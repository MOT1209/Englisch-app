package com.example.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.ai.AiFailure
import com.example.ai.AiOutcome
import com.example.ai.GeminiTutorService
import com.example.data.model.CefrLevel
import com.example.data.model.ChatMessage
import com.example.data.repository.LinguaVerseRepositoryInterface
import com.example.ai.WritingEvaluationResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for the AI Tutor chat screen (AiChatScreen).
 * Manages chat messages, AI typing/loading state, and AI errors.
 */
@HiltViewModel
class AiChatViewModel @Inject constructor(
    private val repository: LinguaVerseRepositoryInterface
) : ViewModel() {

    val chatMessages: StateFlow<List<ChatMessage>> = repository.chatMessages
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    private val _isAiChatLoading = MutableStateFlow(false)
    val isAiChatLoading: StateFlow<Boolean> = _isAiChatLoading.asStateFlow()

    private val _aiChatError = MutableStateFlow<AiFailure?>(null)
    val aiChatError: StateFlow<AiFailure?> = _aiChatError.asStateFlow()

    val currentLevel: StateFlow<CefrLevel> = repository.userProfile
        .map { it?.currentLevel ?: CefrLevel.A1 }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = CefrLevel.A1
        )

    val targetLanguageCode: StateFlow<String> = repository.userProfile
        .map { it?.targetLanguageCode ?: "es" }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = "es"
        )

    fun sendAiChatMessage(userText: String) {
        if (userText.isBlank()) return

        viewModelScope.launch {
            _isAiChatLoading.value = true
            _aiChatError.value = null

            when (
                val outcome = GeminiTutorService.chatWithAiTeacher(
                    userMessage = userText,
                    targetLanguage = targetLanguageCode.value,
                    cefrLevel = currentLevel.value,
                    chatHistory = chatMessages.value
                )
            ) {
                is AiOutcome.Success -> repository.sendChatMessage(userText, outcome.value)
                is AiOutcome.Failure -> _aiChatError.value = outcome.reason
            }
            _isAiChatLoading.value = false
        }
    }

    fun evaluateWritingSubmission(userText: String, prompt: String) {
        if (userText.isBlank()) return

        viewModelScope.launch {
            _isEvaluatingWriting.value = true
            _writingEvaluationError.value = null
            _writingEvaluation.value = null

            when (
                val outcome = GeminiTutorService.evaluateWriting(
                    userText = userText,
                    prompt = prompt,
                    targetLanguage = targetLanguageCode.value
                )
            ) {
                is AiOutcome.Success -> _writingEvaluation.value = outcome.value
                is AiOutcome.Failure -> _writingEvaluationError.value = outcome.reason
            }
            _isEvaluatingWriting.value = false
        }
    }

    private val _writingEvaluation = MutableStateFlow<WritingEvaluationResult?>(null)
    val writingEvaluation: StateFlow<WritingEvaluationResult?> = _writingEvaluation.asStateFlow()

    private val _isEvaluatingWriting = MutableStateFlow(false)
    val isEvaluatingWriting: StateFlow<Boolean> = _isEvaluatingWriting.asStateFlow()

    private val _writingEvaluationError = MutableStateFlow<AiFailure?>(null)
    val writingEvaluationError: StateFlow<AiFailure?> = _writingEvaluationError.asStateFlow()

    fun clearError() {
        _aiChatError.value = null
        _writingEvaluationError.value = null
    }
}
