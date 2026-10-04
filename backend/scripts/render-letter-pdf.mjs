import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

const PREFERRED_FONTS = ['Iskoola Pota', 'Noto Sans Sinhala'];
// Include the joiner-based repaya sequence so the embedded face is checked
// against the shaping path that must work in the generated PDF.
const FONT_CHECK_TEXT = 'ප්‍රධාන ලේකම්, දිස්ත්‍රික් සෞඛ්‍ය සේවා අධ්‍යක්ෂ කාර්යාලය';
const MAX_HTML_BYTES = 20 * 1024 * 1024;
let activeBrowser = null;
let browserClosePromise = null;

async function closeBrowser() {
  if (!activeBrowser) return;
  if (!browserClosePromise) {
    browserClosePromise = activeBrowser.close().catch(() => {});
  }
  await browserClosePromise;
}

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, async () => {
    await Promise.race([
      closeBrowser(),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
    process.exit(1);
  });
}

async function readInput() {
  const chunks = [];
  let size = 0;

  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > MAX_HTML_BYTES) {
      throw new Error('Letter HTML exceeds the renderer size limit.');
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString('utf8');
}

function applyRendererContentPolicy(html) {
  const policy = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\' https:; font-src data: https:; img-src data:;">';

  if (/<head(?:\s[^>]*)?>/i.test(html)) {
    return html.replace(/<head(?:\s[^>]*)?>/i, (head) => `${head}${policy}`);
  }

  return `<!doctype html><html><head><meta charset="UTF-8">${policy}</head><body>${html}</body></html>`;
}

async function verifyFont(page) {
  // Try each preferred family; succeed if any is properly loaded and applied.
  const result = await page.evaluate(async ({ families, sample }) => {
    await document.fonts.ready;

    const documentFont = getComputedStyle(document.querySelector('.letter-page') ?? document.body).fontFamily;
    const firstFamily = documentFont.split(',')[0].trim().replace(/^['\"]|['\"]$/g, '');

    for (const family of families) {
      const fontQuery = `12pt "${family}"`;
      const loadedFaces = await document.fonts.load(fontQuery, sample);
      const loaded = loadedFaces.length > 0 && Array.from(document.fonts).some((face) => face.family.replace(/^['\"]|['\"]$/g, '') === family && face.status === 'loaded');
      const sampleMatches = document.fonts.check(fontQuery, sample);

      if (loaded && sampleMatches && firstFamily === family) {
        return { ok: true, family };
      }
    }

    return { ok: false, families: families, documentFont: documentFont };
  }, { families: PREFERRED_FONTS, sample: FONT_CHECK_TEXT });

  if (!result.ok) {
    throw new Error(`Required Sinhala font verification failed (${JSON.stringify(result)}).`);
  }
}

async function renderPdf(html) {
  if (!html.trim()) {
    throw new Error('No letter HTML was provided to the PDF renderer.');
  }

  const systemChromiumCandidates = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/opt/google/chrome/chrome',
  ];
  const executablePath = process.env.LETTER_PDF_CHROMIUM_PATH
    || systemChromiumCandidates.find((candidate) => existsSync(candidate));
  activeBrowser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });

  try {
    const page = await activeBrowser.newPage({
      deviceScaleFactor: 1,
      printBackground: true,
    });
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);

    await page.setContent(applyRendererContentPolicy(html), { waitUntil: 'load' });
    await verifyFont(page);

    return await page.pdf({
      format: 'A4',
      landscape: false,
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });
  } finally {
    await closeBrowser();
  }
}

try {
  const html = await readInput();
  const pdf = await renderPdf(html);
  process.stdout.write(pdf);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
}
