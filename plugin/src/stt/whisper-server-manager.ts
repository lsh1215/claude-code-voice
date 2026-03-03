import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.claude', 'plugins', 'voice');
const PID_FILE = path.join(CONFIG_DIR, 'whisper-server.pid');
const LOG_FILE = path.join(CONFIG_DIR, 'whisper-server.log');

export const DEVELOPER_INITIAL_PROMPT =
  'null pointer exception, async await, useState, TypeScript, JWT, API endpoint, ' +
  'git commit, pull request, 에러, 함수, 클래스, 메서드, 배열, 인터페이스';

export interface ServerInfo { pid: number; port: number; }

export function isWhisperServerAvailable(): boolean {
  try {
    const r = spawnSync('which', ['whisper-server'], { encoding: 'utf8' });
    return r.status === 0 && r.stdout.trim().length > 0;
  } catch { return false; }
}

export function readServerInfo(): ServerInfo | null {
  try {
    return JSON.parse(fs.readFileSync(PID_FILE, 'utf8')) as ServerInfo;
  } catch { return null; }
}

export function isServerAlive(info: ServerInfo): boolean {
  try { process.kill(info.pid, 0); return true; } catch { return false; }
}

export async function startWhisperServer(opts: {
  modelPath: string;
  language: string;
  port: number;
  initialPrompt?: string;
}): Promise<void> {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  const logFd = fs.openSync(LOG_FILE, 'a');

  const lang = opts.language === 'auto' ? 'auto' : opts.language;
  const args = [
    '-m', opts.modelPath,
    '-l', lang,
    '--prompt', opts.initialPrompt ?? DEVELOPER_INITIAL_PROMPT,
    '--port', String(opts.port),
    '--host', '127.0.0.1',
    '-bs', '-1',
    '-bo', '1',
    '-nt',
  ];

  const proc = spawn('whisper-server', args, {
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });
  proc.unref();
  fs.closeSync(logFd);

  if (!proc.pid) {
    throw new Error('Failed to spawn whisper-server process (no PID assigned)');
  }

  fs.writeFileSync(PID_FILE, JSON.stringify({ pid: proc.pid, port: opts.port }));

  try {
    await waitForServer(opts.port, 30_000);
  } catch (err) {
    try { process.kill(proc.pid, 'SIGTERM'); } catch { /* already dead */ }
    try { fs.unlinkSync(PID_FILE); } catch { /* no file */ }
    throw err;
  }
}

async function waitForServer(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/inference`, {
        method: 'POST',
        body: new FormData(),
        signal: AbortSignal.timeout(2_000),
      });
      if (res.status < 500) return;
    } catch { /* not ready */ }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`whisper-server did not start within ${timeoutMs / 1000}s. Check log: ${LOG_FILE}`);
}

export async function transcribeViaServer(wavPath: string, port: number): Promise<string> {
  const wavBuffer = await fs.promises.readFile(wavPath);
  const file = new File([wavBuffer], 'audio.wav', { type: 'audio/wav' });
  const form = new FormData();
  form.append('file', file);
  form.append('response_format', 'json');

  const res = await fetch(`http://127.0.0.1:${port}/inference`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`whisper-server HTTP ${res.status}: ${await res.text()}`);
  }
  const json = await res.json() as { text?: string };
  return json.text?.trim() ?? '';
}

export function stopWhisperServer(): void {
  const info = readServerInfo();
  if (info && isServerAlive(info)) {
    try { process.kill(info.pid, 'SIGTERM'); } catch { /* already dead */ }
  }
  try { fs.unlinkSync(PID_FILE); } catch { /* no file */ }
}
