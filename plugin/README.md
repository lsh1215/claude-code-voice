# claude-code-voice plugin

Voice (STT) input for Claude Code. Speak into your microphone, whisper transcribes the audio locally, and the resulting text is submitted as Claude Code input. Korean+English code-switching is fully supported — you can mix both languages in a single utterance.

## Requirements

- macOS 14+
- Node.js 20+
- `whisper-cli` and `ffmpeg` installed via Homebrew
- A whisper ggml model file

```bash
brew install whisper-cpp ffmpeg
```

Download the base model (recommended starting point):

```bash
mkdir -p models
curl -L "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin" \
  -o models/ggml-base.bin
```

## Install

Run `setup.sh` from the repository root. It installs Node dependencies, compiles TypeScript, and generates the `/voice` command file.

```bash
./setup.sh
```

## Usage

Load the plugin when starting Claude Code:

```bash
claude --plugin-dir ./plugin
```

Then use the `/voice` command inside a Claude Code session:

```
/voice
```

Recording starts immediately. Speak your instruction. Recording stops automatically after 1.5 seconds of silence. The transcribed text is submitted as your next Claude Code input.

**Korean+English example:**

```
/voice
# say: "auth.py에서 JWT 만료 처리해줘"
# result: "auth.py에서 JWT 만료 처리해줘"
```

## Configuration

Config file location: `~/.claude/plugins/voice/config.json`

| Key | Default | Description |
|-----|---------|-------------|
| `language` | `"ko"` | Transcription language: `"ko"`, `"en"`, or `"auto"` |
| `modelPath` | auto-detected | Absolute path to the ggml model file |
| `silenceDurationMs` | `1500` | Milliseconds of silence before recording stops |
| `vadThreshold` | `0.02` | RMS silence threshold. Range: `0.01`–`0.1`. Lower = more sensitive |
| `autoSubmit` | `false` | Submit transcription directly without showing it first |
| `debug` | `false` | Enable verbose logging via `CLAUDE_VOICE_DEBUG=1` |

Example config:

```json
{
  "language": "auto",
  "silenceDurationMs": 2000,
  "vadThreshold": 0.015
}
```

The plugin merges your config with defaults, so you only need to include keys you want to override.

## Troubleshooting

**Microphone permission denied**
Open System Settings → Privacy & Security → Microphone and enable access for Terminal (or your terminal app).

**Model not found**
Download the model to the expected location:
```bash
mkdir -p models
curl -L "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin" \
  -o models/ggml-base.bin
```
Or set `modelPath` in your config to an existing model file.

**`whisper-cli` not found**
```bash
brew install whisper-cpp
```

**`ffmpeg` not found**
```bash
brew install ffmpeg
```

**No speech detected / empty transcription**
Speak closer to the microphone or lower `vadThreshold` in your config (e.g., `0.01`). If the recording cuts off too early, increase `silenceDurationMs`.

**Enable debug logging**
```bash
CLAUDE_VOICE_DEBUG=1 claude --plugin-dir ./plugin
```

## Development

```bash
cd plugin
npm test        # run all 16 tests
npm run build   # compile TypeScript to dist/
npm run dev     # watch mode
```

Tests cover audio capture, VAD silence detection, whisper engine, config loading, and platform utilities.

## License

MIT
