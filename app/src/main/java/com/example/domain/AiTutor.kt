package com.example.domain

import com.example.ai.AiOutcome
import com.example.ai.AiTeacherReply
import com.example.data.model.ChatMessage
import com.example.data.model.CefrLevel

/**
 * Interface for AI tutor interactions, allowing substitution with a fake/mock
 * for unit testing ViewModels without requiring network access or the Gemini API.
 */
interface AiTutor {

    /**
     * Chat with the AI teacher about a language learning topic.
     *
     * @param userMessage The user's message/question
     * @param targetLanguage The target language code (e.g., "es" for Spanish)
     * @param cefrLevel The learner's CEFR level
     * @param chatHistory Previous chat messages for context
     * @return AiOutcome containing either a successful AiTeacherReply or an AiFailure
     */
    suspend fun chat(
        userMessage: String,
        targetLanguage: String,
        cefrLevel: CefrLevel,
        chatHistory: List<ChatMessage>
    ): AiOutcome<AiTeacherReply>

    /**
     * Evaluate a writing submission and provide feedback.
     *
     * @param userText The user's writing submission
     * @param prompt The writing prompt/context
     * @param targetLanguage The target language
     * @return AiOutcome containing either a successful WritingEvaluationResult or an AiFailure
     */
    suspend fun evaluateWriting(
        userText: String,
        prompt: String,
        targetLanguage: String
    ): AiOutcome<WritingEvaluationResult>

    data class WritingEvaluationResult(
        val score: Int,
        val correctedText: String,
        val feedback: String,
        val suggestions: List<String>
    )
}