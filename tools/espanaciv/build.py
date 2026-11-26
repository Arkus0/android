"""Construye todos los datos de España Civ (espanaciv/data/*.json) a partir de las descargas en caché.

Uso:
    pip install numpy shapely rasterio affine     # (rasterio trae GDAL)
    python3 tools/espanaciv/fetch.py              # descarga las fuentes (≈2 GB, con caché)
    python3 tools/espanaciv/worldcover.py         # cobertura del suelo (lecturas parciales de COG)
    python3 tools/espanaciv/build.py [paso ...]   # world stats cities lenses extras cityview game
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import build_cities  # noqa: E402
import build_cityview  # noqa: E402
import build_extras  # noqa: E402
import build_game  # noqa: E402
import build_lenses  # noqa: E402
import build_stats  # noqa: E402
import build_world  # noqa: E402

STEPS = {"world": build_world.build, "stats": build_stats.build, "cities": build_cities.build,
         "lenses": build_lenses.build, "extras": build_extras.build, "cityview": build_cityview.build,
         "game": build_game.build}

if __name__ == "__main__":
    want = sys.argv[1:] or list(STEPS)
    for name in want:
        t0 = time.time()
        print(f"· {name}")
        STEPS[name]()
        print(f"  ({time.time() - t0:.1f} s)")
