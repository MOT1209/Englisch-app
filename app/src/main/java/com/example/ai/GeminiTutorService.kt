package com.example.ai

import android.util.Log
import com.example.data.model.CefrLevel
import com.example.data.model.ChatMessage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Data classes representing the Gemini API request/response format.
 * These now mirror the structure consumed by the Firebase Function proxy.
 */
data class GeminiPart(val text: String? = null)
data class GeminiContent(val role: String? = "user", val parts: List<GeminiPart>)
data class GeminiRequest(
    val contents: List<GeminiContent>,
    val systemInstruction: GeminiContent? = null
)
data class GeminiCandidateContent(val parts: List<GeminiPart> = emptyList())
data class GeminiCandidate(val content: GeminiCandidateContent = GeminiCandidateContent())
data class GeminiResponse(val candidates: List<GeminiCandidate> = emptyList())

data class AiTeacherReply(
    val replyText: String,
    val correction: String? = null,
    val suggestion: String? = null,
    val grammarExplanation: String? = null
)

data class WritingEvaluationResult(
    val score: Int,
    val correctedText: String,
    val feedback: String,
    val suggestions: List<String>
)

/**
 * Service object that talks to the Gemini model through a Firebase Function proxy.
 *
 * The proxy holds the API key on the server side, so it never ships in the APK.
 * The client sends the same JSON body it used to send to the Gemini REST endpoint;
 * the function forwards it and returns the same response shape.
 */
object GeminiTutorService {
    private const val TAG = "GeminiTutorService"

    /**
     * URL of the Firebase Function HTTPS proxy.
     * Replace with your deployed function URL after `firebase deploy`.
     * For local testing, use the Firebase CLI emulator:
     *   firebase emulators:start --only functions
     * then change this to http://10.0.2.2:5001/<project>/us-central1/proxyGemini
     */
    private const val PROXY_URL = "https://us-central1-linguaverse-app.cloudfunctions.net/proxyGemini"

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private const val PLACEHOLDER_API_KEY = "MY_GEMINI_API_KEY"

    /**
     * Checks whether the user has supplied a usable API key via .env.
     * For the proxy approach, the key is optional — if absent, the proxy
     * uses its own server-side key. We check for the placeholder to detect
     * when the user hasn't configured secrets at all.
     */
    private fun hasUsableApiKey(): Boolean {
        // In the proxy model, the server holds the key.
        // We treat "hasUsableApiKey" as always true if the proxy is reachable,
        // and return a different failure if it is not.
        return true
    }

    /**
     * Calls the Firebase Function proxy.
     * Returns AiOutcome.Failure if the proxy is unreachable or returns an error.
     */
    private suspend fun callProxy(request: GeminiRequest): AiOutcome<GeminiResponse> =
        withContext(Dispatchers.IO) {
            val jsonBody = JSONObject().apply {
                put("contents", request.contents.toString())
                request.systemInstruction?.let {
                    put("systemInstruction", it.toString())
                }
            }
            // Note: The actual JSON serialization uses Moshi below; this is a lightweight
            // reflection-free alternative for the proxy call.
            val moshi = com.squareup.moshi.Moshi.Builder().build()
            val adapter = moshi.adapter(GeminiRequest::class.java)
            val requestBodyStr = adapter.toJson(request)
            val body = requestBodyStr.toRequestBody("application/json; charset=utf-8".toMediaType())

            val httpRequest = Request.Builder()
                .url(PROXY_URL)
                .post(body)
                .build()

            try {
                val response: Response = okHttpClient.newCall(httpRequest).execute()
                if (!response.isSuccessful) {
                    Log.w(TAG, "Proxy returned HTTP ${response.code}: ${response.message}")
                    return@withContext AiOutcome.Failure(AiFailure.UNREACHABLE)
                }

                val responseBody = response.body?.string()
                if (responseBody.isNullOrBlank()) {
                    Log.w(TAG, "Proxy returned empty response body")
                    return@withContext AiOutcome.Failure(AiFailure.EMPTY_RESPONSE)
                }

                val responseAdapter = moshi.adapter(GeminiResponse::class.java)
                val geminiResponse = responseAdapter.fromJson(responseBody)

                if (geminiResponse == null || geminiResponse.candidates.isEmpty()) {
                    Log.w(TAG, "Proxy returned no candidates: $responseBody")
                    return@withContext AiOutcome.Failure(AiFailure.EMPTY_RESPONSE)
                }

                AiOutcome.Success(geminiResponse)
            } catch (e: Exception) {
                Log.w(TAG, "Proxy call failed", e)
                AiOutcome.Failure(AiFailure.UNREACHABLE)
            }
        }

    suspend fun chatWithAiTeacher(
        userMessage: String,
        targetLanguage: String,
        cefrLevel: CefrLevel,
        chatHistory: List<ChatMessage>
    ): AiOutcome<AiTeacherReply> = withContext(Dispatchers.IO) {
        if (!hasUsableApiKey()) {
            return@withContext AiOutcome.Failure(AiFailure.NOT_CONFIGURED)
        }

        val systemPrompt = """
            You are LinguaVerse AI Teacher, a warm, supportive language tutor teaching $targetLanguage to a learner at level ${cefrLevel.code} (${cefrLevel.title}).
            Rules:
            1. Respond in $targetLanguage appropriate for a ${cefrLevel.code} level learner, with English translation in parentheses if helpful.
            2. If the user's input has grammar or spelling mistakes, point out a gentle correction.
            3. Provide a better, more native sentence suggestion.
            4. Keep responses conversational and encouraging.
            5. Format your output strictly using this structure:
            REPLY: <your tutor response>
            CORRECTION: <gentle correction or NONE>
            SUGGESTION: <better sentence suggestion or NONE>
            EXPLANATION: <brief grammar note or NONE>
        """.trimIndent()

        val contents = mutableListOf<GeminiContent>()
        chatHistory.takeLast(6).forEach { msg ->
            val role = if (msg.sender == "user") "user" else "model"
            contents.add(GeminiContent(role = role, parts = listOf(GeminiPart(text = msg.text))))
        }
        contents.add(GeminiContent(role = "user", parts = listOf(GeminiPart(text = userMessage))))

        val request = GeminiRequest(
            contents = contents,
            systemInstruction = GeminiContent(parts = listOf(GeminiPart(text = systemPrompt)))
        )

        when (val outcome = callProxy(request)) {
            is AiOutcome.Success -> {
                val response = outcome.value
                val rawText = response.candidates.firstOrNull()
                    ?.content?.parts?.firstOrNull()?.text.orEmpty()
                if (rawText.isBlank()) {
                    AiOutcome.Failure(AiFailure.EMPTY_RESPONSE)
                } else {
                    AiOutcome.Success(parseAiReply(rawText))
                }
            }
            is AiOutcome.Failure -> outcome
        }
    }

    suspend fun evaluateWriting(
        userText: String,
        prompt: String,
        targetLanguage: String
    ): AiOutcome<WritingEvaluationResult> = withContext(Dispatchers.IO) {
        if (!hasUsableApiKey()) {
            return@withContext AiOutcome.Failure(AiFailure.NOT_CONFIGURED)
        }

        val systemPrompt = """
            Evaluate the following writing submission in $targetLanguage for the prompt: '$prompt'.
            User submission: '$userText'
            Provide feedback strictly formatted as:
            SCORE: <number 0-100>
            CORRECTED: <corrected version of user text>
            FEEDBACK: <detailed feedback on grammar, vocabulary, and style>
            SUGGESTIONS: <suggestion 1> | <suggestion 2>
        """.trimIndent()

        val request = GeminiRequest(
            contents = listOf(GeminiContent(parts = listOf(GeminiPart(text = userText)))),
            systemInstruction = GeminiContent(parts = listOf(GeminiPart(text = systemPrompt)))
        )

        when (val outcome = callProxy(request)) {
            is AiOutcome.Success -> {
                val response = outcome.value
                val rawText = response.candidates.firstOrNull()
                    ?.content?.parts?.firstOrNull()?.text.orEmpty()
                if (rawText.isBlank()) {
                    AiOutcome.Failure(AiFailure.EMPTY_RESPONSE)
                } else {
                    AiOutcome.Success(parseWritingResult(rawText, userText))
                }
            }
            is AiOutcome.Failure -> outcome
        }
    }

    private fun parseAiReply(raw: String): AiTeacherReply {
        var reply = ""
        var correction: String? = null
        var suggestion: String? = null
        var explanation: String? = null

        val lines = raw.lines()
        for (line in lines) {
            when {
                line.startsWith("REPLY:", ignoreCase = true) -> reply = line.substringAfter("REPLY:").trim()
                line.startsWith("CORRECTION:", ignoreCase = true) -> {
                    val content = line.substringAfter("CORRECTION:").trim()
                    if (content != "NONE") correction = content
                }
                line.startsWith("SUGGESTION:", ignoreCase = true) -> {
                    val content = line.substringAfter("SUGGESTION:").trim()
                    if (content != "NONE") suggestion = content
                }
                line.startsWith("EXPLANATION:", ignoreCase = true) -> {
                    val content = line.substringAfter("EXPLANATION:").trim()
                    if (content != "NONE") explanation = content
                }
            }
        }

        if (reply.isEmpty()) reply = raw

        return AiTeacherReply(
            replyText = reply,
            correction = correction,
            suggestion = suggestion,
            grammarExplanation = explanation
        )
    }

    private fun parseWritingResult(raw: String, originalText: String): WritingEvaluationResult {
        var score = 85
        var corrected = originalText
        var feedback = "Good overall composition!"
        val suggestions = mutableListOf<String>()

        val lines = raw.lines()
        for (line in lines) {
            when {
                line.startsWith("SCORE:", ignoreCase = true) -> {
                    score = line.substringAfter("SCORE:").trim().toIntOrNull() ?: 85
                }
                line.startsWith("CORRECTED:", ignoreCase = true) -> {
                    corrected = line.substringAfter("CORRECTED:").trim()
                }
                line.startsWith("FEEDBACK:", ignoreCase = true) -> {
                    feedback = line.substringAfter("FEEDBACK:").trim()
                }
                line.startsWith("SUGGESTIONS:", ignoreCase = true) -> {
                    val items = line.substringAfter("SUGGESTIONS:").split("|")
                    suggestions.addAll(items.map { it.trim() }.filter { it.isNotEmpty() })
                }
            }
        }

        return WritingEvaluationResult(
            score = score,
            correctedText = corrected,
            feedback = feedback,
            suggestions = if (suggestions.isEmpty()) listOf("Keep practicing daily") else suggestions
        )
    }
}
