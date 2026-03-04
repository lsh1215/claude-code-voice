# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-03-04

### Added
- `whisper-server` daemon mode: model loaded once in memory, HTTP `/inference` per request — eliminates cold-start latency (2–5 s → 0 on subsequent calls)
- `ggml-large-v3-turbo-q5_0` as default model (~600 MB, ~26–28% MER on KO-EN code-switching vs 97.8% for base)
- Greedy decoding (`-bs -1 -bo 1`): inference < 1 s vs 5–15 s with beam-size 5
- Developer `initial-prompt` hint: improves KO-EN term recognition (null pointer exception, async/await, TypeScript, JWT, etc.)
- `getDefaultModelPath()`: auto-discovers turbo → base model in project `models/` then `~/.cache/whisper/`
- `whisperServerPort` config option (default: 18080)
- `sttEngine` config option (`whisper-server` | `whisper-cli`, default: `whisper-server`)
- `/voice-config stop-server` subcommand: stop the running whisper-server daemon
- `/voice-config detect-mic` subcommand: auto-detect preferred microphone index (excludes iPhone/iPad/AirPods via Continuity Camera)
- `setup.sh` interactive model selection: turbo (~600 MB) or base (~141 MB), skips if already downloaded
- Fallback to `whisper-cli` when `whisper-server` fails to start (with availability check)
- PID file cleanup + SIGTERM on `waitForServer` timeout
- Guard against `proc.pid === undefined` on spawn failure
- 49 new tests (206 total: 107+11 unit, 28+13 integration, 17 contract, 7 perf)

### Changed
- Default `sttEngine` changed from `whisper-cli` to `whisper-server`
- Default model path updated: prefers `ggml-large-v3-turbo-q5_0.bin`, falls back to `ggml-base.bin`
- `setup.sh`: now checks for both `whisper-cli` and `whisper-server` binaries
- Model download hint in error message now uses actual model filename from config

### Requirements
- macOS 14+, Node.js 20+
- `brew install whisper-cpp ffmpeg`
- whisper ggml-large-v3-turbo-q5_0 model (~600 MB) or ggml-base model (~141 MB)

## [0.2.0] - 2026-03-03

### Added
- `/voice` slash command: speak into mic → whisper-cli transcribes → text becomes Claude Code input
- Korean + English code-switching support via whisper-cli `-l ko`
- RMS-based VAD (Voice Activity Detection): auto-stops recording after 1.5s silence
- ffmpeg avfoundation audio capture (macOS, `:0` default mic)
- `audioDeviceIndex` config option to select specific mic when multiple devices present
- `setup.sh` install script: checks prereqs, builds TypeScript, generates `commands/voice.md`
- Config stored at `~/.claude/plugins/voice/config.json`
- 16 tests (11 unit + 5 integration)

### Requirements
- macOS 14+, Node.js 20+
- `brew install whisper-cpp ffmpeg`
- whisper ggml-base model (~141MB)
