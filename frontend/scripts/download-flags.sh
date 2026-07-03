#!/bin/sh
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/public/flags"
BASE="https://cdn.jsdelivr.net/npm/flag-icons@7.2.3/flags/4x3"

mkdir -p "$OUT"

download() {
  code="$1"
  url="$BASE/${code}.svg"
  dest="$OUT/${code}.svg"
  echo "Downloading $code flag..."
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$dest"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$dest" "$url"
  else
    echo "Need curl or wget to download flags." >&2
    exit 1
  fi
}

download es
download gb

echo "Flags saved to $OUT (flag-icons, MIT license)"
