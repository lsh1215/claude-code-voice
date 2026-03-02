<p align="center">
  <a href="README.md">English</a> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.zh.md">中文</a>
</p>

<div align="center">

# claude-code-voice

[![GitHub stars](https://img.shields.io/github/stars/lsh1215/claude-code-voice?style=flat&color=yellow)](https://github.com/lsh1215/claude-code-voice/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

**Claude Code 音声プラグイン。**

*声でコーディング。キーボード不要。*

[はじめに](#はじめに) · [機能](#機能) · [アーキテクチャ](#アーキテクチャ) · [ロードマップ](#ロードマップ)

</div>

---

## なぜ作ったのか

Claude Codeは自然言語を理解します。**最も速い自然言語入力は音声です** — タイピング40 WPM vs 音声150 WPM。しかし、Claude Codeには音声サポートが全くありません。

この機能を要求する[GitHubイシューが10件以上](https://github.com/anthropics/claude-code/issues?q=voice+OR+speech+OR+audio+OR+microphone)ありますが、担当者は0人です。

このプラグインがそのギャップを埋めます。

---

## できること

| あなたが... | プラグインが... |
|------------|---------------|
| ホットキーを押して話す | 音声をテキストに変換してClaude Codeに送信 |
| コマンドを終える | Claude Codeが音声で応答（TTS） |
| 1.5秒沈黙する | 自動で発話終了を検知してコマンドを送信 |
| 曖昧に話す | 正確な開発者指示に整える |
| 連続会話したい | 音声チャットモードで — 話して、聞いて、また話す |

---

## 機能

| 機能 | 説明 |
|------|------|
| **STT（音声→テキスト）** | オンデバイス音声認識 — macOS SFSpeech、Whisper.cpp |
| **TTS（テキスト→音声）** | 応答の読み上げ — macOS `say`、Linux `espeak-ng` |
| **VAD（沈黙検知）** | 発話終了を自動検知 |
| **音声チャットモード** | 連続会話 — 話す、聞く、また話す |
| **LLM精製** | 口語を開発者指示に変換 |
| **クロスプラットフォーム** | macOS、Linux（WSL含む） |

---

## はじめに

### 必要なもの

- [Claude Code](https://docs.anthropic.com/claude-code) CLI
- macOS 14+ または Linux（PulseAudio/PipeWire）
- マイク

### インストール

```bash
# クローン
git clone https://github.com/lsh1215/claude-code-voice.git
cd claude-code-voice

# インストール
./setup.sh
```

### 使い方

```bash
# 音声入力（1回）
/voice

# 連続音声チャット
/voice-chat

# 設定
/voice-config
```

または **`⌥+Space`**（macOS）を押してすぐ話せます。

---

## アーキテクチャ

```
┌─────────────────────────────────────────┐
│  Claude Code                            │
│                                         │
│  ┌─────────────┐    ┌───────────────┐   │
│  │  /voice cmd  │───▶│  STTエンジン   │   │
│  │  ⌥+Space     │    │  ┌─────────┐  │   │
│  │              │    │  │Whisper   │  │   │
│  │              │    │  │SFSpeech  │  │   │
│  │              │    │  └─────────┘  │   │
│  └─────────────┘    └──────┬────────┘   │
│                            │ テキスト   │
│                            ▼            │
│  ┌─────────────┐    ┌───────────────┐   │
│  │  TTSエンジン  │◀───│  Claude Code  │   │
│  │  ┌─────────┐ │    │ （コマンド処理）│   │
│  │  │say      │ │    │              │   │
│  │  │espeak-ng│ │    │              │   │
│  │  └─────────┘ │    └───────────────┘   │
│  └─────────────┘                        │
│                                         │
│  フック: Stop (TTS), PreToolUse (VAD)    │
└─────────────────────────────────────────┘
```

---

## STTエンジン

| エンジン | プラットフォーム | コーディング用語精度 | レイテンシ | 日本語+英語 |
|---------|----------------|-------------------|----------|-----------|
| **Whisper.cpp** | macOS | 高い | ~300ms | 対応 |
| **SFSpeech** | macOS | 普通 | ~200ms | 部分対応 |
| **Vosk** | Linux | 普通 | ~400ms | 対応 |

デフォルト：macOSはWhisper.cpp、LinuxはVosk。`/voice-config`で変更可能。

---

## ロードマップ

- [x] コアSTT/TTSパイプライン
- [ ] VAD自動送信
- [ ] Whisper.cppエンジン
- [ ] `/voice-chat` 連続会話モード
- [ ] LLM精製（口語 → 開発者指示）
- [ ] Linuxサポート
- [ ] [anthropics/claude-code](https://github.com/anthropics/claude-code)へPR提出

---

## 関連イシュー

このプラグインは以下のClaude Codeイシューに対応します：

| イシュー | タイトル |
|---------|---------|
| [#14444](https://github.com/anthropics/claude-code/issues/14444) | Native support for audio as a modality |
| [#27908](https://github.com/anthropics/claude-code/issues/27908) | Voice Mode in Claude Code |
| [#24619](https://github.com/anthropics/claude-code/issues/24619) | Add speech-to-text support in chat input |
| [#26113](https://github.com/anthropics/claude-code/issues/26113) | Microphone/voice input button in VS Code |
| [#2189](https://github.com/anthropics/claude-code/issues/2189) | Text-to-speech output |

---

## コントリビュート

貢献を歓迎します。[CONTRIBUTING.md](CONTRIBUTING.md)をご参照ください。

---

## ライセンス

MIT — [LICENSE](LICENSE)を参照

---

<div align="center">

**声でコーディング。キーボード不要。**

</div>
