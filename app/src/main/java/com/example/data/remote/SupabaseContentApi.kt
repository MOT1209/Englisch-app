package com.example.data.remote

import android.util.Log
import com.example.BuildConfig
import com.example.data.db.LinguaVerseDao
import com.example.data.model.Achievement
import com.example.data.model.CefrLevel
import com.example.data.model.Exercise
import com.example.data.model.ExerciseType
import com.example.data.model.Flashcard
import com.example.data.model.GrammarRule
import com.example.data.model.Language
import com.example.data.model.Lesson
import com.example.data.model.Vocabulary
import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import okhttp3.OkHttpClient
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import retrofit2.http.GET
import java.io.IOException
import com.squareup.moshi.JsonDataException

private const val TAG = "SupabaseContentApi"

interface SupabaseContentApi {
    @GET("rest/v1/languages?select=*")
    suspend fun getLanguages(): List<RemoteLanguage>

    @GET("rest/v1/lessons?select=*")
    suspend fun getLessons(): List<RemoteLesson>

    @GET("rest/v1/exercises?select=*")
    suspend fun getExercises(): List<RemoteExercise>

    @GET("rest/v1/vocabularies?select=*")
    suspend fun getVocabularies(): List<RemoteVocabulary>

    @GET("rest/v1/grammar_rules?select=*")
    suspend fun getGrammarRules(): List<RemoteGrammarRule>

    @GET("rest/v1/flashcards?select=*")
    suspend fun getFlashcards(): List<RemoteFlashcard>

    @GET("rest/v1/achievements?select=*")
    suspend fun getAchievements(): List<RemoteAchievement>
}

@JsonClass(generateAdapter = true)
data class RemoteLanguage(
    val code: String,
    val name: String,
    @Json(name = "native_name") val nativeName: String,
    @Json(name = "flag_emoji") val flagEmoji: String = "",
    @Json(name = "is_default") val isDefault: Boolean = true,
    @Json(name = "total_lessons_count") val totalLessonsCount: Int = 24,
    val description: String = ""
) {
    fun toModel() = Language(
        code = code,
        name = name,
        nativeName = nativeName,
        flagEmoji = flagEmoji,
        isDefault = isDefault,
        totalLessonsCount = totalLessonsCount,
        description = description
    )
}

@JsonClass(generateAdapter = true)
data class RemoteLesson(
    val id: String,
    @Json(name = "language_code") val languageCode: String,
    val level: String,
    val title: String,
    val description: String,
    val category: String,
    @Json(name = "xp_reward") val xpReward: Int = 20,
    @Json(name = "is_locked") val isLocked: Boolean = false,
    @Json(name = "order_index") val orderIndex: Int = 0
) {
    fun toModel(previous: Lesson?) = Lesson(
        id = id,
        languageCode = languageCode,
        level = level.toCefrLevel(),
        title = title,
        description = description,
        category = category,
        xpReward = xpReward,
        isCompleted = previous?.isCompleted ?: false,
        isLocked = isLocked,
        orderIndex = orderIndex
    )
}

@JsonClass(generateAdapter = true)
data class RemoteExercise(
    val id: String,
    @Json(name = "lesson_id") val lessonId: String,
    val type: String,
    val prompt: String,
    @Json(name = "target_text") val targetText: String = "",
    val translation: String = "",
    @Json(name = "options_json") val optionsJson: String = "[]",
    @Json(name = "correct_answer") val correctAnswer: String = "",
    @Json(name = "audio_url") val audioUrl: String = "",
    @Json(name = "phonetic_text") val phoneticText: String = "",
    val explanation: String = "",
    @Json(name = "passage_text") val passageText: String = "",
    @Json(name = "image_res_name") val imageResName: String = ""
) {
    fun toModel() = Exercise(
        id = id,
        lessonId = lessonId,
        type = type.toExerciseType(),
        prompt = prompt,
        targetText = targetText,
        translation = translation,
        optionsJson = optionsJson,
        correctAnswer = correctAnswer,
        audioUrl = audioUrl,
        phoneticText = phoneticText,
        explanation = explanation,
        passageText = passageText,
        imageResName = imageResName
    )
}

@JsonClass(generateAdapter = true)
data class RemoteVocabulary(
    val id: String,
    @Json(name = "language_code") val languageCode: String,
    val word: String,
    val translation: String,
    @Json(name = "example_sentence") val exampleSentence: String,
    @Json(name = "example_translation") val exampleTranslation: String,
    val phonetic: String = "",
    val category: String = "General"
) {
    fun toModel(previous: Vocabulary?) = Vocabulary(
        id = id,
        languageCode = languageCode,
        word = word,
        translation = translation,
        exampleSentence = exampleSentence,
        exampleTranslation = exampleTranslation,
        phonetic = phonetic,
        category = category,
        isFavorite = previous?.isFavorite ?: false,
        needsReview = previous?.needsReview ?: false
    )
}

@JsonClass(generateAdapter = true)
data class RemoteGrammarRule(
    val id: String,
    @Json(name = "language_code") val languageCode: String,
    val level: String,
    val title: String,
    val summary: String,
    @Json(name = "full_rule_text") val fullRuleText: String,
    @Json(name = "example_sentence") val exampleSentence: String,
    @Json(name = "example_translation") val exampleTranslation: String
) {
    fun toModel() = GrammarRule(
        id = id,
        languageCode = languageCode,
        level = level.toCefrLevel(),
        title = title,
        summary = summary,
        fullRuleText = fullRuleText,
        exampleSentence = exampleSentence,
        exampleTranslation = exampleTranslation
    )
}

@JsonClass(generateAdapter = true)
data class RemoteFlashcard(
    val id: String,
    @Json(name = "language_code") val languageCode: String,
    @Json(name = "front_word") val frontWord: String,
    @Json(name = "back_translation") val backTranslation: String,
    @Json(name = "example_sentence") val exampleSentence: String,
    val phonetic: String = "",
    @Json(name = "interval_days") val intervalDays: Int = 1
) {
    fun toModel(previous: Flashcard?) = Flashcard(
        id = id,
        languageCode = languageCode,
        frontWord = frontWord,
        backTranslation = backTranslation,
        exampleSentence = exampleSentence,
        phonetic = phonetic,
        intervalDays = previous?.intervalDays ?: intervalDays,
        // SM-2 progress is learner-specific: never overwrite it from the server.
        easeFactor = previous?.easeFactor ?: 2.5,
        repetitions = previous?.repetitions ?: 0,
        nextReviewAt = previous?.nextReviewAt ?: 0,
        lastReviewAt = previous?.lastReviewAt ?: 0,
        isMastered = previous?.isMastered ?: false
    )
}

@JsonClass(generateAdapter = true)
data class RemoteAchievement(
    val id: String,
    val title: String,
    val description: String,
    @Json(name = "icon_name") val iconName: String,
    @Json(name = "max_progress") val maxProgress: Int = 100,
    @Json(name = "reward_xp") val rewardXp: Int = 50
) {
    fun toModel(previous: Achievement?) = Achievement(
        id = id,
        title = title,
        description = description,
        iconName = iconName,
        isUnlocked = previous?.isUnlocked ?: false,
        progress = previous?.progress ?: 0,
        maxProgress = maxProgress,
        rewardXp = rewardXp
    )
}

object SupabaseConfig {
    val url: String
        get() = BuildConfig.SUPABASE_URL.trim().trimEnd('/')

    val anonKey: String
        get() = BuildConfig.SUPABASE_ANON_KEY.trim()

    val isConfigured: Boolean
        get() = url.startsWith("https://") &&
            anonKey.isNotBlank() &&
            !anonKey.startsWith("YOUR_")
}

class SupabaseContentDataSource(
    private val api: SupabaseContentApi? = createConfiguredApi()
) {
    /** Downloads public catalog data and merges it without overwriting learner progress. */
    suspend fun syncPublicContent(dao: LinguaVerseDao): Boolean {
        val configuredApi = api ?: return false

        return try {
            val remoteLanguages = configuredApi.getLanguages()
            val remoteLessons = configuredApi.getLessons()
            val remoteExercises = configuredApi.getExercises()
            val remoteVocabulary = configuredApi.getVocabularies()
            val remoteGrammar = configuredApi.getGrammarRules()
            val remoteFlashcards = configuredApi.getFlashcards()
            val remoteAchievements = configuredApi.getAchievements()

            if (remoteLanguages.isEmpty() || remoteLessons.isEmpty()) return false

            val existingLessons = dao.getAllLessonsOnce().associateBy { it.id }
            val existingVocabulary = dao.getAllVocabulariesOnce().associateBy { it.id }
            val existingFlashcards = dao.getAllFlashcardsOnce().associateBy { it.id }
            val existingAchievements = dao.getAllAchievementsOnce().associateBy { it.id }

            dao.mergePublicContent(
                languages = remoteLanguages.map { it.toModel() },
                lessons = remoteLessons.map { it.toModel(existingLessons[it.id]) },
                exercises = remoteExercises.map { it.toModel() },
                vocabularies = remoteVocabulary.map { it.toModel(existingVocabulary[it.id]) },
                grammarRules = remoteGrammar.map { it.toModel() },
                flashcards = remoteFlashcards.map { it.toModel(existingFlashcards[it.id]) },
                achievements = remoteAchievements.map { it.toModel(existingAchievements[it.id]) }
            )
            true
        } catch (exception: IOException) {
            Log.w(TAG, "Supabase content sync could not reach the server", exception)
            false
        } catch (exception: HttpException) {
            Log.w(TAG, "Supabase content sync returned HTTP ${exception.code()}", exception)
            false
        } catch (exception: JsonDataException) {
            Log.w(TAG, "Supabase content schema did not match the app", exception)
            false
        }
    }

    private companion object {
        fun createConfiguredApi(): SupabaseContentApi? {
            if (!SupabaseConfig.isConfigured) return null

            val httpClient = OkHttpClient.Builder()
                .addInterceptor { chain ->
                    val request = chain.request().newBuilder()
                        .addHeader("apikey", SupabaseConfig.anonKey)
                        .addHeader("Authorization", "Bearer ${SupabaseConfig.anonKey}")
                        .build()
                    chain.proceed(request)
                }
                .build()

            return Retrofit.Builder()
                .baseUrl("${SupabaseConfig.url}/")
                .client(httpClient)
                .addConverterFactory(MoshiConverterFactory.create())
                .build()
                .create(SupabaseContentApi::class.java)
        }
    }
}

private fun String.toCefrLevel(): CefrLevel =
    CefrLevel.entries.firstOrNull { it.name == uppercase() || it.code == uppercase() } ?: CefrLevel.A1

private fun String.toExerciseType(): ExerciseType =
    ExerciseType.entries.firstOrNull { it.name == uppercase() } ?: ExerciseType.VOCABULARY
