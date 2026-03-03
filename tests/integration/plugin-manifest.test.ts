import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve paths relative to this test file (ESM-compatible)
// tests/integration/ -> ../../plugin -> plugin root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLUGIN_DIR = path.resolve(__dirname, '../../plugin');

function findFile(names: string[], dirs: string[]): string | null {
  for (const dir of dirs) {
    for (const name of names) {
      const p = path.join(dir, name);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

const searchDirs = [
  PLUGIN_DIR,
  path.join(PLUGIN_DIR, '.claude-plugin'),
];

const hooksSearchDirs = [
  ...searchDirs,
  path.join(PLUGIN_DIR, 'hooks'),
];

describe('plugin manifest validation', () => {
  it('plugin.json exists', () => {
    const pluginJsonPath = findFile(['plugin.json'], searchDirs);
    expect(pluginJsonPath).not.toBeNull();
  });

  it('plugin.json is valid JSON', () => {
    const pluginJsonPath = findFile(['plugin.json'], searchDirs);
    if (!pluginJsonPath) return;
    const content = fs.readFileSync(pluginJsonPath, 'utf8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('plugin.json has required name field (non-empty string)', () => {
    const pluginJsonPath = findFile(['plugin.json'], searchDirs);
    if (!pluginJsonPath) return;
    const plugin = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
    expect(plugin).toHaveProperty('name');
    expect(typeof plugin.name).toBe('string');
    expect(plugin.name.length).toBeGreaterThan(0);
  });

  it('plugin.json has required version field (string)', () => {
    const pluginJsonPath = findFile(['plugin.json'], searchDirs);
    if (!pluginJsonPath) return;
    const plugin = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
    expect(plugin).toHaveProperty('version');
    expect(typeof plugin.version).toBe('string');
  });

  it('plugin.json version matches semver pattern (x.y.z)', () => {
    const pluginJsonPath = findFile(['plugin.json'], searchDirs);
    if (!pluginJsonPath) return;
    const plugin = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
    expect(plugin.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('plugin.json has description field', () => {
    const pluginJsonPath = findFile(['plugin.json'], searchDirs);
    if (!pluginJsonPath) return;
    const plugin = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
    expect(plugin).toHaveProperty('description');
  });

  it('hooks.json exists', () => {
    const hooksPath = findFile(['hooks.json'], hooksSearchDirs);
    expect(hooksPath).not.toBeNull();
  });

  it('hooks.json is valid JSON', () => {
    const hooksPath = findFile(['hooks.json'], hooksSearchDirs);
    if (!hooksPath) return;
    const content = fs.readFileSync(hooksPath, 'utf8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('hooks.json has hooks key', () => {
    const hooksPath = findFile(['hooks.json'], hooksSearchDirs);
    if (!hooksPath) return;
    const hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
    expect(hooks).toHaveProperty('hooks');
  });

  it('commands directory contains .md or .md.template files', () => {
    const commandsDir = path.join(PLUGIN_DIR, 'commands');
    if (!fs.existsSync(commandsDir)) return;
    const files = fs.readdirSync(commandsDir);
    const mdFiles = files.filter(
      (f) => f.endsWith('.md') || f.endsWith('.md.template'),
    );
    expect(mdFiles.length).toBeGreaterThan(0);
  });
});
