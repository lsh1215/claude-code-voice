# Release Notes

## v0.2.0

**Voice Plugin Core — STT + VAD (Speech-to-Text with auto-stop)**

### What's New

- `/voice` slash command: speak into your mic, whisper-cli transcribes, output becomes Claude Code input
- Korean + English code-switching support (e.g., "auth.py에서 JWT 만료 처리해줘")
- RMS-based VAD (Voice Activity Detection): recording auto-stops after 1.5 s of silence — no manual stop needed
- ffmpeg audio capture via macOS `avfoundation` (`:0` default mic)
- whisper-cli backend (`brew install whisper-cpp`) with `ggml-base` model (~141 MB)
- Config stored in `~/.claude/plugins/voice/config.json` (language, model path, VAD threshold)
- `setup.sh` install script: checks prereqs, builds TypeScript, generates `commands/voice.md` with correct path
- 16 tests passing (11 unit + 5 integration)

### Requirements

- macOS 14+
- `brew install whisper-cpp ffmpeg`
- Download model: `curl -L "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin" -o models/ggml-base.bin`

### Usage

```bash
./setup.sh
claude --plugin-dir ./plugin
# inside Claude Code:
/voice
```
