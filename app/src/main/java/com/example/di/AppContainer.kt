package com.example.di

import android.content.Context
import com.example.ai.AiOutcome
import com.example.ai.AiTeacherReply
import com.example.audio.TtsManager
import com.example.data.db.AppDatabase
import com.example.data.model.*
import com.example.data.prefs.UserPreferencesRepository
import com.example.data.repository.LinguaVerseRepository
import com.example.domain.AiTutor
import com.example.domain.ContentRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext

/**
 * Manual dependency container (constructor injection, no DI framework).
 *
 * A single instance is created in [com.example.LinguaVerseApplication] and shared
 * by every ViewModel. This moves dependency wiring out of the ViewModels so they
 * can be unit-tested with fakes and so a change to one dependency (e.g. swapping
 * a network data source in) never ripples through screen code. When the app grows
 * real accounts / analytics, add those services here too.
 *
 * Provides both concrete implementations and interfaces for testability.
 */
class AppContainer(context: Context) {

    // Concrete implementations
    val db: AppDatabase by lazy { AppDatabase.getDatabase(context) }

    val repository: LinguaVerseRepository by lazy {
        LinguaVerseRepository(db.linguaVerseDao())
    }

    val preferencesRepository: UserPreferencesRepository by lazy {
        UserPreferencesRepository(context)
    }

    val ttsManager: TtsManager by lazy { TtsManager(context) }

    // Interface implementations (shared instances)
    val aiTutor: AiTutor = object : AiTutor {
        override suspend fun chat(
            userMessage: String,
            targetLanguage: String,
            cefrLevel: CefrLevel,
            chatHistory: List<ChatMessage>
        ): AiOutcome<AiTeacherReply> = withContext(Dispatchers.IO) {
            // TODO: Implement actual AI chat via Gemini API proxy
            AiOutcome.Failure(com.example.ai.AiFailure.NOT_CONFIGURED)
        }

        override suspend fun evaluateWriting(
            userText: String,
            prompt: String,
            targetLanguage: String
        ): AiOutcome<AiTutor.WritingEvaluationResult> = withContext(Dispatchers.IO) {
            // TODO: Implement actual writing evaluation via Gemini API proxy
            AiOutcome.Failure(com.example.ai.AiFailure.NOT_CONFIGURED)
        }
    }

    val contentRepository: ContentRepository = object : ContentRepository {
        override val allLanguages: Flow<List<Language>>
            get() = repository.allLanguages

        override val userProfile: Flow<UserProfile?>
            get() = repository.userProfile

        override val achievements: Flow<List<Achievement>>
            get() = repository.achievements

        override val chatMessages: Flow<List<ChatMessage>>
            get() = repository.chatMessages

        override fun getLessonsByLanguage(langCode: String): Flow<List<Lesson>> =
            repository.getLessonsByLanguage(langCode)

        override fun getVocabularies(langCode: String): Flow<List<Vocabulary>> =
            repository.getVocabularies(langCode)

        override fun getFavoriteVocabularies(langCode: String): Flow<List<Vocabulary>> =
            repository.getFavoriteVocabularies(langCode)

        override fun getGrammarRules(langCode: String): Flow<List<GrammarRule>> =
            repository.getGrammarRules(langCode)

        override fun getFlashcards(langCode: String): Flow<List<Flashcard>> =
            repository.getFlashcards(langCode)

        override suspend fun getAllLessonsOnce(): List<Lesson> = repository.getAllLessonsOnce()

        override suspend fun getAllVocabulariesOnce(): List<Vocabulary> = repository.getAllVocabulariesOnce()

        override suspend fun getAllAchievementsOnce(): List<Achievement> = repository.getAllAchievementsOnce()

        override suspend fun initializeSeedData() {
            repository.initializeSeedData()
        }

        override suspend fun completeLesson(lessonId: String, xpEarned: Int) {
            repository.completeLesson(lessonId, xpEarned, null)
        }

        override suspend fun toggleFavoriteVocab(vocabulary: Vocabulary) {
            repository.toggleFavoriteVocab(vocabulary)
        }
    }
}