#!/usr/bin/env python3
"""Update PWA icons to have dark green background instead of white"""

from PIL import Image
import os

# Arbórea forest green color
FOREST_GREEN = (0x22, 0x2E, 0x2C, 255)  # RGB + Alpha

def replace_background_with_green(image_path, output_path=None):
    """Replace white/transparent background with forest green"""
    if output_path is None:
        output_path = image_path

    # Open image
    img = Image.open(image_path).convert('RGBA')

    # Create new image with forest green background
    width, height = img.size
    new_img = Image.new('RGBA', (width, height), FOREST_GREEN)

    # Get pixel data
    pixels = img.load()
    new_pixels = new_img.load()

    # Process each pixel
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]

            # If pixel is NOT white/light (i.e., it's part of the logo)
            # Keep it, otherwise leave the green background
            if not (r > 200 and g > 200 and b > 200):
                new_pixels[x, y] = (r, g, b, a)

    # Convert to RGB (no transparency) to ensure solid background
    final_img = Image.new('RGB', (width, height), (0x22, 0x2E, 0x2C))
    final_img.paste(new_img, (0, 0), new_img)

    # Save
    final_img.save(output_path, 'PNG')
    print(f'✅ Updated {os.path.basename(output_path)}')

def main():
    base_path = '/Users/andresarias/Documents/MDW/arborea/operations/arborea-ops/public'

    print('Updating PWA icons with dark green background...\n')

    icons = [
        'icon-192.png',
        'icon-512.png',
        'icon-circle.png'
    ]

    for icon in icons:
        icon_path = os.path.join(base_path, icon)
        if os.path.exists(icon_path):
            replace_background_with_green(icon_path)
        else:
            print(f'⚠️  {icon} not found')

    print('\n✨ All icons updated successfully!')

if __name__ == '__main__':
    main()
