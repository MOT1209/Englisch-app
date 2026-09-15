import { Router } from 'express';
import {
  getUnitsByLangAndLevel,
  getLessonsByUnit,
  getLessonById,
  createLesson,
  getExercisesByLesson,
  createExercise,
} from '../controllers/lesson.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createLessonSchema, createExerciseSchema } from '../validators/lesson.validator';

const router = Router();

// Units by language + level - public: listing available units/levels
router.get('/languages/:langCode/levels/:levelCode/units', getUnitsByLangAndLevel);

// Lessons by unit - public: browse lessons
router.get('/units/:unitId/lessons', getLessonsByUnit);

// Single lesson with exercises - public: view lesson details
router.get('/lessons/:lessonId', getLessonById);

// Create lesson - authenticated: only admins/educators
router.post('/units/:unitId/lessons', authenticate, validate(createLessonSchema), createLesson);

// Exercises by lesson - public: browse exercises
router.get('/lessons/:lessonId/exercises', getExercisesByLesson);

// Create exercise - authenticated: only admins/educators
router.post('/lessons/:lessonId/exercises', authenticate, validate(createExerciseSchema), createExercise);

export default router;
