package com.example.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.audio.TtsManager
import com.example.data.model.Exercise
import com.example.data.model.Lesson
import com.example.data.repository.LinguaVerseRepository
import com.example.domain.AnswerGrader
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Owns the execution of a single lesson: loading exercises, tracking the current
 * exercise and completion, grading answers and completing the lesson for XP.
 * Split out of the shared [MainViewModel] so lesson-flow state is scoped to the
 * lesson screen only.
 */
class LessonViewModel(
    private val repository: LinguaVerseRepository,
    private val ttsManager: TtsManager
) : ViewModel() {

    private val _activeLesson = MutableStateFlow<Lesson?>(null)
    val activeLesson: StateFlow<Lesson?> = _activeLesson.asStateFlow()

    private val _activeExercises = MutableStateFlow<List<Exercise>>(emptyList())
    val activeExercises: StateFlow<List<Exercise>> = _activeExercises.asStateFlow()

    private val _currentExerciseIndex = MutableStateFlow(0)
    val currentExerciseIndex: StateFlow<Int> = _currentExerciseIndex.asStateFlow()

    private val _lessonCompleted = MutableStateFlow(false)
    val lessonCompleted: StateFlow<Boolean> = _lessonCompleted.asStateFlow()

    /**
     * Loads a lesson by id, for navigation routes that carry only the id.
     * No-ops if the lesson is already loaded, so returning to the screen after a
     * configuration change does not reset the learner's position.
     */
    fun startLessonById(lessonId: String) {
        if (_activeLesson.value?.id == lessonId) return
        viewModelScope.launch {
            val lesson = repository.getLessonById(lessonId) ?: return@launch
            startLesson(lesson)
        }
    }

    fun startLesson(lesson: Lesson) {
        viewModelScope.launch {
            _activeLesson.value = lesson
            val exercises = repository.getExercisesForLesson(lesson.id)
            _activeExercises.value = exercises
            _currentExerciseIndex.value = 0
            _lessonCompleted.value = false
        }
    }

    fun submitExerciseAnswer(userAnswer: String): Boolean {
        val exercise = _activeExercises.value.getOrNull(_currentExerciseIndex.value) ?: return false
        return AnswerGrader.isCorrect(exercise, userAnswer)
    }

    /** Leaves lesson mode and returns to the tab that was showing before. */
    fun closeLesson() {
        _activeLesson.value = null
        _activeExercises.value = emptyList()
        _currentExerciseIndex.value = 0
        _lessonCompleted.value = false
    }

    fun nextExercise() {
        val exercises = _activeExercises.value
        val currentIndex = _currentExerciseIndex.value
        if (currentIndex < exercises.size - 1) {
            _currentExerciseIndex.value = currentIndex + 1
        } else {
            // Lesson completed!
            _lessonCompleted.value = true
            val lesson = _activeLesson.value
            if (lesson != null) {
                viewModelScope.launch {
                    repository.completeLesson(lesson.id, lesson.xpReward)
                }
            }
        }
    }

    fun speakText(text: String, targetLanguageCode: String, audioSpeed: Float) {
        ttsManager.speak(text, targetLanguageCode, audioSpeed)
    }

    override fun onCleared() {
        super.onCleared()
        ttsManager.shutdown()
    }
}
