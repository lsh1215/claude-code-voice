<p align="center">
  <a href="README.md">English</a> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.zh.md">中文</a>
</p>

<div align="center">

# claude-code-voice

[![GitHub stars](https://img.shields.io/github/stars/lsh1215/claude-code-voice?style=flat&color=yellow)](https://github.com/lsh1215/claude-code-voice/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

**Claude Code 语音插件。**

*用声音编程。无需键盘。*

[快速开始](#快速开始) · [功能](#功能) · [架构](#架构) · [路线图](#路线图)

</div>

---

## 为什么

Claude Code 理解自然语言。**最快的自然语言输入方式是语音** — 打字 40 WPM vs 语音 150 WPM。但 Claude Code 完全没有语音支持。

有[超过10个 GitHub Issue](https://github.com/anthropics/claude-code/issues?q=voice+OR+speech+OR+audio+OR+microphone) 请求这个功能，但没有任何人在负责。

这个插件填补了这个空白。

---

## 能做什么

| 你... | 插件会... |
|-------|---------|
| 按下快捷键说话 | 将语音转换为文本，发送给 Claude Code |
| 说完一个命令 | Claude Code 用语音回复（TTS） |
| 沉默1.5秒 | 自动检测语音结束，发送命令 |
| 说得模糊 | 将口语整理为精确的开发者指令 |
| 想要连续对话 | 进入语音聊天模式 — 说、听、再说 |

---

## 功能

| 功能 | 说明 |
|------|------|
| **STT（语音→文本）** | 端侧语音识别 — macOS SFSpeech、Whisper.cpp |
| **TTS（文本→语音）** | 朗读回复 — macOS `say`、Linux `espeak-ng` |
| **VAD（静音检测）** | 自动检测说话结束 |
| **语音聊天模式** | 连续对话 — 说、听、再说 |
| **LLM 精炼** | 将口语转换为开发者指令 |
| **跨平台** | macOS、Linux（含 WSL） |

---

## 快速开始

### 环境要求

- [Claude Code](https://docs.anthropic.com/claude-code) CLI
- macOS 14+ 或 Linux（PulseAudio/PipeWire）
- 麦克风

### 安装

```bash
# 克隆
git clone https://github.com/lsh1215/claude-code-voice.git
cd claude-code-voice

# 安装
./setup.sh
```

### 使用

```bash
# 语音输入（单次）
/voice

# 连续语音聊天
/voice-chat

# 设置
/voice-config
```

或直接按 **`⌥+Space`**（macOS）开始说话。

---

## 架构

```
┌─────────────────────────────────────────┐
│  Claude Code                            │
│                                         │
│  ┌─────────────┐    ┌───────────────┐   │
│  │  /voice 命令  │───▶│  STT 引擎     │   │
│  │  ⌥+Space     │    │  ┌─────────┐  │   │
│  │              │    │  │Whisper   │  │   │
│  │              │    │  │SFSpeech  │  │   │
│  │              │    │  └─────────┘  │   │
│  └─────────────┘    └──────┬────────┘   │
│                            │ 文本       │
│                            ▼            │
│  ┌─────────────┐    ┌───────────────┐   │
│  │  TTS 引擎    │◀───│  Claude Code  │   │
│  │  ┌─────────┐ │    │  （处理命令）   │   │
│  │  │say      │ │    │              │   │
│  │  │espeak-ng│ │    │              │   │
│  │  └─────────┘ │    └───────────────┘   │
│  └─────────────┘                        │
│                                         │
│  钩子: Stop (TTS), PreToolUse (VAD)     │
└─────────────────────────────────────────┘
```

---

## STT 引擎

| 引擎 | 平台 | 编程术语准确度 | 延迟 | 中文+英文 |
|------|------|--------------|------|---------|
| **Whisper.cpp** | macOS | 高 | ~300ms | 支持 |
| **SFSpeech** | macOS | 中 | ~200ms | 部分支持 |
| **Vosk** | Linux | 中 | ~400ms | 支持 |

默认：macOS 使用 Whisper.cpp，Linux 使用 Vosk。可通过 `/voice-config` 更改。

---

## 路线图

- [x] 核心 STT/TTS 管线
- [ ] VAD 自动发送
- [ ] Whisper.cpp 引擎
- [ ] `/voice-chat` 连续对话模式
- [ ] LLM 精炼（口语 → 开发者指令）
- [ ] Linux 支持
- [ ] 向 [anthropics/claude-code](https://github.com/anthropics/claude-code) 提交 PR

---

## 相关 Issue

本插件解决以下 Claude Code Issue：

| Issue | 标题 |
|-------|------|
| [#14444](https://github.com/anthropics/claude-code/issues/14444) | Native support for audio as a modality |
| [#27908](https://github.com/anthropics/claude-code/issues/27908) | Voice Mode in Claude Code |
| [#24619](https://github.com/anthropics/claude-code/issues/24619) | Add speech-to-text support in chat input |
| [#26113](https://github.com/anthropics/claude-code/issues/26113) | Microphone/voice input button in VS Code |
| [#2189](https://github.com/anthropics/claude-code/issues/2189) | Text-to-speech output |

---

## 贡献

欢迎贡献。请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

## 许可证

MIT — 参见 [LICENSE](LICENSE)

---

<div align="center">

**用声音编程。无需键盘。**

</div>
