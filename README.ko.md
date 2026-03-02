<p align="center">
  <a href="README.md">English</a> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.zh.md">中文</a>
</p>

<div align="center">

# claude-code-voice

[![GitHub stars](https://img.shields.io/github/stars/lsh1215/claude-code-voice?style=flat&color=yellow)](https://github.com/lsh1215/claude-code-voice/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

**Claude Code 음성 플러그인.**

*말로 코딩하세요. 키보드 없이.*

[시작하기](#시작하기) · [기능](#기능) · [아키텍처](#아키텍처) · [로드맵](#로드맵)

</div>

---

## 왜 만들었나

Claude Code는 자연어를 이해합니다. **가장 빠른 자연어 입력은 음성입니다** — 타이핑 40 WPM vs 음성 150 WPM. 하지만 Claude Code에는 음성 지원이 전혀 없습니다.

이 기능을 요청하는 [GitHub 이슈가 10개 이상](https://github.com/anthropics/claude-code/issues?q=voice+OR+speech+OR+audio+OR+microphone) 있지만, 담당자는 0명입니다.

이 플러그인이 그 공백을 채웁니다.

---

## 이런 걸 할 수 있습니다

| 당신이... | 플러그인이... |
|-----------|-------------|
| 핫키를 누르고 말하면 | 음성을 텍스트로 변환해서 Claude Code에 전달합니다 |
| 명령을 마치면 | Claude Code가 음성으로 응답합니다 (TTS) |
| 1.5초 침묵하면 | 자동으로 말 끝남을 감지하고 명령을 전송합니다 |
| 애매하게 말하면 | 정확한 개발자 지시문으로 다듬어줍니다 |
| 연속 대화를 원하면 | 음성 채팅 모드로 — 말하고, 듣고, 다시 말하세요 |

---

## 기능

| 기능 | 설명 |
|------|------|
| **STT (음성→텍스트)** | 온디바이스 음성 인식 — macOS SFSpeech, Whisper.cpp |
| **TTS (텍스트→음성)** | 응답 읽어주기 — macOS `say`, Linux `espeak-ng` |
| **VAD (침묵 감지)** | 말이 끝나면 자동 감지 |
| **음성 채팅 모드** | 연속 대화 — 말하고, 듣고, 다시 말하기 |
| **LLM 정제** | 구어체를 개발자 지시문으로 변환 |
| **크로스 플랫폼** | macOS, Linux (WSL 포함) |

---

## 시작하기

### 요구 사항

- [Claude Code](https://docs.anthropic.com/claude-code) CLI
- macOS 14+ 또는 Linux (PulseAudio/PipeWire)
- 마이크

### 설치

```bash
# 클론
git clone https://github.com/lsh1215/claude-code-voice.git
cd claude-code-voice

# 설치
./setup.sh
```

### 사용법

```bash
# 음성 입력 (1회)
/voice

# 연속 음성 채팅
/voice-chat

# 설정
/voice-config
```

또는 **`⌥+Space`** (macOS)를 눌러 바로 말하세요.

---

## 아키텍처

```
┌─────────────────────────────────────────┐
│  Claude Code                            │
│                                         │
│  ┌─────────────┐    ┌───────────────┐   │
│  │  /voice 명령  │───▶│  STT 엔진     │   │
│  │  ⌥+Space     │    │  ┌─────────┐  │   │
│  │              │    │  │Whisper   │  │   │
│  │              │    │  │SFSpeech  │  │   │
│  │              │    │  └─────────┘  │   │
│  └─────────────┘    └──────┬────────┘   │
│                            │ 텍스트     │
│                            ▼            │
│  ┌─────────────┐    ┌───────────────┐   │
│  │  TTS 엔진    │◀───│  Claude Code  │   │
│  │  ┌─────────┐ │    │  (명령 처리)   │   │
│  │  │say      │ │    │              │   │
│  │  │espeak-ng│ │    │              │   │
│  │  └─────────┘ │    └───────────────┘   │
│  └─────────────┘                        │
│                                         │
│  훅: Stop (TTS), PreToolUse (VAD)       │
└─────────────────────────────────────────┘
```

---

## STT 엔진

| 엔진 | 플랫폼 | 코딩 용어 정확도 | 지연 | 한국어+영어 |
|------|--------|----------------|------|-----------|
| **Whisper.cpp** | macOS | 높음 | ~300ms | 지원 |
| **SFSpeech** | macOS | 보통 | ~200ms | 부분 지원 |
| **Vosk** | Linux | 보통 | ~400ms | 지원 |

기본값: macOS는 Whisper.cpp, Linux는 Vosk. `/voice-config`로 변경 가능.

---

## 로드맵

- [x] 핵심 STT/TTS 파이프라인
- [ ] VAD 자동 전송
- [ ] Whisper.cpp 엔진
- [ ] `/voice-chat` 연속 대화 모드
- [ ] LLM 정제 (구어체 → 개발자 지시문)
- [ ] Linux 지원
- [ ] [anthropics/claude-code](https://github.com/anthropics/claude-code)에 PR 제출

---

## 관련 이슈

이 플러그인은 다음 Claude Code 이슈들을 해결합니다:

| 이슈 | 제목 |
|------|------|
| [#14444](https://github.com/anthropics/claude-code/issues/14444) | Native support for audio as a modality |
| [#27908](https://github.com/anthropics/claude-code/issues/27908) | Voice Mode in Claude Code |
| [#24619](https://github.com/anthropics/claude-code/issues/24619) | Add speech-to-text support in chat input |
| [#26113](https://github.com/anthropics/claude-code/issues/26113) | Microphone/voice input button in VS Code |
| [#2189](https://github.com/anthropics/claude-code/issues/2189) | Text-to-speech output |

---

## 기여하기

기여를 환영합니다. [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.

---

## 라이선스

MIT — [LICENSE](LICENSE) 참고

---

<div align="center">

**말로 코딩하세요. 키보드 없이.**

</div>
