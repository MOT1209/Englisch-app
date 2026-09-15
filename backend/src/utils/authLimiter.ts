import { rateLimit } from 'express-rate-limit';

/**
 * Rate limiter for credential endpoints. Login/register/refresh have no other
 * gate, so without this an attacker could brute-force passwords or burn the
 * database with account-creation attempts.
 */
export const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many attempts, please try again in a minute' },
});