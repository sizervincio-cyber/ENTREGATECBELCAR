import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright/index.js');

const dir = '/tmp/claude-0/-home-user-ENTREGATECBELCAR/3424afd4-bd51-5edf-b85d-7e3ce38e1b3f/scratchpad/pdf-build';
const out = process.argv[2] || `${dir}/Proposta-Comercial-Torre-de-Controle-Belcar.pdf`;

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.goto(pathToFileURL(`${dir}/proposta.html`).href, { waitUntil: 'networkidle' });
await page.emulateMedia({ media: 'print' });
await page.pdf({
  path: out,
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
});
await browser.close();
console.log('PDF gerado:', out);
