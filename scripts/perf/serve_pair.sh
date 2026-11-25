#!/usr/bin/env bash
# Usage: scripts/perf/serve_pair.sh BASE_DIST PR_DIST [BASE_API_PORT] [PR_API_PORT]
# Serves two frontend builds with this checkout's server.js: base on https://localhost:8443,
# PR on https://localhost:8444, each sending /api to its own API port (default 8000 for both).
# Env: PERF_WORK (default /tmp/bev-perf) holds the certificate, logs and pid files.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="${PERF_WORK:-/tmp/bev-perf}"
mkdir -p "$WORK"

for pid_file in "$WORK"/*.pid; do
  [[ -e "$pid_file" ]] && kill "$(cat "$pid_file")" 2>/dev/null || true
  rm -f "$pid_file"
done

if [[ ! -f "$WORK/cert.pem" ]]; then
  openssl req -x509 -newkey rsa:2048 -nodes -days 30 -subj /CN=localhost \
    -keyout "$WORK/key.pem" -out "$WORK/cert.pem" 2>/dev/null
  openssl x509 -in "$WORK/cert.pem" -pubkey -noout | openssl pkey -pubin -outform der \
    | openssl dgst -sha256 -binary | base64 > "$WORK/spki.txt"
fi

serve() {
  local side="$1" dist="$2" static_port="$3" tls_port="$4" api_port="$5"
  local dir="$WORK/$side"
  rm -rf "$dir" && mkdir -p "$dir/server"
  cp "$ROOT/frontend/server.js" "$dir/"
  cp "$ROOT/frontend/server/staticServer.js" "$dir/server/"
  echo '{"type":"module"}' > "$dir/package.json"
  ln -sfn "$(cd "$dist" && pwd)" "$dir/dist"
  (cd "$dir" && PORT="$static_port" node server.js > "$WORK/$side.log" 2>&1 & echo $! > "$WORK/$side-static.pid")
  node "$ROOT/scripts/perf/tls_proxy.mjs" "$tls_port" "$static_port" "$api_port" "$WORK" \
    > "$WORK/$side-tls.log" 2>&1 & echo $! > "$WORK/$side-tls.pid"
}

serve base "$1" 8001 8443 "${3:-8000}"
serve pr "$2" 8002 8444 "${4:-8000}"

for side in base pr; do
  for _ in $(seq 60); do grep -q listening "$WORK/$side.log" 2>/dev/null && break; sleep 0.5; done
  cat "$WORK/$side.log"
done
