#!/usr/bin/env bash
# Pasang dan sediakan HyperFrames dalam sesi Claude Code (awan) atau komputer Linux/macOS.
#   bash tools/setup-hyperframes.sh          -> pasang CLI + semak sistem
#   bash tools/setup-hyperframes.sh --tts    -> tambah suara AI tempatan (Kokoro, bahasa Inggeris dll.)
# Skill HyperFrames sudah ada dalam .claude/skills/ repo ini (versi sama dengan CLI di bawah).
set -euo pipefail
VERSION="${HYPERFRAMES_VERSION:-0.9.20}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Perlu '$1' (lihat https://hyperframes.heygen.com)" >&2; exit 1; }; }
need node; need ffmpeg
node -e 'process.exit(parseInt(process.versions.node) >= 22 ? 0 : 1)' || { echo "Perlu Node.js 22+" >&2; exit 1; }

if ! command -v hyperframes >/dev/null 2>&1 || [[ "$(hyperframes --version 2>/dev/null)" != "$VERSION" ]]; then
  npm install -g "hyperframes@${VERSION}"   # npm sahkan integriti pakej (sha512) secara automatik
fi

# Laluan render pantas: guna chrome-headless-shell yang sedia ada (sesi awan Claude Code)
HS=$(ls -d /opt/pw-browsers/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell 2>/dev/null | head -1 || true)
if [[ -n "$HS" ]]; then
  echo "Petua: export HYPERFRAMES_BROWSER_PATH=$HS"
fi

if [[ "${1:-}" == "--tts" ]]; then
  pip install -q kokoro-onnx soundfile
fi

hyperframes doctor || true   # semakan pilihan (whisper, MusicGen, Docker) boleh gagal tanpa masalah
echo "HyperFrames ${VERSION} sedia."
