#!/usr/bin/env python3
"""Static smoke test for the archived Unity WebGL build and Rebirth shell."""

from __future__ import annotations

import gzip
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    html = INDEX.read_text(encoding="utf-8")

    local_refs = set(
        re.findall(r'(?:href|src)="((?!https?://|#)[^"]+)"', html)
    )
    local_refs.update(
        re.findall(r'(?:dataUrl|codeUrl|asmUrl|memUrl):\s*"([^"]+)"', html)
    )

    missing = []
    for relative in sorted(local_refs):
        path = ROOT / relative
        if path.exists():
            continue
        if (ROOT / f"{relative}gz").exists():
            continue
        missing.append(relative)

    if missing:
        fail("missing referenced assets: " + ", ".join(missing))

    payloads = sorted((ROOT / "Release").glob("*gz"))
    if len(payloads) != 4:
        fail(f"expected four compressed Unity payloads, found {len(payloads)}")

    for payload in payloads:
        try:
            with gzip.open(payload, "rb") as stream:
                head = stream.read(16)
        except (OSError, EOFError) as error:
            fail(f"invalid gzip payload {payload.name}: {error}")
        if not head:
            fail(f"empty Unity payload {payload.name}")

    data_payload = ROOT / "Release" / "DuckomanHTML5.datagz"
    with gzip.open(data_payload, "rb") as stream:
        if stream.read(7) != b"UnityFS":
            fail("Unity data archive does not have a UnityFS header")

    required_tokens = (
        "WASD",
        "Arrow",
        "Space",
        "Fullscreen",
        "Duckoman Rebirth",
    )
    absent = [token for token in required_tokens if token not in html]
    if absent:
        fail("browser shell is missing: " + ", ".join(absent))

    print(f"PASS: {len(local_refs)} local references resolve")
    print("PASS: all four Unity payloads are valid gzip streams")
    print("PASS: Unity data archive header is valid")
    print("PASS: controls, title, and fullscreen affordance are present")


if __name__ == "__main__":
    main()
