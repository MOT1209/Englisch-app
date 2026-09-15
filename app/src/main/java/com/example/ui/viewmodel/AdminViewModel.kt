package com.example.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.model.CefrLevel
import com.example.data.model.Exercise
import com.example.data.model.ExerciseType
import com.example.data.model.Language
import com.example.data.model.Lesson
import com.example.data.model.Vocabulary
import com.example.data.repository.LinguaVerseRepository
import kotlinx.coroutines.launch

/**
 * Owns the custom-content authoring actions exposed by the admin content studio:
 * adding new languages, custom lessons and vocabulary. Split out of the shared
 * [MainViewModel] so authoring logic stays isolated from the learner state.
 */
class AdminViewModel(
    private val repository: LinguaVerseRepository
) : ViewModel() {

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
                flagEmoji = flag,
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
        targetLanguageCode: String,
        currentLessonCount: Int
    ) {
        viewModelScope.launch {
            val langCode = targetLanguageCode
            val lessonId = "les_${langCode}_${System.currentTimeMillis()}"
            val lesson = Lesson(
                id = lessonId,
                languageCode = langCode,
                level = level,
                title = title,
                description = "Custom lesson created via Admin Panel",
                category = category,
                xpReward = xpReward,
                isCompleted = false,
                isLocked = false,
                orderIndex = (currentLessonCount + 1)
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
            val langCode = targetLanguageCode
            val vocab = Vocabulary(
                id = "v_${System.currentTimeMillis()}",
                languageCode = langCode,
                word = word,
                translation = translation,
                exampleSentence = example,
                exampleTranslation = "Example translation",
                category = category
            )
            repository.addCustomVocabulary(vocab)
        }
    }
}
