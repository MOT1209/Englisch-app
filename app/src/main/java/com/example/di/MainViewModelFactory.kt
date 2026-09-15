package com.example.di

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.example.ui.viewmodel.AdminViewModel
import com.example.ui.viewmodel.AiViewModel
import com.example.ui.viewmodel.LessonViewModel
import com.example.ui.viewmodel.MainViewModel

class MainViewModelFactory(
    private val container: AppContainer
) : ViewModelProvider.Factory {

    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        return when {
            modelClass.isAssignableFrom(MainViewModel::class.java) ->
                MainViewModel(container) as T
            modelClass.isAssignableFrom(LessonViewModel::class.java) ->
                LessonViewModel(container.repository, container.ttsManager) as T
            modelClass.isAssignableFrom(AiViewModel::class.java) ->
                AiViewModel(container.repository) as T
            modelClass.isAssignableFrom(AdminViewModel::class.java) ->
                AdminViewModel(container.repository) as T
            else -> throw IllegalArgumentException("Unknown ViewModel class: ${modelClass.name}")
        }
    }
}
