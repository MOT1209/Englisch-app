package com.example.data.repository

import com.example.ai.AiTeacherReply
import com.example.data.db.LinguaVerseDao
import com.example.data.model.*
import kotlinx.coroutines.flow.Flow
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.IOException

class LinguaVerseRepository(
    private val dao: LinguaVerseDao
) {

    private companion object {
        private const val BACKEND_BASE_URL = "http://10.0.2.2:3000"
    }

    val allLanguages: Flow<List<Language>> = dao.getAllLanguages()
    val userProfile: Flow<UserProfile?> = dao.getUserProfile()
    val achievements: Flow<List<Achievement>> = dao.getAllAchievements()
    val chatMessages: Flow<List<ChatMessage>> = dao.getChatMessages()

    fun getLessonsByLanguage(langCode: String): Flow<List<Lesson>> = dao.getLessonsByLanguage(langCode)
    fun getVocabularies(langCode: String): Flow<List<Vocabulary>> = dao.getVocabularies(langCode)
    fun getFavoriteVocabularies(langCode: String): Flow<List<Vocabulary>> = dao.getFavoriteVocabularies(langCode)
    fun getGrammarRules(langCode: String): Flow<List<GrammarRule>> = dao.getGrammarRules(langCode)
    fun getFlashcards(langCode: String): Flow<List<Flashcard>> = dao.getFlashcards(langCode)
    suspend fun updateFlashcard(flashcard: Flashcard) = dao.updateFlashcard(flashcard)

    suspend fun getExercisesForLesson(lessonId: String): List<Exercise> = dao.getExercisesForLesson(lessonId)
    suspend fun getLessonById(lessonId: String): Lesson? = dao.getLessonById(lessonId)

    private val moshi = Moshi.Builder().build()

    private fun callBackend(endpoint: String): List<Any?>? {
        try {
            val client = OkHttpClient()
            val request = Request.Builder().url("$BACKEND_BASE_URL$endpoint").build()
            val response = client.newCall(request).execute()
            if (!response.isSuccessful) return null
            val json = response.body?.string()
            if (json.isBlank()) return null
            val type = com.squareup.moshi.Types.newParameterizedType(
                java.util.List::class.java,
                when (endpoint) {
                    "/languages" -> RemoteLanguage::class.java
                    "/lessons" -> RemoteLesson::class.java
                    "/exercises" -> RemoteExercise::class.java
                    "/vocabularies" -> RemoteVocabulary::class.java
                    "/grammar-rules" -> RemoteGrammarRule::class.java
                    "/flashcards" -> RemoteFlashcard::class.java
                    "/achievements" -> RemoteAchievement::class.java
                    else -> java.util.List::class.java
                }
            )
            val result: List<Any?> = moshi.adapter(type).fromJson(json)
            return result
        } catch (e: IOException) {
            Log.w("Repo", "Backend call failed: ${e.message}")
            null
        }
    }

    suspend fun syncPublicContent(dao: LinguaVerseDao): Boolean {
        return try {
            val remoteLanguages = callBackend("/languages") as? List<RemoteLanguage> ?: return false
            val remoteLessons = callBackend("/lessons") as? List<RemoteLesson> ?: return false
            val remoteExercises = callBackend("/exercises") as? List<RemoteExercise> ?: return false
            val remoteVocabularies = callBackend("/vocabularies") as? List<RemoteVocabulary> ?: return false
            val remoteGrammar = callBackend("/grammar-rules") as? List<RemoteGrammarRule> ?: return false
            val remoteFlashcards = callBackend("/flashcards") as? List<RemoteFlashcard> ?: return false
            val remoteAchievements = callBackend("/achievements") as? List<RemoteAchievement> ?: return false

            if (remoteLanguages.isEmpty() || remoteLessons.isEmpty()) return false

            val existingLessons = dao.getAllLessonsOnce().associateBy { it.id }
            val existingVocabulary = dao.getAllVocabulariesOnce().associateBy { it.id }
            val existingFlashcards = dao.getAllFlashcardsOnce().associateBy { it.id }
            val existingAchievements = dao.getAllAchievementsOnce().associateBy { it.id }

            dao.mergePublicContent(
                languages = remoteLanguages.map { it.toModel() },
                lessons = remoteLessons.map { it.toModel(existingLessons[it.id]) },
                exercises = remoteExercises.map { it.toModel() },
                vocabularies = remoteVocabularies.map { it.toModel(existingVocabulary[it.id]) },
                grammarRules = remoteGrammar.map { it.toModel() },
                flashcards = remoteFlashcards.map { it.toModel(existingFlashcards[it.id]) },
                achievements = remoteAchievements.map { it.toModel(existingAchievements[it.id]) }
            )
            true
        } catch (e: Exception) {
            Log.w("SyncPublicContent", "Backend sync error", e)
            false
        }
    }

suspend fun completeLesson(lessonId: String, xpEarned: Int, authToken: String?) {
        val lesson = dao.getLessonById(lessonId) ?: return

        // Don't allow replaying a finished lesson to farm XP
        if (lesson.isCompleted) return

        // Update local database
        dao.updateLesson(lesson.copy(isCompleted = true))

        val profile = dao.getUserProfileOnce() ?: return
        val newXp = profile.xp + xpEarned
        val newTodayXp = profile.todayXp + xpEarned
        val newCompletedCount = profile.totalCompletedLessons + 1
        val newCoins = profile.coins + (xpEarned / 2)

        // Update local profile
        dao.updateProfile(
            profile.copy(
                xp = newXp,
                todayXp = newTodayXp,
                totalCompletedLessons = newCompletedCount,
                coins = newCoins
            )
        )

        // Sync with backend if token provided
        authToken?.let { token ->
            try {
                val client = OkHttpClient.Builder()
                    .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                    .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                    .build()

                val payload = """{"xp":newXp,"todayXp":newTodayXp,"completedLessons":newCompletedCount,"coins":newCoins}"""
                val request = Request.Builder()
                    .url("$BACKEND_BASE_URL/users/me/progress")
                    .header("Authorization", "Bearer $token")
                    .put(RequestBody.create(payload, okhttp3.MediaType.get("application/json")))
                    .build()

                val response = client.newCall(request).execute()
                if (!response.isSuccessful) {
                    Log.w("Repo", "Backend XP sync failed: ${response.code}")
                }
            } catch (e: Exception) {
                Log.w("Repo", "Backend XP sync error", e)
            }
        }
    }

    suspend fun getAdminStats(): AdminStats = AdminStats(
        languages = dao.countLanguages(),
        lessons = dao.countAllLessons(),
        exercises = dao.countExercises(),
        vocabulary = dao.countVocabulary(),
        grammarRules = dao.countGrammarRules(),
        flashcards = dao.countFlashcards(),
        completedLessons = dao.countCompletedLessons()
    )
}