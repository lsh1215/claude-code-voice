# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
