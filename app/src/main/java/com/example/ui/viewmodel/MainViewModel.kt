package com.example.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.di.AppContainer
import com.example.data.prefs.UserPreferences
import com.example.data.model.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

/**
 * Shared view model for the dashboard: exposes the learner's data (profile,
 * languages, lessons, vocabulary, grammar, flashcards, achievements) plus the
 * preferences-backed settings (audio speed, theme). Screen-specific concerns live
 * in their own view models ([LessonViewModel], [AiViewModel], [AdminViewModel]).
 */
class MainViewModel(container: AppContainer) : ViewModel() {

    val repository = container.repository
    private val preferencesRepository = container.preferencesRepository
    val ttsManager = container.ttsManager

    private val preferences: StateFlow<UserPreferences> = preferencesRepository.preferences
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = UserPreferences()
        )

    // User Profile State
    val userProfile: StateFlow<UserProfile> = repository.userProfile
        .filterNotNull()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = UserProfile()
        )

    // Languages State
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

    // Lessons for current target language
    val currentLessons: StateFlow<List<Lesson>> = targetLanguageCode
        .flatMapLatest { langCode -> repository.getLessonsByLanguage(langCode) }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    // Vocabulary for current target language
    val vocabularies: StateFlow<List<Vocabulary>> = targetLanguageCode
        .flatMapLatest { langCode -> repository.getVocabularies(langCode) }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    // Grammar Rules
    val grammarRules: StateFlow<List<GrammarRule>> = targetLanguageCode
        .flatMapLatest { langCode -> repository.getGrammarRules(langCode) }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    // Flashcards
    val flashcards: StateFlow<List<Flashcard>> = targetLanguageCode
        .flatMapLatest { langCode -> repository.getFlashcards(langCode) }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    // Achievements
    val achievements: StateFlow<List<Achievement>> = repository.achievements
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    // Audio speed and theme are read from persisted preferences, so they survive
    // process death and app restarts.
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

    fun toggleFavoriteVocabulary(vocabulary: Vocabulary) {
        viewModelScope.launch {
            repository.toggleFavoriteVocab(vocabulary)
        }
    }

    override fun onCleared() {
        super.onCleared()
        ttsManager.shutdown()
    }
}
