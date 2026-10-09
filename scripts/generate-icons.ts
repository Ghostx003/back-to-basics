import fs from 'fs';
import path from 'path';

// Minimal PNG generator without dependencies
// Generates a valid uncompressed PNG file with an indigo background and a white letter / square
function createPng(width: number, height: number): Buffer {
  // Simple solid color RGBA bitmap: Indigo #6366f1 (99, 102, 241, 255) with darker border
  const bytesPerPixel = 4;
  const rawData = Buffer.alloc(height * (width * bytesPerPixel + 1));

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      // Corner rounding effect
      const dx = Math.min(x, width - 1 - x);
      const dy = Math.min(y, height - 1 - y);
      const cornerRadius = Math.max(2, Math.floor(width * 0.2));
      const inCorner = dx < cornerRadius && dy < cornerRadius;
      const dist = inCorner ? Math.hypot(cornerRadius - dx, cornerRadius - dy) : 0;
      
      if (inCorner && dist > cornerRadius) {
        // Transparent outside rounded corner
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        rawData[offset++] = 0;
      } else {
        // Indigo background: 99, 102, 241
        // Inner white symbol (central block)
        const isCenter =
          x >= Math.floor(width * 0.3) &&
          x <= Math.floor(width * 0.7) &&
          y >= Math.floor(width * 0.3) &&
          y <= Math.floor(width * 0.7);

        if (isCenter) {
          rawData[offset++] = 255;
          rawData[offset++] = 255;
          rawData[offset++] = 255;
          rawData[offset++] = 255;
        } else {
          rawData[offset++] = 99;
          rawData[offset++] = 102;
          rawData[offset++] = 241;
          rawData[offset++] = 255;
        }
      }
    }
  }

  // Use zlib deflate
  import('zlib').then((zlib) => {
    // handled synchronously below
  });
  const zlib = await import('zlib');
  const compressed = zlib.deflateSync(rawData);

  // CRC32 table
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c >>> 0;
  }

  function crc32(buf: Buffer): number {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type: string, data: Buffer): Buffer {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT chunk
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

async function run() {
  const iconsDir = path.resolve('public', 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const sizes = [16, 32, 48, 128];
  for (const size of sizes) {
    const png = await createPng(size, size);
    fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), png);
    console.log(`Generated icon${size}.png`);
  }
}

run();
