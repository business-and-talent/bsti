import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const sourcePath = 'scripts/apply-pr5.mjs';
const temporaryPath = '/tmp/apply-pr5-fixed.mjs';
const source = fs.readFileSync(sourcePath, 'utf8');
const corrected = source.replace(
  '打印／存为 PDF<\\/button>',
  '打印／存为\\s*PDF<\\/button>'
);

if (corrected === source) {
  throw new Error('PR5 print-label regex anchor was not found');
}

fs.writeFileSync(temporaryPath, corrected);
await import(pathToFileURL(temporaryPath));
