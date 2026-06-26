/**
 * PWA ikonlarını oluşturur: 192x192 ve 512x512 PNG (any + maskable).
 * Çalıştır: node scripts/generate-pwa-icons.mjs
 * Gereksinim: sharp (npm install sharp --save-dev)
 * veya sharp yoksa: sadece SVG kaynaklı basit PNG oluşturur.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../public/icons");
fs.mkdirSync(outDir, { recursive: true });

function drawIcon(canvas, size, maskable = false) {
  const ctx = canvas.getContext("2d");
  const pad = maskable ? size * 0.1 : 0;

  // Background
  ctx.fillStyle = "#0f172a";
  if (maskable) {
    ctx.fillRect(0, 0, size, size);
  } else {
    roundRect(ctx, 0, 0, size, size, size * 0.18);
    ctx.fill();
  }

  // Scale drawing to fill usable area
  const s = (size - pad * 2) / 100;
  ctx.save();
  ctx.translate(pad, pad);
  ctx.scale(s, s);

  ctx.fillStyle = "#f8fafc";

  // Cargo box
  roundRectPath(ctx, 14, 32, 38, 28, 2);
  ctx.fill();

  // Cabin
  ctx.beginPath();
  ctx.moveTo(52, 60);
  ctx.lineTo(52, 38);
  ctx.lineTo(80, 38);
  ctx.arcTo(83, 38, 83, 41, 3);
  ctx.lineTo(83, 57);
  ctx.arcTo(83, 60, 80, 60, 3);
  ctx.closePath();
  ctx.fill();

  // Nose
  ctx.beginPath();
  ctx.moveTo(52, 38);
  ctx.lineTo(46, 38);
  ctx.lineTo(40, 46);
  ctx.lineTo(40, 60);
  ctx.lineTo(52, 60);
  ctx.closePath();
  ctx.fill();

  // Wheels
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(26, 63, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(64, 63, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(26, 63, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(64, 63, 6, 0, Math.PI * 2);
  ctx.stroke();

  // Window
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  roundRectPath(ctx, 55, 41, 10, 8, 1);
  ctx.fill();

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
function roundRectPath(ctx, x, y, w, h, r) {
  roundRect(ctx, x, y, w, h, r);
}

const sizes = [192, 512];
let generated = 0;

try {
  const { createCanvas: cc } = await import("canvas");

  for (const size of sizes) {
    for (const maskable of [false, true]) {
      const canvas = cc(size, size);
      drawIcon(canvas, size, maskable);
      const suffix = maskable ? "maskable" : "any";
      const fname = maskable ? `icon-maskable-${size}.png` : `icon-${size}.png`;
      const buf = canvas.toBuffer("image/png");
      fs.writeFileSync(path.join(outDir, fname), buf);
      console.log(`✓ ${fname} (${size}x${size}, ${suffix})`);
      generated++;
    }
  }
  console.log(`\n${generated} ikon oluşturuldu → public/icons/`);
} catch {
  console.warn(
    "⚠  `canvas` paketi bulunamadı. Yüklemek için:\n   npm install canvas --save-dev\n   node scripts/generate-pwa-icons.mjs",
  );
  // Fallback: SVG dosyasını kopyala (tarayıcılar SVG ikonu da kabul eder)
  const svgSrc = path.join(__dirname, "../app/icon.svg");
  if (fs.existsSync(svgSrc)) {
    fs.copyFileSync(svgSrc, path.join(outDir, "icon.svg"));
    console.log("✓ icon.svg kopyalandı → public/icons/icon.svg (PNG fallback)");
  }
}
