package com.example.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.model.Flashcard
import com.example.data.model.GrammarRule
import com.example.data.model.Vocabulary
import com.example.data.repository.LinguaVerseRepositoryInterface
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for SkillDetailScreen.
 * Provides vocabularies, grammar rules, and flashcards for the currently
 * selected target language.
 */
@HiltViewModel
class SkillsViewModel @Inject constructor(
    repository: LinguaVerseRepositoryInterface
) : ViewModel() {

    private val _targetLanguageCode = MutableStateFlow(
        repository.userProfile.value?.targetLanguageCode ?: "es"
    )
    val targetLanguageCode: StateFlow<String> = _targetLanguageCode.asStateFlow()

    val vocabularies: StateFlow<List<Vocabulary>> = targetLanguageCode
        .flatMapLatest { langCode -> repository.getVocabularies(langCode) }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    val grammarRules: StateFlow<List<GrammarRule>> = targetLanguageCode
        .flatMapLatest { langCode -> repository.getGrammarRules(langCode) }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    val flashcards: StateFlow<List<Flashcard>> = targetLanguageCode
        .flatMapLatest { langCode -> repository.getFlashcards(langCode) }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    fun toggleFavoriteVocab(vocab: Vocabulary) {
        viewModelScope.launch {
            repository.toggleFavoriteVocab(vocab)
        }
    }
}
