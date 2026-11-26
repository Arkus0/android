"""Datos geográficos del modo de juego (game.json): dónde empieza cada pueblo, los recursos históricos, el nombre
real de cada casilla (para bautizar las ciudades que se fundan) y dónde están las maravillas.

Todo se resuelve contra los propios datos del mapa: los municipios de counties.json (nombre, provincia y casilla) y
los bienes de wonders.json. Así no hace falta proyectar coordenadas aquí y todo cae en la casilla correcta.
"""

from __future__ import annotations

import json
import unicodedata

from common import OUT, write_web

# Pueblo → (municipio, provincia) de su capital inicial. Las reglas (nombres, colores, ventajas) están en el JS.
STARTS = {
    "galaicos": ("Lugo", "LU"),
    "vascones": ("Pamplona/Iruña", "NA"),
    "celtiberos": ("Garray", "SO"),
    "ilergetes": ("Lleida", "L"),
    "iberos": ("Llíria", "V"),
    "punicos": ("Cartagena", "MU"),
    "tartesios": ("Sevilla", "SE"),
    "vettones": ("Salamanca", "SA"),
    "carpetanos": ("Toledo", "TO"),
}

# Recursos con historia: (tipo, municipio, provincia). Minas, salinas, vegas y almadrabas conocidas desde la
# Antigüedad o la Edad Media. Los recursos «comunes» (trigo, ganado, madera, pesca) los reparte el JS por terreno.
RESOURCES = [
    ("plata", "La Unión", "MU"), ("plata", "Linares", "J"), ("plata", "Hiendelaencina", "GU"), ("plata", "Guadalcanal", "SE"),
    ("cobre", "Minas de Riotinto", "H"), ("cobre", "Alosno", "H"),
    ("oro", "Carucedo", "LE"), ("oro", "Tineo", "O"),
    ("hierro", "Muskiz", "BI"), ("hierro", "Tarazona", "Z"), ("hierro", "Ojos Negros", "TE"), ("hierro", "Calatayud", "Z"),
    ("estano", "Lousame", "C"), ("mercurio", "Almadén", "CR"),
    ("sal", "Cardona", "B"), ("sal", "Torrevieja", "A"), ("sal", "Añana", "VI"), ("sal", "San Fernando", "CA"),
    ("caballos", "Jerez de la Frontera", "CA"), ("caballos", "Écija", "SE"), ("caballos", "Trujillo", "CC"), ("caballos", "Cangas de Onís", "O"),
    ("ovejas", "Cáceres", "CC"), ("ovejas", "Soria", "SO"), ("ovejas", "Zamora", "ZA"), ("ovejas", "Segovia", "SG"), ("ovejas", "Molina de Aragón", "GU"),
    ("olivo", "Jaén", "J"), ("olivo", "Baena", "CO"), ("olivo", "Estepa", "SE"), ("olivo", "Les Borges Blanques", "L"), ("olivo", "Úbeda", "J"),
    ("vino", "El Puerto de Santa María", "CA"), ("vino", "Haro", "LO"), ("vino", "Vilafranca del Penedès", "B"), ("vino", "Valdepeñas", "CR"),
    ("vino", "Aranda de Duero", "BU"), ("vino", "Cambados", "PO"), ("vino", "Jumilla", "MU"),
    ("trigo", "Medina de Rioseco", "VA"), ("trigo", "Carmona", "SE"), ("trigo", "Alcázar de San Juan", "CR"),
    ("atun", "Barbate", "CA"), ("atun", "Conil de la Frontera", "CA"), ("atun", "Tarifa", "CA"),
    ("pesca", "Ribeira", "C"), ("pesca", "Santoña", "S"), ("pesca", "Bermeo", "BI"),
    ("marmol", "Macael", "AL"), ("seda", "Murcia", "MU"), ("azafran", "Consuegra", "TO"),
]

# Nombres antiguos para bautizar ciudades fundadas en su casilla: (municipio, provincia, nombre).
ANCIENT = [
    ("Cádiz", "CA", "Gadir"), ("Málaga", "MA", "Malaka"), ("Almuñécar", "GR", "Sexi"), ("Adra", "AL", "Abdera"),
    ("Cartagena", "MU", "Qart Hadasht"), ("Alacant/Alicante", "A", "Lucentum"), ("Elx/Elche", "A", "Ilici"),
    ("Sagunto/Sagunt", "V", "Arse"), ("València", "V", "Valentia"), ("Valencia", "V", "Valentia"), ("Llíria", "V", "Edeta"),
    ("Xàtiva", "V", "Saetabis"), ("Dénia", "A", "Dianium"), ("Tortosa", "T", "Dertosa"), ("Tarragona", "T", "Tarraco"),
    ("Barcelona", "B", "Barcino"), ("L'Escala", "GI", "Emporion"), ("Lleida", "L", "Iltirta"), ("Huesca", "HU", "Bolskan"),
    ("Zaragoza", "Z", "Salduie"), ("Pamplona/Iruña", "NA", "Pompaelo"), ("Calahorra", "LO", "Calagurris"),
    ("Garray", "SO", "Numantia"), ("Toledo", "TO", "Toletum"), ("Alcalá de Henares", "M", "Complutum"),
    ("Zamora", "ZA", "Ocelum Duri"), ("Salamanca", "SA", "Salmantica"), ("Ávila", "AV", "Obila"), ("Mérida", "BA", "Emerita"),
    ("Cáceres", "CC", "Norba"), ("Sevilla", "SE", "Ispal"), ("Córdoba", "CO", "Corduba"), ("Linares", "J", "Castulo"),
    ("Granada", "GR", "Iliberri"), ("Huelva", "H", "Onoba"), ("Écija", "SE", "Astigi"), ("León", "LE", "Legio"),
    ("Astorga", "LE", "Asturica"), ("Lugo", "LU", "Lucus"), ("A Coruña", "C", "Brigantium"), ("Gijón", "O", "Gigia"),
    ("Palencia", "P", "Pallantia"), ("Calatayud", "Z", "Bilbilis"), ("Tarazona", "Z", "Turiaso"), ("Eivissa", "IB", "Ebusus"),
    ("Alcúdia", "IB", "Pollentia"), ("Maó", "IB", "Mago"), ("Medinaceli", "SO", "Ocilis"), ("Saelices", "CU", "Segobriga"),
    ("Osuna", "SE", "Urso"), ("Carmona", "SE", "Carmo"), ("Jaén", "J", "Aurgi"), ("Baza", "GR", "Basti"), ("Lorca", "MU", "Eliocroca"),
    ("Talavera de la Reina", "TO", "Caesarobriga"), ("Coria", "CC", "Caurium"), ("Guadix", "GR", "Acci"), ("Ourense", "OR", "Auria"),
    ("Padrón", "C", "Iria"), ("Sigüenza", "GU", "Segontia"), ("Antequera", "MA", "Anticaria"), ("Ronda", "MA", "Arunda"),
    ("Niebla", "H", "Ilipla"), ("Ceuta", "CE", "Septem"), ("Melilla", "ML", "Rusaddir"), ("Logroño", "LO", "Vareia"),
    ("Vigo", "PO", "Vicus"), ("Santander", "S", "Portus Victoriae"), ("Castro-Urdiales", "S", "Flaviobriga"),
    ("Irun", "SS", "Oiasso"), ("Olite/Erriberri", "NA", "Ologicus"), ("Teruel", "TE", "Turba"), ("Segovia", "SG", "Segovia"),
    ("Úbeda", "J", "Salaria"), ("Almería", "AL", "Urci"), ("Écija", "SE", "Astigi"), ("Badajoz", "BA", "Batalyaws"),
    ("Murcia", "MU", "Mursiya"), ("Madrid", "M", "Mayrit"), ("Burgos", "BU", "Burgos"), ("Oviedo", "O", "Ovetum"),
]

# Maravillas del juego → nombre corto del bien en wonders.json (su casilla real).
WONDER_SITES = {
    "altamira": "Altamira", "atapuerca": "Atapuerca", "antequera": "Dólmenes de Antequera", "lugo": "Muralla de Lugo",
    "medulas": "Las Médulas", "segovia": "Acueducto de Segovia", "hercules": "Torre de Hércules", "merida": "Mérida",
    "tarraco": "Tarraco", "mezquita": "Mezquita de Córdoba", "alhambra": "Alhambra", "burgos": "Catedral de Burgos",
    "santiago": "Santiago de Compostela", "salamanca": "Salamanca", "toledo": "Toledo", "azahara": "Medina Azahara",
    "escorial": "El Escorial", "sevilla": "Catedral y Alcázar de Sevilla",
}


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(ch for ch in s if unicodedata.category(ch) != "Mn").strip()


def build():
    counties = json.loads((OUT / "counties.json").read_text())
    wonders = json.loads((OUT / "wonders.json").read_text())
    cols = counties["columns"]
    iN, iS, iP, iC = (cols.index(k) for k in ("name", "state", "population", "cell"))
    rows = counties["rows"]

    by_name: dict[tuple[str, str], list] = {}
    for r in rows:
        if r[iC] is None:
            continue
        keys = {_norm(r[iN])} | {_norm(p) for p in r[iN].split("/")}
        for k in keys:
            by_name.setdefault((k, r[iS]), []).append(r)

    def find(name: str, prov: str):
        for k in [_norm(name)] + [_norm(p) for p in name.split("/")]:
            hit = by_name.get((k, prov))
            if hit:
                return max(hit, key=lambda r: r[iP] or 0)
        return None

    missing = []

    def cell_of(name, prov):
        r = find(name, prov)
        if r is None:
            missing.append(f"{name} ({prov})")
            return None
        return int(r[iC])

    starts = {pid: cell_of(n, p) for pid, (n, p) in STARTS.items()}
    resources = []
    taken = set()
    for typ, n, p in RESOURCES:
        c = cell_of(n, p)
        if c is None or c in taken:
            continue
        taken.add(c)
        resources.append({"type": typ, "cell": c, "place": n.split("/")[0]})

    # Nombre de cada casilla de tierra: el municipio más poblado que cae en ella (o el antiguo, si lo hay).
    best: dict[int, list] = {}
    for r in rows:
        c = r[iC]
        if c is None:
            continue
        if c not in best or (r[iP] or 0) > (best[c][iP] or 0):
            best[c] = r
    names = {int(c): r[iN].split("/")[0] for c, r in best.items()}
    ancient = {}
    for n, p, a in ANCIENT:
        c = cell_of(n, p) if find(n, p) else None
        if c is not None:
            ancient[int(c)] = a
    short = {w["short"]: w for w in wonders["wonders"]}
    sites = {}
    for gid, s in WONDER_SITES.items():
        w = short.get(s)
        if w and w.get("cell") is not None:
            sites[gid] = {"cell": int(w["cell"]), "name": w["name"], "short": w["short"]}
        else:
            missing.append(f"maravilla {s}")

    if missing:
        print("    sin casilla:", ", ".join(missing))
    write_web("game.json", {
        "version": 1,
        "note": "Geografía del modo de juego: salidas, recursos históricos, nombres de casillas y sitios de maravillas.",
        "starts": starts,
        "resources": resources,
        "names": names,
        "ancient": ancient,
        "wonder_sites": sites,
    })
    print(f"    → game.json: {sum(v is not None for v in starts.values())} salidas, {len(resources)} recursos, "
          f"{len(names)} nombres, {len(ancient)} antiguos, {len(sites)} sitios de maravillas")


if __name__ == "__main__":
    build()
