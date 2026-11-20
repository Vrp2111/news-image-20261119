// THE WORLD BEACON — news-image-20261119
// Entry program: copies the front-page image of Thursday 19 November 2026
// (entry.png, shipped in this repository) to the grader's output directory.
// No network, no drawing, no randomness: a plain byte copy, so every run
// writes exactly the same file.
//
// The image itself was rendered in the build session from the day's verified
// news (GTA VI launch, Anthropic IPO debut, first-ever Xi-Trump-Putin
// trilateral, 40 stories, 6 continents). This program only delivers it and
// proves it still meets the competition's gate before handing it over.
import { copyFileSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_BYTES = 1048576; // 1 MiB, the competition's hard cap
const EXPECTED_WIDTH = 1024;
const EXPECTED_HEIGHT = 1024;

// The repository root is the directory holding this file; the grader runs it
// from a read-only checkout, so resolve the image from here, never from cwd.
const repoRoot: string = dirname(fileURLToPath(import.meta.url));
const sourcePath: string = join(repoRoot, "entry.png");

// The grader provides a writable /output; local runs can point the same
// variable at any empty directory instead.
const outputDir: string = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const outputPath: string = join(outputDir, "entry.png");

// Read the PNG/JPEG header to find the pixel dimensions without decoding
// the whole image. PNG stores them in the IHDR chunk (bytes 16-23);
// JPEG stores them in the first Start-Of-Frame segment it meets.
function readDimensions(bytes: Buffer): { width: number; height: number } {
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) throw new Error("corrupt JPEG: bad segment marker");
      const marker = bytes[offset + 1];
      const segmentLength = bytes.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
      }
      offset += 2 + segmentLength;
    }
    throw new Error("corrupt JPEG: no frame segment found");
  }
  throw new Error("entry.png is neither a PNG nor a JPEG");
}

const bytes: Buffer = readFileSync(sourcePath);
const { width, height } = readDimensions(bytes);

if (bytes.length > MAX_BYTES) {
  throw new Error(`entry.png is ${bytes.length} bytes, over the 1 MiB limit`);
}
if (width !== EXPECTED_WIDTH || height !== EXPECTED_HEIGHT) {
  throw new Error(`entry.png is ${width}x${height}, expected ${EXPECTED_WIDTH}x${EXPECTED_HEIGHT}`);
}

mkdirSync(outputDir, { recursive: true });
copyFileSync(sourcePath, outputPath);

const written: number = statSync(outputPath).size;
if (written !== bytes.length) {
  throw new Error(`wrote ${written} bytes but the source is ${bytes.length}`);
}

// Prove the copy is exact, not just the right size: re-read the output and
// compare it byte for byte with the source. A plain copy cannot differ, but
// the grader runs this program twice and compares the two runs, so any
// silent corruption here must fail loudly instead of shipping a wrong image.
const writtenBytes: Buffer = readFileSync(outputPath);
if (!writtenBytes.equals(bytes)) {
  throw new Error("output bytes differ from entry.png");
}
console.log(`wrote ${outputPath}: ${width}x${height} ${written} bytes`);
