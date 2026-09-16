// Patch Express so rejected promises from async handlers reach the error
// handler instead of hanging the request (Express 4 does not do this itself).
import 'express-async-errors';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import os from 'os';
import { env } from './config/env';
import { prisma } from './config/database';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { requestLog } from './middleware/requestLog';
import { AppError } from './utils/errors';
import { providerStatus } from './ai/gateway';
import { appAccessMode } from './middleware/appAccess';
import { SERVICE_NAME, SERVICE_VERSION } from './version';

const app = express();

// Structured access log first, so request-ids exist on every downstream log.
app.use(requestLog);

// Security middleware
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/**
 * Health check. Public (no auth) so load balancers and up-time probes can call
 * it. Reports the check results rather than just `200/503`, never any secrets.
 */
app.get('/health', async (_req, res) => {
  const checks: { database?: { status: 'up' | 'down' } } = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'up' };
  } catch {
    checks.database = { status: 'down' };
  }

  const status = checks.database.status === 'down' ? 'degraded' : 'ok';
  const mem = process.memoryUsage();
  const ai = providerStatus();

  res.status(status === 'ok' ? 200 : 503).json({
    status,
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    checks,
    ai: {
      mode: appAccessMode(),
      order: ai.order,
      configured: ai.providers,
    },
    process: {
      pid: process.pid,
      node: process.version,
      platform: os.platform(),
      arch: os.arch(),
      memory: { rss: mem.rss, heapUsed: mem.heapUsed, heapTotal: mem.heapTotal },
    },
  });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use((_req, _res, next) => {
  next(new AppError('Route not found', 404));
});

// Error handler
app.use(errorHandler);

export default app;