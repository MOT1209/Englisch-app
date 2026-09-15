package com.example.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.model.CefrLevel
import com.example.data.model.Exercise
import com.example.data.model.ExerciseType
import com.example.data.model.GrammarRule
import com.example.data.model.Language
import com.example.data.model.Lesson
import com.example.data.model.Vocabulary
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
 * ViewModel for AdminPanelScreen.
 * Provides CRUD operations for languages, lessons, and vocabulary.
 * Only accessible in debug builds.
 */
@HiltViewModel
class AdminViewModel @Inject constructor(
    private val repository: LinguaVerseRepositoryInterface
) : ViewModel() {

    val targetLanguageCode: StateFlow<String> = repository.userProfile
        .map { it?.targetLanguageCode ?: "es" }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = "es"
        )

    fun addNewLanguage(
        code: String,
        name: String,
        nativeName: String,
        flag: String,
        description: String
    ) {
        viewModelScope.launch {
            val lang = Language(
                code = code,
                name = name,
                nativeName = nativeName,
                flagEmoji = flag.ifEmpty { "🌐" },
                isDefault = false,
                totalLessonsCount = 10,
                description = description
            )
            repository.addCustomLanguage(lang)
        }
    }

    fun addNewLesson(
        title: String,
        category: String,
        level: CefrLevel,
        xpReward: Int,
        promptText: String,
        answerText: String,
        targetLanguageCode: String
    ) {
        viewModelScope.launch {
            val lessonId = "les_${targetLanguageCode}_${System.currentTimeMillis()}"
            val lesson = Lesson(
                id = lessonId,
                languageCode = targetLanguageCode,
                level = level,
                title = title,
                description = "Custom lesson created via Admin Panel",
                category = category,
                xpReward = xpReward,
                isCompleted = false,
                isLocked = false,
                orderIndex = 999
            )

            val exercise = Exercise(
                id = "ex_${lessonId}_1",
                lessonId = lessonId,
                type = ExerciseType.VOCABULARY,
                prompt = promptText,
                targetText = answerText,
                correctAnswer = answerText,
                explanation = "Custom exercise created by administrator."
            )

            repository.addCustomLesson(lesson, listOf(exercise))
        }
    }

    fun addNewVocabulary(
        word: String,
        translation: String,
        example: String,
        category: String,
        targetLanguageCode: String
    ) {
        viewModelScope.launch {
            val vocab = Vocabulary(
                id = "v_${System.currentTimeMillis()}",
                languageCode = targetLanguageCode,
                word = word,
                translation = translation,
                exampleSentence = example,
                exampleTranslation = "Example translation",
                category = category
            )
            repository.addCustomVocabulary(vocab)
        }
    }

    fun addNewGrammarRule(
        title: String,
        summary: String,
        fullRuleText: String,
        exampleSentence: String,
        exampleTranslation: String,
        level: CefrLevel,
        targetLanguageCode: String
    ) {
        viewModelScope.launch {
            repository.addCustomGrammarRule(
                GrammarRule(
                    id = "g_${System.currentTimeMillis()}",
                    languageCode = targetLanguageCode,
                    level = level,
                    title = title,
                    summary = summary,
                    fullRuleText = fullRuleText,
                    exampleSentence = exampleSentence,
                    exampleTranslation = exampleTranslation
                )
            )
        }
    }
}
