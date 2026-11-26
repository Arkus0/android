"""Registro de fuentes de España Civ: de dónde sale cada dato.

Cada fuente tiene metadatos (los muestra el Almanaque) y una función `files()` que devuelve
(nombre_local, url) de todo lo que hay que descargar. Todas son públicas y sin claves.
"""

from __future__ import annotations

import os
import urllib.parse
from pathlib import Path

RAW = Path(os.environ.get("ESPANACIV_RAW", Path.home() / ".cache" / "espanaciv" / "raw"))

INE_CSV = "https://www.ine.es/jaxiT3/files/t/es/csv_bdsc/{}.csv"
EUROSTAT = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{}?{}"
NE_TAG = "v5.1.2"
NE = f"https://raw.githubusercontent.com/nvkelso/natural-earth-vector/{NE_TAG}/geojson/{{}}.geojson"
ERDDAP = "https://coastwatch.pfeg.noaa.gov/erddap/griddap/etopo180.csv?altitude%5B({}):1:({})%5D%5B({}):1:({})%5D"
WIKIDATA = "https://query.wikidata.org/sparql?format=json&query={}"

# Ventanas de elevación (lat0, lat1, lon0, lon1): península + Baleares + norte de África, y Canarias.
ETOPO_WINDOWS = {"peninsula": (34.0, 45.0, -11.5, 5.5), "canarias": (27.3, 29.7, -18.6, -13.0)}

# Tablas del INE (una por provincia salvo que se diga). Ids sacados de servicios.ine.es/wstempus TABLAS_OPERACION.
ADRH_RENTA = [30824, 53689]  # nacional con todos los municipios + resumen por provincias
ADRH_DEMOG = [30832, 53776]
ADRH_POBREZA = [30829, 53694]
CENSO_ESTUDIOS = [66637, 66645, 66649, 66661, 66665, 66669, 66673, 66677, 66681, 66685, 66689, 66693, 66697, 66701, 66705,
                  66709, 66713, 66717, 66721, 66725, 66729, 66733, 66737, 66741, 66745, 66749, 66753, 66757, 66761, 66765,
                  66769, 66773, 66777, 66781, 66785, 66789, 66793, 66797, 66801, 66805, 66809, 66813, 66817, 66821, 66825,
                  66829, 66833, 66837, 66841, 66641, 66653, 66592, 66657]
CENSO_ACTIVIDAD = [66639, 66647, 66651, 66663, 66667, 66671, 66675, 66679, 66683, 66687, 66691, 66695, 66699, 66703,
                   66707, 66711, 66715, 66719, 66723, 66727, 66731, 66735, 66739, 66743, 66747, 66751, 66755, 66759,
                   66763, 66767, 66771, 66775, 66779, 66783, 66787, 66791, 66795, 66799, 66803, 66807, 66811, 66815,
                   66819, 66823, 66827, 66831, 66835, 66839, 66843, 66655, 66643, 66594, 66659]


def _ids(prefix: str, ids: list[int]):
    return [(f"{prefix}/{t}.csv", INE_CSV.format(t)) for t in ids]


def _eurostat(name: str, dataset: str, **params) -> tuple[str, str]:
    q = urllib.parse.urlencode([(k, v) for k, vs in params.items() for v in (vs if isinstance(vs, list) else [vs])])
    return name, EUROSTAT.format(dataset, q)


SPARQL_UNESCO = """
SELECT ?item ?itemLabel ?coord ?whs ?year WHERE {
  ?item wdt:P1435 wd:Q9259 ; wdt:P17 wd:Q29 ; wdt:P625 ?coord .
  OPTIONAL { ?item wdt:P757 ?whs }
  OPTIONAL { ?item p:P1435 ?st . ?st ps:P1435 wd:Q9259 ; pq:P580 ?start . BIND(YEAR(?start) AS ?year) }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
}"""

SPARQL_PARQUES = """
SELECT ?item ?itemLabel ?coord ?area ?inception WHERE {
  ?item wdt:P31 wd:Q46169 ; wdt:P17 wd:Q29 ; wdt:P625 ?coord .
  OPTIONAL { ?item wdt:P2046 ?area }
  OPTIONAL { ?item wdt:P571 ?inception }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
}"""

SPARQL_AEROPUERTOS = """
SELECT ?item ?itemLabel ?coord ?iata ?icao WHERE {
  ?item wdt:P31/wdt:P279* wd:Q1248784 ; wdt:P17 wd:Q29 ; wdt:P625 ?coord ; wdt:P239 ?icao .
  OPTIONAL { ?item wdt:P238 ?iata }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
}"""


SPARQL_MUNICIPIOS = """
SELECT ?item ?ine ?coord WHERE { ?item wdt:P772 ?ine ; wdt:P625 ?coord . FILTER(STRLEN(?ine) = 5) }"""


def _sparql(name: str, q: str) -> tuple[str, str]:
    return name, WIKIDATA.format(urllib.parse.quote(" ".join(q.split())))


SOURCES = [
    {
        "id": "es_atlas",
        "title": "Límites municipales, provinciales y autonómicos (es-atlas)",
        "publisher": "Instituto Geográfico Nacional (IGN), vía es-atlas",
        "homepage": "https://github.com/martgnz/es-atlas",
        "license": "CC BY 4.0 (IGN, scne.es); paquete es-atlas bajo licencia MIT",
        "description": "TopoJSON de los 8.200 municipios, las 52 provincias y las comunidades autónomas, con los códigos "
        "del INE, generado a partir del Equipamiento Geográfico de Referencia Nacional del IGN. Decide qué provincia y qué "
        "municipio hay en cada hexágono.",
        "used_for": ["Tierra y mar", "Fronteras provinciales", "Municipio de cada hexágono"],
        "files": lambda: [("es-atlas-0.6.0.tgz", "https://registry.npmjs.org/es-atlas/-/es-atlas-0.6.0.tgz")],
    },
    {
        "id": "natural_earth",
        "title": "Natural Earth 1:10m (países, lagos, ríos)",
        "publisher": "Natural Earth",
        "homepage": "https://www.naturalearthdata.com/",
        "license": "Dominio público",
        "description": "Países vecinos (Portugal, Francia, Andorra, Marruecos, Argelia; se dibujan en gris), lagos y "
        f"embalses grandes, y los ríos principales con sus nombres. Fijado a la versión {NE_TAG}.",
        "used_for": ["Países vecinos", "Ríos", "Lagos y embalses"],
        "files": lambda: [(f"{NE_TAG}/{n}.geojson", NE.format(n)) for n in (
            "ne_10m_admin_0_countries", "ne_10m_rivers_lake_centerlines", "ne_10m_rivers_europe",
            "ne_10m_lakes", "ne_10m_lakes_europe")],
    },
    {
        "id": "natural_earth_roads",
        "title": "Natural Earth 1:10m (carreteras y ferrocarriles)",
        "publisher": "Natural Earth",
        "homepage": "https://www.naturalearthdata.com/",
        "license": "Dominio público",
        "description": "Autovías, carreteras principales y líneas de ferrocarril a escala 1:10m. Se dibujan como arte "
        "del mapa (tramos entre centros de hexágono), no como estadística: el trazado es generalizado y no distingue "
        "alta velocidad.",
        "used_for": ["Carreteras", "Ferrocarril"],
        "files": lambda: [(f"{NE_TAG}/{n}.geojson", NE.format(n)) for n in ("ne_10m_roads", "ne_10m_railroads")],
    },
    {
        "id": "etopo",
        "title": "ETOPO1, modelo global de relieve",
        "publisher": "NOAA National Centers for Environmental Information (vía ERDDAP)",
        "homepage": "https://www.ncei.noaa.gov/products/etopo-global-relief-model",
        "license": "Dominio público (obra del Gobierno de EE. UU.)",
        "description": "Altitud del terreno y profundidad del mar cada minuto de arco (~1,8 km). El relieve de cada "
        "hexágono (llano, colinas, montañas, cumbres) sale de la media y la rugosidad de las muestras que caen dentro.",
        "used_for": ["Relieve", "Sombreado", "Profundidad del mar"],
        "files": lambda: [(f"etopo_{k}.csv", ERDDAP.format(a, b, c, d)) for k, (a, b, c, d) in ETOPO_WINDOWS.items()],
    },
    {
        "id": "worldcover",
        "title": "ESA WorldCover 10 m 2021 v200",
        "publisher": "Agencia Espacial Europea (ESA) / Copernicus",
        "homepage": "https://esa-worldcover.org/",
        "license": "CC BY 4.0 (© ESA WorldCover project 2021, contiene datos modificados de Copernicus Sentinel 2021)",
        "description": "Cobertura del suelo (bosque, matorral, pasto, cultivo, urbano, suelo desnudo, humedal…) leída "
        "de los COG públicos a ~320 m por píxel y muestreada en una malla de ~1 km dentro de cada hexágono.",
        "used_for": ["Terreno (bosque, cultivos, matorral…)", "Lentes de tierra"],
        "files": lambda: [],  # la descarga la hace worldcover.py (lecturas parciales de COG con rasterio)
    },
    {
        "id": "ine_padron",
        "title": "Cifras oficiales de población de los municipios (Padrón municipal)",
        "publisher": "Instituto Nacional de Estadística (INE)",
        "homepage": "https://www.ine.es/dyngs/INEbase/operacion.htm?c=Estadistica_C&cid=1254736177011",
        "license": "Reutilización libre citando la fuente (Aviso legal del INE)",
        "description": "Población a 1 de enero de cada municipio desde 1996 (tabla 29005). Da la población de ciudades, "
        "provincias y del país, la densidad y el crecimiento.",
        "used_for": ["Población", "Crecimiento", "Densidad"],
        "files": lambda: _ids("tablas", [29005]),
    },
    {
        "id": "ine_censo",
        "title": "Censo anual de población (Censos 2021 y siguientes)",
        "publisher": "Instituto Nacional de Estadística (INE)",
        "homepage": "https://www.ine.es/dyngs/INEbase/operacion.htm?c=Estadistica_C&cid=1254736176992",
        "license": "Reutilización libre citando la fuente (Aviso legal del INE)",
        "description": "Ocupados de 16 y más años por actividad del establecimiento (CNAE a 2 dígitos) para las 151 "
        "capitales y principales ciudades (tabla 69980), las provincias y el total nacional (69960), contados donde "
        "viven. También el nivel de estudios, la relación con la actividad (paro) y el país de nacimiento de cada municipio.",
        "used_for": ["Rendimientos de ciudades y provincias", "Lentes de estudios, paro y nacidos fuera"],
        "files": lambda: _ids("tablas", [69980, 69960, 65031]) + _ids("estudios", CENSO_ESTUDIOS)
        + _ids("actividad", CENSO_ACTIVIDAD),
    },
    {
        "id": "ine_adrh",
        "title": "Atlas de distribución de renta de los hogares (ADRH)",
        "publisher": "Instituto Nacional de Estadística (INE)",
        "homepage": "https://www.ine.es/dyngs/INEbase/operacion.htm?c=Estadistica_C&cid=1254736177088",
        "license": "Reutilización libre citando la fuente (Aviso legal del INE)",
        "description": "Renta neta media por persona y por hogar, edad media, tamaño del hogar, población española y "
        "porcentaje de población con ingresos por unidad de consumo por debajo del 60 % de la mediana, por municipio, "
        "a partir de datos tributarios. El INE no publica los municipios más pequeños.",
        "used_for": ["Lentes de renta, pobreza y edad", "Renta de ciudades y provincias"],
        "files": lambda: _ids("renta", ADRH_RENTA) + _ids("demografia", ADRH_DEMOG) + _ids("pobreza", ADRH_POBREZA),
    },
    {
        "id": "eurostat_gdp",
        "title": "PIB y valor añadido bruto por provincia (NUTS 3)",
        "publisher": "Eurostat (cuentas regionales, a partir de la Contabilidad Regional de España del INE)",
        "homepage": "https://ec.europa.eu/eurostat/web/national-accounts/database",
        "license": "CC BY 4.0 (política de reutilización de la Comisión Europea)",
        "description": "PIB a precios corrientes por provincia (nama_10r_3gdp), VAB por ramas (nama_10r_3gva) y PIB "
        "nacional (nama_10_gdp), en euros corrientes.",
        "used_for": ["Oro (PIB)", "PIB por ramas"],
        "files": lambda: [
            _eurostat("nama_10r_3gdp.json", "nama_10r_3gdp", unit="MIO_EUR", lang="en", geoLevel="nuts3"),
            _eurostat("nama_10r_3gva.json", "nama_10r_3gva", unit="CP_MEUR", lang="en", geoLevel="nuts3"),
            _eurostat("nama_10_gdp.json", "nama_10_gdp", unit="CP_MEUR", na_item="B1GQ", geo="ES", lang="en"),
        ],
    },
    {
        "id": "wri_gppd",
        "title": "Global Power Plant Database v1.3",
        "publisher": "World Resources Institute (WRI)",
        "homepage": "https://datasets.wri.org/dataset/globalpowerplantdatabase",
        "license": "CC BY 4.0",
        "description": "Centrales eléctricas con su potencia, tecnología y coordenadas. Es una foto de 2021: no recoge "
        "la ola solar posterior ni los cierres de las centrales de carbón, que por eso no se dibujan.",
        "used_for": ["Recursos de energía"],
        "files": lambda: [("global_power_plant_database.csv",
                           "https://raw.githubusercontent.com/wri/global-power-plant-database/master/output_database/global_power_plant_database.csv")],
    },
    {
        "id": "wikidata",
        "title": "Wikidata: Patrimonio de la Humanidad, parques nacionales y aeropuertos de España",
        "publisher": "Wikidata (Fundación Wikimedia)",
        "homepage": "https://www.wikidata.org/",
        "license": "CC0 (dominio público)",
        "description": "Bienes Patrimonio de la Humanidad de la UNESCO en España (con su número de inscripción y año), "
        "parques nacionales, aeropuertos y la posición del núcleo principal de cada municipio (por su código INE, P772).",
        "used_for": ["Maravillas", "Aeropuertos", "Posición de las ciudades"],
        "files": lambda: [_sparql("unesco.json", SPARQL_UNESCO), _sparql("parques.json", SPARQL_PARQUES),
                          _sparql("aeropuertos.json", SPARQL_AEROPUERTOS),
                          _sparql("municipios.json", SPARQL_MUNICIPIOS)],
    },
    {
        "id": "eurostat_air",
        "title": "Pasajeros por aeropuerto (avia_paoa)",
        "publisher": "Eurostat (a partir de los datos de AENA)",
        "homepage": "https://ec.europa.eu/eurostat/web/transport/database",
        "license": "CC BY 4.0 (política de reutilización de la Comisión Europea)",
        "description": "Pasajeros transportados por aeropuerto declarante, anual.",
        "used_for": ["Aeropuertos"],
        "files": lambda: [_eurostat("avia_paoa.json", "avia_paoa", freq="A", unit="PAS", tra_meas="PAS_CRD",
                                    time=["2023", "2024", "2025"], lang="en")],
    },
]

BY_ID = {s["id"]: s for s in SOURCES}
