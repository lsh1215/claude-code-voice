#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$REPO_ROOT/plugin"

echo "=================================================="
echo "  claude-code-voice setup"
echo "=================================================="
echo ""

# -------------------------------------------------------
# 1. Check prerequisites
# -------------------------------------------------------
echo "[1/5] Checking prerequisites..."

MISSING=0

if ! command -v node &>/dev/null; then
  echo "  ❌  node not found. Install from https://nodejs.org"
  MISSING=1
else
  NODE_VERSION=$(node --version)
  echo "  ✅  node $NODE_VERSION"
fi

if ! command -v whisper-cli &>/dev/null || ! command -v whisper-server &>/dev/null; then
  echo "  ❌  whisper-cli or whisper-server not found."
  echo "      macOS: brew install whisper-cpp"
  echo "      Linux: see https://github.com/ggerganov/whisper.cpp"
  MISSING=1
else
  echo "  ✅  whisper-cli at $(command -v whisper-cli)"
  echo "  ✅  whisper-server at $(command -v whisper-server)"
fi

if ! command -v ffmpeg &>/dev/null; then
  echo "  ❌  ffmpeg not found."
  echo "      macOS: brew install ffmpeg"
  echo "      Linux: sudo apt install ffmpeg"
  MISSING=1
else
  FFMPEG_VERSION=$(ffmpeg -version 2>&1 | head -1)
  echo "  ✅  $FFMPEG_VERSION"
fi

if [ "$MISSING" -ne 0 ]; then
  echo ""
  echo "Please install the missing prerequisites listed above, then re-run setup.sh"
  exit 1
fi

echo ""

# -------------------------------------------------------
# 2. Install npm dependencies
# -------------------------------------------------------
echo "[2/5] Installing npm dependencies..."
cd "$PLUGIN_DIR"
npm ci --silent
echo "  ✅  npm dependencies installed"
echo ""

# -------------------------------------------------------
# 3. Build TypeScript
# -------------------------------------------------------
echo "[3/5] Building TypeScript..."
npm run build
echo "  ✅  Build complete (plugin/dist/)"
echo ""

# -------------------------------------------------------
# 4. Generate plugin/commands/voice.md and voice-config.md from templates
# -------------------------------------------------------
echo "[4/5] Generating plugin/commands/voice.md and voice-config.md..."
TEMPLATE="$PLUGIN_DIR/commands/voice.md.template"
OUTPUT="$PLUGIN_DIR/commands/voice.md"

if [ ! -f "$TEMPLATE" ]; then
  echo "  ❌  Template not found: $TEMPLATE"
  exit 1
fi

sed "s|{{PLUGIN_DIR}}|$PLUGIN_DIR|g" "$TEMPLATE" > "$OUTPUT"
echo "  ✅  Generated: $OUTPUT"
echo "      Using plugin dir: $PLUGIN_DIR"

TEMPLATE_VC="$PLUGIN_DIR/commands/voice-config.md.template"
OUTPUT_VC="$PLUGIN_DIR/commands/voice-config.md"

if [ ! -f "$TEMPLATE_VC" ]; then
  echo "  ❌  Template not found: $TEMPLATE_VC"
  exit 1
fi

sed "s|{{PLUGIN_DIR}}|$PLUGIN_DIR|g" "$TEMPLATE_VC" > "$OUTPUT_VC"
echo "  ✅  Generated: $OUTPUT_VC"
echo ""

# -------------------------------------------------------
# 5. Check / download whisper model
# -------------------------------------------------------
echo "[5/5] Setting up whisper model..."
mkdir -p "$REPO_ROOT/models"

TURBO_MODEL="$REPO_ROOT/models/ggml-large-v3-turbo-q5_0.bin"
BASE_MODEL="$REPO_ROOT/models/ggml-base.bin"

if [ -f "$TURBO_MODEL" ]; then
  echo "  ✅  Model found: $TURBO_MODEL"
elif [ -f "$BASE_MODEL" ]; then
  echo "  ✅  Model found: $BASE_MODEL"
  echo "  ℹ️   For better Korean-English accuracy, consider downloading the turbo model:"
  echo "      curl -L \"https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin\" \\"
  echo "           -o \"$TURBO_MODEL\""
else
  echo ""
  echo "  No model found. Select a model to download:"
  echo "  [1] ggml-large-v3-turbo-q5_0.bin (~600MB) — recommended (better Korean-English accuracy)"
  echo "  [2] ggml-base.bin (~141MB) — faster download"
  echo ""
  read -rp "  Choose [1/2, default=1]: " model_choice
  case "$model_choice" in
    2)
      MODEL_URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin"
      MODEL_PATH="$BASE_MODEL"
      MODEL_NAME="ggml-base.bin"
      ;;
    *)
      MODEL_URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin"
      MODEL_PATH="$TURBO_MODEL"
      MODEL_NAME="ggml-large-v3-turbo-q5_0.bin"
      ;;
  esac
  echo ""
  echo "  Downloading $MODEL_NAME..."
  curl -L --progress-bar "$MODEL_URL" -o "$MODEL_PATH"
  echo "  ✅  Model downloaded: $MODEL_PATH"
fi
echo ""

# -------------------------------------------------------
# Done — print usage
# -------------------------------------------------------
echo "=================================================="
echo "  Setup complete!"
echo "=================================================="
echo ""
echo "Usage:"
echo "  claude --plugin-dir \"$PLUGIN_DIR\""
echo ""
echo "Then inside Claude Code, run:"
echo "  /voice"
echo ""
echo "For Claude Code config, you can also add to your settings:"
echo "  { \"pluginDir\": \"$PLUGIN_DIR\" }"
echo ""
