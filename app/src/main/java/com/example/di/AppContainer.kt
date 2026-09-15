package com.example.di

import android.content.Context
import com.example.ai.AiOutcome
import com.example.audio.TtsManager
import com.example.data.db.AppDatabase
import com.example.data.prefs.UserPreferencesRepository
import com.example.data.repository.LinguaVerseRepository
import com.example.domain.AiTutor
import com.example.domain.ContentRepository

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
        ): AiOutcome<AiTeacherReply> = withContext(java.util.concurrent.Dispatchers.IO) {
            // TODO: Implement actual AI chat via Gemini API proxy
            AiOutcome.Failure(com.example.ai.AiFailure.NOT_CONFIGURED)
        }

        override suspend fun evaluateWriting(
            userText: String,
            prompt: String,
            targetLanguage: String
        ): AiOutcome<AiTutor.WritingEvaluationResult> = withContext(java.util.concurrent.Dispatchers.IO) {
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

        override fun getLessonsByLanguage(langCode: String): Flow<List<Lesson>>
            get() = repository.getLessonsByLanguage(langCode)

        override fun getVocabularies(langCode: String): Flow<List<Vocabulary>>
            get() = repository.getVocabularies(langCode)

        override fun getFavoriteVocabularies(langCode: String): Flow<List<Vocabulary>>
            get() = repository.getFavoriteVocabularies(langCode)

        override fun getGrammarRules(langCode: String): Flow<List<GrammarRule>>
            get() = repository.getGrammarRules(langCode)

        override fun getFlashcards(langCode: String): Flow<List<Flashcard>>
            get() = repository.getFlashcards(langCode)

        override fun getAllLessonsOnce(): List<Lesson>
            get() = repository.getAllLessonsOnce()

        override fun getAllVocabulariesOnce(): List<Vocabulary>
            get() = repository.getAllVocabulariesOnce()

        override fun getAllAchievementsOnce(): List<Achievement>
            get() = repository.getAllAchievementsOnce()

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