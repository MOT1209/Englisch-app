import { Router } from 'express';
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
router.get('/:code', getLanguageByCode);
router.get('/:code/levels', getLanguageLevels);
// P1: Remote content endpoints (replaces SupabaseContentDataSource)
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

router.post('/', authenticate, validate(createLanguageSchema), createLanguage);
router.put('/:code', authenticate, updateLanguage);
router.delete('/:code', authenticate, deleteLanguage);

export default router;
