import numpy as np
from PIL import Image

def repack_sprites(input_path, output_path):
    print(f"Repacking {input_path}...")
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img)
    alpha = arr[:, :, 3]

    # Simple blob detection: find rows and cols that have non-zero alpha
    # This assumes sprites are separated by transparency

    # Identify rows with content
    rows_with_content = np.any(alpha > 0, axis=1)

    # Find start and end indices of rows
    row_intervals = []
    start = None
    for i, val in enumerate(rows_with_content):
        if val and start is None:
            start = i
        elif not val and start is not None:
            row_intervals.append((start, i))
            start = None
    if start is not None:
        row_intervals.append((start, len(rows_with_content)))

    print(f"Found {len(row_intervals)} rows of sprites.")

    sprites = []

    for (r_start, r_end) in row_intervals:
        # Extract the row strip
        row_alpha = alpha[r_start:r_end, :]
        # Identify columns in this row
        cols_with_content = np.any(row_alpha > 0, axis=0)

        col_intervals = []
        c_start = None
        for i, val in enumerate(cols_with_content):
            if val and c_start is None:
                c_start = i
            elif not val and c_start is not None:
                col_intervals.append((c_start, i))
                c_start = None
        if c_start is not None:
            col_intervals.append((c_start, len(cols_with_content)))

        print(f"  Row {r_start}-{r_end}: Found {len(col_intervals)} sprites.")

        for (c_start, c_end) in col_intervals:
            # Crop the sprite
            sprite = img.crop((c_start, r_start, c_end, r_end))
            # Trim the sprite to minimal bounding box (remove extra transparent space within the block if any)
            bbox = sprite.getbbox()
            if bbox:
                sprite = sprite.crop(bbox)
                sprites.append(sprite)

    # Determine standard size (max width and max height)
    max_w = max(s.width for s in sprites)
    max_h = max(s.height for s in sprites)
    print(f"Max sprite dimensions: {max_w}x{max_h}")

    # Create new image: single row
    total_width = max_w * len(sprites)
    new_img = Image.new("RGBA", (total_width, max_h), (0, 0, 0, 0))

    for i, sprite in enumerate(sprites):
        # Center the sprite in the frame
        x_offset = i * max_w + (max_w - sprite.width) // 2
        y_offset = (max_h - sprite.height) // 2 # Center vertically? Or align bottom?
        # Usually align bottom for RPG characters so feet match
        y_offset = (max_h - sprite.height)

        new_img.paste(sprite, (x_offset, y_offset))

    new_img.save(output_path)
    print(f"Saved packed sprite sheet to {output_path} ({len(sprites)} frames, {max_w}x{max_h} per frame)")

    return max_w, max_h

repack_sprites("assets/images/hero_spritesheet_no_bg.png", "assets/images/hero_spritesheet.png")
