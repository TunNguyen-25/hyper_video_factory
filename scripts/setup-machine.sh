#!/usr/bin/env bash
set -uo pipefail

MODE="${1:---check}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "$MODE" != "--check" && "$MODE" != "--install" ]]; then
  echo "Usage: $0 --check|--install" >&2
  exit 2
fi

version_line() {
  local label="$1"
  local command_name="$2"
  shift 2
  if command -v "$command_name" >/dev/null 2>&1; then
    printf 'OK   %-18s %s\n' "$label" "$("$@" 2>&1 | head -n 1)"
    return 0
  fi
  printf 'MISS %-18s not found\n' "$label"
  return 1
}

check_all() {
  local failed=0
  if command -v node >/dev/null 2>&1; then
    local node_major
    node_major="$(node -p 'process.versions.node.split(".")[0]')"
    if (( node_major >= 22 )); then
      printf 'OK   %-18s %s\n' "Node.js" "$(node --version)"
    else
      printf 'OLD  %-18s %s (need >=22)\n' "Node.js" "$(node --version)"
      failed=1
    fi
  else
    printf 'MISS %-18s not found\n' "Node.js"
    failed=1
  fi
  version_line "npm" npm npm --version || failed=1
  version_line "FFmpeg" ffmpeg ffmpeg -version || failed=1
  version_line "FFprobe" ffprobe ffprobe -version || failed=1
  version_line "Git" git git --version || failed=1
  if [[ -x "$PROJECT_DIR/node_modules/.bin/hyperframes" ]]; then
    printf 'OK   %-18s %s\n' "HyperFrames CLI" "$("$PROJECT_DIR/node_modules/.bin/hyperframes" --version 2>&1 | head -n 1)"
  else
    printf 'MISS %-18s run npm ci\n' "HyperFrames CLI"
    failed=1
  fi
  return "$failed"
}

install_macos() {
  if ! command -v brew >/dev/null 2>&1; then
    echo "Homebrew is required. Install it from https://brew.sh, then rerun this script." >&2
    exit 1
  fi
  echo "Installing system packages with Homebrew..."
  brew install node@22 ffmpeg git
  brew link --overwrite node@22 >/dev/null 2>&1 || true
}

install_debian() {
  echo "Installing system packages with apt..."
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl ffmpeg git
  if ! command -v node >/dev/null 2>&1 || (( $(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0) < 22 )); then
    local installer
    installer="$(mktemp)"
    curl -fsSL https://deb.nodesource.com/setup_22.x -o "$installer"
    sudo -E bash "$installer"
    rm -f "$installer"
    sudo apt-get install -y nodejs
  fi
}

if [[ "$MODE" == "--check" ]]; then
  check_all
  exit $?
fi

case "$(uname -s)" in
  Darwin) install_macos ;;
  Linux)
    if [[ -f /etc/debian_version ]]; then install_debian
    else echo "Automatic install supports Debian/Ubuntu only. Install Node 22+, FFmpeg, FFprobe, Git, then run npm ci." >&2; exit 1
    fi
    ;;
  *) echo "Unsupported OS. Install Node 22+, FFmpeg, FFprobe, Git, then run npm ci." >&2; exit 1 ;;
esac

cd "$PROJECT_DIR"
if [[ -f package-lock.json ]]; then npm ci; else npm install; fi
"$PROJECT_DIR/node_modules/.bin/hyperframes" browser ensure
check_all
