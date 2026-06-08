// Generate "Lead your business with pride" lion + slogan brand graphics.
//
// Reuses the lion emblem cropped from the wordmark and pairs it with the
// slogan in the brand serif voice. Emits a versatile multi-format set:
// a square social post, a link-preview (OG) card, a Facebook cover, and a
// light-background lockup.
//
// NOTE: the lion art has a pure-white (#fff) interior, so every backdrop the
// lion touches is WHITE — a cream backdrop makes the lion's bounding box show
// as a square. On green graphics the lion sits in a white "coin".
//
// Output → marketing/brand/.  Re-run: node scripts/gen-lion-slogan.cjs

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'marketing', 'logo.png');
const OUT = path.join(__dirname, '..', 'marketing', 'brand');

const GREEN = '#2d6a4f';
const CREAM = '#f3f6f4';
const WHITE_RGB = { r: 255, g: 255, b: 255, alpha: 1 };
const GREEN_RGB = { r: 45, g: 106, b: 79, alpha: 1 };
const SERIF = "Georgia, 'Times New Roman', serif";

// ── Lion emblem on a tight WHITE tile (square) ──
async function lionTile() {
  const meta = await sharp(SRC).metadata();
  const cropW = Math.round(meta.width * 0.255);
  const cropBuf = await sharp(SRC)
    .extract({ left: 0, top: 0, width: cropW, height: meta.height })
    .png().toBuffer();
  const { data, info } = await sharp(cropBuf).trim({ threshold: 10 }).toBuffer({ resolveWithObject: true });
  const side = Math.round(Math.max(info.width, info.height) * 1.02);
  return sharp({ create: { width: side, height: side, channels: 4, background: WHITE_RGB } })
    .composite([{ input: data, gravity: 'center' }])
    .png().toBuffer();
}

// ── Lion in a white circle "coin" (for placing on green) ──
// CONTAIN the lion to 76% of the coin so no part of the mane/laurel reaches
// the rim (that was the "bleeding"). A clean white ring frames it; the mask
// only trims the white tile corners, never the art.
async function lionCircle(tile, d) {
  const inner = Math.round(d * 0.76);
  const lion = await sharp(tile).resize(inner, inner, { fit: 'contain', background: WHITE_RGB }).png().toBuffer();
  const base = await sharp({ create: { width: d, height: d, channels: 4, background: WHITE_RGB } })
    .composite([{ input: lion, gravity: 'center' }])
    .png().toBuffer();
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${d}" height="${d}"><circle cx="${d / 2}" cy="${d / 2}" r="${d / 2}" fill="#fff"/></svg>`);
  return sharp(base).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}

// ── Two-line slogan SVG. Returns { buf, w, h }; line 2 italic. ──
function slogan({ size, color, line1 = 'Lead Your Business', line2 = 'With Pride' }) {
  const w = Math.round(size * Math.max(line1.length, line2.length) * 0.68);
  const h = Math.round(size * 2.6);
  const buf = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<text x="${w / 2}" y="${size}" font-family="${SERIF}" font-weight="700" font-size="${size}" fill="${color}" text-anchor="middle">${line1}</text>` +
    `<text x="${w / 2}" y="${size * 2.15}" font-family="${SERIF}" font-weight="700" font-style="italic" font-size="${size}" fill="${color}" text-anchor="middle">${line2}</text>` +
    `</svg>`
  );
  return { buf, w, h };
}

// ── Small letter-spaced URL strip. Width includes the letter-spacing. ──
function urlStrip({ size, color, text = 'THETRADEVOICE.COM' }) {
  const ls = size * 0.16;
  const w = Math.round(text.length * size * 1.15);   // generous; text-anchor centers within
  const h = Math.round(size * 1.8);
  const buf = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<text x="${w / 2}" y="${size}" font-family="${SERIF}" font-weight="700" letter-spacing="${ls}" font-size="${size}" fill="${color}" text-anchor="middle">${text}</text>` +
    `</svg>`
  );
  return { buf, w, h };
}

const cx = (canvasW, blockW) => Math.round((canvasW - blockW) / 2);

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const tile = await lionTile();

  // 1) Square social post — 1080×1080, green, white coin centered on top.
  {
    const W = 1080, H = 1080, D = 470;
    const lc = await lionCircle(tile, D);
    const s = slogan({ size: 74, color: CREAM });
    const u = urlStrip({ size: 27, color: 'rgba(243,246,244,0.88)' });
    await sharp({ create: { width: W, height: H, channels: 4, background: GREEN_RGB } })
      .composite([
        { input: lc, top: 140, left: cx(W, D) },
        { input: s.buf, top: 700, left: cx(W, s.w) },
        { input: u.buf, top: 968, left: cx(W, u.w) },
      ])
      .png().toFile(path.join(OUT, 'lion-slogan-square.png'));
    console.log('wrote brand/lion-slogan-square.png (1080x1080)');
  }

  // 2) Link-preview / OG card — 1200×630, green, coin left + text right.
  {
    const W = 1200, H = 630, D = 400;
    const lc = await lionCircle(tile, D);
    const s = slogan({ size: 60, color: CREAM });
    const u = urlStrip({ size: 23, color: 'rgba(243,246,244,0.88)' });
    const CXr = 840;                                   // center of the right text column
    await sharp({ create: { width: W, height: H, channels: 4, background: GREEN_RGB } })
      .composite([
        { input: lc, top: Math.round((H - D) / 2), left: 80 },
        { input: s.buf, top: 215, left: Math.round(CXr - s.w / 2) },
        { input: u.buf, top: 430, left: Math.round(CXr - u.w / 2) },
      ])
      .png().toFile(path.join(OUT, 'og-lion.png'));
    console.log('wrote brand/og-lion.png (1200x630)');
  }

  // 3) Facebook cover — 1640×624, green, coin left + text right.
  {
    const W = 1640, H = 624, D = 420;
    const lc = await lionCircle(tile, D);
    const s = slogan({ size: 72, color: CREAM });
    const CXr = 1140;
    await sharp({ create: { width: W, height: H, channels: 4, background: GREEN_RGB } })
      .composite([
        { input: lc, top: Math.round((H - D) / 2), left: 140 },
        { input: s.buf, top: Math.round((H - s.h) / 2), left: Math.round(CXr - s.w / 2) },
      ])
      .png().toFile(path.join(OUT, 'lion-slogan-cover.png'));
    console.log('wrote brand/lion-slogan-cover.png (1640x624)');
  }

  // 4) Light lockup — 1200×630, WHITE bg, dark-green lion + green slogan.
  {
    const W = 1200, H = 630, D = 360;
    const lionLight = await sharp(tile).resize(D, D, { fit: 'contain', background: WHITE_RGB }).png().toBuffer();
    const s = slogan({ size: 64, color: GREEN });
    await sharp({ create: { width: W, height: H, channels: 4, background: WHITE_RGB } })
      .composite([
        { input: lionLight, top: 70, left: cx(W, D) },
        { input: s.buf, top: 450, left: cx(W, s.w) },
      ])
      .png().toFile(path.join(OUT, 'lion-slogan-light.png'));
    console.log('wrote brand/lion-slogan-light.png (1200x630)');
  }

  console.log('\nDone — lion + slogan set in marketing/brand/.');
}

main().catch((e) => { console.error(e); process.exit(1); });
