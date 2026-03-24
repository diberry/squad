import { chromium } from 'playwright';

const BASE = 'http://localhost:4321/squad/docs/reference/api';

const pages = [
  { slug: '',                               name: 'api-landing',         label: 'API Reference Landing' },
  { slug: '/class-runtimeeventbus',         name: 'api-class',           label: 'Class — RuntimeEventBus' },
  { slug: '/interface-agentcapability',     name: 'api-interface',       label: 'Interface — AgentCapability' },
  { slug: '/function-definesquad',          name: 'api-function',        label: 'Function — defineSquad' },
  { slug: '/typealias-agentref',            name: 'api-typealias',       label: 'Type Alias — AgentRef' },
  { slug: '/variable-default_fallback_chains', name: 'api-variable',    label: 'Variable — DEFAULT_FALLBACK_CHAINS' },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

for (const { slug, name, label } of pages) {
  const url = `${BASE}${slug}`;
  console.log(`📸 ${label}: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.screenshot({ path: `docs/tests/screenshots/${name}.png` });
}

await browser.close();
console.log(`\n✅ Captured ${pages.length} screenshots`);
