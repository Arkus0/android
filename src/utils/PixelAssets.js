export const SNES_PALETTE = {
    _: null,       // Transparent

    // UI - Classic Blue Gradient
    // FFVI / Chrono Trigger text box style
    '#': 0x000000, // Black (Shadow/Outline)
    'W': 0xffffff, // White (Border/Text)
    'A': 0x757575, // Dark Grey (Border Bevel)
    'B': 0xbdbdbd, // Light Grey (Border Bevel)

    '0': 0x000040, // UI Darkest Blue (Background Top)
    '1': 0x000060, // UI Dark Blue
    '2': 0x000080, // UI Mid Blue
    '3': 0x0000a0, // UI Light Blue
    '4': 0x0000c0, // UI Lightest Blue (Background Bottom)

    // Forest Palette
    // Grass
    'g': 0x1e3b12, // Grass Shadow (Darkest)
    'G': 0x2f5a18, // Grass Base
    'h': 0x4a7c20, // Grass Highlight
    'H': 0x6ea134, // Grass Bright/Tips

    // Dirt/Earth
    'd': 0x3e2723, // Dirt Dark
    'D': 0x5d4037, // Dirt Base
    'e': 0x8d6e63, // Dirt Light

    // Tree/Wood
    'b': 0x261912, // Bark Darkest (Outline)
    'B': 0x3e2723, // Bark Dark
    'o': 0x5d4037, // Bark Mid
    'O': 0x8d6e63, // Bark Light

    // Canopy (Rich dark greens)
    'c': 0x0d2608, // Canopy Darkest (Shadow)
    'C': 0x18380f, // Canopy Dark
    'v': 0x265c18, // Canopy Mid
    'V': 0x3d8522, // Canopy Light

    // Water
    'w': 0x1a237e, // Deep
    'W': 0x283593, // Mid
    's': 0x3949ab, // Surface
    'S': 0x7986cb, // Foam/Highlight

    // House / Village
    'P': 0xe0e0d0, // Plaster (Cream Wall)
    'p': 0xc0c0b0, // Plaster Shadow
    'L': 0xf1c40f, // Light (Window Yellow)
    'r': 0x800000, // Roof Dark
    'R': 0xa02020, // Roof Mid
    'f': 0xd04040, // Roof Light
};

// 16x16 Pixel Arrays
export const UI_ASSETS = {
    // 9-Slice Window Components
    window_tl: [ // Top Left
        "___AAAAAAAAAAAAA",
        "__AWWWWWWWWWWWWW",
        "_AWW000000000000",
        "AW00000000000000",
        "AW00000000000000",
        "AW00000000000000",
        "AW00000000000000",
        "AW00000000000000",
        "AW00000000000000",
        "AW00000000000000",
        "AW00000000000000",
        "AW00000000000000",
        "AW00000000000000",
        "AW00000000000000",
        "AW00000000000000",
        "AW00000000000000"
    ],
    window_t: [ // Top Edge
        "AAAAAAAAAAAAAAAA",
        "WWWWWWWWWWWWWWWW",
        "WW00000000000000",
        "0000000000000000",
        "0000000000000000",
        "0000000000000000",
        "0000000000000000",
        "0000000000000000",
        "0000000000000000",
        "0000000000000000",
        "0000000000000000",
        "0000000000000000",
        "0000000000000000",
        "0000000000000000",
        "0000000000000000",
        "0000000000000000"
    ],
    window_tr: [ // Top Right
        "AAAAAAAAAAAAA___",
        "WWWWWWWWWWWWWA__",
        "000000000000WWA_",
        "0000000000000WWA",
        "0000000000000WWA",
        "0000000000000WWA",
        "0000000000000WWA",
        "0000000000000WWA",
        "0000000000000WWA",
        "0000000000000WWA",
        "0000000000000WWA",
        "0000000000000WWA",
        "0000000000000WWA",
        "0000000000000WWA",
        "0000000000000WWA",
        "0000000000000WWA"
    ],
    window_l: [ // Left Edge
        "AW00000000000000",
        "AW11111111111111",
        "AW11111111111111",
        "AW11111111111111",
        "AW22222222222222",
        "AW22222222222222",
        "AW22222222222222",
        "AW22222222222222",
        "AW33333333333333",
        "AW33333333333333",
        "AW33333333333333",
        "AW33333333333333",
        "AW44444444444444",
        "AW44444444444444",
        "AW44444444444444",
        "AW44444444444444"
    ],
    window_c: [ // Center (Gradient)
        "0000000000000000",
        "1111111111111111",
        "1111111111111111",
        "1111111111111111",
        "2222222222222222",
        "2222222222222222",
        "2222222222222222",
        "2222222222222222",
        "3333333333333333",
        "3333333333333333",
        "3333333333333333",
        "3333333333333333",
        "4444444444444444",
        "4444444444444444",
        "4444444444444444",
        "4444444444444444"
    ],
    window_r: [ // Right Edge
        "0000000000000WWA",
        "1111111111111WWA",
        "1111111111111WWA",
        "1111111111111WWA",
        "2222222222222WWA",
        "2222222222222WWA",
        "2222222222222WWA",
        "2222222222222WWA",
        "3333333333333WWA",
        "3333333333333WWA",
        "3333333333333WWA",
        "3333333333333WWA",
        "4444444444444WWA",
        "4444444444444WWA",
        "4444444444444WWA",
        "4444444444444WWA"
    ],
    window_bl: [ // Bottom Left
        "AW44444444444444",
        "AW44444444444444",
        "AW44444444444444",
        "AW44444444444444",
        "AW44444444444444",
        "AW44444444444444",
        "AW44444444444444",
        "AW44444444444444",
        "AW44444444444444",
        "AW44444444444444",
        "AW44444444444444",
        "AW44444444444444",
        "AW44444444444444",
        "_AWW444444444444",
        "__AWWWWWWWWWWWWW",
        "___AAAAAAAAAAAAA"
    ],
    window_b: [ // Bottom Edge
        "4444444444444444",
        "4444444444444444",
        "4444444444444444",
        "4444444444444444",
        "4444444444444444",
        "4444444444444444",
        "4444444444444444",
        "4444444444444444",
        "4444444444444444",
        "4444444444444444",
        "4444444444444444",
        "4444444444444444",
        "4444444444444444",
        "W444444444444444",
        "WWWWWWWWWWWWWWWW",
        "AAAAAAAAAAAAAAAA"
    ],
    window_br: [ // Bottom Right
        "4444444444444WWA",
        "4444444444444WWA",
        "4444444444444WWA",
        "4444444444444WWA",
        "4444444444444WWA",
        "4444444444444WWA",
        "4444444444444WWA",
        "4444444444444WWA",
        "4444444444444WWA",
        "4444444444444WWA",
        "4444444444444WWA",
        "4444444444444WWA",
        "4444444444444WWA",
        "444444444444WWWA",
        "WWWWWWWWWWWWWA__",
        "AAAAAAAAAAAAA___"
    ]
};

export const FOREST_ASSETS = {
    // 16x16 Tiles
    grass: [
        "GGGGGGGGGGGGGGGG",
        "GGhGGGGGGhGGGGGG",
        "GGhhGGGGhhGGGGGG",
        "GGGGGGGGGGGGGGGG",
        "GGGGggGGGGGGggGG",
        "GGGGgggGGGGGgggG",
        "GGGGGGGGGGGGGGGG",
        "GGhGGGGGGhGGGGGG",
        "GGhhGGGGhhGGGGGG",
        "GGGGGGGGGGGGGGGG",
        "ggGGGGGGggGGGGGG",
        "gggGGGGGgggGGGGG",
        "GGGGGGGGGGGGGGGG",
        "GGGGGGGGGGGGGGGG",
        "GGGGGGGGGGGGGGGG",
        "GGGGGGGGGGGGGGGG"
    ],
    grass_var: [
        "GGGGGGGGGGGGGGGG",
        "GGGGGHGGGGGHGGGG",
        "GGGGHHGGGGHHGGGG",
        "GGGGGGGGGGGGGGGG",
        "GGGGGGGGGGGGGGGG",
        "GGggGGGGGGggGGGG",
        "GGggGGGGGGggGGGG",
        "GGGGGGGGGGGGGGGG",
        "GGGGGGGGGGGGGGGG",
        "GGHHHGGGGHHHGGGG",
        "GGHHHGGGGHHHGGGG",
        "GGGGGGGGGGGGGGGG",
        "GGGGGGGGGGGGGGGG",
        "GGggGGGGGGGGGGGG",
        "GGggGGGGGGGGGGGG",
        "GGGGGGGGGGGGGGGG"
    ],
    dirt: [
        "DDDDDDDDDDDDDDDD",
        "DDeDDDDDDDDDeDDD",
        "DDDeDDDDDDDDeDDD",
        "DDDDDDDDDDDDDDDD",
        "DDDDDddDDDDDddDD",
        "DDDDDdddDDDDdddD",
        "DDDDDDDDDDDDDDDD",
        "DDeDDDDDDDeDDDDD",
        "DDeDDDDDDDeDDDDD",
        "DDDDDDDDDDDDDDDD",
        "ddDDDDDDddDDDDDD",
        "dddDDDDDdddDDDDD",
        "DDDDDDDDDDDDDDDD",
        "DDDDDDDDDDDDDDDD",
        "DDDDDDDDDDDDDDDD",
        "DDDDDDDDDDDDDDDD"
    ],

    // Simple Tree (Can be composed)
    tree_trunk: [
        "______BBBB______",
        "_____BBooBB_____",
        "_____BBooBB_____",
        "_____BoOOoB_____",
        "_____BoOOoB_____",
        "____BBoOOoBB____",
        "____BBoOOoBB____",
        "___BBBoOOoBBB___",
        "___BBBoOOoBBB___",
        "___BBBoOOoBBB___",
        "__BBBBbOObBBBB__",
        "__BBBBbOObBBBB__",
        "_BBBBBbOObBBBBB_",
        "_BBBBBbOObBBBBB_",
        "BBBBBBbOObBBBBBB",
        "BBBBBBbOObBBBBBB"
    ],

    tree_top: [
        "______cccc______",
        "_____ccvvcc_____",
        "____ccvVVvcc____",
        "___ccvVVVVvcc___",
        "___ccVVVVVVcc___",
        "__ccvVVVVVVvcc__",
        "__ccVVVVVVVVcc__",
        "__ccVVVVVVVVcc__",
        "_ccvVVVVVVVVvcc_",
        "_ccVVVVVVVVVVcc_",
        "_ccVVVVVVVVVVcc_",
        "ccvVVVVVVVVVVvcc",
        "ccVVVVVVVVVVVVcc",
        "ccVVVVVVVVVVVVcc",
        "_ccccVVVVVVcccc_",
        "_____cccccc_____"
    ]
};

export const VILLAGE_ASSETS = {
    // Roofs
    roof_red_l: [
        "________________",
        "_______________R",
        "______________Rr",
        "_____________Rrf",
        "____________Rrff",
        "___________RrffR",
        "__________RrffRr",
        "_________RrffRrf",
        "________RrffRrff",
        "_______RrffRrffR",
        "______RrffRrffRr",
        "_____RrffRrffRrf",
        "____RrffRrffRrff",
        "___RrffRrffRrffR",
        "__RrffRrffRrffRr",
        "_RrffRrffRrffRrf"
    ],
    roof_red_c: [
        "________________",
        "RRRRRRRRRRRRRRRR",
        "rrrrrrrrrrrrrrrr",
        "ffffffffffffffff",
        "ffffffffffffffff",
        "RRRRRRRRRRRRRRRR",
        "rrrrrrrrrrrrrrrr",
        "ffffffffffffffff",
        "ffffffffffffffff",
        "RRRRRRRRRRRRRRRR",
        "rrrrrrrrrrrrrrrr",
        "ffffffffffffffff",
        "ffffffffffffffff",
        "RRRRRRRRRRRRRRRR",
        "rrrrrrrrrrrrrrrr",
        "ffffffffffffffff"
    ],
    roof_red_r: [
        "________________",
        "R_______________",
        "rR______________",
        "frR_____________",
        "ffrR____________",
        "RffrR___________",
        "rRffrR__________",
        "frRffrR_________",
        "ffrRffrR________",
        "RffrRffrR_______",
        "rRffrRffrR______",
        "frRffrRffrR_____",
        "ffrRffrRffrR____",
        "RffrRffrRffrR___",
        "rRffrRffrRffrR__",
        "frRffrRffrRffrR_"
    ],

    // Walls
    wall_plaster: [
        "bbbbbbbbbbbbbbbb",
        "bPPPPPPPPPPPPPPb",
        "bPPPPPPPPPPPPPPb",
        "bPPPPPPPPPPPPPPb",
        "bPPPPPPPPPPPPPPb",
        "bPPPPPPPPPPPPPPb",
        "bPPPPPPPPPPPPPPb",
        "bPPPPPPPPPPPPPPb",
        "bPPPPPPPPPPPPPPb",
        "bPPPPPPPPPPPPPPb",
        "bPPPPPPPPPPPPPPb",
        "bPPPPPPPPPPPPPPb",
        "bPPPPPPPPPPPPPPb",
        "bPPPPPPPPPPPPPPb",
        "bPPPPPPPPPPPPPPb",
        "bbbbbbbbbbbbbbbb"
    ],
    wall_window: [
        "bbbbbbbbbbbbbbbb",
        "bPPPPPPPPPPPPPPb",
        "bPPPPPPPPPPPPPPb",
        "bPPPPbbbbbbPPPPb",
        "bPPPPbLLLLbPPPPb",
        "bPPPPbLLLLbPPPPb",
        "bPPPPbLLLLbPPPPb",
        "bPPPPbLLLLbPPPPb",
        "bPPPPbbbbbbPPPPb",
        "bPPPPbbWbbbPPPPb",
        "bPPPPPPPPPPPPPPb",
        "bPPPPPPPPPPPPPPb",
        "bPPPPPPPPPPPPPPb",
        "bPPPPPPPPPPPPPPb",
        "bPPPPPPPPPPPPPPb",
        "bbbbbbbbbbbbbbbb"
    ],
    wall_door: [
        "bbbbbbbbbbbbbbbb",
        "bPPPPbbbbbbPPPPb",
        "bPPPPbDDDDbPPPPb",
        "bPPPPbDDDDbPPPPb",
        "bPPPPbDDDDbPPPPb",
        "bPPPPbDDDDbPPPPb",
        "bPPPPbDDDDbPPPPb",
        "bPPPPbDdDDbPPPPb",
        "bPPPPbDDDDbPPPPb",
        "bPPPPbDDDDbPPPPb",
        "bPPPPbDDDDbPPPPb",
        "bPPPPbDDDDbPPPPb",
        "bPPPPbDDDDbPPPPb",
        "bPPPPbDDDDbPPPPb",
        "bPPPPbDDDDbPPPPb",
        "bbbbbbbbbbbbbbbb"
    ],

    // Fence
    fence: [
        "________________",
        "________________",
        "________________",
        "________________",
        "___bb______bb___",
        "___bb______bb___",
        "__boob____boob__",
        "__boob____boob__",
        "bbboobbbbboobbbb",
        "bbboobbbbboobbbb",
        "__boob____boob__",
        "__boob____boob__",
        "__boob____boob__",
        "__boob____boob__",
        "__boob____boob__",
        "__boob____boob__"
    ]
};
