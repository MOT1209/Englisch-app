package com.example.data.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.example.data.model.*

@Database(
    entities = [
        Language::class,
        UserProfile::class,
        Lesson::class,
        Exercise::class,
        Vocabulary::class,
        GrammarRule::class,
        Flashcard::class,
        Achievement::class,
        ChatMessage::class
    ],
    version = 3,
    exportSchema = true
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun linguaVerseDao(): LinguaVerseDao

    companion object {
        /**
         * v1 -> v2: adds the indices that every list query in the app filters on.
         * Index names must match exactly what Room derives from the @Index
         * annotations, otherwise the schema validation on open will fail.
         */
        /**
         * v2 -> v3: flashcard SRS columns (SM-2 scheduling) added to the
         * flashcards table with defaults equal to the Kotlin defaults, plus the
         * index the due-card query filters on. Column types must match what Room
         * derives from the entity, otherwise schema validation on open fails.
         */
        val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE `flashcards` ADD COLUMN `easeFactor` REAL NOT NULL DEFAULT 2.5")
                db.execSQL("ALTER TABLE `flashcards` ADD COLUMN `repetitions` INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE `flashcards` ADD COLUMN `nextReviewAt` INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE `flashcards` ADD COLUMN `lastReviewAt` INTEGER NOT NULL DEFAULT 0")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_flashcards_nextReviewAt` ON `flashcards` (`nextReviewAt`)")
            }
        }

        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_lessons_languageCode` ON `lessons` (`languageCode`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_lessons_languageCode_orderIndex` ON `lessons` (`languageCode`, `orderIndex`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_exercises_lessonId` ON `exercises` (`lessonId`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_vocabularies_languageCode` ON `vocabularies` (`languageCode`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_vocabularies_languageCode_isFavorite` ON `vocabularies` (`languageCode`, `isFavorite`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_grammar_rules_languageCode` ON `grammar_rules` (`languageCode`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_flashcards_languageCode` ON `flashcards` (`languageCode`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_chat_messages_timestamp` ON `chat_messages` (`timestamp`)")
            }
        }

        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "linguaverse_database"
                )
                    // No fallbackToDestructiveMigration: it silently wiped every
                    // user's progress on any schema change. Schema changes must
                    // ship a Migration here instead.
                    .addMigrations(MIGRATION_1_2, MIGRATION_2_3)
                    .build()
                    .also { INSTANCE = it }
            }
        }
    }
}
