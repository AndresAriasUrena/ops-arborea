#!/usr/bin/env python3
"""Update PWA icons to have dark green background instead of white"""

from PIL import Image
import os

# Arbórea forest green color
FOREST_GREEN = (0x22, 0x2E, 0x2C, 255)  # RGB + Alpha

def replace_background_with_green(image_path, output_path=None, padding=20):
    """Replace white/transparent background with forest green and add padding"""
    if output_path is None:
        output_path = image_path

    # Open image
    img = Image.open(image_path).convert('RGBA')

    # Calculate new size with padding
    original_width, original_height = img.size
    new_width = original_width + (padding * 2)
    new_height = original_height + (padding * 2)

    # Create new image with forest green background and padding
    new_img = Image.new('RGBA', (new_width, new_height), FOREST_GREEN)

    # Get pixel data from original
    pixels = img.load()
    new_pixels = new_img.load()

    # Copy pixels to new image with offset for padding
    for y in range(original_height):
        for x in range(original_width):
            r, g, b, a = pixels[x, y]

            # If pixel is NOT white/light (i.e., it's part of the logo)
            # Copy it to the new position with padding offset
            if not (r > 200 and g > 200 and b > 200):
                new_x = x + padding
                new_y = y + padding
                new_pixels[new_x, new_y] = (r, g, b, a)

    # Resize back to original dimensions to maintain icon size
    new_img = new_img.resize((original_width, original_height), Image.Resampling.LANCZOS)

    # Convert to RGB (no transparency) to ensure solid background
    final_img = Image.new('RGB', (original_width, original_height), (0x22, 0x2E, 0x2C))
    final_img.paste(new_img, (0, 0), new_img)

    # Save
    final_img.save(output_path, 'PNG')
    print(f'✅ Updated {os.path.basename(output_path)} with padding')

def main():
    base_path = '/Users/andresarias/Documents/MDW/arborea/operations/arborea-ops/public'

    print('Updating PWA icons with dark green background and padding...\n')

    # Different padding for different icon sizes
    icons = [
        ('icon-192.png', 16),   # Smaller padding for smaller icon
        ('icon-512.png', 40),   # More padding for larger icon
        ('icon-circle.png', 40) # More padding for circle icon
    ]

    for icon, padding in icons:
        icon_path = os.path.join(base_path, icon)
        if os.path.exists(icon_path):
            replace_background_with_green(icon_path, padding=padding)
        else:
            print(f'⚠️  {icon} not found')

    print('\n✨ All icons updated successfully!')

if __name__ == '__main__':
    main()
