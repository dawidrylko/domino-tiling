const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const SITE_DIRECTORY = path.resolve(process.env.SITE_DIRECTORY || path.join(__dirname, 'dist', 'site'));
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
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};
const VIEWPORT_HEIGHT = 900;
const WAIT_TIMEOUT = 20000;
const COMMAND_TIMEOUT = 30000;
const LAUNCH_TIMEOUT = 30000;
const KILL_TIMEOUT = 5000;
const SETTLE_LAYOUT = 'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))';
const SHEET_BOARDS = ['2x2', '4x4', '6x6', '8x8', '10x10', '12x12', '20x20'];
const PAGE_CONTROLS = '#page-controls button, #page-controls input';
const siteTestCases = [
  { width: 1440, check: 'sheets' },
  { width: 1440, check: 'picker' },
  { width: 1440, check: 'confirmation' },
  { width: 1440, check: 'benchmark' },
  { width: 786, check: 'sheets' },
  { width: 786, check: 'picker' },
  { width: 786, check: 'confirmation' },
  { width: 786, check: 'benchmark' },
  { width: 375, check: 'sheets' },
  { width: 375, check: 'confirmation' },
  { width: 375, check: 'benchmark' },
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
    const [rowCount, colCount] = board.split('x');
    await page.evaluate(`location.hash = 'gallery/${board}/1'`);
    await page.waitFor(
      `(document.querySelector('#sheet svg')?.getAttribute('aria-label') || '').includes('${rowCount} by ${colCount}')`,
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
  await loadSite(page, baseUrl, width, 'gallery/18x18/1');
  await page.waitFor("!document.getElementById('notice').hidden", 'the 18x18 notice');
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

async function checkBenchmark(page, baseUrl, width) {
  await loadSite(page, baseUrl, width, 'benchmark');
  await page.waitFor("document.querySelectorAll('#benchmark-rows tr').length > 0", 'the benchmark rows');
  await page.settle();
  const state = await page.evaluate(`(() => {
    const wrap = document.querySelector('#benchmark .table-wrap');
    const box = wrap.getBoundingClientRect();
    const hidden = [...wrap.querySelectorAll('td')].filter(cell => {
      const rect = cell.getBoundingClientRect();
      return rect.left < box.left - 0.5 || rect.right > box.right + 0.5;
    });
    return { overflow: wrap.scrollWidth - wrap.clientWidth, hidden: hidden.length };
  })()`);

  return state.overflow > 0 || state.hidden
    ? [`benchmark scrolls ${state.overflow} px sideways with ${state.hidden} cells off screen`]
    : [];
}

const CHECKS = {
  sheets: { label: 'tiling sheets', run: checkSheets },
  picker: { label: 'board picker', run: checkPicker },
  confirmation: { label: '18x18 confirmation', run: checkConfirmation },
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
