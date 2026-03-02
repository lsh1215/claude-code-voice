#!/usr/bin/env node
import { handleVoice } from './commands/voice-handler.js';

const command = process.argv[2];
const args = process.argv.slice(2);

switch (command) {
  case 'voice':
    await handleVoice();
    break;
  case 'voice-config': {
    const { handleVoiceConfig } = await import('./commands/voice-config-handler.js');
    await handleVoiceConfig(args.slice(1));
    break;
  }
  default:
    process.stderr.write(`Unknown command: ${command}\n`);
    process.exit(1);
}
