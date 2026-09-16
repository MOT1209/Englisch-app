import { Router } from 'express';
import { chat, providers, write } from '../controllers/ai.controller';
import { requireAppAccess } from '../middleware/appAccess';
import { validate } from '../middleware/validate';
import { chatSchema, writeSchema } from '../validators/ai.validator';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// AI proxy: hides every provider key server-side. The app gate is normally
// Firebase App Check; while it is not configured the app sends `X-App-Token`.
// Each caller is capped to a daily budget inside the handler, and the request
// is served by the first configured provider (Gemini, Groq, OpenCode Zen) that
// answers. `asyncHandler` keeps a provider failure from killing the process.
router.post('/chat', asyncHandler(requireAppAccess), validate(chatSchema), asyncHandler(chat));
router.post('/write', asyncHandler(requireAppAccess), validate(writeSchema), asyncHandler(write));

// Which providers are configured and in what order. No secrets in the payload.
router.get('/providers', asyncHandler(requireAppAccess), providers);

export default router;
