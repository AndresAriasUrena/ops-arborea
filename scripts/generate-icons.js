// Generate PWA icons with dark green background
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

const FOREST_GREEN = '#222E2C';
const AMBER = '#FFD2A9';

async function generateIcon(size, outputPath, isCircle = false) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Fill background with forest green
  ctx.fillStyle = FOREST_GREEN;
  if (isCircle) {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(0, 0, size, size);
  }

  // Load and draw the original icon to extract just the tree logo
  try {
    const originalPath = outputPath.replace('scripts/../public/', 'public/');
    const img = await loadImage(originalPath);

    // Draw the image with composite mode to only keep the colored parts
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(img, 0, 0, size, size);

    // Replace white pixels with forest green
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // If pixel is white or very light (background), replace with forest green
      if (r > 240 && g > 240 && b > 240) {
        data[i] = 0x22;     // R
        data[i + 1] = 0x2E; // G
        data[i + 2] = 0x2C; // B
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Save
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ Generated ${outputPath}`);
  } catch (error) {
    console.error(`❌ Error generating ${outputPath}:`, error.message);
  }
}

async function main() {
  console.log('Generating PWA icons with dark green background...\n');

  await generateIcon(192, 'scripts/../public/icon-192.png', false);
  await generateIcon(512, 'scripts/../public/icon-512.png', false);
  await generateIcon(512, 'scripts/../public/icon-circle.png', true);

  console.log('\n✨ All icons generated successfully!');
}

main().catch(console.error);
