"""Descarga ESA WorldCover 2021 (v200) a ~300 m leyendo solo las vistas reducidas de los COG públicos.

Uso:  python3 tools/espanaciv/worldcover.py      (necesita `pip install rasterio numpy`)

Cada tesela de 3°×3° se guarda como raw/worldcover/<tesela>.npz (uint8, códigos WorldCover) y queda
registrada en raw/worldcover/manifest.json con la URL del COG de origen.
"""

from __future__ import annotations

import datetime as dt
import hashlib
import io
import json
import sys
from pathlib import Path

import numpy as np
import rasterio

sys.path.insert(0, str(Path(__file__).parent))
from sources import RAW  # noqa: E402

URL = "https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_{}_Map.tif"
DECIMATE = 32  # 36000 px → 1125 px por tesela (~300 m)
# Teselas (esquina SO) que tocan España: península y Baleares, Ceuta y Melilla, Canarias.
TILES = [f"N{la:02d}{'W' if lo < 0 else 'E'}{abs(lo):03d}" for la in (36, 39, 42) for lo in (-12, -9, -6, -3, 0, 3)]
TILES += ["N33W006", "N33W003", "N27W018", "N27W015"]


def main() -> None:
    out_dir = RAW / "worldcover"
    out_dir.mkdir(parents=True, exist_ok=True)
    man_p = out_dir / "manifest.json"
    man = json.loads(man_p.read_text()) if man_p.exists() else {}
    env = dict(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif", GDAL_HTTP_MAX_RETRY="4",
               GDAL_HTTP_RETRY_DELAY="2")
    with rasterio.Env(**env):
        for t in TILES:
            name = f"{t}.npz"
            if name in man:
                continue
            url = URL.format(t)
            try:
                with rasterio.open("/vsicurl/" + url) as ds:
                    n = ds.width // DECIMATE
                    arr = ds.read(1, out_shape=(n, n), resampling=rasterio.enums.Resampling.nearest)
                    b = ds.bounds
            except rasterio.errors.RasterioIOError as e:
                print(f"    - {t}: sin tesela ({e.__class__.__name__}; todo mar)")
                continue
            buf = io.BytesIO()
            np.savez_compressed(buf, data=arr, bounds=np.array([b.left, b.bottom, b.right, b.top]))
            (out_dir / name).write_bytes(buf.getvalue())
            man[name] = {
                "url": url,
                "retrieved": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
                "sha256": hashlib.sha256(buf.getvalue()).hexdigest(),
                "bytes": len(buf.getvalue()),
                "note": f"vista reducida 1/{DECIMATE} del COG (~300 m), remuestreo al vecino más próximo",
            }
            man_p.write_text(json.dumps(man, indent=1, ensure_ascii=False))
            print(f"    ✓ {t} {arr.shape} {np.bincount(arr.ravel(), minlength=101)[[10, 20, 30, 40, 50, 60, 80]]}")


if __name__ == "__main__":
    main()
