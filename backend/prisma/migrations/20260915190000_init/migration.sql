-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "LanguageDirection" AS ENUM ('LTR', 'RTL');

-- CreateEnum
CREATE TYPE "LanguageStatus" AS ENUM ('active', 'beta', 'planned', 'archived');

-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('vocabulary', 'grammar', 'listening', 'reading', 'writing', 'speaking', 'conversation', 'quiz', 'flashcard');

-- CreateTable
CREATE TABLE "languages" (
    "id" UUID NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "native_name" VARCHAR(100) NOT NULL,
    "direction" "LanguageDirection" NOT NULL DEFAULT 'LTR',
    "status" "LanguageStatus" NOT NULL DEFAULT 'active',
    "flag_emoji" VARCHAR(10),
    "total_levels" INTEGER NOT NULL DEFAULT 6,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cefr_levels" (
    "id" UUID NOT NULL,
    "code" VARCHAR(2) NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "title" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cefr_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" UUID NOT NULL,
    "language_id" UUID NOT NULL,
    "level_id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" UUID NOT NULL,
    "language_id" UUID NOT NULL,
    "level_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(100),
    "xp_reward" INTEGER NOT NULL DEFAULT 20,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "cover_image_url" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "type" "ExerciseType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "target_text" TEXT NOT NULL DEFAULT '',
    "correct_answer" TEXT NOT NULL DEFAULT '',
    "options_json" JSONB NOT NULL DEFAULT '[]',
    "explanation" TEXT NOT NULL DEFAULT '',
    "phonetic_text" TEXT NOT NULL DEFAULT '',
    "audio_url" TEXT,
    "image_url" TEXT,
    "passage_text" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "xp_reward" INTEGER NOT NULL DEFAULT 10,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocabulary" (
    "id" UUID NOT NULL,
    "language_id" UUID NOT NULL,
    "word" VARCHAR(200) NOT NULL,
    "translation" VARCHAR(200) NOT NULL,
    "phonetic" VARCHAR(200) NOT NULL DEFAULT '',
    "category" VARCHAR(100) NOT NULL DEFAULT 'General',
    "example_sentence" TEXT,
    "example_translation" TEXT,
    "audio_url" TEXT,
    "difficulty" INTEGER NOT NULL DEFAULT 0,
    "next_review_at" TIMESTAMP(3),
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vocabulary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grammar_rules" (
    "id" UUID NOT NULL,
    "language_id" UUID NOT NULL,
    "level_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "summary" TEXT NOT NULL,
    "full_rule_text" TEXT NOT NULL,
    "example_sentence" TEXT,
    "example_translation" TEXT,
    "category" VARCHAR(100) NOT NULL DEFAULT 'Grammar',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grammar_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcards" (
    "id" UUID NOT NULL,
    "language_id" UUID NOT NULL,
    "front_word" VARCHAR(200) NOT NULL,
    "back_translation" VARCHAR(200) NOT NULL,
    "example_sentence" TEXT,
    "phonetic" VARCHAR(200) NOT NULL DEFAULT '',
    "interval_days" INTEGER NOT NULL DEFAULT 1,
    "ease_factor" DECIMAL(4,2) NOT NULL DEFAULT 2.50,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "next_review_at" TIMESTAMP(3),
    "is_mastered" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flashcards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "password_hash" VARCHAR(255) NOT NULL,
    "avatar_url" TEXT,
    "native_language_id" UUID,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "streak_count" INTEGER NOT NULL DEFAULT 0,
    "last_active_date" TIMESTAMP(3),
    "daily_goal_xp" INTEGER NOT NULL DEFAULT 50,
    "today_xp" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_languages" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "language_id" UUID NOT NULL,
    "target_level" VARCHAR(2) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_lesson_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER,
    "xp_earned" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "user_lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_exercise_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "user_answer" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMP(3),

    CONSTRAINT "user_exercise_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_vocabulary_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "vocabulary_id" UUID NOT NULL,
    "ease_factor" DECIMAL(4,2) NOT NULL DEFAULT 2.50,
    "interval_days" INTEGER NOT NULL DEFAULT 1,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "next_review_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_mastered" BOOLEAN NOT NULL DEFAULT false,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "wrong_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_vocabulary_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "icon_name" VARCHAR(100),
    "reward_xp" INTEGER NOT NULL DEFAULT 50,
    "condition_type" VARCHAR(50) NOT NULL,
    "condition_value" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "achievement_id" UUID NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progress" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "language_id" UUID NOT NULL,
    "sender" VARCHAR(10) NOT NULL,
    "text" TEXT NOT NULL,
    "correction" TEXT,
    "suggestion" TEXT,
    "grammar_explanation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "languages_code_key" ON "languages"("code");

-- CreateIndex
CREATE UNIQUE INDEX "cefr_levels_code_key" ON "cefr_levels"("code");

-- CreateIndex
CREATE UNIQUE INDEX "cefr_levels_sort_order_key" ON "cefr_levels"("sort_order");

-- CreateIndex
CREATE INDEX "units_language_id_level_id_idx" ON "units"("language_id", "level_id");

-- CreateIndex
CREATE UNIQUE INDEX "units_language_id_level_id_code_key" ON "units"("language_id", "level_id", "code");

-- CreateIndex
CREATE INDEX "lessons_unit_id_idx" ON "lessons"("unit_id");

-- CreateIndex
CREATE INDEX "lessons_language_id_level_id_idx" ON "lessons"("language_id", "level_id");

-- CreateIndex
CREATE INDEX "lessons_is_published_idx" ON "lessons"("is_published");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_unit_id_order_index_key" ON "lessons"("unit_id", "order_index");

-- CreateIndex
CREATE INDEX "exercises_lesson_id_idx" ON "exercises"("lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "exercises_lesson_id_sort_order_key" ON "exercises"("lesson_id", "sort_order");

-- CreateIndex
CREATE INDEX "vocabulary_language_id_idx" ON "vocabulary"("language_id");

-- CreateIndex
CREATE INDEX "vocabulary_language_id_category_idx" ON "vocabulary"("language_id", "category");

-- CreateIndex
CREATE INDEX "vocabulary_next_review_at_idx" ON "vocabulary"("next_review_at");

-- CreateIndex
CREATE UNIQUE INDEX "vocabulary_language_id_word_key" ON "vocabulary"("language_id", "word");

-- CreateIndex
CREATE INDEX "grammar_rules_language_id_level_id_idx" ON "grammar_rules"("language_id", "level_id");

-- CreateIndex
CREATE UNIQUE INDEX "grammar_rules_language_id_title_key" ON "grammar_rules"("language_id", "title");

-- CreateIndex
CREATE INDEX "flashcards_language_id_idx" ON "flashcards"("language_id");

-- CreateIndex
CREATE INDEX "flashcards_next_review_at_idx" ON "flashcards"("next_review_at");

-- CreateIndex
CREATE UNIQUE INDEX "flashcards_language_id_front_word_key" ON "flashcards"("language_id", "front_word");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "user_languages_user_id_idx" ON "user_languages"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_languages_user_id_language_id_key" ON "user_languages"("user_id", "language_id");

-- CreateIndex
CREATE INDEX "user_lesson_progress_user_id_idx" ON "user_lesson_progress"("user_id");

-- CreateIndex
CREATE INDEX "user_lesson_progress_lesson_id_idx" ON "user_lesson_progress"("lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_lesson_progress_user_id_lesson_id_key" ON "user_lesson_progress"("user_id", "lesson_id");

-- CreateIndex
CREATE INDEX "user_exercise_progress_user_id_idx" ON "user_exercise_progress"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_exercise_progress_user_id_exercise_id_key" ON "user_exercise_progress"("user_id", "exercise_id");

-- CreateIndex
CREATE INDEX "user_vocabulary_progress_user_id_idx" ON "user_vocabulary_progress"("user_id");

-- CreateIndex
CREATE INDEX "user_vocabulary_progress_next_review_at_idx" ON "user_vocabulary_progress"("next_review_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_vocabulary_progress_user_id_vocabulary_id_key" ON "user_vocabulary_progress"("user_id", "vocabulary_id");

-- CreateIndex
CREATE INDEX "user_achievements_user_id_idx" ON "user_achievements"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_user_id_achievement_id_key" ON "user_achievements"("user_id", "achievement_id");

-- CreateIndex
CREATE INDEX "chat_messages_user_id_language_id_created_at_idx" ON "chat_messages"("user_id", "language_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "cefr_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "cefr_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabulary" ADD CONSTRAINT "vocabulary_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grammar_rules" ADD CONSTRAINT "grammar_rules_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grammar_rules" ADD CONSTRAINT "grammar_rules_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "cefr_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_languages" ADD CONSTRAINT "user_languages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_languages" ADD CONSTRAINT "user_languages_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_lesson_progress" ADD CONSTRAINT "user_lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_lesson_progress" ADD CONSTRAINT "user_lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_exercise_progress" ADD CONSTRAINT "user_exercise_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_exercise_progress" ADD CONSTRAINT "user_exercise_progress_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_vocabulary_progress" ADD CONSTRAINT "user_vocabulary_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_vocabulary_progress" ADD CONSTRAINT "user_vocabulary_progress_vocabulary_id_fkey" FOREIGN KEY ("vocabulary_id") REFERENCES "vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

