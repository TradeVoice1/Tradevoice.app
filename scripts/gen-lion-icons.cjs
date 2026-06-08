// Generate the Tradevoice lion favicon / app-icon set from the wordmark.
//
// Source of truth: marketing/logo.png (the full "lion + TRADEVOICE" wordmark).
// We crop JUST the lion-in-laurel emblem on the left, trim the surrounding
// white, and center it on a white square so the dark-green linework stays
// visible on BOTH light and dark browser tab bars. Then we emit every size
// the marketing site + app need.
//
// Supersedes scripts/gen-pwa-icons.cjs (the green "TV" placeholder icons).
// Re-run with:  node scripts/gen-lion-icons.cjs

const sharp = require('sharp');
const path = require('path');

const SRC = path.join(__dirname, '..', 'marketing', 'logo.png');
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

async function buildSquare({ marginPct }) {
  const meta = await sharp(SRC).metadata(); // 1845x500

  // The emblem lives in the left ~25.5% of the art. Stop before the thin
  // vine divider (~x=490) so only the lion + laurel are captured.
  const cropW = Math.round(meta.width * 0.255);

  // Crop the emblem column (separate pass — sharp can't chain extract+trim),
  // then trim the white margins to a tight bbox.
  const cropBuf = await sharp(SRC)
    .extract({ left: 0, top: 0, width: cropW, height: meta.height })
    .png()
    .toBuffer();
  const { data, info } = await sharp(cropBuf)
    .trim({ threshold: 10 })
    .toBuffer({ resolveWithObject: true });

  // Center on a white square with breathing room around the emblem.
  const side = Math.round(Math.max(info.width, info.height) * (1 + marginPct));
  return sharp({
    create: { width: side, height: side, channels: 4, background: WHITE },
  })
    .composite([{ input: data, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function emit(square, dir, name, size) {
  const out = path.join(__dirname, '..', dir, name);
  await sharp(square)
    .resize(size, size, { fit: 'contain', background: WHITE })
    .flatten({ background: WHITE })
    .png()
    .toFile(out);
  console.log('wrote', `${dir}/${name}`, `(${size}x${size})`);
}

async function main() {
  // Standard square: modest margin — used for favicons + apple-touch + PWA.
  const square = await buildSquare({ marginPct: 0.12 });
  // Maskable: extra margin so the lion survives Android's circular crop
  // (key content must sit inside the central ~80% safe zone).
  const squareMaskable = await buildSquare({ marginPct: 0.6 });

  // App (Vite copies public/ to the web root).
  await emit(square, 'public', 'favicon-16.png', 16);
  await emit(square, 'public', 'favicon-32.png', 32);
  await emit(square, 'public', 'favicon-48.png', 48);
  await emit(square, 'public', 'apple-touch-icon.png', 180);
  await emit(square, 'public', 'icon-192.png', 192);
  await emit(square, 'public', 'icon-512.png', 512);
  await emit(squareMaskable, 'public', 'icon-maskable-512.png', 512);

  // Marketing site (served at root from its own Vercel project).
  await emit(square, 'marketing', 'favicon-16.png', 16);
  await emit(square, 'marketing', 'favicon-32.png', 32);
  await emit(square, 'marketing', 'favicon-48.png', 48);
  await emit(square, 'marketing', 'apple-touch-icon.png', 180);

  console.log('\nLion icon set generated.');
}

main().catch((e) => { console.error(e); process.exit(1); });
