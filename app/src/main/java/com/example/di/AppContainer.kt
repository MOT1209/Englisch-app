package com.example.di

import android.content.Context
import com.example.audio.TtsManager
import com.example.data.db.AppDatabase
import com.example.data.prefs.UserPreferencesRepository
import com.example.data.repository.LinguaVerseRepository

/**
 * Manual dependency container (constructor injection, no DI framework).
 *
 * A single instance is created in [com.example.LinguaVerseApplication] and shared
 * by every ViewModel. This moves dependency wiring out of the ViewModels so they
 * can be unit-tested with fakes and so a change to one dependency (e.g. swapping
 * a network data source in) never ripples through screen code. When the app grows
 * real accounts / analytics, add those services here too.
 */
class AppContainer(context: Context) {

    val db: AppDatabase by lazy { AppDatabase.getDatabase(context) }

    val repository: LinguaVerseRepository by lazy { LinguaVerseRepository(db.linguaVerseDao()) }

    val preferencesRepository: UserPreferencesRepository by lazy {
        UserPreferencesRepository(context)
    }

    val ttsManager: TtsManager by lazy { TtsManager(context) }
}