import { Router } from 'express';
import { chat, write } from '../controllers/ai.controller';
import { requireAppAccess } from '../middleware/appAccess';
import { validate } from '../middleware/validate';
import { chatSchema, writeSchema } from '../validators/ai.validator';

const router = Router();

// AI proxy: hides the Gemini key server-side. The app sends `X-App-Token`, and
// each caller is capped to a daily budget inside the handler.
router.post('/chat', requireAppAccess, validate(chatSchema), chat);
router.post('/write', requireAppAccess, validate(writeSchema), write);

export default router;