package com.example.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.audio.TtsManager
import com.example.data.prefs.UserPreferences
import com.example.data.prefs.UserPreferencesRepository
import com.example.data.model.Achievement
import com.example.data.model.ChatMessage
import com.example.data.model.Language
import com.example.data.model.UserProfile
import com.example.data.repository.LinguaVerseRepositoryInterface
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Shared ViewModel for app-wide concerns:
 * - User preferences (dark theme, audio speed)
 * - Text-to-speech
 * - Target language selection
 *
 * Screen-specific ViewModels (HomeViewModel, LessonViewModel, AiChatViewModel, etc.)
 * handle their own domain state via Hilt injection.
 */
@HiltViewModel
class MainViewModel @Inject constructor(
    private val repository: LinguaVerseRepositoryInterface,
    private val preferencesRepository: UserPreferencesRepository,
    private val ttsManager: TtsManager
) : ViewModel() {

    private val preferences: StateFlow<UserPreferences> = preferencesRepository.preferences
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = UserPreferences()
        )

    // User Profile State — shared across multiple screens
    val userProfile: StateFlow<UserProfile> = repository.userProfile
        .map { it ?: UserProfile() }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = UserProfile()
        )

    // Languages State — shared (used by Settings, Home)
    val languages: StateFlow<List<Language>> = repository.allLanguages
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    // Current Target Language
    val targetLanguageCode: StateFlow<String> = userProfile
        .map { it.targetLanguageCode }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = "es"
        )

    // Audio speed and theme are read from persisted preferences
    val audioSpeed: StateFlow<Float> = preferences
        .map { it.audioSpeed }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = UserPreferences.DEFAULT_AUDIO_SPEED
        )

    val isDarkTheme: StateFlow<Boolean> = preferences
        .map { it.isDarkTheme }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = false
        )

    init {
        viewModelScope.launch {
            repository.initializeSeedData()
        }
    }

    fun setTargetLanguage(langCode: String) {
        viewModelScope.launch {
            repository.updateTargetLanguage(langCode)
        }
    }

    fun speakText(text: String) {
        ttsManager.speak(text, targetLanguageCode.value, audioSpeed.value)
    }

    fun setAudioSpeed(speed: Float) {
        viewModelScope.launch { preferencesRepository.setAudioSpeed(speed) }
    }

    fun toggleDarkTheme() {
        viewModelScope.launch { preferencesRepository.setDarkTheme(!isDarkTheme.value) }
    }

    // --- Shared state consumed by multiple screens ---

    val achievements: StateFlow<List<Achievement>> = repository.achievements
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    val chatMessages: StateFlow<List<ChatMessage>> = repository.chatMessages
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    override fun onCleared() {
        super.onCleared()
        ttsManager.shutdown()
    }
}
