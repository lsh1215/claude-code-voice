const DEBUG = process.env.CLAUDE_VOICE_DEBUG === '1';

export const logger = {
  info: (msg: string) => process.stderr.write(`[voice] ${msg}\n`),
  debug: (msg: string) => { if (DEBUG) process.stderr.write(`[voice:debug] ${msg}\n`); },
  warn: (msg: string) => process.stderr.write(`[voice:warn] ${msg}\n`),
  error: (msg: string) => process.stderr.write(`[voice:error] ${msg}\n`),
};
