# Emofid Anniversary40 Game Exploit

Automated exploit for the Emofid Anniversary40 rocket game. Bypasses client-side HMAC validation to submit arbitrary scores.

## Vulnerability

The game uses HMAC-SHA256 to sign scores, but the **secret key is exposed in client-side JavaScript**, allowing anyone to forge valid signatures for any score.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Google Chrome](https://www.google.com/chrome/)
- npm (comes with Node.js)

## Setup

```bash
npm install
```

## Usage

### Step 1: Get Your Token

1. Login at `landing.emofid.com/anniversary40`
2. Open DevTools (F12) → Application → Local Storage
3. Copy token from `auth-storage`

### Step 2: Set Token in Both Files

Edit `coin-exploit.js` and `cheat-bot.js`:

```javascript
const CONFIG = {
  token: 'YOUR_TOKEN_HERE',  // Paste your token here
  // ...
};
```

### Step 3: Get Initial Coins (First Time Only)

```bash
node coin-exploit.js
```

Completes one-time missions and spams referrals to get coins/tickets.

### Step 4: Run Score Exploit

```bash
node cheat-bot.js
```

Automatically:
- Gets ticket via referral
- Starts game
- Submits fake score (7M-9M per game)
- Repeats until target score reached

## Configuration

Edit `cheat-bot.js` to customize:

```javascript
const CONFIG = {
  token: 'YOUR_TOKEN_HERE',
  targetScore: 50000000,        // Stop when reached
  scoreMin: 7000000,            // Min score per game
  scoreMax: 9000000,            // Max score per game
  delayMin: 70,                 // Min delay between games (seconds)
  delayMax: 120,                // Max delay between games
};
```

## Disclaimer

For educational and security research purposes only.
