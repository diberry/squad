/**
 * TDD tests for docs semantic search MVP (issue #40).
 *
 * These tests define the expected contract for the search-index.json
 * that EECOM's build script will generate. They validate schema,
 * coverage, relevance scoring, and data quality.
 *
 * RED PHASE — tests will fail until the search index generator is built.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DOCS_DIR = join(process.cwd(), 'docs');
const DIST_DIR = join(DOCS_DIR, 'dist');
const SEARCH_INDEX_PATH = join(DIST_DIR, 'search-index.json');

interface SearchChunk {
  title: string;
  slug: string;
  section: string;
  heading: string;
  text: string;
}

function loadSearchIndex(): SearchChunk[] {
  if (!existsSync(SEARCH_INDEX_PATH)) {
    throw new Error(
      `search-index.json not found at ${SEARCH_INDEX_PATH}. ` +
      'Run the docs build first: npm run docs:build'
    );
  }
  return JSON.parse(readFileSync(SEARCH_INDEX_PATH, 'utf-8'));
}

/**
 * Simple TF-IDF scoring for search relevance testing.
 * Matches the production scoring in SemanticSearch.astro: title/heading boost
 * plus exact phrase boost. Uses BM25-style length normalization to prevent
 * very short chunks from dominating via inflated term frequency.
 * Returns chunks sorted by descending relevance to the query.
 */
function tfidfSearch(chunks: SearchChunk[], query: string): SearchChunk[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const lowerQuery = query.toLowerCase();
  const N = chunks.length;

  // Average document length for BM25-style normalization
  const avgDl = chunks.reduce((sum, c) => {
    return sum + `${c.title} ${c.heading || ''} ${c.text}`.split(/\s+/).length;
  }, 0) / (N || 1);

  // Document frequency: how many chunks contain each term
  const df = new Map<string, number>();
  for (const term of terms) {
    let count = 0;
    for (const chunk of chunks) {
      const text = `${chunk.title} ${chunk.heading || ''} ${chunk.text}`.toLowerCase();
      if (text.includes(term)) count++;
    }
    df.set(term, count);
  }

  // Score each chunk
  const scored = chunks.map(chunk => {
    const text = `${chunk.title} ${chunk.heading || ''} ${chunk.text}`.toLowerCase();
    const words = text.split(/\s+/);
    const dl = words.length;
    let score = 0;

    // BM25-style normalization factor (k1=1.2, b=0.75)
    const k1 = 1.2;
    const b = 0.75;
    const lengthNorm = 1 - b + b * (dl / avgDl);

    for (const term of terms) {
      const rawTf = words.filter(w => w.includes(term)).length;
      // Normalized TF (BM25): prevents short docs from dominating
      const tf = (rawTf * (k1 + 1)) / (rawTf + k1 * lengthNorm);
      // Inverse document frequency
      const idf = Math.log(N / (1 + (df.get(term) ?? 0)));
      score += tf * idf;
    }

    // Exact phrase boost (matches production SemanticSearch.astro)
    if (chunk.text.toLowerCase().includes(lowerQuery)) score += 0.3;
    if (chunk.title.toLowerCase().includes(lowerQuery)) score += 0.2;
    if ((chunk.heading || '').toLowerCase().includes(lowerQuery)) score += 0.15;

    // Title/heading boost: individual query terms appearing in title/heading
    const titleLower = chunk.title.toLowerCase();
    const headingLower = (chunk.heading || '').toLowerCase();
    for (const term of terms) {
      if (titleLower.includes(term)) score *= 1.3;
      if (headingLower.includes(term)) score *= 1.15;
    }

    return { chunk, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .map(s => s.chunk);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Docs Search Index — search-index.json', () => {
  it('search-index.json exists after build', () => {
    expect(
      existsSync(SEARCH_INDEX_PATH),
      `Expected search-index.json at ${SEARCH_INDEX_PATH}`
    ).toBe(true);
  });

  it('has correct schema: array of {title, slug, section, text}', () => {
    const index = loadSearchIndex();

    expect(Array.isArray(index)).toBe(true);
    expect(index.length).toBeGreaterThan(0);

    for (const chunk of index) {
      expect(chunk).toHaveProperty('title');
      expect(chunk).toHaveProperty('slug');
      expect(chunk).toHaveProperty('section');
      expect(chunk).toHaveProperty('text');

      expect(typeof chunk.title).toBe('string');
      expect(typeof chunk.slug).toBe('string');
      expect(typeof chunk.section).toBe('string');
      expect(typeof chunk.text).toBe('string');
    }
  });
});

describe('Docs Search Index — chunk coverage', () => {
  // Pages listed in navigation.ts that are generated at build time
  // and don't have corresponding .md source files
  const KNOWN_GENERATED_PAGES = new Set([
    'reference/api',
  ]);

  it('every page in navigation.ts has at least one chunk in the index', async () => {
    const { NAV_SECTIONS, STANDALONE_PAGES } = await import(
      '../docs/src/navigation.ts'
    );
    const index = loadSearchIndex();
    const indexedSlugs = new Set(index.map((c: SearchChunk) => c.slug));

    // Collect all slugs from navigation
    const navSlugs: string[] = [];
    for (const section of NAV_SECTIONS) {
      for (const item of section.items) {
        navSlugs.push(item.slug);
      }
    }
    for (const page of STANDALONE_PAGES) {
      navSlugs.push(page.slug);
    }

    const missingSlugs: string[] = [];
    for (const slug of navSlugs) {
      if (KNOWN_GENERATED_PAGES.has(slug)) continue;
      if (!indexedSlugs.has(slug)) {
        missingSlugs.push(slug);
      }
    }

    expect(
      missingSlugs,
      `Pages missing from search index:\n  ${missingSlugs.join('\n  ')}`
    ).toEqual([]);
  });
});

describe('Docs Search Index — search relevance', () => {
  it('query "model pinning" returns the model-selection page as top result', () => {
    const index = loadSearchIndex();
    const results = tfidfSearch(index, 'model pinning');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].slug).toContain('model-selection');
  });

  it('query "parallel execution" returns parallel-execution page first', () => {
    const index = loadSearchIndex();
    const results = tfidfSearch(index, 'parallel execution');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].slug).toContain('parallel-execution');
  });

  it('query "install" returns installation page in top 3', () => {
    const index = loadSearchIndex();
    const results = tfidfSearch(index, 'install');
    const top3Slugs = results.slice(0, 3).map(r => r.slug);

    expect(
      top3Slugs.some(s => s.includes('installation')),
      `Expected "installation" in top 3 results, got: ${top3Slugs.join(', ')}`
    ).toBe(true);
  });
});

describe('Docs Search Index — data quality', () => {
  it('no chunk has an empty text field', () => {
    const index = loadSearchIndex();
    const emptyChunks = index.filter(
      (c: SearchChunk) => !c.text || c.text.trim().length === 0
    );

    expect(
      emptyChunks,
      `Found ${emptyChunks.length} chunks with empty text:\n` +
      emptyChunks.map((c: SearchChunk) => `  ${c.slug} — "${c.title}"`).join('\n')
    ).toEqual([]);
  });

  it('no chunk has an empty title field', () => {
    const index = loadSearchIndex();
    const emptyTitles = index.filter(
      (c: SearchChunk) => !c.title || c.title.trim().length === 0
    );

    expect(
      emptyTitles,
      `Found ${emptyTitles.length} chunks with empty title`
    ).toEqual([]);
  });

  it('no chunk has an empty slug field', () => {
    const index = loadSearchIndex();
    const emptySlugs = index.filter(
      (c: SearchChunk) => !c.slug || c.slug.trim().length === 0
    );

    expect(
      emptySlugs,
      `Found ${emptySlugs.length} chunks with empty slug`
    ).toEqual([]);
  });
});
