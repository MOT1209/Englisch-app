package com.example.data.repository

import com.example.data.model.*

/**
 * Interface defining the repository contract.
 * This allows us to swap the real implementation with a fake in tests.
 */
interface LinguaVerseRepositoryInterface {
    val allLanguages: kotlinx.coroutines.flow.Flow<List<Language>>
    val userProfile: kotlinx.coroutines.flow.Flow<UserProfile?>
    val achievements: kotlinx.coroutines.flow.Flow<List<Achievement>>
    val chatMessages: kotlinx.coroutines.flow.Flow<List<ChatMessage>>

    fun getLessonsByLanguage(langCode: String): kotlinx.coroutines.flow.Flow<List<Lesson>>
    fun getVocabularies(langCode: String): kotlinx.coroutines.flow.Flow<List<Vocabulary>>
    fun getFavoriteVocabularies(langCode: String): kotlinx.coroutines.flow.Flow<List<Vocabulary>>
    fun getGrammarRules(langCode: String): kotlinx.coroutines.flow.Flow<List<GrammarRule>>
    fun getFlashcards(langCode: String): kotlinx.coroutines.flow.Flow<List<Flashcard>>

    suspend fun getExercisesForLesson(lessonId: String): List<Exercise>
    suspend fun getLessonById(lessonId: String): Lesson?
    suspend fun initializeSeedData()
    suspend fun completeLesson(lessonId: String, xpEarned: Int)
    suspend fun updateTargetLanguage(langCode: String)
    suspend fun toggleFavoriteVocab(vocabulary: Vocabulary)
    suspend fun addCustomLanguage(language: Language)
    suspend fun addCustomLesson(lesson: Lesson, exercises: List<Exercise>)
    suspend fun addCustomVocabulary(vocabulary: Vocabulary)
    suspend fun addCustomGrammarRule(rule: GrammarRule)
    suspend fun sendChatMessage(userText: String, aiReply: com.example.ai.AiTeacherReply)
    suspend fun clearChatHistory()
}
