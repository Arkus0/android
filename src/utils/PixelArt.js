export const PALETTE = {
    _: null, // Transparente
    K: 0x000000, // Negro (Bordes)
    W: 0xffffff, // Blanco (Ojos, Brillos)

    // Piel
    s: 0xffccaa, // Piel clara

    // Héroe (Azul/Rojo)
    b: 0x2980b9, // Azul oscuro (Ropa)
    B: 0x3498db, // Azul claro (Ropa)
    h: 0x8d6e63, // Marrón (Pelo)
    r: 0xc0392b, // Rojo oscuro (Capa)
    R: 0xe74c3c, // Rojo claro (Capa)
    Y: 0xf1c40f, // Dorado (Detalles)

    // Limo (Azul/Celeste)
    l: 0x2980b9, // Azul borde
    L: 0x3498db, // Azul cuerpo
    S: 0x85c1e9, // Celeste brillo

    // Tiles
    w: 0x5d4037, // Madera oscura
    d: 0x8d6e63, // Madera clara
    g: 0x7f8c8d, // Gris oscuro (Piedra)
    G: 0xbdc3c7, // Gris claro (Piedra)

    // Muebles
    p: 0x8e44ad, // Morado (Sábana)
    P: 0x9b59b6, // Morado claro
    o: 0xd35400, // Naranja (Libro)
    v: 0x27ae60, // Verde (Libro)
};

// 16x16 Sprites (Se escalarán x2 o x3 en juego)
export const SPRITES = {
    hero: [
        "______KKKK______",
        "_____KhhhK______",
        "____KhhhhhK_____",
        "____KhhhKhK_____",
        "____KhhhKhK_____",
        "____KssKssK_____",
        "____KssKssK_____",
        "_____KsssK______",
        "___KKRRRRKK_____",
        "__KRRBBBBRRK____",
        "_KRBBBBBBBBRK___",
        "_KBBBYBBYBBBK___",
        "_KBBBBBBBBBBK___",
        "_KBBKBBBBKBBK___",
        "_KKK_KBBK_KKK___",
        "_____KKKK_______"
    ],

    slime: [
        "________________",
        "________________",
        "_______K________",
        "______KLSK______",
        "_____KLLLLK_____",
        "____KLLLLLLK____",
        "___KLLWKLLWK____",
        "__KLLKKKLLKKK___",
        "__KLLLLLLLLLK___",
        "_KLLLLLLLLLLLK__",
        "_KLLLLLLLLLLLK__",
        "KLLLLLLLLLLLLLK_",
        "KLLLLLLLLLLLLLK_",
        "KLLLLLLLLLLLLLK_",
        "_KKKKKKKKKKKKK__",
        "________________"
    ],

    floor_wood: [
        "wwwwwwwwwwwwwwww",
        "wdwwwwwwwwwwwdww",
        "wwdwwwwwwwwwdwww",
        "wwwdwwwwwwwdwwww",
        "wwwwdddddddwwwww",
        "wwwwwwwwwwwwwwww",
        "wwdwwwwwwwwwwwdw",
        "wdwwwwwwwwwwwdww",
        "wwwwwwwwwwwwwwww",
        "wwwwwwdwwwwwdwww",
        "wwwwwdwwwwwdwwww",
        "wwwwdwwwwwdwwwww",
        "wwddwwwwwwddwwww",
        "wwwwwwwwwwwwwwww",
        "wwwwwwwwwwwwwwww",
        "wwwwwwwwwwwwwwww"
    ],

    wall_stone: [
        "GGGGGGGGGGGGGGGG",
        "GgggggGGggggggGG",
        "GgggggGGggggggGG",
        "GGGGGGGGGGGGGGGG",
        "ggGGggggggGGgggg",
        "ggGGggggggGGgggg",
        "GGGGGGGGGGGGGGGG",
        "GgggggGGggggggGG",
        "GgggggGGggggggGG",
        "GGGGGGGGGGGGGGGG",
        "ggGGggggggGGgggg",
        "ggGGggggggGGgggg",
        "GGGGGGGGGGGGGGGG",
        "GgggggGGggggggGG",
        "GgggggGGggggggGG",
        "GGGGGGGGGGGGGGGG"
    ],

    bed: [
        // 16x24 (Usaremos 2 tiles de alto aprox o un sprite custom)
        "___KKKKKK____",
        "__KwwwwwwK___",
        "_KwwwwwwwwK__",
        "_KWWWWWWWWK__",
        "_KWWWWWWWWK__",
        "_KppppppppK__",
        "_KppppppppK__",
        "_KppppppppK__",
        "_KppppppppK__",
        "_KppppppppK__",
        "_KppppppppK__",
        "_KppppppppK__",
        "_KppppppppK__",
        "__KppppppK___",
        "___KKKKKK____",
        "_____________"
    ],

    bookshelf: [
        "KKKKKKKKKKKKKKKK",
        "KwwwwwKwwKwwwwwK",
        "KwwwwwKwwKwwwwwK",
        "KRRRwwKGGKBBwwGK",
        "KRRRwwKGGKBBwwGK",
        "KKKKKKKKKKKKKKKK",
        "KwwwwwKwwKwwwwwK",
        "KwwwwwKwwKwwwwwK",
        "KYYwwGKRRKwwBBBK",
        "KYYwwGKRRKwwBBBK",
        "KKKKKKKKKKKKKKKK",
        "KwwwwwwwwwwwwwwK",
        "KwwwwwwwwwwwwwwK",
        "KwwwwwwwwwwwwwwK",
        "KwwwwwwwwwwwwwwK",
        "KKKKKKKKKKKKKKKK"
    ]
};
