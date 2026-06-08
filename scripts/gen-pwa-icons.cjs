// Pre-render Tradevoice PWA icons (green brand) from an inline SVG.
// Run once: node scripts/gen-pwa-icons.cjs   (outputs into public/)
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', 'public');

// Maskable-safe: full-bleed green background, "TV" monogram centered well
// inside the inner-80% safe zone so Android's mask never clips it.
function svg({ rounded }) {
  const bg = rounded
    ? `<rect width="512" height="512" rx="96" fill="#2d6a4f"/>`
    : `<rect width="512" height="512" fill="#2d6a4f"/>`;
  return Buffer.from(
`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  ${bg}
  <text x="256" y="338" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif" font-weight="700"
        font-size="230" fill="#ffffff" letter-spacing="-6">TV</text>
</svg>`);
}

async function main() {
  const jobs = [
    { name: 'icon-192.png',           size: 192, src: svg({ rounded: false }) }, // maskable bg fills
    { name: 'icon-512.png',           size: 512, src: svg({ rounded: false }) },
    { name: 'icon-maskable-512.png',  size: 512, src: svg({ rounded: false }) },
    { name: 'apple-touch-icon.png',   size: 180, src: svg({ rounded: true  }) }, // iOS rounds itself; rounded looks native in Safari grid
  ];
  for (const j of jobs) {
    await sharp(j.src, { density: 384 }).resize(j.size, j.size).png().toFile(path.join(OUT, j.name));
    console.log('wrote', j.name, fs.statSync(path.join(OUT, j.name)).size, 'bytes');
  }
}
main().catch(e => { console.error(e); process.exit(1); });
