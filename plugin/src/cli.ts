#!/usr/bin/env node
import { handleVoice } from './commands/voice-handler.js';

const command = process.argv[2];

switch (command) {
  case 'voice':
    await handleVoice();
    break;
  default:
    process.stderr.write(`Unknown command: ${command}\n`);
    process.exit(1);
}
