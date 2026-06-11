// Generate the Capacitor source assets (assets/icon.png 1024² + splash 2732²)
// from the lion emblem. @capacitor/assets then fans these out into every iOS
// icon/splash size. iOS icons must be opaque — white background, like the
// favicon set. Re-run: node scripts/gen-ios-assets.cjs && npx @capacitor/assets generate --ios

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'marketing', 'logo.png');
const OUT = path.join(__dirname, '..', 'assets');
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

// Same crop + despeckle as gen-lion-icons.cjs: lion column, trim, drop the
// vine sliver after the first >=6px all-white column gap.
async function lionBody() {
  const meta = await sharp(SRC).metadata();
  const cropW = Math.round(meta.width * 0.255);
  const cropBuf = await sharp(SRC).extract({ left: 0, top: 0, width: cropW, height: meta.height }).png().toBuffer();
  const trimmed = await sharp(cropBuf).trim({ threshold: 10 }).png().toBuffer();
  const { width: tw, height: th } = await sharp(trimmed).metadata();
  const rgb = await sharp(trimmed).removeAlpha().raw().toBuffer();
  const ink = new Array(tw).fill(false);
  for (let x = 0; x < tw; x++) {
    for (let y = 0; y < th; y++) {
      const i = (y * tw + x) * 3;
      if ((rgb[i] + rgb[i + 1] + rgb[i + 2]) / 3 < 230) { ink[x] = true; break; }
    }
  }
  let cut = tw, gapStart = -1;
  for (let x = 0; x < tw; x++) {
    if (!ink[x]) { if (gapStart < 0) gapStart = x; }
    else { if (gapStart >= 0 && x - gapStart >= 6) { cut = gapStart; break; } gapStart = -1; }
  }
  return { body: await sharp(trimmed).extract({ left: 0, top: 0, width: cut, height: th }).png().toBuffer(), w: cut, h: th };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const { body, w, h } = await lionBody();

  // App icon — 1024², opaque white, lion at ~72% so iOS's rounded-corner
  // mask never clips the mane.
  const iconInner = 736;
  const scale = Math.min(iconInner / w, iconInner / h);
  const lionIcon = await sharp(body).resize(Math.round(w * scale), Math.round(h * scale)).png().toBuffer();
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: WHITE } })
    .composite([{ input: lionIcon, gravity: 'center' }])
    .flatten({ background: WHITE })
    .png().toFile(path.join(OUT, 'icon.png'));
  console.log('wrote assets/icon.png (1024x1024)');

  // Splash — 2732² white with the lion centered small (safe for any crop).
  const splashInner = 760;
  const s2 = Math.min(splashInner / w, splashInner / h);
  const lionSplash = await sharp(body).resize(Math.round(w * s2), Math.round(h * s2)).png().toBuffer();
  const splash = sharp({ create: { width: 2732, height: 2732, channels: 4, background: WHITE } })
    .composite([{ input: lionSplash, gravity: 'center' }])
    .flatten({ background: WHITE })
    .png();
  await splash.clone().toFile(path.join(OUT, 'splash.png'));
  await splash.clone().toFile(path.join(OUT, 'splash-dark.png'));
  console.log('wrote assets/splash.png + splash-dark.png (2732x2732)');
}

main().catch((e) => { console.error(e); process.exit(1); });
