#!/usr/bin/env bash
# JOURIVA dev database — initialize/start local PostgreSQL (sandbox/dev only).
# Production uses a managed PostgreSQL via DATABASE_URL (see docs/07-environment.md).
set -e
PG_BIN=/usr/lib/postgresql/17/bin
PG_DIR="$HOME/.pg/jouriva"
mkdir -p "$HOME/.pg"
if [ ! -d "$PG_DIR" ]; then
  "$PG_BIN/initdb" -D "$PG_DIR" -U postgres --auth=trust --encoding=UTF8 >/dev/null
fi
if ! "$PG_BIN/pg_ctl" -D "$PG_DIR" status >/dev/null 2>&1; then
  "$PG_BIN/pg_ctl" -D "$PG_DIR" -l "$HOME/.pg/jouriva.log" \
    -o "-p 5432 -k $HOME/.pg -c listen_addresses=127.0.0.1" start >/dev/null
fi
"$PG_BIN/psql" -h 127.0.0.1 -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='jouriva'" | grep -q 1 \
  || "$PG_BIN/psql" -h 127.0.0.1 -U postgres -c "CREATE DATABASE jouriva"
echo "PostgreSQL ready: postgresql://postgres@127.0.0.1:5432/jouriva"
