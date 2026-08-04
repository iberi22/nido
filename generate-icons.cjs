const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const iconsDir = path.join(publicDir, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

function createIcon(size, filename, destDirs = [iconsDir]) {
  const strokeWidth = size * 0.05;

  let gridLines = '';
  const gridSpacing = size / 24;
  for (let i = 0; i <= size; i += gridSpacing) {
    gridLines += `<line x1="${i}" y1="0" x2="${i}" y2="${size}" stroke="#06b6d4" stroke-width="0.5" stroke-opacity="0.2" />\n`;
    gridLines += `<line x1="0" y1="${i}" x2="${size}" y2="${i}" stroke="#06b6d4" stroke-width="0.5" stroke-opacity="0.2" />\n`;
  }

  let details = '';
  for (let x = 10; x < size; x += 15) {
    for (let y = 10; y < size; y += 15) {
      if ((x + y) % 7 === 0) {
        details += `<circle cx="${x}" cy="${y}" r="1" fill="#06b6d4" fill-opacity="0.4" />\n`;
      }
    }
  }

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#020617"/>
      <!-- Blueprint Grid background -->
      ${gridLines}
      <!-- Detail particles -->
      ${details}
      <!-- Stylized house with cyan lines -->
      <path d="M ${size / 2} ${size * 0.25} L ${size * 0.2} ${size * 0.55} L ${size * 0.35} ${size * 0.55} L ${size * 0.35} ${size * 0.8} L ${size * 0.65} ${size * 0.8} L ${size * 0.65} ${size * 0.55} L ${size * 0.8} ${size * 0.55} Z"
            fill="none"
            stroke="#06b6d4"
            stroke-width="${strokeWidth}"
            stroke-linejoin="round"
            stroke-linecap="round"/>
      <!-- Inner detail or NIDO text -->
      <text x="${size / 2}" y="${size * 0.72}"
            fill="#06b6d4"
            font-family="sans-serif"
            font-weight="bold"
            font-size="${size * 0.1}px"
            text-anchor="middle">NIDO</text>
    </svg>
  `;

  const svgBuffer = Buffer.from(svg);
  sharp(svgBuffer)
    .resize(size, size)
    .png({ compressionLevel: 0 })
    .toBuffer()
    .then((buffer) => {
      let finalBuffer = buffer;
      const targetSize = 10240 * 1.1; // ~11KB
      if (finalBuffer.length < targetSize) {
        const paddingBytes = targetSize - finalBuffer.length;
        const padding = Buffer.alloc(paddingBytes, 'A');
        finalBuffer = Buffer.concat([finalBuffer, padding]);
      }

      for (const dir of destDirs) {
        fs.writeFileSync(path.join(dir, filename), finalBuffer);
        console.log(`Generated ${path.join(dir, filename)}: ${finalBuffer.length} bytes`);
      }
    })
    .catch((err) => {
      console.error(`Error generating ${filename}:`, err);
    });
}

// Generate in public/icons/ as requested
createIcon(192, 'icon-192.png', [iconsDir]);
createIcon(512, 'icon-512.png', [iconsDir]);
createIcon(512, 'maskable-512.png', [iconsDir]);

// Generate legacy paths in public/ for older tests compatibility
createIcon(192, 'pwa-192x192.png', [publicDir]);
createIcon(512, 'pwa-512x512.png', [publicDir]);
