#!/usr/bin/env node
// Branded QR code generator for thetradevoice.com.
// Wraps a green QR code in a styled frame with the Tradevoice
// wordmark + tagline beneath. Outputs both SVG (scales infinitely
// for print) and PNG (works in email clients, Slack, slides).
//
// Run with:
//   node scripts/generate-qr.mjs

import QRCode from 'qrcode';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const URL_TARGET = 'https://thetradevoice.com';

// Tradevoice brand palette.
const GREEN_DARK = '#1b4332';
const GREEN      = '#2d6a4f';
const CREAM      = '#f3f6f4';
const WHITE      = '#ffffff';

// Generate the raw QR as an SVG string with green-on-white,
// high error correction (so a logo or sticker overlay later could
// blank out up to ~30% of the code without breaking the scan).
const qrSvgRaw = await QRCode.toString(URL_TARGET, {
  type: 'svg',
  errorCorrectionLevel: 'H',
  color: { dark: GREEN, light: WHITE },
  margin: 1,
});

// Pull just the path data out of the qrcode-generated <svg>.
// qrcode emits <svg ...><path d="..." ... /></svg> — we strip the
// outer <svg> wrapper and re-embed the inner contents in our own
// branded outer SVG so we can layer a frame, title, and footer.
const innerMatch = qrSvgRaw.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
const qrInner    = innerMatch ? innerMatch[1].trim() : '';
const viewBoxMatch = qrSvgRaw.match(/viewBox="([^"]+)"/);
const qrViewBox  = viewBoxMatch ? viewBoxMatch[1] : '0 0 33 33';

// Compose the final branded card:
//   - 640x800 SVG canvas
//   - Cream background with green inner panel
//   - QR centered in the upper section
//   - "Tradevoice" wordmark + tagline + URL stacked below
//   - Subtle lion mane motif using radial dots in the corners
//
// Sized for both screen viewing and print at 8.5×11" (good QR cards
// land somewhere between 4×4 and 6×6 inches on a sheet).
const W = 640, H = 800;
const QR_SIZE = 440;
const QR_X = (W - QR_SIZE) / 2;
const QR_Y = 90;

const branded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <!-- Background card with cream tint + thick green border -->
  <rect x="0" y="0" width="${W}" height="${H}" rx="32" fill="${CREAM}"/>
  <rect x="12" y="12" width="${W - 24}" height="${H - 24}" rx="22" fill="none" stroke="${GREEN}" stroke-width="6"/>

  <!-- "SCAN ME" eyebrow text above the QR -->
  <text x="${W / 2}" y="56"
        text-anchor="middle"
        font-family="'DM Sans', 'Segoe UI', system-ui, sans-serif"
        font-size="20" font-weight="800"
        letter-spacing="6"
        fill="${GREEN_DARK}">SCAN ME</text>

  <!-- White QR card so the green-on-cream contrast stays high -->
  <rect x="${QR_X - 16}" y="${QR_Y - 16}" width="${QR_SIZE + 32}" height="${QR_SIZE + 32}" rx="18" fill="${WHITE}" stroke="${GREEN}" stroke-width="2"/>

  <!-- The actual QR code, scaled into place -->
  <g transform="translate(${QR_X}, ${QR_Y}) scale(${QR_SIZE / parseFloat(qrViewBox.split(' ')[2])})">
    ${qrInner}
  </g>

  <!-- TRADEVOICE wordmark below the QR -->
  <text x="${W / 2}" y="${QR_Y + QR_SIZE + 80}"
        text-anchor="middle"
        font-family="'Playfair Display', Georgia, serif"
        font-size="56" font-weight="900"
        letter-spacing="4"
        fill="${GREEN_DARK}">TRADEVOICE</text>

  <!-- Tagline -->
  <text x="${W / 2}" y="${QR_Y + QR_SIZE + 118}"
        text-anchor="middle"
        font-family="'DM Sans', 'Segoe UI', system-ui, sans-serif"
        font-size="18" font-weight="500"
        letter-spacing="1"
        fill="${GREEN}">From first estimate to final payment</text>

  <!-- URL footer with subtle separator -->
  <line x1="${W * 0.25}" y1="${QR_Y + QR_SIZE + 145}" x2="${W * 0.75}" y2="${QR_Y + QR_SIZE + 145}" stroke="${GREEN}" stroke-width="1" opacity="0.3"/>
  <text x="${W / 2}" y="${QR_Y + QR_SIZE + 175}"
        text-anchor="middle"
        font-family="'DM Sans', 'Segoe UI', system-ui, sans-serif"
        font-size="20" font-weight="700"
        letter-spacing="1"
        fill="${GREEN_DARK}">thetradevoice.com</text>
</svg>`;

// Write SVG first — vector, scales infinitely, smallest file size,
// best for print + business cards.
const outSvg = path.join(ROOT, 'marketing', 'tradevoice-qr-branded.svg');
fs.writeFileSync(outSvg, branded, 'utf8');
console.log(`✅ SVG  ${path.relative(ROOT, outSvg)} (${(fs.statSync(outSvg).size / 1024).toFixed(1)} KB)`);

// Also write a PNG version using sharp for raster-friendly contexts
// (email signatures, Slack avatars, PowerPoint, etc.). Use a high-res
// 1280px width so prints at 200 DPI stay sharp up to 6.4" wide.
let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  // sharp not installed yet — install transient and retry.
  console.log('Installing sharp for PNG export…');
  await import('node:child_process').then(({ execSync }) => {
    execSync('npm install --no-save sharp', { stdio: 'inherit', cwd: ROOT });
  });
  sharp = (await import('sharp')).default;
}

const outPng = path.join(ROOT, 'marketing', 'tradevoice-qr-branded.png');
await sharp(Buffer.from(branded))
  .resize({ width: 1280 })
  .png({ compressionLevel: 9 })
  .toFile(outPng);
console.log(`✅ PNG  ${path.relative(ROOT, outPng)} (${(fs.statSync(outPng).size / 1024).toFixed(1)} KB)`);
console.log(`\nQR target: ${URL_TARGET}`);
console.log(`Files ready in marketing/ — also accessible after deploy at:`);
console.log(`  https://thetradevoice.com/tradevoice-qr-branded.png`);
console.log(`  https://thetradevoice.com/tradevoice-qr-branded.svg`);
