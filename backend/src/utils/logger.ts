/**
 * Minimal dependency-free structured logger.
 *
 * Every record is a single JSON line on stdout (info/debug) or stderr
 * (warn/error) so log shippers can index it without parsing free-form text.
 * Level threshold comes from `LOG_LEVEL` (debug|info|warn|error); anything else
 * or unset defaults to info. One file, no framework, no magic.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const THRESHOLD_STRING = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
const THRESHOLD: number = LEVEL_ORDER[THRESHOLD_STRING as LogLevel] ?? LEVEL_ORDER.info;

type Fields = Record<string, unknown>;

function write(level: LogLevel, message: string, fields?: Fields): void {
  if (LEVEL_ORDER[level] < THRESHOLD) return;
  const line = JSON.stringify({
    level,
    msg: message,
    time: new Date().toISOString(),
    ...fields,
  });
  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
  stream.write(line + '\n');
}

export const logger = {
  debug: (message: string, fields?: Fields) => write('debug', message, fields),
  info: (message: string, fields?: Fields) => write('info', message, fields),
  warn: (message: string, fields?: Fields) => write('warn', message, fields),
  error: (message: string, fields?: Fields) => write('error', message, fields),
};