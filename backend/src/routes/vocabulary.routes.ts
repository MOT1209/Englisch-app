import { Router } from 'express';
import {
  getVocabularyByLanguage,
  createVocabulary,
  getFlashcardsByLanguage,
  createFlashcard,
} from '../controllers/vocabulary.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createVocabularySchema, createFlashcardSchema } from '../validators/vocabulary.validator';

const router = Router();

router.get('/languages/:langCode/vocabulary', getVocabularyByLanguage); // public: browse vocab
router.post('/languages/:langCode/vocabulary', authenticate, validate(createVocabularySchema), createVocabulary); // authenticated: add vocab

router.get('/languages/:langCode/flashcards', getFlashcardsByLanguage); // public: browse flashcards
router.post('/languages/:langCode/flashcards', authenticate, validate(createFlashcardSchema), createFlashcard); // authenticated: add flashcard

export default router;
