import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createLanguageSchema } from '../validators/lesson.validator';
import {
  getAllLanguages,
  getLanguageByCode,
  createLanguage,
  updateLanguage,
  deleteLanguage,
  getLanguageLevels,
  // P1 Content endpoints: remote content from Prisma (replaces Supabase)
  getRemoteLanguages,
  getRemoteLessons,
  getRemoteExercises,
  getRemoteVocabularies,
  getRemoteGrammarRules,
  getRemoteFlashcards,
  getRemoteAchievements,
  // P1 Content endpoints by language
  getRemoteLessonsByLanguage,
  getRemoteExercisesByLesson,
  getRemoteVocabulariesByLanguage,
  getRemoteGrammarRulesByLanguage,
  getRemoteFlashcardsByLanguage,
  getRemoteAchievementsByLanguage,
} from '../controllers/language.controller';

const router = Router();

// Languages
router.get('/', getAllLanguages);

// P1: Remote content endpoints (replaces SupabaseContentDataSource). These must
// be declared before `/:code`, otherwise `remote` matches the language-code
// catch-all and every `/remote/...` path 404s.
router.get('/remote/languages', getRemoteLanguages);
router.get('/remote/lessons', getRemoteLessons);
router.get('/remote/exercises', getRemoteExercises);
router.get('/remote/vocabularies', getRemoteVocabularies);
router.get('/remote/grammar-rules', getRemoteGrammarRules);
router.get('/remote/flashcards', getRemoteFlashcards);
router.get('/remote/achievements', getRemoteAchievements);
// P1: Remote content by language
router.get('/remote/lessons/:langCode', getRemoteLessonsByLanguage);
router.get('/remote/exercises/:lessonId', getRemoteExercisesByLesson);
router.get('/remote/vocabularies/:langCode', getRemoteVocabulariesByLanguage);
router.get('/remote/grammar-rules/:langCode', getRemoteGrammarRulesByLanguage);
router.get('/remote/flashcards/:langCode', getRemoteFlashcardsByLanguage);
router.get('/remote/achievements/:langCode', getRemoteAchievementsByLanguage);

router.get('/:code', getLanguageByCode);
router.get('/:code/levels', getLanguageLevels);

router.post('/', authenticate, validate(createLanguageSchema), createLanguage);
router.put('/:code', authenticate, updateLanguage);
router.delete('/:code', authenticate, deleteLanguage);

export default router;
