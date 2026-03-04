# Release Notes

## v0.2.0 — 2026-03-04

**whisper-server Daemon Mode + Large-v3-Turbo Model**

### Summary

v0.2.0의 두 가지 핵심 문제를 해결합니다:
1. **인식률**: `ggml-base` 모델의 KO-EN 코드스위칭 MER 97.8% (사실상 사용 불가) → `ggml-large-v3-turbo-q5_0` (~26–28% MER)
2. **지연**: `/voice` 실행마다 모델을 subprocess로 새로 로드 (cold-start 2–5 s) → 데몬 방식으로 모델 상주, 이후 호출 0 s overhead

### What's New

#### whisper-server Daemon
- 첫 `/voice` 실행 시 `whisper-server`를 백그라운드 데몬으로 기동 (PID 파일: `~/.claude/plugins/voice/whisper-server.pid`)
- 이후 `/voice`는 HTTP `POST /inference`로 이미 메모리에 올라간 모델에 바로 요청
- `/voice-config stop-server`로 데몬 수동 종료 가능
- 서버 기동 실패 시 `whisper-cli`로 자동 fallback

#### 모델 업그레이드
- 기본 모델: `ggml-large-v3-turbo-q5_0.bin` (~600 MB, 양자화 5-bit)
- `setup.sh` 실행 시 대화형 모델 선택 (turbo 권장 / base 경량)
- 이미 모델이 있으면 다운로드 스킵

#### 추론 최적화
- Greedy decoding (`-bs -1 -bo 1`): 추론 시간 < 1 s (기존 beam-size 5: 5–15 s)
- Developer initial-prompt: `"null pointer exception, async await, useState, TypeScript, JWT, API endpoint, 에러, 함수, 클래스"` — KO-EN 혼용 개발자 용어 인식률 향상

#### 마이크 자동 감지
- `/voice-config detect-mic`: ffmpeg avfoundation 장치 목록에서 iPhone/iPad/AirPods 제외, MacBook 마이크 인덱스 자동 감지 후 저장

### New Config Options

```bash
/voice-config set sttEngine whisper-server   # default
/voice-config set sttEngine whisper-cli       # legacy
/voice-config set whisperServerPort 18080     # default
/voice-config stop-server                     # stop daemon
/voice-config detect-mic                      # auto-detect mic index
```

### Requirements

- macOS 14+, Node.js 20+
- `brew install whisper-cpp ffmpeg`
- whisper-server binary: included in `brew install whisper-cpp` (v1.8.3+)

### Setup

```bash
git clone https://github.com/lsh1215/claude-code-voice.git
cd claude-code-voice
./setup.sh   # interactive: choose turbo (~600MB) or base (~141MB)
claude --plugin-dir ./plugin
# inside Claude Code:
/voice
```

### Test Results

| Type | Count |
|------|-------|
| Unit | 118/118 |
| Integration | 41/41 |
| Contract | 17/17 |
| Performance | 7/7 (sic) |
| **Total** | **206/206** |

---

## v0.1.0

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
