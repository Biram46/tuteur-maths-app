// Run: node scripts/generate-icons.mjs
// Requires: npm install sharp (already in most Next.js projects)
// Or use: npx @squoosh/cli for conversion

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// Try to use sharp if available
try {
  const sharp = (await import('sharp')).default;
  const svgBuffer = readFileSync(join(publicDir, 'icon.svg'));

  // icon-192.png
  await sharp(svgBuffer).resize(192, 192).png().toFile(join(publicDir, 'icon-192.png'));
  console.log('✅ icon-192.png');

  // icon-512.png
  await sharp(svgBuffer).resize(512, 512).png().toFile(join(publicDir, 'icon-512.png'));
  console.log('✅ icon-512.png');

  // apple-touch-icon.png (180x180)
  await sharp(svgBuffer).resize(180, 180).png().toFile(join(publicDir, 'apple-touch-icon.png'));
  console.log('✅ apple-touch-icon.png');

  // og-image.png (1200x630 - simple gradient)
  const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="#0f172a"/>
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#0ea5e9;stop-opacity:0.3"/>
        <stop offset="100%" style="stop-color:#a855f7;stop-opacity:0.3"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#g)"/>
    <text x="600" y="280" font-family="serif" font-size="180" font-weight="bold" fill="white" text-anchor="middle">∑</text>
    <text x="600" y="380" font-family="Arial,sans-serif" font-size="64" font-weight="bold" fill="white" text-anchor="middle">Tuteur Maths</text>
    <text x="600" y="450" font-family="Arial,sans-serif" font-size="32" fill="#94a3b8" text-anchor="middle">Cours · Exercices · IA — Lycée français</text>
  </svg>`;
  await sharp(Buffer.from(ogSvg)).resize(1200, 630).png().toFile(join(publicDir, 'og-image.png'));
  console.log('✅ og-image.png');

  // icon-quiz.png & icon-sujets.png (96x96 simplified)
  await sharp(svgBuffer).resize(96, 96).png().toFile(join(publicDir, 'icon-quiz.png'));
  await sharp(svgBuffer).resize(96, 96).png().toFile(join(publicDir, 'icon-sujets.png'));
  console.log('✅ icon-quiz.png, icon-sujets.png');

  console.log('\n✅ All icons generated successfully!');
} catch (e) {
  console.error('❌ sharp not available:', e.message);
  console.log('Run: npm install sharp  then re-run this script.');
}
