import numpy as np
from PIL import Image
import os

def remove_background(image_path, output_path, tolerance=30):
    print(f"Processing {image_path}...")
    img = Image.open(image_path).convert("RGBA")
    datas = img.getdata()

    # Analyze corners to find background colors
    # Top-left, Top-right, Bottom-left, Bottom-right
    width, height = img.size
    corners = [
        img.getpixel((0, 0)),
        img.getpixel((width-1, 0)),
        img.getpixel((0, height-1)),
        img.getpixel((width-1, height-1))
    ]

    bg_colors = set()
    for c in corners:
        bg_colors.add(c[:3]) # Add RGB tuple

    print(f"Detected background colors (corners): {bg_colors}")

    newData = []

    # We will treat a pixel as background if it is close to ANY of the detected background colors
    # AND it is likely part of the checkerboard (high brightness usually)

    for item in datas:
        r, g, b, a = item
        is_bg = False
        for bg in bg_colors:
            if (abs(r - bg[0]) < tolerance and
                abs(g - bg[1]) < tolerance and
                abs(b - bg[2]) < tolerance):
                is_bg = True
                break

        if is_bg:
            newData.append((255, 255, 255, 0)) # Transparent
        else:
            newData.append(item)

    img.putdata(newData)
    img.save(output_path, "PNG")
    print(f"Saved to {output_path}")

# Run for both
remove_background("assets/images/hero_spritesheet_raw.jpg", "assets/images/hero_spritesheet_no_bg.png")
remove_background("assets/images/hero_portrait_raw.jpg", "assets/images/hero_portrait.png")
