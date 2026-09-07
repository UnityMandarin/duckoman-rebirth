#!/bin/sh
set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$project_root"

baseline_commit=$(git rev-list --max-parents=0 HEAD)

git diff --exit-code --no-ext-diff "$baseline_commit" -- \
  Assets/Scripts \
  Assets/Scenes \
  Assets/Prefabs \
  Assets/Animations \
  Assets/Controllers \
  Assets/Materials \
  ProjectSettings \
  Release

printf '%s\n' "PASS: behavior-critical files match baseline $baseline_commit"
