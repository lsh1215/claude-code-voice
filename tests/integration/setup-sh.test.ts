import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve paths relative to this test file (ESM-compatible)
// tests/integration/ -> ../../plugin -> plugin root; ../../plugin/.. -> repo root (worktree root)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLUGIN_DIR = path.resolve(__dirname, '../../plugin');
// repo root is the worktree root, one level above plugin/
const REPO_ROOT = path.resolve(PLUGIN_DIR, '..');
const SETUP_SH = path.join(REPO_ROOT, 'setup.sh');

describe('setup.sh validation', () => {
  it('setup.sh exists at repo root', () => {
    expect(fs.existsSync(SETUP_SH)).toBe(true);
  });

  it('setup.sh has no bash syntax errors (bash -n)', () => {
    let exitCode = 0;
    let errorOutput = '';
    try {
      execSync(`bash -n "${SETUP_SH}"`, { encoding: 'utf8' });
    } catch (err: any) {
      exitCode = err.status ?? 1;
      errorOutput = err.stderr ?? '';
    }
    if (exitCode !== 0) {
      console.error('Bash syntax errors:\n', errorOutput);
    }
    expect(exitCode).toBe(0);
  });

  it('setup.sh contains PLUGIN_DIR substitution logic', () => {
    const content = fs.readFileSync(SETUP_SH, 'utf8');
    expect(content).toMatch(/PLUGIN_DIR|plugin_dir/i);
  });

  it('setup.sh references voice.md', () => {
    const content = fs.readFileSync(SETUP_SH, 'utf8');
    // setup.sh either uses a voice.md.template or writes voice.md directly
    expect(content).toMatch(/voice\.md/);
  });

  it('voice.md.template exists in plugin/commands or is embedded in setup.sh', () => {
    const templateInPlugin = path.join(PLUGIN_DIR, 'commands', 'voice.md.template');
    const templateInRepo = path.join(REPO_ROOT, 'commands', 'voice.md.template');

    const existsInPlugin = fs.existsSync(templateInPlugin);
    const existsInRepo = fs.existsSync(templateInRepo);

    if (!existsInPlugin && !existsInRepo) {
      // Template may be embedded directly in setup.sh via heredoc
      const content = fs.readFileSync(SETUP_SH, 'utf8');
      expect(content).toMatch(/voice\.md/);
    } else {
      expect(existsInPlugin || existsInRepo).toBe(true);
    }
  });

  it('setup.sh starts with a shebang line', () => {
    const content = fs.readFileSync(SETUP_SH, 'utf8');
    expect(content.startsWith('#!/')).toBe(true);
  });

  it('setup.sh checks for or references required binaries (whisper-cli or ffmpeg)', () => {
    const content = fs.readFileSync(SETUP_SH, 'utf8');
    expect(content).toMatch(/whisper.cli|ffmpeg/i);
  });
});
