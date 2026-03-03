import { loadConfig, saveConfig, DEFAULT_CONFIG, getConfigDir } from '../utils/config.js';
import fs from 'fs';

export async function handleVoiceConfig(args: string[]): Promise<void> {
  const subcommand = args[0];

  switch (subcommand) {
    case 'show':
      await handleShow();
      break;

    case 'set':
      await handleSet(args.slice(1));
      break;

    case 'reset':
      await handleReset();
      break;

    default:
      await handleHelp();
      break;
  }
}

async function handleShow(): Promise<void> {
  const config = loadConfig();
  process.stdout.write('Current voice plugin configuration:\n');
  process.stdout.write(`  language         = ${config.language}\n`);
  process.stdout.write(`  silenceDurationMs= ${config.silenceDurationMs}\n`);
  process.stdout.write(`  vadThreshold     = ${config.vadThreshold}\n`);
  process.stdout.write(`  modelPath        = ${config.modelPath}\n`);
  process.stdout.write(`  sttEngine        = ${config.sttEngine}\n`);
  process.stdout.write(`  autoSubmit       = ${config.autoSubmit}\n`);
  process.stdout.write(`  debug            = ${config.debug}\n`);
  process.stdout.write(`\nConfig file: ${getConfigDir()}/config.json\n`);
}

async function handleSet(args: string[]): Promise<void> {
  if (args.length < 2) {
    process.stdout.write('Usage: voice-config set <key> <value>\n');
    process.stdout.write('Keys: language, silenceDurationMs, vadThreshold, modelPath\n');
    process.exit(1);
  }

  const [key, value] = args;

  switch (key) {
    case 'language': {
      const validLanguages = ['ko', 'en', 'auto'];
      if (!validLanguages.includes(value)) {
        process.stdout.write(`Error: invalid language "${value}". Must be one of: ${validLanguages.join(', ')}\n`);
        process.exit(1);
      }
      saveConfig({ language: value });
      process.stdout.write(`language set to: ${value}\n`);
      break;
    }

    case 'silenceDurationMs': {
      const num = Number(value);
      if (isNaN(num) || num < 500 || num > 5000) {
        process.stdout.write(`Error: silenceDurationMs must be between 500 and 5000 (got: ${value})\n`);
        process.exit(1);
      }
      saveConfig({ silenceDurationMs: num });
      process.stdout.write(`silenceDurationMs set to: ${num}\n`);
      break;
    }

    case 'vadThreshold': {
      const num = Number(value);
      if (isNaN(num) || num < 0.001 || num > 0.5) {
        process.stdout.write(`Error: vadThreshold must be between 0.001 and 0.5 (got: ${value})\n`);
        process.exit(1);
      }
      saveConfig({ vadThreshold: num });
      process.stdout.write(`vadThreshold set to: ${num}\n`);
      break;
    }

    case 'modelPath': {
      if (!fs.existsSync(value)) {
        process.stdout.write(`Error: model file not found: ${value}\n`);
        process.exit(1);
      }
      saveConfig({ modelPath: value });
      process.stdout.write(`modelPath set to: ${value}\n`);
      break;
    }

    default: {
      process.stdout.write(`Error: unknown key "${key}"\n`);
      process.stdout.write('Valid keys: language, silenceDurationMs, vadThreshold, modelPath\n');
      process.exit(1);
    }
  }
}

async function handleReset(): Promise<void> {
  const { sttEngine, language, modelPath, vadThreshold, silenceDurationMs, autoSubmit, debug } = DEFAULT_CONFIG;
  saveConfig({ sttEngine, language, modelPath, vadThreshold, silenceDurationMs, autoSubmit, debug });
  process.stdout.write('Configuration reset to defaults.\n');
  await handleShow();
}

async function handleHelp(): Promise<void> {
  const config = loadConfig();
  process.stdout.write('voice-config - Configure voice plugin settings\n\n');
  process.stdout.write('Subcommands:\n');
  process.stdout.write('  show                     Show current configuration\n');
  process.stdout.write('  set <key> <value>        Update a setting\n');
  process.stdout.write('  reset                    Reset all settings to defaults\n\n');
  process.stdout.write('Available keys:\n');
  process.stdout.write('  language         ko | en | auto\n');
  process.stdout.write('  silenceDurationMs  500-5000 (ms)\n');
  process.stdout.write('  vadThreshold     0.001-0.5\n');
  process.stdout.write('  modelPath        /path/to/ggml-model.bin\n\n');
  process.stdout.write('Current configuration:\n');
  process.stdout.write(`  language         = ${config.language}\n`);
  process.stdout.write(`  silenceDurationMs= ${config.silenceDurationMs}\n`);
  process.stdout.write(`  vadThreshold     = ${config.vadThreshold}\n`);
  process.stdout.write(`  modelPath        = ${config.modelPath}\n`);
}
