const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const SITE_DIRECTORY = path.resolve(process.env.SITE_DIRECTORY || path.join(__dirname, '..', 'dist', 'site'));
const CHROME_CANDIDATES = [
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};
const VIEWPORT_HEIGHT = 900;
const WAIT_TIMEOUT = 20000;
const COMMAND_TIMEOUT = 30000;
const LAUNCH_TIMEOUT = 30000;
const KILL_TIMEOUT = 5000;
const SETTLE_LAYOUT = 'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))';
const SHEET_BOARDS = [
  '2x2',
  '4x4',
  '6x6',
  '8x8',
  '10x10',
  '12x12',
  '20x20',
  '2x2-diagonal',
  '4x4-diagonal',
  '6x6-diagonal',
  '8x8-diagonal',
  '10x10-diagonal',
  '12x12-diagonal',
  '18x18-diagonal',
  '20x20-diagonal',
];
const CONFIRMATION_BOARDS = ['18x18', '16x16-diagonal'];
const NOTES = [
  { slug: 'method', cells: 0 },
  { slug: 'a004003', cells: 6 },
  { slug: 'a239273', cells: 8 },
];
const NOTE_FAILURES = ['NO', 'DIFFERS FROM OEIS'];
const PAGE_CONTROLS = '#page-controls button, #page-controls input';
const siteTestCases = [
  { width: 1440, check: 'sheets' },
  { width: 1440, check: 'picker' },
  { width: 1440, check: 'confirmation' },
  { width: 1440, check: 'benchmark' },
  { width: 1440, check: 'pieces' },
  { width: 1440, check: 'styles' },
  { width: 375, check: 'styles' },
  { width: 1440, check: 'landing' },
  { width: 1440, check: 'notes' },
  { width: 1440, check: 'chrome' },
  { width: 786, check: 'notes' },
  { width: 786, check: 'chrome' },
  { width: 786, check: 'sheets' },
  { width: 786, check: 'picker' },
  { width: 786, check: 'confirmation' },
  { width: 786, check: 'benchmark' },
  { width: 375, check: 'sheets' },
  { width: 375, check: 'confirmation' },
  { width: 375, check: 'benchmark' },
  { width: 375, check: 'pieces' },
  { width: 375, check: 'landing' },
  { width: 375, check: 'notes' },
  { width: 375, check: 'chrome' },
];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function resolveSiteFile(url) {
  try {
    const { pathname } = new URL(url, 'http://127.0.0.1');
    const file = path.join(SITE_DIRECTORY, decodeURIComponent(pathname).replace(/\/$/, '/index.html'));
    const relative = path.relative(SITE_DIRECTORY, file);

    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      return null;
    }

    return fs.statSync(file, { throwIfNoEntry: false })?.isFile() ? file : null;
  } catch {
    return null;
  }
}

function serveSite() {
  const server = http.createServer((request, response) => {
    const file = resolveSiteFile(request.url);

    if (!file) {
      response.writeHead(404).end();

      return;
    }

    response.writeHead(200, { 'Content-Type': CONTENT_TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(response);
  });

  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function stopChrome(chrome) {
  if (chrome.pid === undefined || chrome.exitCode !== null || chrome.signalCode !== null) {
    return Promise.resolve();
  }

  return new Promise(resolve => {
    const force = setTimeout(() => chrome.kill('SIGKILL'), KILL_TIMEOUT);

    chrome.once('exit', () => {
      clearTimeout(force);
      resolve();
    });
    chrome.kill();
  });
}

function removeProfile(profile) {
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
}

function launchChrome() {
  const executable = process.env.CHROME_PATH || CHROME_CANDIDATES.find(candidate => fs.existsSync(candidate));

  if (!executable) {
    return Promise.reject(new Error('No Chrome found. Set CHROME_PATH to a Chrome or Chromium executable.'));
  }

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'domino-tiling-chrome-'));
  const chrome = spawn(
    executable,
    [
      '--headless=new',
      '--no-sandbox',
      '--no-first-run',
      '--no-default-browser-check',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );

  return new Promise((resolve, reject) => {
    let output = '';
    let settled = false;
    const fail = error => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      stopChrome(chrome).finally(() => {
        removeProfile(profile);
        reject(error);
      });
    };
    const timer = setTimeout(
      () => fail(new Error(`Chrome did not open DevTools within ${LAUNCH_TIMEOUT / 1000} s: ${output.trim()}`)),
      LAUNCH_TIMEOUT,
    );

    chrome.stderr.on('data', data => {
      output += data;
      const match = output.match(/DevTools listening on ws:\/\/([^/\s]+)\//);

      if (match && !settled) {
        settled = true;
        clearTimeout(timer);
        resolve({ chrome, profile, host: match[1] });
      }
    });
    chrome.on('error', fail);
    chrome.on('exit', code => fail(new Error(`Chrome exited with code ${code}: ${output.trim()}`)));
  });
}

async function openPage(host) {
  const response = await fetch(`http://${host}/json/new?about:blank`, {
    method: 'PUT',
    signal: AbortSignal.timeout(COMMAND_TIMEOUT),
  });
  const target = await response.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  let lastId = 0;

  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = () => reject(new Error('Could not connect to the DevTools page.'));
  });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const request = pending.get(message.id);

    if (request) {
      pending.delete(message.id);
      return message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
    }
  };
  socket.onclose = () => {
    pending.forEach(request => request.reject(new Error('The DevTools connection closed.')));
    pending.clear();
  };

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      if (socket.readyState !== WebSocket.OPEN) {
        reject(new Error(`${method}: the DevTools connection is closed.`));

        return;
      }

      const id = ++lastId;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`${method} got no answer within ${COMMAND_TIMEOUT / 1000} s.`));
      }, COMMAND_TIMEOUT);

      pending.set(id, {
        resolve: value => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: error => {
          clearTimeout(timer);
          reject(error);
        },
      });
      socket.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async expression => {
    const { result, exceptionDetails } = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });

    if (exceptionDetails) {
      throw new Error(exceptionDetails.exception ? exceptionDetails.exception.description : exceptionDetails.text);
    }

    return result.value;
  };
  const waitFor = async (expression, description) => {
    const deadline = Date.now() + WAIT_TIMEOUT;
    let lastError = null;

    while (Date.now() < deadline) {
      const ready = await evaluate(expression).catch(error => {
        lastError = error;
        return false;
      });

      if (ready) {
        return;
      }

      await sleep(100);
    }

    throw new Error(`Timed out waiting for ${description}${lastError ? ` (${lastError.message})` : ''}.`);
  };
  const settle = () => evaluate(SETTLE_LAYOUT);

  return { socket, send, evaluate, waitFor, settle };
}

async function loadSite(page, baseUrl, width, hash) {
  const run = `run=${Date.now()}`;

  await page.send('Emulation.setDeviceMetricsOverride', {
    width,
    height: VIEWPORT_HEIGHT,
    deviceScaleFactor: 1,
    mobile: width < 640,
  });
  await page.send('Page.navigate', { url: `${baseUrl}/?${run}#${hash}` });
  await page.waitFor(
    `location.search === '?${run}' && document.readyState === 'complete' && typeof DATA !== 'undefined'`,
    'the page',
  );
}

async function checkSheets(page, baseUrl, width) {
  await loadSite(page, baseUrl, width, 'gallery/4x4/1');
  const problems = [];

  for (const board of SHEET_BOARDS) {
    const [, rowCount, colCount] = board.match(/^(\d+)x(\d+)/);
    const label = `${board.endsWith('-diagonal') ? 'Domicule' : 'Domino'} tilings of a ${rowCount} by ${colCount}`;
    await page.evaluate(`location.hash = 'gallery/${board}/1'`);
    await page.waitFor(
      `(document.querySelector('#sheet svg')?.getAttribute('aria-label') || '').includes('${label}')`,
      `the ${board} sheet`,
    );
    await page.settle();
    const overflow = await page.evaluate(
      "(() => { const sheet = document.getElementById('sheet'); return sheet.scrollWidth - sheet.clientWidth; })()",
    );

    if (overflow > 0) {
      problems.push(`${board} sheet scrolls ${overflow} px sideways`);
    }
  }

  return problems;
}

async function checkPicker(page, baseUrl, width) {
  await loadSite(page, baseUrl, width, 'gallery/4x4/1');
  await page.settle();
  const overflow = await page.evaluate(
    "(() => { const boards = document.getElementById('boards'); return boards.scrollWidth - boards.clientWidth; })()",
  );

  return overflow > 0 ? [`board picker overflows by ${overflow} px`] : [];
}

async function checkConfirmation(page, baseUrl, width) {
  const problems = [];

  for (const board of CONFIRMATION_BOARDS) {
    problems.push(...(await checkBoardConfirmation(page, baseUrl, width, board)).map(problem => `${board}: ${problem}`));
  }

  return problems;
}

async function checkBoardConfirmation(page, baseUrl, width, board) {
  await loadSite(page, baseUrl, width, `gallery/${board}/1`);
  await page.waitFor("!document.getElementById('notice').hidden", `the ${board} notice`);
  const state = await page.evaluate(`(async () => {
    const enabled = () => [...document.querySelectorAll('${PAGE_CONTROLS}')].filter(control => !control.disabled);
    const before = { meta: document.getElementById('gallery-meta').textContent, enabled: enabled().map(control => control.id || control.textContent.trim()) };
    document.querySelectorAll('${PAGE_CONTROLS}').forEach(control => control.click());
    await new Promise(resolve => setTimeout(resolve, 500));
    return { ...before, workerStarted: worker !== null, noticeShown: !document.getElementById('notice').hidden };
  })()`);
  const problems = [];

  if (state.meta.includes('showing')) {
    problems.push(`meta line shows a range before confirmation: "${state.meta}"`);
  }

  if (state.enabled.length) {
    problems.push(`controls active before confirmation: ${state.enabled.join(', ')}`);
  }

  if (state.workerStarted || !state.noticeShown) {
    problems.push('a control started building the counting table without confirmation');
  }

  return problems;
}

async function checkPieces(page, baseUrl, width) {
  await loadSite(page, baseUrl, width, 'gallery/8x8/1');
  await page.waitFor("document.querySelector('#sheet svg')", 'the 8x8 sheet');
  const problems = [];
  const read = () =>
    page.evaluate(`(() => ({
      hash: location.hash,
      boards: [...document.querySelectorAll('#boards button')].filter(button => !button.hidden).map(button => button.dataset.id),
      legend: [...document.querySelectorAll('.legend > span')].filter(item => !item.hidden).length,
    }))()`);

  await page.evaluate("document.querySelector('#pieces [data-pieces=domicule]').click()");
  await page.waitFor("location.hash === '#gallery/8x8-diagonal/1'", 'the switch to 8x8 domicules');
  const diagonal = await read();

  if (!diagonal.boards.length || diagonal.boards.some(id => !id.endsWith('-diagonal'))) {
    problems.push(`domicule picker shows ${diagonal.boards.join(', ')}`);
  }

  if (diagonal.legend !== 4) {
    problems.push(`domicule legend shows ${diagonal.legend} pieces`);
  }

  await page.evaluate("location.hash = 'gallery/20x20-diagonal/1'");
  await page.waitFor("document.querySelector('#sheet svg rect.d, #sheet svg rect.a')", 'the 20x20 domicule sample');
  await page.evaluate("document.querySelector('#pieces [data-pieces=domino]').click()");
  await page.waitFor("location.hash === '#gallery/20x20/1'", 'the switch back to 20x20 dominoes');
  const straight = await read();

  if (straight.boards.some(id => id.endsWith('-diagonal')) || straight.legend !== 2) {
    problems.push(`domino view shows ${straight.boards.join(', ')} with ${straight.legend} legend entries`);
  }

  return problems;
}

async function checkStyles(page, baseUrl, width) {
  const hash = 'gallery/4x4-diagonal/1/5';
  const problems = [];
  const read = () =>
    page.evaluate(`(() => {
      const probe = document.body.appendChild(document.createElement('i'));
      probe.style.color = 'var(--h)';
      const expected = getComputedStyle(probe).color;
      probe.remove();
      const piece = document.querySelector('#sheet svg .h');
      const label = [...document.querySelectorAll('#sheet text')].find(text => text.textContent === '#5');
      return {
        svg: document.querySelector('#sheet svg').getAttribute('class'),
        gallery: document.getElementById('gallery').dataset.style,
        pressed: [...document.querySelectorAll('#styles button')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.style),
        labels: document.querySelectorAll('#sheet text').length,
        highlighted: Boolean(label) && label.style.fill === 'var(--hit)',
        themed: getComputedStyle(piece)[document.querySelector('#sheet svg.blocks') ? 'fill' : 'stroke'] === expected,
      };
    })()`);
  const reload = async description => {
    await loadSite(page, baseUrl, width, hash);
    await page.waitFor("document.querySelector('#sheet svg')", description);
    return read();
  };

  try {
    await loadSite(page, baseUrl, width, hash);
    await page.evaluate("localStorage.setItem('domino-tiling-style', 'bogus')");
    const initial = await reload('the 4x4 domicule sheet');

    if (initial.svg !== 'blocks' || initial.gallery !== 'blocks' || initial.pressed.join() !== 'blocks' || !initial.highlighted || !initial.themed) {
      problems.push(`an unknown saved style does not fall back to blocks: ${JSON.stringify(initial)}`);
    }

    for (const style of ['dimer', 'engraving']) {
      await page.evaluate(`document.querySelector('#styles [data-style=${style}]').click()`);
      const state = await read();

      if (state.svg !== style || state.gallery !== style || state.pressed.join() !== style || state.labels !== initial.labels || !state.highlighted) {
        problems.push(`after choosing ${style}: ${JSON.stringify(state)}`);
      }
    }

    const reloaded = await reload('the reloaded sheet');

    if (reloaded.svg !== 'engraving' || reloaded.pressed.join() !== 'engraving') {
      problems.push(`the chosen style did not survive a reload: ${JSON.stringify(reloaded)}`);
    }

    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });

    for (const style of ['blocks', 'dimer']) {
      await page.evaluate(`document.querySelector('#styles [data-style=${style}]').click()`);
      const dark = await read();

      if (!dark.themed) {
        problems.push(`the ${style} sheet ignores the dark palette: ${JSON.stringify(dark)}`);
      }
    }
  } finally {
    await page.send('Emulation.setEmulatedMedia', { features: [] });
    await page.evaluate("localStorage.removeItem('domino-tiling-style')");
  }

  return problems;
}

async function checkLanding(page, baseUrl, width) {
  await loadSite(page, baseUrl, width, 'gallery/4x4/1');
  await page.settle();
  const state = await page.evaluate(`(() => ({
    oeis: [...document.querySelectorAll('.intro a')].map(link => link.getAttribute('href')),
    leftovers: ['.sequences', 'nav.notes', 'math', '.formula'].filter(selector => document.querySelector(selector)),
    tabs: [...document.querySelectorAll('nav.tabs a')].map(link => link.dataset.tab),
  }))()`);
  const problems = [];

  if (state.oeis.join() !== 'https://oeis.org/A004003,https://oeis.org/A239273') {
    problems.push(`intro links ${state.oeis.join(', ')}`);
  }

  if (state.leftovers.length) {
    problems.push(`main page still has ${state.leftovers.join(', ')}`);
  }

  if (state.tabs.join() !== 'gallery,benchmark,benchmark-domicule') {
    problems.push(`tabs are ${state.tabs.join(', ')}`);
  }

  return problems;
}

async function checkNotes(page, baseUrl, width) {
  const problems = [];

  for (const { slug, cells } of NOTES) {
    const run = `run=${Date.now()}`;

    await page.send('Emulation.setDeviceMetricsOverride', { width, height: VIEWPORT_HEIGHT, deviceScaleFactor: 1, mobile: width < 640 });
    await page.send('Page.navigate', { url: `${baseUrl}/notes/${slug}.html?${run}` });
    await page.waitFor(`location.search === '?${run}' && document.readyState === 'complete'`, `the ${slug} note`);
    await page.settle();
    const state = await page.evaluate(`(() => ({
      cells: document.querySelectorAll('.cell').length,
      outputs: [...document.querySelectorAll('.output td, pre.output')].map(cell => cell.textContent.trim()),
      sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      unresolved: /undefined|\\u0000/.test(document.querySelector('article').textContent),
      math: document.querySelectorAll('.math').length,
      katex: document.querySelectorAll('.katex').length,
    }))()`);

    if (state.cells !== cells) {
      problems.push(`${slug} has ${state.cells} cells instead of ${cells}`);
    }

    if (state.unresolved) {
      problems.push(`${slug} shows an unresolved token`);
    }

    if (state.math && !state.katex) {
      problems.push(`${slug} has ${state.math} formulas but KaTeX rendered none`);
    }

    if (state.outputs.some(text => NOTE_FAILURES.includes(text))) {
      problems.push(`${slug} reports a mismatch`);
    }

    if (state.sideways > 0) {
      problems.push(`${slug} scrolls ${state.sideways} px sideways`);
    }
  }

  return problems;
}

const READ_CHROME = `(() => {
  const header = document.querySelector('main > header');
  const footer = document.querySelector('main > footer');
  const style = element => {
    const computed = element && getComputedStyle(element);
    return computed && [computed.fontSize, computed.fontWeight, computed.lineHeight, computed.color].join(' ');
  };
  const brand = header && header.firstElementChild;
  const nav = header ? [...header.querySelectorAll('nav a')] : [];
  return {
    brand: brand && brand.textContent.trim(),
    brandTag: brand && brand.tagName,
    headings: document.querySelectorAll('h1').length,
    brandStyle: style(brand),
    brandHome: brand && (brand.tagName === 'H1' ? location.origin + location.pathname : brand.href),
    logo: brand && brand.querySelector('img') ? brand.querySelector('img').getBoundingClientRect().width : 0,
    height: header ? Math.round(header.getBoundingClientRect().height) : 0,
    nav: nav.map(link => link.textContent.trim() + ' ' + link.href).join(' | '),
    navStyle: style(nav.find(link => !link.hasAttribute('aria-current'))),
    navBoxes: nav.map(link => Math.round(link.getBoundingClientRect().left) + ',' + Math.round(link.getBoundingClientRect().top)).join(' '),
    current: nav.filter(link => link.getAttribute('aria-current') === 'page').map(link => link.href),
    back: header ? [...header.querySelectorAll('a')].some(link => link.textContent.includes('←')) : false,
    footer: footer ? [...footer.querySelectorAll('.site-links a')].map(link => link.textContent.trim() + ' ' + link.href).join(' | ') : '',
    footerStyle: footer && [style(footer), getComputedStyle(footer).borderTop, style(footer.lastElementChild), getComputedStyle(footer.lastElementChild).margin].join(' '),
  };
})()`;

async function checkChrome(page, baseUrl, width) {
  const problems = [];
  await loadSite(page, baseUrl, width, 'gallery/4x4/1');
  await page.settle();
  const home = await page.evaluate(READ_CHROME);
  const homeUrl = `${baseUrl}/`;

  if (home.brand !== 'Domino Tiling' || !home.logo || !home.nav || !home.footer) {
    problems.push(`the main page header or footer is incomplete: ${JSON.stringify(home)}`);
  }

  if (home.brandTag !== 'H1' || home.headings !== 1) {
    problems.push(`the main page has ${home.headings} h1 and its site name is a ${home.brandTag}`);
  }

  if (home.current.join() !== homeUrl) {
    problems.push(`the main page marks ${home.current.join() || 'no link'} as current`);
  }

  for (const { slug } of NOTES) {
    const run = `run=${Date.now()}`;

    await page.send('Page.navigate', { url: `${baseUrl}/notes/${slug}.html?${run}` });
    await page.waitFor(`location.search === '?${run}' && document.readyState === 'complete'`, `the ${slug} note`);
    await page.settle();
    const note = await page.evaluate(READ_CHROME);

    ['brand', 'brandStyle', 'logo', 'height', 'nav', 'navStyle', 'navBoxes', 'footer', 'footerStyle'].forEach(key => {
      if (note[key] !== home[key]) {
        problems.push(`${slug} ${key} is ${JSON.stringify(note[key])} instead of ${JSON.stringify(home[key])}`);
      }
    });

    if (note.brandTag !== 'A' || note.headings !== 1) {
      problems.push(`${slug} has ${note.headings} h1 and its site name is a ${note.brandTag}`);
    }

    if (note.brandHome !== homeUrl) {
      problems.push(`${slug} brand links to ${note.brandHome} instead of ${homeUrl}`);
    }

    if (note.current.join() !== `${baseUrl}/notes/${slug}.html`) {
      problems.push(`${slug} marks ${note.current.join() || 'no link'} as current`);
    }

    if (note.back) {
      problems.push(`${slug} still has a back link`);
    }
  }

  return problems;
}

async function checkBenchmark(page, baseUrl, width) {
  const problems = [];

  for (const [tab, rows, otherTab] of [
    ['benchmark', 'benchmark-rows', 'benchmark-domicule'],
    ['benchmark-domicule', 'domicule-benchmark-rows', 'benchmark'],
  ]) {
    await loadSite(page, baseUrl, width, tab);
    await page.waitFor(`document.querySelectorAll('#${rows} tr').length > 0`, `the ${tab} rows`);
    await page.settle();
    const state = await page.evaluate(`(() => {
      const section = document.getElementById('${tab}');
      const wrap = section.querySelector('.table-wrap');
      const box = wrap.getBoundingClientRect();
      const cells = [...wrap.querySelectorAll('td')];
      return {
        shown: !section.hidden && document.getElementById('${otherTab}').hidden && document.getElementById('gallery').hidden,
        overflow: wrap.scrollWidth - wrap.clientWidth,
        hidden: cells.filter(cell => {
          const rect = cell.getBoundingClientRect();
          return rect.left < box.left - 0.5 || rect.right > box.right + 0.5;
        }).length,
        missing: [...wrap.querySelectorAll('tbody tr')]
          .filter(row => row.cells[0].textContent !== '0×0')
          .filter(row => [...row.cells].slice(2, -1).some(cell => cell.textContent === '-'))
          .map(row => row.cells[0].textContent),
        environment: section.querySelector('.environment').textContent,
      };
    })()`);

    if (!state.shown) {
      problems.push(`${tab} tab does not show only its own table`);
    }

    if (state.overflow > 0 || state.hidden) {
      problems.push(`${tab} scrolls ${state.overflow} px sideways with ${state.hidden} cells off screen`);
    }

    if (tab === 'benchmark-domicule' && state.missing.length) {
      problems.push(`${tab} has no time for ${state.missing.join(', ')}`);
    }

    if (!state.environment.startsWith('Measured with Node.js')) {
      problems.push(`${tab} caption has no environment`);
    }
  }

  return problems;
}

const CHECKS = {
  sheets: { label: 'tiling sheets', run: checkSheets },
  picker: { label: 'board picker', run: checkPicker },
  confirmation: { label: '18x18 and 16x16 domicule confirmation', run: checkConfirmation },
  pieces: { label: 'straight and diagonal switch', run: checkPieces },
  styles: { label: 'sheet style switch', run: checkStyles },
  landing: { label: 'main page', run: checkLanding },
  notes: { label: 'notes', run: checkNotes },
  chrome: { label: 'shared header and footer', run: checkChrome },
  benchmark: { label: 'benchmark table', run: checkBenchmark },
};

async function runTest(page, baseUrl, { width, check }) {
  const problems = await CHECKS[check].run(page, baseUrl, width);
  await page.settle();
  const sideways = await page.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth');

  if (sideways > 0) {
    problems.push(`page scrolls ${sideways} px sideways`);
  }

  if (problems.length) {
    console.error(`Failed! ${problems.join('; ')}`);

    return false;
  }

  console.log('Passed!');

  return true;
}

async function __main__() {
  if (!fs.existsSync(path.join(SITE_DIRECTORY, 'index.html'))) {
    console.error(`No site in ${SITE_DIRECTORY}. Run pnpm site:build first.`);
    process.exit(1);
  }

  const server = await serveSite();
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  let browser = null;
  let passed = true;

  try {
    browser = await launchChrome();
    const page = await openPage(browser.host);
    console.log(`Starting site test execution with ${siteTestCases.length} tests...`);

    for (const [index, testCase] of siteTestCases.entries()) {
      process.stdout.write(
        `Executing site test ${index + 1} of ${siteTestCases.length} for ${CHECKS[testCase.check].label} at ${testCase.width} px... `,
      );
      passed = (await runTest(page, baseUrl, testCase).catch(error => {
        console.error(`Failed! ${error.message}`);
        return false;
      })) && passed;
    }

    page.socket.close();
  } catch (error) {
    console.error(error.message);
    passed = false;
  } finally {
    if (browser) {
      await stopChrome(browser.chrome);
      removeProfile(browser.profile);
    }

    server.close();
  }

  if (passed) {
    console.log('All site tests completed successfully.');
    process.exit(0);
  } else {
    console.error('Some site tests failed.');
    process.exit(1);
  }
}

__main__();
