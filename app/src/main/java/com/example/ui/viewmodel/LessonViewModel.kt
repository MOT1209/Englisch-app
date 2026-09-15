package com.example.ui.viewmodel

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.model.Exercise
import com.example.data.model.Lesson
import com.example.data.model.UserProfile
import com.example.data.repository.LinguaVerseRepositoryInterface
import com.example.domain.AnswerGrader
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
 * ViewModel for LessonScreen — manages active lesson state, exercise progression,
 * and answer submission. Uses SavedStateHandle to restore state across process death.
 */
@HiltViewModel
class LessonViewModel @Inject constructor(
    private val repository: LinguaVerseRepositoryInterface,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    // Restore lessonId from navigation args — survives process death
    private val lessonId: String = savedStateHandle.get<String>("lessonId") ?: ""

    // User profile — needed for XP calculation
    val userProfile: StateFlow<UserProfile?> = repository.userProfile
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = null
        )

    // Active lesson state
    private val _activeLesson = MutableStateFlow<Lesson?>(null)
    val activeLesson: StateFlow<Lesson?> = _activeLesson.asStateFlow()

    private val _activeExercises = MutableStateFlow<List<Exercise>>(emptyList())
    val activeExercises: StateFlow<List<Exercise>> = _activeExercises.asStateFlow()

    private val _currentExerciseIndex = MutableStateFlow(
        savedStateHandle.get<Int>("exerciseIndex") ?: 0
    )
    val currentExerciseIndex: StateFlow<Int> = _currentExerciseIndex.asStateFlow()

    private val _lessonCompleted = MutableStateFlow(false)
    val lessonCompleted: StateFlow<Boolean> = _lessonCompleted.asStateFlow()

    init {
        // Only start the lesson if we haven't already completed it
        if (!_lessonCompleted.value && lessonId.isNotBlank()) {
            startLesson(lessonId)
        }
    }

    private fun startLesson(id: String) {
        viewModelScope.launch {
            val lesson = repository.getLessonById(id) ?: return@launch
            val exercises = repository.getExercisesForLesson(id)

            _activeLesson.value = lesson
            _activeExercises.value = exercises
            _currentExerciseIndex.value = 0
            _lessonCompleted.value = false
        }
    }

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
            _lessonCompleted.value = true
            val lesson = _activeLesson.value
            if (lesson != null) {
                viewModelScope.launch {
                    repository.completeLesson(lesson.id, lesson.xpReward)
                }
            }
        }
    }

    fun submitExerciseAnswer(userAnswer: String): Boolean {
        val exercise = _activeExercises.value.getOrNull(_currentExerciseIndex.value) ?: return false
        return AnswerGrader.isCorrect(exercise, userAnswer)
    }
}
