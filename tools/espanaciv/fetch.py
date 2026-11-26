"""Descarga (con caché) todas las fuentes públicas que usa España Civ.

Uso:  python3 tools/espanaciv/fetch.py [fuente ...]

Los ficheros se guardan en $ESPANACIV_RAW (por defecto ~/.cache/espanaciv/raw), con un
manifest.json por fuente (URL, sha256, tamaño y fecha) que luego cita el Almanaque.
"""

from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
import sys
import tarfile
import time
import urllib.parse
import urllib.request
from pathlib import Path

from sources import SOURCES, RAW

UA = "espanaciv-pipeline/1.0 (+datos públicos; sin claves)"


def manifest_path(src: str) -> Path:
    return RAW / src / "manifest.json"


def read_manifest(src: str) -> dict:
    p = manifest_path(src)
    return json.loads(p.read_text()) if p.exists() else {}


def download(src: str, url: str, name: str, force: bool = False, tries: int = 4) -> Path:
    dest = RAW / src / name
    man = read_manifest(src)
    if dest.exists() and name in man and not force:
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
            with urllib.request.urlopen(req, timeout=600) as r, open(tmp, "wb") as f:
                while chunk := r.read(1 << 20):
                    f.write(chunk)
            break
        except Exception as e:  # noqa: BLE001 - red inestable: reintenta con espera
            print(f"    ! {name}: {e} (intento {k + 1}/{tries})")
            if k == tries - 1:
                raise
            time.sleep(2 ** (k + 1))
    tmp.replace(dest)
    data = dest.read_bytes()
    man[name] = {
        "url": url,
        "retrieved": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
        "sha256": hashlib.sha256(data).hexdigest(),
        "bytes": len(data),
    }
    manifest_path(src).write_text(json.dumps(man, indent=1, ensure_ascii=False))
    print(f"    ✓ {src}/{name} ({len(data) / 1e6:.1f} MB)")
    return dest


def main(argv: list[str]) -> None:
    want = set(argv)
    for s in SOURCES:
        if want and s["id"] not in want:
            continue
        print(f"· {s['id']}")
        for name, url in s["files"]():
            download(s["id"], url, name)
        if s["id"] == "es_atlas":
            tgz = RAW / "es_atlas" / "es-atlas-0.6.0.tgz"
            out = RAW / "es_atlas" / "package"
            if not out.exists():
                with tarfile.open(tgz) as t:
                    t.extractall(RAW / "es_atlas", filter="data")
    print("listo")


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).parent))
    main(sys.argv[1:])
