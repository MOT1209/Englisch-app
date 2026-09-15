package com.example.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.model.Achievement
import com.example.data.model.Language
import com.example.data.model.Lesson
import com.example.data.model.UserProfile
import com.example.data.repository.LinguaVerseRepositoryInterface
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for HomeScreen.
 * Provides user profile, languages, lessons, and achievements for the dashboard.
 */
@HiltViewModel
class HomeViewModel @Inject constructor(
    private val repository: LinguaVerseRepositoryInterface
) : ViewModel() {

    val userProfile: StateFlow<UserProfile> = repository.userProfile
        .map { it ?: UserProfile() }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = UserProfile()
        )

    val languages: StateFlow<List<Language>> = repository.allLanguages
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    val currentLessons: StateFlow<List<Lesson>> = userProfile
        .flatMapLatest { profile -> repository.getLessonsByLanguage(profile.targetLanguageCode) }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    val achievements: StateFlow<List<Achievement>> = repository.achievements
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    val targetLanguageCode: StateFlow<String> = userProfile
        .map { it.targetLanguageCode }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = "es"
        )

    fun setTargetLanguage(langCode: String) {
        viewModelScope.launch {
            repository.updateTargetLanguage(langCode)
        }
    }
}
