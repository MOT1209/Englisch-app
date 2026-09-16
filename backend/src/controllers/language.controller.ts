import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';

export async function getAllLanguages(_req: Request, res: Response): Promise<void> {
  const languages = await prisma.language.findMany({
    where: { status: 'active' },
    orderBy: { name: 'asc' },
  });

  res.json({ success: true, data: languages });
}

export async function getLanguageByCode(req: Request, res: Response): Promise<void> {
  const code = String(req.params.code);
  const language = await prisma.language.findUnique({
    where: { code },
    include: {
      units: {
        include: {
          level: true,
          lessons: {
            where: { isPublished: true },
            orderBy: { orderIndex: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!language) {
    throw new NotFoundError('Language');
  }

  res.json({ success: true, data: language });
}

export async function createLanguage(req: Request, res: Response): Promise<void> {
  const language = await prisma.language.create({ data: req.body });

  res.status(201).json({ success: true, data: language });
}

export async function updateLanguage(req: Request, res: Response): Promise<void> {
  const code = String(req.params.code);
  const language = await prisma.language.update({
    where: { code },
    data: req.body,
  });

  res.json({ success: true, data: language });
}

export async function deleteLanguage(req: Request, res: Response): Promise<void> {
  const code = String(req.params.code);
  await prisma.language.delete({ where: { code } });

  res.json({ success: true, message: 'Language deleted' });
}

// ============================================================
// Remote content endpoints. These serve the Android app's catalog DTOs
// (SupabaseContentApi.kt): prepare your results with `code`|`name` columns in
// mind, so the app receives `language_code`/`native_name`/etc. without seeing
// relational ids or internal columns. Values the schema does not store but the
// app needs (e.g. `is_default`, `description`, per-user progress) are derived
// deterministically or left to the app's defaults.
// ============================================================

export async function getRemoteLanguages(_req: Request, res: Response): Promise<void> {
  const languages = await prisma.language.findMany({
    where: { status: 'active' },
    orderBy: { name: 'asc' },
    include: { _count: { select: { lessons: true } } },
  });

  const remoteLanguages = languages.map((lang) => ({
    code: lang.code,
    name: lang.name,
    native_name: lang.nativeName,
    flag_emoji: lang.flagEmoji ?? '',
    is_default: lang.code === 'en',
    total_lessons_count: lang._count.lessons,
    description: '',
  }));

  res.json({ success: true, data: remoteLanguages });
}

export async function getRemoteLessons(_req: Request, res: Response): Promise<void> {
  const lessons = await prisma.lesson.findMany({
    where: { isPublished: true },
    include: { language: true, level: true },
    orderBy: { orderIndex: 'asc' },
  });

  const remoteLessons = lessons.map((lesson) => ({
    id: lesson.id,
    language_code: lesson.language.code,
    level: lesson.level.code,
    title: lesson.title,
    description: lesson.description ?? '',
    category: lesson.category ?? '',
    xp_reward: lesson.xpReward,
    is_locked: false,
    order_index: lesson.orderIndex,
  }));

  res.json({ success: true, data: remoteLessons });
}

export async function getRemoteExercises(_req: Request, res: Response): Promise<void> {
  const exercises = await prisma.exercise.findMany({
    where: { isPublished: true },
    orderBy: { sortOrder: 'asc' },
  });

  const remoteExercises = exercises.map((ex) => ({
    id: ex.id,
    lesson_id: ex.lessonId,
    type: ex.type,
    prompt: ex.prompt,
    target_text: ex.targetText,
    translation: '',
    options_json:
      ex.optionsJson == null || ex.optionsJson === ''
        ? '[]'
        : typeof ex.optionsJson === 'string'
          ? ex.optionsJson
          : JSON.stringify(ex.optionsJson),
    correct_answer: ex.correctAnswer,
    audio_url: ex.audioUrl ?? '',
    phonetic_text: ex.phoneticText,
    explanation: ex.explanation,
    passage_text: ex.passageText ?? '',
    image_res_name: ex.imageUrl ?? '',
  }));

  res.json({ success: true, data: remoteExercises });
}

export async function getRemoteVocabularies(_req: Request, res: Response): Promise<void> {
  const vocabularies = await prisma.vocabulary.findMany({
    include: { language: true },
    orderBy: { word: 'asc' },
  });

  const remoteVocabularies = vocabularies.map((vocab) => ({
    id: vocab.id,
    language_code: vocab.language.code,
    word: vocab.word,
    translation: vocab.translation,
    example_sentence: vocab.exampleSentence ?? '',
    example_translation: vocab.exampleTranslation ?? '',
    phonetic: vocab.phonetic,
    category: vocab.category,
  }));

  res.json({ success: true, data: remoteVocabularies });
}

export async function getRemoteGrammarRules(_req: Request, res: Response): Promise<void> {
  const rules = await prisma.grammarRule.findMany({
    include: { language: true, level: true },
    orderBy: { title: 'asc' },
  });

  const remoteGrammarRules = rules.map((rule) => ({
    id: rule.id,
    language_code: rule.language.code,
    level: rule.level.code,
    title: rule.title,
    summary: rule.summary,
    full_rule_text: rule.fullRuleText,
    example_sentence: rule.exampleSentence ?? '',
    example_translation: rule.exampleTranslation ?? '',
  }));

  res.json({ success: true, data: remoteGrammarRules });
}

export async function getRemoteFlashcards(_req: Request, res: Response): Promise<void> {
  const flashcards = await prisma.flashcard.findMany({
    where: { isMastered: false },
    include: { language: true },
    orderBy: { id: 'asc' },
  });

  const remoteFlashcards = flashcards.map((fc) => ({
    id: fc.id,
    language_code: fc.language.code,
    front_word: fc.frontWord,
    back_translation: fc.backTranslation,
    example_sentence: fc.exampleSentence ?? '',
    phonetic: fc.phonetic,
    interval_days: fc.intervalDays,
  }));

  res.json({ success: true, data: remoteFlashcards });
}

export async function getRemoteAchievements(_req: Request, res: Response): Promise<void> {
  const achievements = await prisma.achievement.findMany({
    orderBy: { conditionValue: 'asc' },
  });

  const remoteAchievements = achievements.map((ach) => ({
    id: ach.id,
    title: ach.title,
    description: ach.description,
    icon_name: ach.iconName ?? '',
    max_progress: ach.conditionValue,
    reward_xp: ach.rewardXp,
  }));

  res.json({ success: true, data: remoteAchievements });
}

export async function getRemoteLessonsByLanguage(
  req: Request,
  res: Response
): Promise<void> {
  const langCode = String(req.params.langCode);
  const language = await prisma.language.findUnique({ where: { code: langCode } });
  if (!language) throw new NotFoundError('Language');

  const lessons = await prisma.lesson.findMany({
    where: { languageId: language.id, isPublished: true },
    include: { language: true, level: true },
    orderBy: { orderIndex: 'asc' },
  });

  const remoteLessons = lessons.map((lesson) => ({
    id: lesson.id,
    language_code: lesson.language.code,
    level: lesson.level.code,
    title: lesson.title,
    description: lesson.description ?? '',
    category: lesson.category ?? '',
    xp_reward: lesson.xpReward,
    is_locked: false,
    order_index: lesson.orderIndex,
  }));

  res.json({ success: true, data: remoteLessons });
}

export async function getRemoteExercisesByLesson(
  req: Request,
  res: Response
): Promise<void> {
  const lessonId = String(req.params.lessonId);
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) throw new NotFoundError('Lesson');

  const exercises = await prisma.exercise.findMany({
    where: { lessonId, isPublished: true },
    orderBy: { sortOrder: 'asc' },
  });

  const remoteExercises = exercises.map((ex) => ({
    id: ex.id,
    lesson_id: ex.lessonId,
    type: ex.type,
    prompt: ex.prompt,
    target_text: ex.targetText,
    translation: '',
    options_json:
      ex.optionsJson == null || ex.optionsJson === ''
        ? '[]'
        : typeof ex.optionsJson === 'string'
          ? ex.optionsJson
          : JSON.stringify(ex.optionsJson),
    correct_answer: ex.correctAnswer,
    audio_url: ex.audioUrl ?? '',
    phonetic_text: ex.phoneticText,
    explanation: ex.explanation,
    passage_text: ex.passageText ?? '',
    image_res_name: ex.imageUrl ?? '',
  }));

  res.json({ success: true, data: remoteExercises });
}

export async function getRemoteVocabulariesByLanguage(
  req: Request,
  res: Response
): Promise<void> {
  const langCode = String(req.params.langCode);
  const language = await prisma.language.findUnique({ where: { code: langCode } });
  if (!language) throw new NotFoundError('Language');

  const vocabularies = await prisma.vocabulary.findMany({
    where: { languageId: language.id },
    include: { language: true },
    orderBy: { word: 'asc' },
  });

  const remoteVocabularies = vocabularies.map((vocab) => ({
    id: vocab.id,
    language_code: vocab.language.code,
    word: vocab.word,
    translation: vocab.translation,
    example_sentence: vocab.exampleSentence ?? '',
    example_translation: vocab.exampleTranslation ?? '',
    phonetic: vocab.phonetic,
    category: vocab.category,
  }));

  res.json({ success: true, data: remoteVocabularies });
}

export async function getRemoteGrammarRulesByLanguage(
  req: Request,
  res: Response
): Promise<void> {
  const langCode = String(req.params.langCode);
  const language = await prisma.language.findUnique({ where: { code: langCode } });
  if (!language) throw new NotFoundError('Language');

  const rules = await prisma.grammarRule.findMany({
    where: { languageId: language.id },
    include: { language: true, level: true },
    orderBy: { title: 'asc' },
  });

  const remoteGrammarRules = rules.map((rule) => ({
    id: rule.id,
    language_code: rule.language.code,
    level: rule.level.code,
    title: rule.title,
    summary: rule.summary,
    full_rule_text: rule.fullRuleText,
    example_sentence: rule.exampleSentence ?? '',
    example_translation: rule.exampleTranslation ?? '',
  }));

  res.json({ success: true, data: remoteGrammarRules });
}

export async function getRemoteFlashcardsByLanguage(
  req: Request,
  res: Response
): Promise<void> {
  const langCode = String(req.params.langCode);
  const language = await prisma.language.findUnique({ where: { code: langCode } });
  if (!language) throw new NotFoundError('Language');

  const flashcards = await prisma.flashcard.findMany({
    where: { languageId: language.id },
    include: { language: true },
    orderBy: { id: 'asc' },
  });

  const remoteFlashcards = flashcards.map((fc) => ({
    id: fc.id,
    language_code: fc.language.code,
    front_word: fc.frontWord,
    back_translation: fc.backTranslation,
    example_sentence: fc.exampleSentence ?? '',
    phonetic: fc.phonetic,
    interval_days: fc.intervalDays,
  }));

  res.json({ success: true, data: remoteFlashcards });
}

export async function getRemoteAchievementsByLanguage(
  _req: Request,
  res: Response
): Promise<void> {
  const achievements = await prisma.achievement.findMany({
    orderBy: { conditionValue: 'asc' },
  });

  const remoteAchievements = achievements.map((ach) => ({
    id: ach.id,
    title: ach.title,
    description: ach.description,
    icon_name: ach.iconName ?? '',
    max_progress: ach.conditionValue,
    reward_xp: ach.rewardXp,
  }));

  res.json({ success: true, data: remoteAchievements });
}

export async function getLanguageLevels(req: Request, res: Response): Promise<void> {
  const code = String(req.params.code);
  const language = await prisma.language.findUnique({
    where: { code },
    include: {
      units: {
        select: { levelId: true },
        distinct: ['levelId'],
      },
    },
  });

  if (!language) {
    throw new NotFoundError('Language');
  }

  const levelIds = language.units.map((u) => u.levelId);

  const levels = await prisma.cefrLevel.findMany({
    where: { id: { in: levelIds } },
    orderBy: { sortOrder: 'asc' },
  });

  res.json({ success: true, data: levels });
}