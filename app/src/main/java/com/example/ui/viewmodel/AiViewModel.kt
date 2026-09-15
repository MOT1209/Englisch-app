package com.example.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.ai.AiFailure
import com.example.ai.AiOutcome
import com.example.ai.GeminiTutorService
import com.example.ai.WritingEvaluationResult
import com.example.data.model.CefrLevel
import com.example.data.repository.LinguaVerseRepository
import com.example.data.model.ChatMessage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * Owns every Gemini interaction: the conversational AI tutor chat and the writing
 * evaluation lab. Split out of the shared [MainViewModel] so AI networking concerns
 * stay isolated from the learning/dashboard state.
 */
class AiViewModel(
    private val repository: LinguaVerseRepository
) : ViewModel() {

    val chatMessages: StateFlow<List<ChatMessage>> = repository.chatMessages
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    private val _isAiChatLoading = MutableStateFlow(false)
    val isAiChatLoading: StateFlow<Boolean> = _isAiChatLoading.asStateFlow()

    /** Non-null when the last AI tutor request failed. Cleared on the next attempt. */
    private val _aiChatError = MutableStateFlow<AiFailure?>(null)
    val aiChatError: StateFlow<AiFailure?> = _aiChatError.asStateFlow()

    private val _writingEvaluation = MutableStateFlow<WritingEvaluationResult?>(null)
    val writingEvaluation: StateFlow<WritingEvaluationResult?> = _writingEvaluation.asStateFlow()

    private val _isEvaluatingWriting = MutableStateFlow(false)
    val isEvaluatingWriting: StateFlow<Boolean> = _isEvaluatingWriting.asStateFlow()

    /** Non-null when the last writing evaluation failed. Cleared on the next attempt. */
    private val _writingEvaluationError = MutableStateFlow<AiFailure?>(null)
    val writingEvaluationError: StateFlow<AiFailure?> = _writingEvaluationError.asStateFlow()

    fun sendAiChatMessage(userText: String, targetLanguage: String, cefrLevel: CefrLevel, history: List<ChatMessage>) {
        if (userText.isBlank()) return

        viewModelScope.launch {
            _isAiChatLoading.value = true
            _aiChatError.value = null

            when (
                val outcome = GeminiTutorService.chatWithAiTeacher(
                    userMessage = userText,
                    targetLanguage = targetLanguage,
                    cefrLevel = cefrLevel,
                    chatHistory = history
                )
            ) {
                // Only a real answer is persisted. A failed request must not leave
                // an invented tutor message in the user's chat history.
                is AiOutcome.Success -> repository.sendChatMessage(userText, outcome.value)
                is AiOutcome.Failure -> _aiChatError.value = outcome.reason
            }
            _isAiChatLoading.value = false
        }
    }

    fun evaluateWritingSubmission(userText: String, prompt: String, targetLanguage: String) {
        if (userText.isBlank()) return

        viewModelScope.launch {
            _isEvaluatingWriting.value = true
            _writingEvaluationError.value = null
            _writingEvaluation.value = null

            when (
                val outcome = GeminiTutorService.evaluateWriting(
                    userText = userText,
                    prompt = prompt,
                    targetLanguage = targetLanguage
                )
            ) {
                is AiOutcome.Success -> _writingEvaluation.value = outcome.value
                is AiOutcome.Failure -> _writingEvaluationError.value = outcome.reason
            }
            _isEvaluatingWriting.value = false
        }
    }
}
