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
- **Vista de ciudad** (pulsa una ciudad → «Vista de ciudad»): sus ciudadanos (ocupaciones CNO, edades, estudios
  y lugar de nacimiento del Censo anual), sus distritos (las ramas en las que está especializada: «Ciudad del
  motor», «Ciudad turística», «Ciudad agrícola»…), economía, trabajo, recursos cercanos y comparación con otras.
- **Consejeros** (botón 🏛️ de la barra superior): ocho paneles que explican los datos que hay detrás del mapa, con gráficas
  enlazadas al mapa — Energía, Economía (PIB por ramas, especialización), Población (crecimiento, densidad, edad
  e inmigración), Prosperidad (renta, pobreza, paro), Conocimiento (estudios, empleo científico), Territorio
  (cobertura del suelo por provincia), Cultura (Patrimonio Mundial, parques nacionales, empleo cultural) y el
  Explorador, que cruza cualquier columna de provincias, ciudades o los 8.131 municipios.
- **Búsqueda** de ciudades, provincias y de los 8.131 municipios; enlaces que guardan la vista; imagen para compartir.

## Jugar: Hispania

El botón **Jugar** convierte el mapa en un juego de estrategia por turnos (4X) original: de la **Edad del Bronce
(2000 a. C.) a 2050**, sobre el terreno real (relieve, bosques, vegas, ríos y costa salen de los mismos datos) y
contra la IA. La idea: construir tu propio país, decisión a decisión, hasta tener **tu España alternativa**.

- **Nueve pueblos** de la Península con su capital real y una ventaja propia: íberos (Edeta), celtíberos (Numantia),
  vascones (Pompaelo), galaicos (Lucus), ilergetes (Iltirta), argáricos (El Argar), tartesios (Ispal), vettones
  (Salmantica) y carpetanos (Toletum). Juegas con uno contra 2–8 rivales.
- **Siete eras y 48 tecnologías**, del bronce a la fusión nuclear; unidades de los honderos a los drones (pasando por
  la falcata, los tercios, los dragones y los blindados) y edificios del dolmen al parque solar. El calendario se
  acelera: 30 años por turno en la Edad del Bronce, uno al año a partir de 2010.
- **Invasiones de la historia**, en su fecha y por su puerta (los pasos del Pirineo, el Estrecho, la costa): celtas,
  Cartago, Roma, suevos y vándalos, visigodos, Bizancio, el ejército omeya, vikingos, almorávides, almohades,
  benimerines, la Gran Alianza, la Grande Armée… Si toman una ciudad **se quedan como un pueblo nuevo** (nace
  al-Ándalus, Hispania romana o un reino napoleónico); si resistes, la historia cambia.
- **152 decisiones y sucesos** repartidos por todas las eras: los mercaderes fenicios, Viriato, una nueva fe, el
  sepulcro del apóstol, fueros o centralismo, la peste negra, un navegante con un plan, convivencia o unidad
  confesional, la imprenta, Lepanto, una constitución, la industria, el ancho de vía, monarquía o república,
  Europa, la transición energética, la gran sequía, la inteligencia artificial… además de sucesos recurrentes
  (cosechas, terremotos, riadas, disputas fronterizas, refugiados, espías, corrupción, huelgas) y eventos propios
  de cada pueblo. Dependen de lo que has elegido antes (cadenas de consecuencias), de tu identidad, tu gobierno, tu
  fe, tus guerras, tu estabilidad y de qué invasores se han quedado. Cada opción muestra sus efectos reales, que
  escalan con tu economía, y deja huella en la identidad de tu país (foral, atlántico, ilustrado, verde…). Hay
  hasta **uniones dinásticas** que suman a un reino vecino.
- **Fe**: dioses antiguos, cristianismo, islam o Estado laico. Las ciudades conquistadas conservan su fe y se van
  convirtiendo; muchas ciudades de otra fe restan estabilidad (menos si tu país es tolerante).
- **Obreros y caminos**: campos de labor, minas, aserraderos, viñedos y olivares, dehesas y caminos (por los que se
  va al doble de rápido; con el ferrocarril, al cuádruple).
- **Comercio**: los mercaderes abren rutas entre tus ciudades o con las de tus vecinos en paz (más rentables y con
  ciencia); una guerra las corta.
- **Marina**: galeras, carabelas, galeones, navíos de línea, acorazados, submarinos y fragatas, que navegan,
  combaten entre sí y bombardean costas.
- **Gobierno y estabilidad**: de la jefatura tribal a la tecnocracia, pasando por la monarquía feudal, la república
  federal o la democracia. La estabilidad baja con las guerras y con un imperio demasiado grande; si se hunde, hay
  revueltas y las ciudades pueden independizarse.
- **Tu España alternativa**: le pones nombre a tu país y, al final (o cuando quieras, en 📖), una crónica cuenta qué
  país has construido, qué pasó con Roma o con al-Ándalus, cuánto de la Península ocupa y su línea del tiempo.
- **Ciudades con nombre de verdad** (el antiguo del lugar —Gadir, Barcino, Emerita— o el del municipio de hoy),
  **recursos históricos** en su sitio (plata de Cartagena y Riotinto, oro de Las Médulas, mercurio de Almadén, sal de
  Cardona, almadrabas de Barbate…) y **28 maravillas en su sitio real**: Atapuerca, Altamira, la Mezquita, la Alhambra,
  El Escorial, el Prado, el Puente de Vizcaya, la Sagrada Familia, el Observatorio del Teide, Doñana… solo se pueden
  levantar en una ciudad cuyo territorio incluya su ubicación.
- Combate con terreno, fortificación y asedio; fronteras que crecen con la cultura; guerra y paz; niebla de guerra;
  embarque (Baleares y Canarias); guardado automático en el navegador.
- **Victoria** por ciencia (la fusión nuclear), por dominio (todas las capitales del principio) o por puntos en 2050.

Es un juego original del género 4X: toma sus mecánicas (eras, crisis, gobiernos, eventos narrativos, potencias que
aparecen), no los nombres, personajes ni el arte de ningún juego comercial.

Las reglas están en `js/ext/game/rules.js`, los eventos en `events.js`, la simulación en `sim.js` (también corre en Node, sin navegador), la IA
en `ai.js`, el dibujo en `render.js` y la interfaz en `ui.js`. La geografía del juego (`data/game.json`: salidas,
puntos de entrada de las invasiones, recursos, nombres y sitios de maravillas) la genera
`tools/espanaciv/build_game.py` a partir de `counties.json` y `wonders.json`.

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
python3 tools/espanaciv/build.py        # world → stats → cities → lenses → extras → cityview → game  ⇒  espanaciv/data/*.json
```

| Paso | Qué hace |
|---|---|
| `build_world.py` | Proyección (Albers para España + recuadro de Canarias), malla, tierra/mar rasterizando municipios y países a 1 km, relieve, cobertura, ríos → `world.json` |
| `build_stats.py` | Padrón, Censo anual, Atlas de Renta (ADRH) y PIB de Eurostat → intermedio por municipio, ciudad y provincia |
| `build_cities.py` | `cities.json`, `states.json` (provincias), `nation.json`; PIB estimado de las ciudades |
| `build_lenses.py` | `lenses.json`: cada municipio reparte su población por su superficie dentro de cada hexágono |
| `build_extras.py` | `resources.json`, `wonders.json`, `infrastructure.json`, energía por provincia y `sources.json` (la bibliografía del Almanaque) |
| `build_cityview.py` | `citizens.json` (ocupaciones, edades, estudios y origen de cada ciudad), `districts.json` (especialización por rama → distritos e insignia) y `counties.json` (los 8.131 municipios para los consejeros) |
| `build_game.py` | `game.json`: la geografía del modo de juego (salidas de cada pueblo, puntos de entrada de las invasiones, recursos históricos, nombre real de cada casilla, sitios de las maravillas) |

Los ficheros de `espanaciv/data/` siguen los contratos de usaciv (`docs/DATA_CONTRACTS.md` en su código fuente),
con algunos campos españoles de más (`renta_persona`, `pobreza`, `edad_media`, `nacidos_fuera`, `estudios_sup`,
`provincial_capital`, `world.insets`, `world.projection`).

## Leer el mapa con honestidad

- **Los rendimientos son nombres para cifras reales.** El oro es el PIB; lo demás son ocupados por rama,
  contados donde viven.
- **El PIB de las ciudades es una estimación (≈).** El INE no publica PIB municipal: se reparte el valor añadido
  de la provincia rama a rama según los ocupados de la ciudad. Infravalora los centros que atraen trabajadores.
- **El paro es el del Censo** (registros administrativos): no coincide exactamente con el de la EPA.
- **Las posiciones son esquemáticas.** Cada hexágono es ~133 km²; carreteras y vías son arte del mapa.
- **Lo que falta, falta:** si no hay dato es `null`, nunca 0. El ADRH no publica los municipios más pequeños.
- **Las centrales son una foto de 2021**: falta la ola solar posterior y no se dibuja el carbón (casi todo cerrado).

## Licencias

Código: MIT (Andrej Karpathy, usaciv; y esta adaptación). Datos: INE (reutilización con cita), Eurostat
(CC BY 4.0), IGN vía es-atlas (CC BY 4.0), ESA WorldCover (CC BY 4.0), NOAA ETOPO1 y Natural Earth (dominio
público), WRI Global Power Plant Database (CC BY 4.0), Wikidata (CC0). Proyecto no afiliado a ningún editor de
videojuegos; todo el arte está dibujado por código.
