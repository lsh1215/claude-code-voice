import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks — declared before any imports that use these modules.
// ---------------------------------------------------------------------------

vi.mock('child_process', () => ({
  spawnSync: vi.fn(),
  spawn: vi.fn(),
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      readFileSync: vi.fn(),
      writeFileSync: vi.fn(),
      unlinkSync: vi.fn(),
      mkdirSync: vi.fn(),
      openSync: vi.fn(() => 99),
      closeSync: vi.fn(),
      createWriteStream: vi.fn(() => ({ write: vi.fn(), end: vi.fn() })),
      promises: {
        ...actual.default.promises,
        readFile: vi.fn(),
      },
    },
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
    mkdirSync: vi.fn(),
    openSync: vi.fn(() => 99),
    closeSync: vi.fn(),
    createWriteStream: vi.fn(() => ({ write: vi.fn(), end: vi.fn() })),
  };
});

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------
import { spawnSync, spawn } from 'child_process';
import fs from 'fs';
import {
  isWhisperServerAvailable,
  readServerInfo,
  isServerAlive,
  startWhisperServer,
  transcribeViaServer,
  stopWhisperServer,
} from '../../plugin/src/stt/whisper-server-manager.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('isWhisperServerAvailable()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when `which whisper-server` exits with status 0', () => {
    vi.mocked(spawnSync).mockReturnValue({
      status: 0,
      stdout: '/usr/local/bin/whisper-server\n',
      stderr: '',
      pid: 1234,
      output: [],
      signal: null,
      error: undefined,
    } as any);

    expect(isWhisperServerAvailable()).toBe(true);
    expect(spawnSync).toHaveBeenCalledWith('which', ['whisper-server'], { encoding: 'utf8' });
  });

  it('returns false when the command is not found (non-zero status)', () => {
    vi.mocked(spawnSync).mockReturnValue({
      status: 1,
      stdout: '',
      stderr: '',
      pid: 1234,
      output: [],
      signal: null,
      error: undefined,
    } as any);

    expect(isWhisperServerAvailable()).toBe(false);
  });

  it('returns false when spawnSync throws', () => {
    vi.mocked(spawnSync).mockImplementation(() => {
      throw new Error('ENOENT');
    });

    expect(isWhisperServerAvailable()).toBe(false);
  });
});

describe('readServerInfo()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when the PID file does not exist (ENOENT)', () => {
    const err = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    vi.mocked(fs.readFileSync).mockImplementation(() => { throw err; });

    expect(readServerInfo()).toBeNull();
  });

  it('returns parsed ServerInfo when the PID file contains valid JSON', () => {
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ pid: 9876, port: 18080 })
    );

    const info = readServerInfo();
    expect(info).toEqual({ pid: 9876, port: 18080 });
  });

  it('returns null when the PID file contains invalid JSON', () => {
    vi.mocked(fs.readFileSync).mockReturnValue('not-valid-json{{');

    expect(readServerInfo()).toBeNull();
  });
});

describe('isServerAlive()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when process.kill(pid, 0) succeeds', () => {
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

    expect(isServerAlive({ pid: 42, port: 18080 })).toBe(true);
    expect(killSpy).toHaveBeenCalledWith(42, 0);

    killSpy.mockRestore();
  });

  it('returns false when process.kill throws ESRCH (process does not exist)', () => {
    const err = Object.assign(new Error('ESRCH'), { code: 'ESRCH' });
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => { throw err; });

    expect(isServerAlive({ pid: 99999, port: 18080 })).toBe(false);

    killSpy.mockRestore();
  });
});

describe('transcribeViaServer()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns trimmed text on a successful response', async () => {
    vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from('fake-wav-data'));

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ text: '  hello world  ' }),
      text: async () => '',
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await transcribeViaServer('/tmp/test.wav', 18080);
    expect(result).toBe('hello world');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:18080/inference',
      expect.objectContaining({ method: 'POST' })
    );

    vi.unstubAllGlobals();
  });

  it('throws on HTTP error (status 500)', async () => {
    vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from('fake-wav-data'));

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
      text: async () => 'Internal Server Error',
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(transcribeViaServer('/tmp/test.wav', 18080)).rejects.toThrow(
      'whisper-server HTTP 500'
    );

    vi.unstubAllGlobals();
  });

  it('returns empty string when the text field is missing from JSON response', async () => {
    vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from('fake-wav-data'));

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await transcribeViaServer('/tmp/test.wav', 18080);
    expect(result).toBe('');

    vi.unstubAllGlobals();
  });

  it('returns empty string when the text field is an empty string', async () => {
    vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from('fake-wav-data'));

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ text: '   ' }),
      text: async () => '',
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await transcribeViaServer('/tmp/test.wav', 18080);
    expect(result).toBe('');

    vi.unstubAllGlobals();
  });
});

describe('startWhisperServer()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('spawns whisper-server with the correct arguments and writes PID file', async () => {
    const fakeProc = {
      pid: 5555,
      unref: vi.fn(),
    };
    vi.mocked(spawn).mockReturnValue(fakeProc as any);
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);

    // mock fetch to return 400 immediately (server "ready" with non-5xx)
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({}),
      text: async () => '',
    });
    vi.stubGlobal('fetch', mockFetch);

    await startWhisperServer({
      modelPath: '/models/ggml-base.bin',
      language: 'ko',
      port: 18080,
    });

    expect(spawn).toHaveBeenCalledWith(
      'whisper-server',
      expect.arrayContaining([
        '-m', '/models/ggml-base.bin',
        '-l', 'ko',
        '--port', '18080',
        '--host', '127.0.0.1',
      ]),
      expect.objectContaining({ detached: true })
    );

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('whisper-server.pid'),
      JSON.stringify({ pid: 5555, port: 18080 })
    );

    expect(fakeProc.unref).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('throws immediately when spawn returns undefined pid', async () => {
    const fakeProc = {
      pid: undefined,
      unref: vi.fn(),
    };
    vi.mocked(spawn).mockReturnValue(fakeProc as any);
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);

    await expect(
      startWhisperServer({
        modelPath: '/models/ggml-base.bin',
        language: 'ko',
        port: 18080,
      })
    ).rejects.toThrow('Failed to spawn whisper-server process (no PID assigned)');

    // PID file must NOT have been written
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('cleans up PID file when waitForServer times out', async () => {
    const fakeProc = {
      pid: 6666,
      unref: vi.fn(),
    };
    vi.mocked(spawn).mockReturnValue(fakeProc as any);
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
    vi.mocked(fs.unlinkSync).mockImplementation(() => undefined);

    // fetch always rejects → waitForServer will exhaust its deadline.
    // To avoid a real 30-second wait we make Date.now() return a value already
    // past the deadline by patching it.
    const realDateNow = Date.now.bind(Date);
    let callCount = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => {
      // First call sets the deadline; subsequent calls must be past it.
      callCount++;
      return callCount === 1 ? realDateNow() : realDateNow() + 31_000;
    });

    const mockFetch = vi.fn().mockRejectedValue(new Error('connection refused'));
    vi.stubGlobal('fetch', mockFetch);

    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

    await expect(
      startWhisperServer({
        modelPath: '/models/ggml-base.bin',
        language: 'ko',
        port: 18080,
      })
    ).rejects.toThrow(/whisper-server did not start/);

    // PID file should have been written then removed
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('whisper-server.pid'),
      JSON.stringify({ pid: 6666, port: 18080 })
    );
    expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('whisper-server.pid'));
    expect(killSpy).toHaveBeenCalledWith(6666, 'SIGTERM');

    killSpy.mockRestore();
    vi.spyOn(Date, 'now').mockRestore();
    vi.unstubAllGlobals();
  });
});

describe('stopWhisperServer()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('kills the process and removes the PID file when the server is alive', () => {
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ pid: 7777, port: 18080 })
    );
    vi.mocked(fs.unlinkSync).mockImplementation(() => undefined);

    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

    stopWhisperServer();

    // First call: kill(pid, 0) inside isServerAlive
    // Second call: kill(pid, 'SIGTERM') to stop it
    expect(killSpy).toHaveBeenCalledWith(7777, 0);
    expect(killSpy).toHaveBeenCalledWith(7777, 'SIGTERM');
    expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('whisper-server.pid'));

    killSpy.mockRestore();
  });

  it('does not throw when no PID file exists', () => {
    const err = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    vi.mocked(fs.readFileSync).mockImplementation(() => { throw err; });
    vi.mocked(fs.unlinkSync).mockImplementation(() => { throw err; });

    expect(() => stopWhisperServer()).not.toThrow();
  });

  it('does not attempt to kill when server is not alive', () => {
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ pid: 8888, port: 18080 })
    );
    vi.mocked(fs.unlinkSync).mockImplementation(() => undefined);

    const esrch = Object.assign(new Error('ESRCH'), { code: 'ESRCH' });
    // First kill(pid,0) throws → isServerAlive returns false
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => { throw esrch; });

    stopWhisperServer();

    // Only one call: kill(pid, 0) — no SIGTERM because process is already dead
    expect(killSpy).toHaveBeenCalledTimes(1);
    expect(killSpy).toHaveBeenCalledWith(8888, 0);

    killSpy.mockRestore();
  });
});
