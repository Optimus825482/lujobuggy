/**
 * PWA Icon Generator
 *
 * Bu script SVG'den PNG icon'lar oluşturur.
 * Kullanım: node scripts/generate-icons.js
 *
 * Gerekli: sharp paketi (npm install sharp)
 */

import sharp from "sharp";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, "../static/icons");

// Icon boyutları
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// SVG içeriği - GPS pin icon
const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- Background -->
  <rect width="512" height="512" rx="96" fill="#0f172a"/>
  
  <!-- Outer ring -->
  <circle cx="256" cy="220" r="120" fill="none" stroke="#22d3ee" stroke-width="16"/>
  
  <!-- GPS Pin -->
  <circle cx="256" cy="220" r="60" fill="#22d3ee"/>
  <circle cx="256" cy="220" r="24" fill="#0f172a"/>
  
  <!-- Pin pointer -->
  <path d="M256 340 L200 280 L312 280 Z" fill="#22d3ee"/>
  
  <!-- Signal waves -->
  <path d="M140 380 Q256 320 372 380" fill="none" stroke="#22d3ee" stroke-width="8" opacity="0.6"/>
  <path d="M100 420 Q256 340 412 420" fill="none" stroke="#22d3ee" stroke-width="8" opacity="0.4"/>
  <path d="M60 460 Q256 360 452 460" fill="none" stroke="#22d3ee" stroke-width="8" opacity="0.2"/>
</svg>
`;

async function generateIcons() {
  // Icons klasörünü oluştur
  if (!existsSync(iconsDir)) {
    mkdirSync(iconsDir, { recursive: true });
  }

  // SVG'yi kaydet
  writeFileSync(join(iconsDir, "icon.svg"), svgContent.trim());
  console.log("✅ SVG icon oluşturuldu");

  // Her boyut için PNG oluştur
  for (const size of sizes) {
    try {
      await sharp(Buffer.from(svgContent))
        .resize(size, size)
        .png()
        .toFile(join(iconsDir, `icon-${size}.png`));
      console.log(`✅ icon-${size}.png oluşturuldu`);
    } catch (err) {
      console.error(`❌ icon-${size}.png hatası:`, err.message);
    }
  }

  console.log("\n🎉 Tüm icon'lar oluşturuldu!");
}

generateIcons().catch(console.error);
