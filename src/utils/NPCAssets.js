// 16x16 Pixel Arrays for SNES-style Chibi Characters
// Palette mapping should be handled by the texture generator.
// Here we define the "shape" using generic characters:
// @: Outline (Black/Dark)
// S: Skin
// H: Hair
// C: Clothing Main
// D: Clothing Detail/Dark
// F: Feet/Shoes

export const NPC_SPRITES = {
    // Base villager template
    base_idle: [
        "________________",
        "_____HHHHHH_____",
        "____HHHHHHHH____",
        "____HHHHHHHH____",
        "____SSSSSSSS____",
        "____S@S@@S@S____", // Eyes
        "____SSSSSSSS____",
        "_____CCCCCC_____",
        "____CCCCCCCC____",
        "___CCCCCCCCCC___",
        "___CCCCCCCCCC___",
        "___CCCCCCCCCC___",
        "____DD____DD____",
        "____DD____DD____",
        "___FF______FF___",
        "___FF______FF___"
    ],
    // Variations defined by color palettes in BootScene logic
};
