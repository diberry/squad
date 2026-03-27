#!/usr/bin/env node
/**
 * build-search-index.mjs
 * Reads all .md files from docs/src/content/docs/, chunks by ## headings,
 * and outputs a static search-index.json for client-side TF-IDF search.
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = join(__dirname, '..', 'src', 'content', 'docs');
const OUTPUT_DIR = join(__dirname, '..', 'public');
const OUTPUT_FILE = join(OUTPUT_DIR, 'search-index.json');

// Section display names derived from directory
const SECTION_NAMES = {
  'get-started': 'Get Started',
  guide: 'Guide',
  features: 'Features',
  reference: 'Reference',
  scenarios: 'Scenarios',
  concepts: 'Concepts',
  cookbook: 'Cookbook',
};

async function collectMdFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMdFiles(full)));
    } else if (entry.name.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

function stripFrontmatter(content) {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  return match ? content.slice(match[0].length) : content;
}

function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'Untitled';
}

function deriveSlug(filePath) {
  let rel = relative(DOCS_ROOT, filePath)
    .replace(/\\/g, '/')
    .replace(/\.md$/, '');
  if (rel.endsWith('/index')) rel = rel.replace(/\/index$/, '');
  return rel;
}

function deriveSection(slug) {
  const first = slug.split('/')[0];
  return SECTION_NAMES[first] || first.charAt(0).toUpperCase() + first.slice(1);
}

function stripMarkdown(text) {
  return text
    .replace(/!\[.*?\]\(.*?\)/g, '')        // images
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1')   // links → text
    .replace(/(`{1,3})[\s\S]*?\1/g, '')      // inline/fenced code
    .replace(/^>\s?/gm, '')                  // blockquotes
    .replace(/[*_~]{1,3}/g, '')              // bold/italic/strikethrough
    .replace(/^[-*+]\s/gm, '')               // unordered list markers
    .replace(/^\d+\.\s/gm, '')               // ordered list markers
    .replace(/\|/g, ' ')                     // table pipes
    .replace(/^-{3,}$/gm, '')               // horizontal rules
    .replace(/<[^>]+>/g, '')                 // HTML tags
    .replace(/\n{2,}/g, '\n')               // collapse blank lines
    .trim();
}

function chunkByHeadings(content, pageTitle, slug) {
  const body = stripFrontmatter(content);
  const section = deriveSection(slug);
  const lines = body.split('\n');
  const chunks = [];
  let currentHeading = pageTitle;
  let buffer = [];

  function flush() {
    const raw = buffer.join('\n').trim();
    if (!raw) return;
    const text = stripMarkdown(raw);
    if (text.length < 20) return; // skip tiny chunks
    chunks.push({
      title: pageTitle,
      slug,
      section,
      heading: currentHeading,
      text,
    });
  }

  for (const line of lines) {
    const headingMatch = line.match(/^#{2,3}\s+(.+)/);
    if (headingMatch) {
      flush();
      currentHeading = headingMatch[1].trim();
      buffer = [];
    } else {
      buffer.push(line);
    }
  }
  flush();

  // If no chunks were produced, add the whole page as one chunk
  if (chunks.length === 0) {
    const text = stripMarkdown(body);
    if (text.length >= 20) {
      chunks.push({ title: pageTitle, slug, section, heading: pageTitle, text });
    }
  }

  return chunks;
}

async function main() {
  console.log('Building search index...');
  const files = await collectMdFiles(DOCS_ROOT);
  console.log(`Found ${files.length} markdown files`);

  const allChunks = [];

  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    const title = extractTitle(content);
    const slug = deriveSlug(file);
    const chunks = chunkByHeadings(content, title, slug);
    allChunks.push(...chunks);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  const json = JSON.stringify(allChunks);
  await writeFile(OUTPUT_FILE, json, 'utf-8');

  const sizeKB = (Buffer.byteLength(json) / 1024).toFixed(1);
  console.log(`✓ ${allChunks.length} chunks from ${files.length} files`);
  console.log(`✓ Output: search-index.json (${sizeKB} KB)`);
}

main().catch((err) => {
  console.error('Build search index failed:', err);
  process.exit(1);
});
