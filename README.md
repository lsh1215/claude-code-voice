<p align="center">
  <a href="README.md">English</a> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.zh.md">中文</a>
</p>

<div align="center">

# claude-code-voice

[![GitHub stars](https://img.shields.io/github/stars/lsh1215/claude-code-voice?style=flat&color=yellow)](https://github.com/lsh1215/claude-code-voice/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

**Voice plugin for Claude Code.**

*Talk to code. Code by voice. Zero keystrokes.*

[Get Started](#get-started) · [Features](#features) · [Architecture](#architecture) · [Roadmap](#roadmap)

</div>

---

## Why

Claude Code understands natural language. **The fastest natural language input is voice** — 150 WPM speaking vs 40 WPM typing. Yet Claude Code has no voice support at all.

There are [10+ GitHub issues](https://github.com/anthropics/claude-code/issues?q=voice+OR+speech+OR+audio+OR+microphone) requesting this. Zero assignees.

This plugin fills that gap.

---

## What It Does

| You... | It... |
|--------|-------|
| Press a hotkey and speak | Converts speech to text, sends to Claude Code |
| Finish a command | Claude Code responds with voice (TTS) |
| Pause speaking for 1.5s | Auto-detects silence, sends command |
| Say something vague | Refines your words into a precise developer instruction |
| Want continuous conversation | Enter voice-chat mode — talk back and forth |

---

## Features

| Feature | Description |
|---------|-------------|
| **STT (Speech-to-Text)** | On-device transcription — macOS SFSpeech, Whisper.cpp, or system default |
| **TTS (Text-to-Speech)** | Read back responses — macOS `say`, Linux `espeak-ng` |
| **VAD (Voice Activity Detection)** | Auto-detect when you stop speaking |
| **Voice Chat Mode** | Continuous conversation — speak, listen, speak again |
| **LLM Refinement** | Clean up spoken language into developer instructions |
| **Cross-platform** | macOS, Linux (WSL included) |

---

## Get Started

### Requirements

- [Claude Code](https://docs.anthropic.com/claude-code) CLI
- macOS 14+ or Linux with PulseAudio/PipeWire
- Microphone

### Install

```bash
# Clone
git clone https://github.com/lsh1215/claude-code-voice.git
cd claude-code-voice

# Install
./setup.sh
```

### Usage

```bash
# Start voice input (one-shot)
/voice

# Start continuous voice chat
/voice-chat

# Configure settings
/voice-config
```

Or just press **`⌥+Space`** (macOS) to start speaking.

---

## Architecture

```
┌─────────────────────────────────────────┐
│  Claude Code                            │
│                                         │
│  ┌─────────────┐    ┌───────────────┐   │
│  │  /voice cmd  │───▶│  STT Engine   │   │
│  │  ⌥+Space     │    │  ┌─────────┐  │   │
│  │              │    │  │Whisper   │  │   │
│  │              │    │  │SFSpeech  │  │   │
│  │              │    │  └─────────┘  │   │
│  └─────────────┘    └──────┬────────┘   │
│                            │ text       │
│                            ▼            │
│  ┌─────────────┐    ┌───────────────┐   │
│  │  TTS Engine  │◀───│  Claude Code  │   │
│  │  ┌─────────┐ │    │  (processes   │   │
│  │  │say      │ │    │   command)    │   │
│  │  │espeak-ng│ │    │              │   │
│  │  └─────────┘ │    └───────────────┘   │
│  └─────────────┘                        │
│                                         │
│  Hooks: Stop (TTS), PreToolUse (VAD)    │
└─────────────────────────────────────────┘
```

---

## STT Engines

| Engine | Platform | Coding Accuracy | Latency | Korean+English |
|--------|----------|----------------|---------|----------------|
| **Whisper.cpp** | macOS | High | ~300ms | Yes |
| **SFSpeech** | macOS | Medium | ~200ms | Partial |
| **Vosk** | Linux | Medium | ~400ms | Yes |

Default: Whisper.cpp on macOS, Vosk on Linux. Override with `/voice-config`.

---

## Roadmap

- [x] Core STT/TTS pipeline
- [ ] VAD with auto-send
- [ ] Whisper.cpp engine
- [ ] `/voice-chat` continuous mode
- [ ] LLM refinement (spoken → developer instruction)
- [ ] Linux support
- [ ] PR to [anthropics/claude-code](https://github.com/anthropics/claude-code)

---

## Related Issues

This plugin addresses these Claude Code issues:

| Issue | Title |
|-------|-------|
| [#14444](https://github.com/anthropics/claude-code/issues/14444) | Native support for audio as a modality |
| [#27908](https://github.com/anthropics/claude-code/issues/27908) | Voice Mode in Claude Code |
| [#24619](https://github.com/anthropics/claude-code/issues/24619) | Add speech-to-text support in chat input |
| [#26113](https://github.com/anthropics/claude-code/issues/26113) | Microphone/voice input button in VS Code |
| [#2189](https://github.com/anthropics/claude-code/issues/2189) | Text-to-speech output |

---

## Contributing

Contributions welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT — see [LICENSE](LICENSE)

---

<div align="center">

**Talk to code. Code by voice. Zero keystrokes.**

</div>
