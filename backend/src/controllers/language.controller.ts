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

export async function getRemoteLanguages(_req: Request, res: Response): Promise<void> {
  const languages = await prisma.language.findMany({
    where: { status: 'active' },
    orderBy: { name: 'asc' },
  });

  const remoteLanguages = languages.map((lang) => ({
    code: lang.code,
    name: lang.name,
    nativeName: lang.nativeName,
    flagEmoji: lang.flagEmoji,
    isDefault: lang.isDefault,
    totalLessonsCount: lang.totalLessonsCount,
    description: lang.description,
  }));

  res.json({ success: true, data: remoteLanguages });
}

export async function getRemoteLessons(_req: Request, res: Response): Promise<void> {
  const lessons = await prisma.lesson.findMany({
    where: { isPublished: true },
    include: {
      exercises: true,
      grammarRules: true,
    },
    orderBy: { orderIndex: 'asc' },
  });

  const remoteLessons = lessons.map((lesson) => ({
    id: lesson.id,
    languageCode: lesson.languageCode,
    level: lesson.level.code,
    title: lesson.title,
    description: lesson.description,
    category: lesson.category,
    xpReward: lesson.xpReward,
    isCompleted: lesson.isCompleted,
    isLocked: lesson.isLocked,
    orderIndex: lesson.orderIndex,
  }));

  res.json({ success: true, data: remoteLessons });
}

export async function getRemoteExercises(_req: Request, res: Response): Promise<void> {
  const exercises = await prisma.exercise.findMany({
    where: { isPublished: true },
    include: {
      lesson: true,
    },
    orderBy: { orderIndex: 'asc' },
  });

  const remoteExercises = exercises.map((ex) => ({
    id: ex.id,
    lessonId: ex.lessonId,
    type: ex.type,
    prompt: ex.prompt,
    targetText: ex.targetText,
    translation: ex.translation,
    optionsJson: ex.optionsJson,
    correctAnswer: ex.correctAnswer,
    audioUrl: ex.audioUrl,
    phoneticText: ex.phoneticText,
    explanation: ex.explanation,
    passageText: ex.passageText,
    imageResName: ex.imageResName,
  }));

  res.json({ success: true, data: remoteExercises });
}

export async function getRemoteVocabularies(_req: Request, res: Response): Promise<void> {
  const vocabularies = await prisma.vocabulary.findMany({
    where: { isFavorite: false },
    orderBy: { word: 'asc' },
  });

  const remoteVocabularies = vocabularies.map((vocab) => ({
    id: vocab.id,
    languageCode: vocab.languageCode,
    word: vocab.word,
    translation: vocab.translation,
    exampleSentence: vocab.exampleSentence,
    exampleTranslation: vocab.exampleTranslation,
    phonetic: vocab.phonetic,
    category: vocab.category,
    isFavorite: vocab.isFavorite,
    needsReview: vocab.needsReview,
  }));

  res.json({ success: true, data: remoteVocabularies });
}

export async function getRemoteGrammarRules(_req: Request, res: Response): Promise<void> {
  const rules = await prisma.grammarRule.findMany({
    where: { isPublished: true },
    orderBy: { title: 'asc' },
  });

  const remoteGrammarRules = rules.map((rule) => ({
    id: rule.id,
    languageCode: rule.languageCode,
    level: rule.level.code,
    title: rule.title,
    summary: rule.summary,
    fullRuleText: rule.fullRuleText,
    exampleSentence: rule.exampleSentence,
    exampleTranslation: rule.exampleTranslation,
  }));

  res.json({ success: true, data: remoteGrammarRules });
}

export async function getRemoteFlashcards(_req: Request, res: Response): Promise<void> {
  const flashcards = await prisma.flashcard.findMany({
    where: { isMastered: false },
    orderBy: { id: 'asc' },
  });

  const remoteFlashcards = flashcards.map((fc) => ({
    id: fc.id,
    languageCode: fc.languageCode,
    frontWord: fc.frontWord,
    backTranslation: fc.backTranslation,
    exampleSentence: fc.exampleSentence,
    phonetic: fc.phonetic,
    intervalDays: fc.intervalDays,
    isMastered: fc.isMastered,
  }));

  res.json({ success: true, data: remoteFlashcards });
}

export async function getRemoteAchievements(_req: Request, res: Response): Promise<void> {
  const achievements = await prisma.achievement.findMany({
    where: { isUnlocked: false },
    orderBy: { progress: 'asc' },
  });

  const remoteAchievements = achievements.map((ach) => ({
    id: ach.id,
    title: ach.title,
    description: ach.description,
    iconName: ach.iconName,
    isUnlocked: ach.isUnlocked,
    progress: ach.progress,
    maxProgress: ach.maxProgress,
    rewardXp: ach.rewardXp,
  }));

  res.json({ success: true, data: remoteAchievements });
}

export async function getRemoteLessonsByLanguage(
  req: Request,
  res: Response
): Promise<void> {
  const { langCode } = req.params;
  const lessons = await prisma.lesson.findMany({
    where: { languageCode: langCode, isPublished: true },
    include: {
      exercises: true,
      grammarRules: true,
    },
    orderBy: { orderIndex: 'asc' },
  });

  const remoteLessons = lessons.map((lesson) => ({
    id: lesson.id,
    languageCode: lesson.languageCode,
    level: lesson.level.code,
    title: lesson.title,
    description: lesson.description,
    category: lesson.category,
    xpReward: lesson.xpReward,
    isCompleted: lesson.isCompleted,
    isLocked: lesson.isLocked,
    orderIndex: lesson.orderIndex,
  }));

  res.json({ success: true, data: remoteLessons });
}

export async function getRemoteExercisesByLesson(
  req: Request,
  res: Response
): Promise<void> {
  const { lessonId } = req.params;
  const exercises = await prisma.exercise.findMany({
    where: { lessonId, isPublished: true },
    orderBy: { orderIndex: 'asc' },
  });

  const remoteExercises = exercises.map((ex) => ({
    id: ex.id,
    lessonId: ex.lessonId,
    type: ex.type,
    prompt: ex.prompt,
    targetText: ex.targetText,
    translation: ex.translation,
    optionsJson: ex.optionsJson,
    correctAnswer: ex.correctAnswer,
    audioUrl: ex.audioUrl,
    phoneticText: ex.phoneticText,
    explanation: ex.explanation,
    passageText: ex.passageText,
    imageResName: ex.imageResName,
  }));

  res.json({ success: true, data: remoteExercises });
}

export async function getRemoteVocabulariesByLanguage(
  req: Request,
  res: Response
): Promise<void> {
  const { langCode } = req.params;
  const vocabularies = await prisma.vocabulary.findMany({
    where: { languageCode: langCode },
    orderBy: { word: 'asc' },
  });

  const remoteVocabularies = vocabularies.map((vocab) => ({
    id: vocab.id,
    languageCode: vocab.languageCode,
    word: vocab.word,
    translation: vocab.translation,
    exampleSentence: vocab.exampleSentence,
    exampleTranslation: vocab.exampleTranslation,
    phonetic: vocab.phonetic,
    category: vocab.category,
    isFavorite: vocab.isFavorite,
    needsReview: vocab.needsReview,
  }));

  res.json({ success: true, data: remoteVocabularies });
}

export async function getRemoteGrammarRulesByLanguage(
  req: Request,
  res: Response
): Promise<void> {
  const { langCode } = req.params;
  const rules = await prisma.grammarRule.findMany({
    where: { languageCode: langCode, isPublished: true },
    orderBy: { title: 'asc' },
  });

  const remoteGrammarRules = rules.map((rule) => ({
    id: rule.id,
    languageCode: rule.languageCode,
    level: rule.level.code,
    title: rule.title,
    summary: rule.summary,
    fullRuleText: rule.fullRuleText,
    exampleSentence: rule.exampleSentence,
    exampleTranslation: rule.exampleTranslation,
  }));

  res.json({ success: true, data: remoteGrammarRules });
}

export async function getRemoteFlashcardsByLanguage(
  req: Request,
  res: Response
): Promise<void> {
  const { langCode } = req.params;
  const flashcards = await prisma.flashcard.findMany({
    where: { languageCode: langCode },
    orderBy: { id: 'asc' },
  });

  const remoteFlashcards = flashcards.map((fc) => ({
    id: fc.id,
    languageCode: fc.languageCode,
    frontWord: fc.frontWord,
    backTranslation: fc.backTranslation,
    exampleSentence: fc.exampleSentence,
    phonetic: fc.phonetic,
    intervalDays: fc.intervalDays,
    isMastered: fc.isMastered,
  }));

  res.json({ success: true, data: remoteFlashcards });
}

export async function getRemoteAchievementsByLanguage(
  req: Request,
  res: Response
): Promise<void> {
  const { langCode } = req.params;
  const achievements = await prisma.achievement.findMany({
    orderBy: { progress: 'asc' },
  });

  const remoteAchievements = achievements.map((ach) => ({
    id: ach.id,
    title: ach.title,
    description: ach.description,
    iconName: ach.iconName,
    isUnlocked: ach.isUnlocked,
    progress: ach.progress,
    maxProgress: ach.maxProgress,
    rewardXp: ach.rewardXp,
  }));

  res.json({ success: true, data: remoteAchievements });
}

export async function getRemoteLanguages(): Promise<void> {
  const languages = await prisma.language.findMany({
    where: { status: 'active' },
    orderBy: { name: 'asc' },
  });

  const remoteLanguages = languages.map((lang) => ({
    code: lang.code,
    name: lang.name,
    nativeName: lang.nativeName,
    flagEmoji: lang.flagEmoji,
    isDefault: lang.isDefault,
    totalLessonsCount: lang.totalLessonsCount,
    description: lang.description,
  }));

  res.json({ success: true, data: remoteLanguages });
}

export async function getRemoteLessons(): Promise<void> {
  const lessons = await prisma.lesson.findMany({
    where: { isPublished: true },
    include: {
      exercises: true,
      grammarRules: true,
    },
    orderBy: { orderIndex: 'asc' },
  });

  const remoteLessons = lessons.map((lesson) => ({
    id: lesson.id,
    languageCode: lesson.languageCode,
    level: lesson.level.code,
    title: lesson.title,
    description: lesson.description,
    category: lesson.category,
    xpReward: lesson.xpReward,
    isCompleted: lesson.isCompleted,
    isLocked: lesson.isLocked,
    orderIndex: lesson.orderIndex,
  }));

  res.json({ success: true, data: remoteLessons });
}

export async function getRemoteExercises(): Promise<void> {
  const exercises = await prisma.exercise.findMany({
    where: { isPublished: true },
    include: {
      lesson: true,
    },
    orderBy: { orderIndex: 'asc' },
  });

  const remoteExercises = exercises.map((ex) => ({
    id: ex.id,
    lessonId: ex.lessonId,
    type: ex.type,
    prompt: ex.prompt,
    targetText: ex.targetText,
    translation: ex.translation,
    optionsJson: ex.optionsJson,
    correctAnswer: ex.correctAnswer,
    audioUrl: ex.audioUrl,
    phoneticText: ex.phoneticText,
    explanation: ex.explanation,
    passageText: ex.passageText,
    imageResName: ex.imageResName,
  }));

  res.json({ success: true, data: remoteExercises });
}

export async function getRemoteVocabularies(): Promise<void> {
  const vocabularies = await prisma.vocabulary.findMany({
    where: { isFavorite: false },
    orderBy: { word: 'asc' },
  });

  const remoteVocabularies = vocabularies.map((vocab) => ({
    id: vocab.id,
    languageCode: vocab.languageCode,
    word: vocab.word,
    translation: vocab.translation,
    exampleSentence: vocab.exampleSentence,
    exampleTranslation: vocab.exampleTranslation,
    phonetic: vocab.phonetic,
    category: vocab.category,
    isFavorite: vocab.isFavorite,
    needsReview: vocab.needsReview,
  }));

  res.json({ success: true, data: remoteVocabularies });
}

export async function getRemoteGrammarRules(): Promise<void> {
  const rules = await prisma.grammarRule.findMany({
    where: { isPublished: true },
    orderBy: { title: 'asc' },
  });

  const remoteGrammarRules = rules.map((rule) => ({
    id: rule.id,
    languageCode: rule.languageCode,
    level: rule.level.code,
    title: rule.title,
    summary: rule.summary,
    fullRuleText: rule.fullRuleText,
    exampleSentence: rule.exampleSentence,
    exampleTranslation: rule.exampleTranslation,
  }));

  res.json({ success: true, data: remoteGrammarRules });
}

export async function getRemoteFlashcards(): Promise<void> {
  const flashcards = await prisma.flashcard.findMany({
    where: { isMastered: false },
    orderBy: { id: 'asc' },
  });

  const remoteFlashcards = flashcards.map((fc) => ({
    id: fc.id,
    languageCode: fc.languageCode,
    frontWord: fc.frontWord,
    backTranslation: fc.backTranslation,
    exampleSentence: fc.exampleSentence,
    phonetic: fc.phonetic,
    intervalDays: fc.intervalDays,
    isMastered: fc.isMastered,
  }));

  res.json({ success: true, data: remoteFlashcards });
}

export async function getRemoteAchievements(): Promise<void> {
  const achievements = await prisma.achievement.findMany({
    where: { isUnlocked: false },
    orderBy: { progress: 'asc' },
  });

  const remoteAchievements = achievements.map((ach) => ({
    id: ach.id,
    title: ach.title,
    description: ach.description,
    iconName: ach.iconName,
    isUnlocked: ach.isUnlocked,
    progress: ach.progress,
    maxProgress: ach.maxProgress,
    rewardXp: ach.rewardXp,
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

  const levelIds = (language as any).units.map((u: any) => u.levelId);

  const levels = await prisma.cefrLevel.findMany({
    where: { id: { in: levelIds } },
    orderBy: { sortOrder: 'asc' },
  });

  res.json({ success: true, data: levels });
}
