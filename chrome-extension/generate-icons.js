/**
 * Generate professional icons for Chrome extension
 * Run with: node generate-icons.js
 */

const fs = require('fs');
const { createCanvas } = require('canvas');

function generateIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background - dark professional color
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, size, size);

  // Border - accent color
  ctx.strokeStyle = '#00ff88';
  ctx.lineWidth = size * 0.08;
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, size - ctx.lineWidth, size - ctx.lineWidth);

  // Icon - Key symbol
  ctx.fillStyle = '#00ff88';

  // Key circle
  const centerX = size * 0.4;
  const centerY = size * 0.35;
  const radius = size * 0.15;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  // Key shaft
  ctx.fillRect(centerX + radius * 0.5, centerY - radius * 0.3, size * 0.25, radius * 0.6);

  // Key teeth
  const teethStart = centerX + radius * 0.5 + size * 0.25;
  ctx.fillRect(teethStart, centerY - radius * 0.3, size * 0.08, radius * 0.4);
  ctx.fillRect(teethStart + size * 0.08, centerY + radius * 0.1, size * 0.08, radius * 0.2);

  // Text "W" for Whisk
  if (size >= 48) {
    ctx.font = `bold ${size * 0.25}px Arial`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('W', size * 0.5, size * 0.75);
  }

  // Save
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filename, buffer);
  console.log(`✅ Generated ${filename} (${size}x${size})`);
}

try {
  generateIcon(16, 'icon16.png');
  generateIcon(48, 'icon48.png');
  generateIcon(128, 'icon128.png');
  console.log('🎨 All icons generated successfully!');
} catch (error) {
  console.error('❌ Error generating icons:', error.message);
  console.log('⚠️  Installing canvas dependency...');
  console.log('Run: npm install canvas');
  process.exit(1);
}
