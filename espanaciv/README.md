# España Civ: España como un juego de estrategia, con datos reales

La España real dibujada como un mapa de estrategia por turnos (4X): terreno hexagonal, ciudades con
rendimientos, lentes, recursos y maravillas. **Nada es inventado**: cada casilla y cada número sale de datos
públicos (INE, Eurostat, IGN, ESA, NOAA, Natural Earth, WRI, Wikidata), y el **Almanaque** de la propia web
explica qué significa cada cosa y de dónde viene.

Es una adaptación a España de [usaciv](https://karpathy.ai/usaciv/), de Andrej Karpathy (código MIT, ver
`LICENSE`). El motor de dibujo (terreno, ciudades, estandartes, lentes, minimapa…) es el suyo, traducido y
ajustado; los datos españoles, el pipeline que los prepara y los textos son de esta versión.

## Qué hay

- **Mapa**: 144×113 hexágonos de ~7 km de radio (≈133 km² cada uno). Relieve de ETOPO1, cobertura del suelo de
  ESA WorldCover (cultivos, bosque atlántico y mediterráneo, matorral, pastizal, urbano…), ríos de Natural Earth,
  las 52 provincias del IGN. Canarias va en un recuadro, como en los mapas de siempre. Portugal, Francia,
  Andorra, Gibraltar y el norte de África, en gris.
- **Ciudades**: las 151 capitales de provincia y principales ciudades para las que el Censo anual del INE publica
  los ocupados por actividad (CNAE a 2 dígitos). Cifras del **municipio**, no del área metropolitana.
- **Rendimientos**: 🌾 Comida (ocupados en agricultura y pesca), ⚙️ Producción (industria, construcción y
  extractivas), 💰 Oro (= PIB; el de las ciudades es una estimación, ver el Almanaque), 🔬 Ciencia (información y
  comunicaciones + actividades profesionales y científicas) y 🎭 Cultura (artes, entretenimiento y deporte).
- **Lentes**: población, crecimiento 2001–2025 (la España vaciada), edad media, mayores de 65, nacidos fuera,
  renta, pobreza, paro, estudios superiores, hogares de una persona, bosque, cultivos, matorral, construido y altitud.
- **Recursos**: centrales nucleares, hidroeléctricas, de bombeo, ciclos combinados, fuel/diésel de las islas,
  eólica y solar (Global Power Plant Database, foto de 2021).
- **Maravillas**: los bienes Patrimonio de la Humanidad de la UNESCO y los parques nacionales.
- **Mejoras**: autovías, carreteras principales, ferrocarril y aeropuertos (pasajeros de Eurostat/AENA).
- **Búsqueda** de ciudades, provincias y de los 8.131 municipios; enlaces que guardan la vista; imagen para compartir.

## Ejecutarlo

Es una web estática (módulos ES + Canvas 2D, sin dependencias). Necesita un servidor HTTP (no vale abrir el
`index.html` con doble clic):

```bash
cd espanaciv && python3 -m http.server 8000   # → http://localhost:8000
```

En producción se sirve tal cual desde `/espanaciv/` (Vercel publica el repositorio entero).

## Rehacer los datos

El pipeline está en `tools/espanaciv/` (Python 3.11+ con numpy, rasterio y affine):

```bash
pip install numpy rasterio affine
python3 tools/espanaciv/fetch.py        # descarga las fuentes a ~/.cache/espanaciv (≈2,5 GB; caché + manifest)
python3 tools/espanaciv/worldcover.py   # ESA WorldCover, leyendo solo las vistas reducidas de los COG
python3 tools/espanaciv/build.py        # world → stats → cities → lenses → extras  ⇒  espanaciv/data/*.json
```

| Paso | Qué hace |
|---|---|
| `build_world.py` | Proyección (Albers para España + recuadro de Canarias), malla, tierra/mar rasterizando municipios y países a 1 km, relieve, cobertura, ríos → `world.json` |
| `build_stats.py` | Padrón, Censo anual, Atlas de Renta (ADRH) y PIB de Eurostat → intermedio por municipio, ciudad y provincia |
| `build_cities.py` | `cities.json`, `states.json` (provincias), `nation.json`; PIB estimado de las ciudades |
| `build_lenses.py` | `lenses.json`: cada municipio reparte su población por su superficie dentro de cada hexágono |
| `build_extras.py` | `resources.json`, `wonders.json`, `infrastructure.json`, energía por provincia y `sources.json` (la bibliografía del Almanaque) |

Los ficheros de `espanaciv/data/` siguen los contratos de usaciv (`docs/DATA_CONTRACTS.md` en su código fuente),
con algunos campos españoles de más (`renta_persona`, `pobreza`, `edad_media`, `nacidos_fuera`, `estudios_sup`,
`provincial_capital`, `world.insets`, `world.projection`).

## Leer el mapa con honestidad

- **Los rendimientos son nombres para cifras reales.** El oro es el PIB; lo demás son ocupados por rama,
  contados donde viven.
- **El PIB de las ciudades es una estimación (≈).** El INE no publica PIB municipal: se reparte el valor añadido
  de la provincia rama a rama según los ocupados de la ciudad. Infravalora los centros que atraen trabajadores.
- **El paro es el del Censo** (registros administrativos), más bajo que el de la EPA.
- **Las posiciones son esquemáticas.** Cada hexágono es ~133 km²; carreteras y vías son arte del mapa.
- **Lo que falta, falta:** si no hay dato es `null`, nunca 0. El ADRH no publica los municipios más pequeños.
- **Las centrales son una foto de 2021**: falta la ola solar posterior y no se dibuja el carbón (casi todo cerrado).

## Licencias

Código: MIT (Andrej Karpathy, usaciv; y esta adaptación). Datos: INE (reutilización con cita), Eurostat
(CC BY 4.0), IGN vía es-atlas (CC BY 4.0), ESA WorldCover (CC BY 4.0), NOAA ETOPO1 y Natural Earth (dominio
público), WRI Global Power Plant Database (CC BY 4.0), Wikidata (CC0). Proyecto no afiliado a ningún editor de
videojuegos; todo el arte está dibujado por código.
