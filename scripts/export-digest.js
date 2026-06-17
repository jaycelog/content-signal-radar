#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

async function readInput() {
  const fileArg = process.argv[2];
  if (fileArg) return decodeBuffer(await readFile(fileArg));

  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return decodeBuffer(Buffer.concat(chunks));
}

function decodeBuffer(buffer) {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.toString('utf16le').replace(/^\uFEFF/, '');
  }

  const sample = buffer.subarray(0, Math.min(buffer.length, 200));
  const nullCount = Array.from(sample).filter(byte => byte === 0).length;
  if (nullCount > sample.length / 4) {
    return buffer.toString('utf16le').replace(/^\uFEFF/, '');
  }

  return buffer.toString('utf-8').replace(/^\uFEFF/, '');
}

function dateSlug(output) {
  const generatedAt = output.generatedAt || new Date().toISOString();
  const timezone = output.config?.timezone || 'Asia/Shanghai';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(generatedAt));
}

async function main() {
  const raw = await readInput();
  const output = JSON.parse(raw);
  const markdown = output.renderedMarkdown || JSON.stringify(output, null, 2);
  const outDir = join(process.cwd(), 'output');
  const datedPath = join(outDir, `content-signal-radar-${dateSlug(output)}.md`);
  const latestPath = join(outDir, 'latest.md');

  await mkdir(outDir, { recursive: true });
  await writeFile(datedPath, markdown, 'utf-8');
  await writeFile(latestPath, markdown, 'utf-8');

  console.log(JSON.stringify({
    status: 'ok',
    files: [datedPath, latestPath]
  }, null, 2));
}

main().catch(err => {
  console.error(JSON.stringify({ status: 'error', message: err.message }));
  process.exit(1);
});
