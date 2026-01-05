const https = require('https');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');

// Get options from command line arguments
// Usage: node coin-converter.js [token] [targetRank] [minGap] [maxPrevGap] [proxyUrl]
// Example: node coin-converter.js "545029|..." 5 3000000 9000000 "socks5://127.0.0.1:9050"
let TOKEN = process.argv[2] || '545029|7AaGWjjzE815naLIwKMazTIggTFTohUTr2KAIvWWc51ed48c';
const TARGET_RANK = parseInt(process.argv[3]) || 3;  // Default: 3rd place
const MIN_GAP = parseInt(process.argv[4]) || 35000000;  // Default: 8 million
const MAX_PREV_GAP = parseInt(process.argv[5]) || 3000000;  // Default: 9 million - max distance from previous rank
const PROXY_URL = process.argv[6] || null;  // Optional proxy for convert-coins

// Create appropriate proxy agent based on URL
let proxyAgent = null;
if (PROXY_URL) {
  if (PROXY_URL.startsWith('socks')) {
    proxyAgent = new SocksProxyAgent(PROXY_URL);
  } else {
    proxyAgent = new HttpsProxyAgent(PROXY_URL);
  }
}

// Remove Bearer prefix if present (for cookie usage)
if (TOKEN.startsWith('Bearer ')) {
  TOKEN = TOKEN.substring(7);
}
const AUTH_TOKEN = 'Bearer ' + TOKEN;
const COOKIE = `anniversary40_token=${TOKEN}`;
const COINS_THRESHOLD = 1000;
const CHECK_INTERVAL = 20 * 1000;

const commonHeaders = {
  'accept': '*/*',
  'accept-encoding': 'gzip, deflate, br, zstd',
  'accept-language': 'en-US,en;q=0.9,fa;q=0.8',
  'authorization': AUTH_TOKEN,
  'content-type': 'application/json',
  'cookie': COOKIE,
  'referer': 'https://landing.emofid.com/anniversary40/ranking/',
  'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
};

function getLeaderboard() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'landing.emofid.com',
      path: '/api-service/anniversary40/leaderboard/',
      method: 'GET',
      headers: {
        ...commonHeaders,
        'accept': 'application/json, text/plain, */*',
        'priority': 'u=1, i'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function getUserData() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'landing.emofid.com',
      path: '/api-service/anniversary40/user/',
      method: 'GET',
      headers: {
        ...commonHeaders,
        'priority': 'u=1, i'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Check current IP through proxy
function checkProxyIP() {
  return new Promise((resolve, reject) => {
    if (!proxyAgent) {
      resolve('No proxy');
      return;
    }
    const options = {
      hostname: 'httpbin.org',
      path: '/ip',
      method: 'GET',
      agent: proxyAgent
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const ip = JSON.parse(data).origin;
          resolve(ip);
        } catch (e) {
          resolve('Unknown');
        }
      });
    });
    req.on('error', () => resolve('Error'));
    req.setTimeout(10000, () => { req.destroy(); resolve('Timeout'); });
    req.end();
  });
}

function convertCoins() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ value: 5000 });

    const options = {
      hostname: 'landing.emofid.com',
      path: '/api-service/anniversary40/convert-coins/',
      method: 'POST',
      headers: {
        ...commonHeaders,
        'accept': 'application/json, text/plain, */*',
        'origin': 'https://landing.emofid.com',
        'content-length': Buffer.byteLength(postData)
      },
      agent: proxyAgent  // Use proxy if configured
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function checkAndConvert() {
  const now = new Date().toLocaleString();
  console.log(`[${now}] Checking leaderboard and user data...`);

  try {
    // Get leaderboard to check target rank points
    const leaderboard = await getLeaderboard();
    const targetPoints = parseFloat(leaderboard.data?.[TARGET_RANK - 1]?.points || '0');
    const prevRank = TARGET_RANK - 3;  // If target is 3, prev is 1 (index 0)
    const prevRankPoints = prevRank >= 0 ? parseFloat(leaderboard.data?.[prevRank]?.points || '0') : 0;
    console.log(`[${now}] ${TARGET_RANK}${TARGET_RANK === 1 ? 'st' : TARGET_RANK === 2 ? 'nd' : TARGET_RANK === 3 ? 'rd' : 'th'} place: ${targetPoints}, ${prevRank + 1}${prevRank === 0 ? 'st' : prevRank === 1 ? 'nd' : prevRank === 2 ? 'rd' : 'th'} place: ${prevRankPoints}`);

    // Get user data
    const userData = await getUserData();
    const coins = parseFloat(userData.data?.scores?.[0]?.coins || '0');
    const myPoints = parseFloat(userData.data?.scores?.[0]?.points || '0');
    const myRank = userData.data?.userRank;

    const gapFromTarget = myPoints - targetPoints;
    const gapFromPrev = prevRankPoints - myPoints;
    console.log(`[${now}] My points: ${myPoints}, My rank: ${myRank}, My coins: ${coins}, Gap from ${TARGET_RANK}${TARGET_RANK === 1 ? 'st' : TARGET_RANK === 2 ? 'nd' : TARGET_RANK === 3 ? 'rd' : 'th'}: ${gapFromTarget}, Gap from ${prevRank + 1}${prevRank === 0 ? 'st' : prevRank === 1 ? 'nd' : prevRank === 2 ? 'rd' : 'th'}: ${gapFromPrev}`);

    // Check conditions
    const enoughGapFromTarget = gapFromTarget >= MIN_GAP;
    const tooFarFromPrev = TARGET_RANK > 2 && prevRank >= 0 && gapFromPrev > MAX_PREV_GAP;

    // Convert if: need more gap from target OR too far from 1st place
    // Don't convert if: have enough gap from target AND close enough to 1st place
    if (enoughGapFromTarget && !tooFarFromPrev) {
      const prevRankLabel = `${prevRank + 1}${prevRank === 0 ? 'st' : prevRank === 1 ? 'nd' : prevRank === 2 ? 'rd' : 'th'}`;
      console.log(`[${now}] Gap from target (${gapFromTarget}) >= ${MIN_GAP} and gap from ${prevRankLabel} (${gapFromPrev}) <= ${MAX_PREV_GAP}. Not converting.`);
      return;
    }

    // Need more gap, check if we have enough coins to convert
    if (coins > COINS_THRESHOLD) {
      if (PROXY_URL) {
        const proxyIP = await checkProxyIP();
        console.log(`[${now}] Proxy IP: ${proxyIP}`);
      }
      const prevRankLabel = `${prevRank + 1}${prevRank === 0 ? 'st' : prevRank === 1 ? 'nd' : prevRank === 2 ? 'rd' : 'th'}`;
      const reason = !enoughGapFromTarget ? `gap from target (${gapFromTarget}) < ${MIN_GAP}` : `gap from ${prevRankLabel} (${gapFromPrev}) > ${MAX_PREV_GAP}`;
      console.log(`[${now}] Converting because ${reason}. Coins: ${coins}`);
      const result = await convertCoins();
      console.log(`[${now}] Convert result:`, result);
    } else {
      console.log(`[${now}] Coins (${coins}) <= ${COINS_THRESHOLD}, waiting for more coins...`);
    }
  } catch (error) {
    console.error(`[${now}] Error:`, error.message);
  }
}

// Run immediately on start
checkAndConvert();

// Then run every 6 minutes
setInterval(checkAndConvert, CHECK_INTERVAL);

console.log('Coin converter started. Checking every 20 seconds...');
console.log('Using token:', AUTH_TOKEN.substring(0, 20) + '...');
if (TARGET_RANK > 2) {
  const prevRankNum = TARGET_RANK - 2;
  console.log(`Target: min ${MIN_GAP} gap from ${TARGET_RANK}${TARGET_RANK === 1 ? 'st' : TARGET_RANK === 2 ? 'nd' : TARGET_RANK === 3 ? 'rd' : 'th'} place, max ${MAX_PREV_GAP} gap from ${prevRankNum}${prevRankNum === 1 ? 'st' : prevRankNum === 2 ? 'nd' : prevRankNum === 3 ? 'rd' : 'th'} place`);
} else {
  console.log(`Target: min ${MIN_GAP} gap from ${TARGET_RANK}${TARGET_RANK === 1 ? 'st' : TARGET_RANK === 2 ? 'nd' : 'th'} place`);
}
if (PROXY_URL) console.log('Proxy:', PROXY_URL);
