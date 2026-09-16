import app from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { logger } from './utils/logger';

// Start server
async function main() {
  // Test database connection
  await prisma.$connect();
  logger.info('database connected');

  app.listen(env.PORT, () => {
    logger.info('api listening', { port: env.PORT, environment: env.NODE_ENV });
  });
}

main().catch((err) => {
  logger.error('failed to start server', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});