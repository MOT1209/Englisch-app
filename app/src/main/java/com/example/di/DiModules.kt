package com.example.di

import android.content.Context
import androidx.annotation.ApplicationContext
import com.example.audio.TtsManager
import com.example.data.db.AppDatabase
import com.example.data.db.LinguaVerseDao
import com.example.data.prefs.UserPreferencesRepository
import com.example.data.repository.LinguaVerseRepository
import com.example.data.repository.LinguaVerseRepositoryInterface
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Provides application-wide dependencies: database, DAO, repository, TTS manager.
 * Using Hilt's @Singleton ensures single instances across the app lifecycle.
 */
@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindRepository(
        repository: LinguaVerseRepository
    ): LinguaVerseRepositoryInterface
}

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideAppDatabase(@ApplicationContext context: Context): AppDatabase {
        return AppDatabase.getDatabase(context)
    }

    @Provides
    fun provideDao(db: AppDatabase): LinguaVerseDao {
        return db.linguaVerseDao()
    }

    @Provides
    @Singleton
    fun provideLinguaVerseRepository(dao: LinguaVerseDao): LinguaVerseRepository {
        return LinguaVerseRepository(dao)
    }
}

@Module
@InstallIn(SingletonComponent::class)
object TtsModule {

    @Provides
    @Singleton
    fun provideTtsManager(@ApplicationContext context: Context): TtsManager {
        return TtsManager(context)
    }
}

@Module
@InstallIn(SingletonComponent::class)
object PreferencesModule {

    @Provides
    @Singleton
    fun provideUserPreferencesRepository(@ApplicationContext context: Context): UserPreferencesRepository {
        return UserPreferencesRepository(context)
    }
}
