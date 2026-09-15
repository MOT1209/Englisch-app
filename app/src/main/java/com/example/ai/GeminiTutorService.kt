package com.example.ai

import android.util.Log
import com.example.BuildConfig
import com.example.data.model.CefrLevel
import com.example.data.model.ChatMessage
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import retrofit2.http.Body
import retrofit2.http.POST
import java.util.concurrent.TimeUnit

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
 * Contract with our own backend proxy (backend/src/routes/ai.routes.ts).
 *
 * The Gemini API key lives only on the server now. The APK no longer contains
 * it, so shipping the signed app no longer gives away a billing-attached key.
 * The app talks to `/api/ai/chat` and `/api/ai/write` and authenticates with
 * `X-App-Token` (a shared secret configured through the secrets Gradle plugin).
 */
internal data class ProxyMessage(val role: String, val text: String)

internal data class ProxyChatRequest(
    val messages: List<ProxyMessage>,
    val targetLanguage: String,
    val cefrLevel: String
)

internal data class ProxyWriteRequest(
    val userText: String,
    val prompt: String,
    val targetLanguage: String
)

internal data class ProxyEnvelope<T>(
    val success: Boolean = false,
    val data: T? = null
)

internal data class ProxyChatReply(
    val replyText: String = "",
    val correction: String? = null,
    val suggestion: String? = null,
    val grammarExplanation: String? = null
)

internal data class ProxyWriteResult(
    val score: Int = 85,
    val correctedText: String = "",
    val feedback: String = "",
    val suggestions: List<String> = emptyList()
)

internal interface TutorProxyApi {
    @POST("api/ai/chat")
    suspend fun chat(@Body request: ProxyChatRequest): ProxyEnvelope<ProxyChatReply>

    @POST("api/ai/write")
    suspend fun write(@Body request: ProxyWriteRequest): ProxyEnvelope<ProxyWriteResult>
}

object GeminiTutorService {

    private const val TAG = "GeminiTutorService"

    private const val PLACEHOLDER_TOKEN = "YOUR_APP_TOKEN"

    private val proxyBaseUrl: String
        get() = BuildConfig.AI_PROXY_BASE_URL.trim().trimEnd('/')

    private val appToken: String
        get() = BuildConfig.AI_PROXY_APP_TOKEN.trim()

    private fun isConfigured(): Boolean =
        (proxyBaseUrl.startsWith("http://") || proxyBaseUrl.startsWith("https://")) &&
            appToken.isNotBlank() && appToken != PLACEHOLDER_TOKEN

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .addInterceptor { chain ->
            val request = chain.request().newBuilder()
                .header("X-App-Token", appToken)
                .build()
            chain.proceed(request)
        }
        .build()

    // Moshi's reflection adapter is required: Retrofit pairs with 1.x Moshi and
    // our DTOs are plain Kotlin data classes without @JsonClass(generateAdapter=true).
    private val moshi = Moshi.Builder().addLast(KotlinJsonAdapterFactory()).build()

    private val retrofit = Retrofit.Builder()
        .baseUrl("$proxyBaseUrl/")
        .client(okHttpClient)
        .addConverterFactory(MoshiConverterFactory.create(moshi))
        .build()

    private val api = retrofit.create(TutorProxyApi::class.java)

    suspend fun chatWithAiTeacher(
        userMessage: String,
        targetLanguage: String,
        cefrLevel: CefrLevel,
        chatHistory: List<ChatMessage>
    ): AiOutcome<AiTeacherReply> = withContext(Dispatchers.IO) {
        if (!isConfigured()) {
            return@withContext AiOutcome.Failure(AiFailure.NOT_CONFIGURED)
        }

        val messages = buildList {
            chatHistory.takeLast(6).forEach { msg ->
                val role = if (msg.sender == "user") "user" else "tutor"
                add(ProxyMessage(role = role, text = msg.text))
            }
            add(ProxyMessage(role = "user", text = userMessage))
        }

        try {
            val envelope = api.chat(
                ProxyChatRequest(
                    messages = messages,
                    targetLanguage = targetLanguage,
                    cefrLevel = cefrLevel.code
                )
            )
            val reply = envelope.data
            if (envelope.success && reply != null && reply.replyText.isNotBlank()) {
                AiOutcome.Success(
                    AiTeacherReply(
                        replyText = reply.replyText,
                        correction = reply.correction,
                        suggestion = reply.suggestion,
                        grammarExplanation = reply.grammarExplanation
                    )
                )
            } else {
                AiOutcome.Failure(AiFailure.EMPTY_RESPONSE)
            }
        } catch (e: Exception) {
            Log.w(TAG, "AI tutor chat request failed", e)
            AiOutcome.Failure(AiFailure.UNREACHABLE)
        }
    }

    suspend fun evaluateWriting(
        userText: String,
        prompt: String,
        targetLanguage: String
    ): AiOutcome<WritingEvaluationResult> = withContext(Dispatchers.IO) {
        if (!isConfigured()) {
            return@withContext AiOutcome.Failure(AiFailure.NOT_CONFIGURED)
        }

        try {
            val envelope = api.write(
                ProxyWriteRequest(
                    userText = userText,
                    prompt = prompt,
                    targetLanguage = targetLanguage
                )
            )
            val data = envelope.data
            if (envelope.success && data != null && data.correctedText.isNotBlank() && data.feedback.isNotBlank()) {
                AiOutcome.Success(
                    WritingEvaluationResult(
                        score = data.score,
                        correctedText = data.correctedText,
                        feedback = data.feedback,
                        suggestions = data.suggestions.ifEmpty { listOf("Keep practicing daily") }
                    )
                )
            } else {
                AiOutcome.Failure(AiFailure.EMPTY_RESPONSE)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Writing evaluation request failed", e)
            AiOutcome.Failure(AiFailure.UNREACHABLE)
        }
    }
}
