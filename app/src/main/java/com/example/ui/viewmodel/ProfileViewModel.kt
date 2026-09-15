package com.example.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.audio.TtsManager
import com.example.data.model.Achievement
import com.example.data.model.Language
import com.example.data.model.UserProfile
import com.example.data.repository.LinguaVerseRepositoryInterface
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

/**
 * ViewModel for ProfileScreen.
 * Provides user profile data, achievements, languages, and XP/speaking stats.
 */
@HiltViewModel
class ProfileViewModel @Inject constructor(
    repository: LinguaVerseRepositoryInterface
) : ViewModel() {

    val userProfile: StateFlow<UserProfile?> = repository.userProfile
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = null
        )

    val achievements: StateFlow<List<Achievement>> = repository.achievements
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    val languages: StateFlow<List<Language>> = repository.allLanguages
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )
}
