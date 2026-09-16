package com.example.domain

import com.example.data.model.*
import kotlinx.coroutines.flow.Flow

/**
 * Interface for content data operations, allowing substitution with a fake/mock
 * for unit testing ViewModels that depend on data operations without requiring
 * database or network access.
 */
interface ContentRepository {

    /** Returns all available languages. */
    val allLanguages: Flow<List<Language>>

    /** Returns the user's profile (may be null on first launch). */
    val userProfile: Flow<UserProfile?>

    /** Returns all achievements. */
    val achievements: Flow<List<Achievement>>

    /** Returns chat messages stream. */
    val chatMessages: Flow<List<ChatMessage>>

    /** Get lessons by language code. */
    fun getLessonsByLanguage(langCode: String): Flow<List<Lesson>>

    /** Get vocabulary by language code. */
    fun getVocabularies(langCode: String): Flow<List<Vocabulary>>

    /** Get favorite vocabulary by language code. */
    fun getFavoriteVocabularies(langCode: String): Flow<List<Vocabulary>>

    /** Get grammar rules by language code. */
    fun getGrammarRules(langCode: String): Flow<List<GrammarRule>>

    /** Get flashcards by language code. */
    fun getFlashcards(langCode: String): Flow<List<Flashcard>>

    /** Get all lessons once (non-flow). */
    suspend fun getAllLessonsOnce(): List<Lesson>

    /** Get all vocabularies once (non-flow). */
    suspend fun getAllVocabulariesOnce(): List<Vocabulary>

    /** Get all achievements once (non-flow). */
    suspend fun getAllAchievementsOnce(): List<Achievement>

    /** Seed initial content for first launch. */
    suspend fun initializeSeedData()

    /** Complete a lesson and update progress. */
    suspend fun completeLesson(lessonId: String, xpEarned: Int)

    /** Toggle favorite status for a vocabulary item. */
    suspend fun toggleFavoriteVocab(vocabulary: Vocabulary)
}