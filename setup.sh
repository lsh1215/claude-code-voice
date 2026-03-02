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

if ! command -v whisper-cli &>/dev/null; then
  echo "  ❌  whisper-cli not found."
  echo "      macOS: brew install whisper-cpp"
  echo "      Linux: see https://github.com/ggerganov/whisper.cpp"
  MISSING=1
else
  echo "  ✅  whisper-cli $(whisper-cli --version 2>&1 | head -1 || echo '(found)')"
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
# 4. Generate plugin/commands/voice.md from template
# -------------------------------------------------------
echo "[4/5] Generating plugin/commands/voice.md..."
TEMPLATE="$PLUGIN_DIR/commands/voice.md.template"
OUTPUT="$PLUGIN_DIR/commands/voice.md"

if [ ! -f "$TEMPLATE" ]; then
  echo "  ❌  Template not found: $TEMPLATE"
  exit 1
fi

sed "s|{{PLUGIN_DIR}}|$PLUGIN_DIR|g" "$TEMPLATE" > "$OUTPUT"
echo "  ✅  Generated: $OUTPUT"
echo "      Using plugin dir: $PLUGIN_DIR"
echo ""

# -------------------------------------------------------
# 5. Check / note whisper model
# -------------------------------------------------------
echo "[5/5] Checking whisper model..."
MODEL_PATH="$REPO_ROOT/models/ggml-base.bin"
if [ -f "$MODEL_PATH" ]; then
  echo "  ✅  Model found: $MODEL_PATH"
else
  echo "  ⚠️   Model not found at: $MODEL_PATH"
  echo ""
  echo "  Download the base model with:"
  echo "    mkdir -p \"$REPO_ROOT/models\""
  echo "    curl -L \"https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin\" \\"
  echo "         -o \"$MODEL_PATH\""
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
