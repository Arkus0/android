"""Rutas y E/S compartidas por los constructores."""

from __future__ import annotations

import json
import math
import os
import pickle
from pathlib import Path

from sources import RAW

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(os.environ.get("ESPANACIV_OUT", ROOT / "espanaciv" / "data"))
WORK = Path(os.environ.get("ESPANACIV_WORK", RAW.parent / "work"))


def _clean(o):
    """NaN/inf → null y números con pocos decimales, para un JSON compacto y válido."""
    if isinstance(o, float):
        if math.isnan(o) or math.isinf(o):
            return None
        return int(o) if o.is_integer() and abs(o) < 1e15 else o
    if isinstance(o, dict):
        return {k: _clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_clean(v) for v in o]
    if hasattr(o, "item"):  # escalares de numpy
        return _clean(o.item())
    return o


def write_web(name: str, data) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    txt = json.dumps(_clean(data), ensure_ascii=False, separators=(",", ":"))
    (OUT / name).write_text(txt, encoding="utf-8")
    print(f"    → {name} ({len(txt.encode()) / 1e3:.0f} kB)")


def save_interim(name: str, data) -> None:
    WORK.mkdir(parents=True, exist_ok=True)
    with open(WORK / f"{name}.pkl", "wb") as f:
        pickle.dump(data, f)


def load_interim(name: str):
    with open(WORK / f"{name}.pkl", "rb") as f:
        return pickle.load(f)


def raw(src: str, *parts: str) -> Path:
    return RAW.joinpath(src, *parts)
