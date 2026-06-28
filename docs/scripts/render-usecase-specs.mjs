import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const requireFromFrontend = createRequire(path.join(repoRoot, 'frontend', 'package.json'));
const { chromium } = requireFromFrontend('playwright');

const markdownPath = path.join(repoRoot, 'docs', 'chapter2-3-dac-ta-usecase.md');
const outputDir = path.join(repoRoot, 'datn', 'Hinhve', 'Chuong2', 'UsecaseSpec');
await fs.mkdir(outputDir, { recursive: true });
const markdown = await fs.readFile(markdownPath, 'utf8');

const targetNames = {
  UC001: 'UC001-Tham-gia-may-chu.png',
  UC002: 'UC002-Quan-ly-kenh-va-phan-quyen.png',
  UC003: 'UC003-Dang-tai-va-kiem-duyet-game.png',
  UC004: 'UC004-To-chuc-giai-dau.png',
  UC005: 'UC005-Van-hanh-tran-dau-va-xu-ly-ket-qua.png',
};

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('`', '')
    .replaceAll('\\', '\\');
}

function inlineMd(value) {
  return escapeHtml(value)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function tableToHtml(lines) {
  const rows = lines
    .filter(line => /^\s*\|/.test(line))
    .map(line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim()))
    .filter(cells => !cells.every(cell => /^:?-{3,}:?$/.test(cell)));
  if (!rows.length) return '';
  const [header, ...body] = rows;
  return `<table><thead><tr>${header.map(cell => `<th>${inlineMd(cell)}</th>`).join('')}</tr></thead><tbody>${body.map(row => `<tr>${row.map(cell => `<td>${inlineMd(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function sectionToHtml(section) {
  const lines = section.trim().split(/\r?\n/);
  const title = lines.shift().replace(/^##\s+/, '').trim();
  const chunks = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (/^###\s+/.test(line)) {
      chunks.push(`<h2>${inlineMd(line.replace(/^###\s+/, '').trim())}</h2>`);
      index++;
    } else if (/^\s*\|/.test(line)) {
      const tableLines = [];
      while (index < lines.length && /^\s*\|/.test(lines[index])) {
        tableLines.push(lines[index]);
        index++;
      }
      chunks.push(tableToHtml(tableLines));
    } else if (line.trim()) {
      chunks.push(`<p>${inlineMd(line.trim())}</p>`);
      index++;
    } else {
      index++;
    }
  }
  return { title, html: `<h1>${inlineMd(title)}</h1>${chunks.join('\n')}` };
}

const sections = [];
const headingPattern = /^##\s+UC\d{3}\s+-\s+.*$/gm;
const matches = [...markdown.matchAll(headingPattern)];
for (let i = 0; i < matches.length; i++) {
  const start = matches[i].index;
  const nextUseCase = i + 1 < matches.length ? matches[i + 1].index : markdown.length;
  const nextHeading = markdown.slice(start + 1).search(/\n##\s+/);
  const endByHeading = nextHeading >= 0 ? start + 1 + nextHeading : markdown.length;
  sections.push(markdown.slice(start, Math.min(nextUseCase, endByHeading)));
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 2200 }, deviceScaleFactor: 1 });

for (const section of sections) {
  const code = section.match(/^##\s+(UC\d{3})/)?.[1];
  if (!code || !targetNames[code]) continue;
  const { title, html } = sectionToHtml(section);
  const document = `<!doctype html><html><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 32px; background: white; color: #111; font-family: Arial, 'DejaVu Sans', sans-serif; }
    .page { width: 1436px; border: 2px solid #111; padding: 0; background: #fff; }
    h1 { margin: 0; padding: 18px 22px; font-size: 30px; text-align: center; border-bottom: 2px solid #111; background: #eaf3f6; }
    h2 { margin: 0; padding: 12px 18px; font-size: 22px; background: #bf6a12; color: white; border-top: 2px solid #111; border-bottom: 1px solid #111; }
    p { margin: 14px 18px; font-size: 18px; line-height: 1.45; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #111; padding: 9px 10px; vertical-align: top; font-size: 18px; line-height: 1.35; overflow-wrap: anywhere; }
    th { background: #bf6a12; color: white; font-weight: 700; text-align: center; }
    td:first-child, th:first-child { width: 11%; text-align: center; }
    td:nth-child(2), th:nth-child(2) { width: 18%; }
    td:nth-child(3), th:nth-child(3) { width: 71%; }
    table:first-of-type td:first-child { width: 18%; text-align: left; font-weight: 700; background: #d9eef3; }
    table:first-of-type td:nth-child(2) { width: 82%; }
    code { font-family: Consolas, monospace; font-size: 0.92em; }
  </style></head><body><div class="page">${html}</div></body></html>`;
  await page.setContent(document, { waitUntil: 'load' });
  const box = await page.locator('.page').boundingBox();
  await page.screenshot({ path: path.join(outputDir, targetNames[code]), clip: { x: box.x, y: box.y, width: box.width, height: box.height } });
  console.log(`Rendered ${code}: ${title}`);
}

await browser.close();
