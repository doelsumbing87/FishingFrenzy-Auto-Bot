const axios = require('axios');
const WebSocket = require('ws');
const chalk = require('chalk');
const fs = require('fs');

const config = {
  apiBaseUrl: 'https://api.fishingfrenzy.co',
  wsUrl: 'wss://api.fishingfrenzy.co',
  fishingRange: 'mid_range',
  is5x: false,
  delayBetweenFishing: 5000,
  retryDelay: 30000,
  maxRetries: 5,
  energyRefreshHours: 24,
  rangeCosts: {
    'short_range': 1,
    'mid_range': 2,
    'long_range': 3
  }
};

let tokens = [];
try {
  tokens = fs.readFileSync('token.txt', 'utf8').split('\n').map(t => t.trim()).filter(t => t);
} catch (error) {
  console.error('Failed to read token.txt:', error.message);
  process.exit(1);
}

const headers = {
  'accept': 'application/json',
  'accept-language': 'en-US,en;q=0.6',
  'content-type': 'application/json',
  'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Brave";v="134"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  'sec-gpc': '1',
  'Referer': 'https://fishingfrenzy.co/',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'cache-control': 'no-cache',
  'pragma': 'no-cache'
};

let energyRefreshTime = null;

const log = (msg) => console.log(msg); 
const logSuccess = (msg) => console.log(chalk.green(`${msg}`)); 
const logInfo = (msg) => console.log(`${msg}`); 
const logWarn = (msg) => console.log(chalk.yellow(`${msg}`)); 
const logError = (msg) => console.log(chalk.red(`${msg}`)); 
const logHighlight = (label, value) => console.log(`${label}: ${chalk.cyan(value)}`); 

function displayBanner() {
  const banner = [
    chalk.cyan('=================================================='),
    chalk.cyan('    Fishing Frenzy Auto Bot - Doel Edition        '),
    chalk.cyan('=================================================='),
  ];
  banner.forEach(line => console.log(line));
}

function displayProfileInfo(data) {
  logSuccess('Profile Loaded Successfully!');
  logInfo(` User ID: ${data.userId || 'N/A'}`);
  log(` Gold: ${data.gold || 0}`);
  logHighlight(' Energy', `${data.energy || 0}`);
  log(` Fish Points: ${data.fishPoint || 0}`);
  log(` EXP: ${data.exp || 0}`);
}

async function checkInventory(token) {
  try {
    const response = await axios.get(`${config.apiBaseUrl}/v1/inventory`, {
      headers: {
        ...headers,
        'authorization': `Bearer ${token}`
      }
    });
    const data = response.data;
    displayProfileInfo(data);

    if (data.energy > 0) {
      return true;
    } else {
      if (!energyRefreshTime) {
        energyRefreshTime = new Date();
        energyRefreshTime.setHours(energyRefreshTime.getHours() + config.energyRefreshHours);
      }
      return false;
    }
  } catch (error) {
    logError(`Failed to check inventory: ${error.message}`);
    return false;
  }
}

function selectFishingRange(currentEnergy) {
  const availableRanges = [];
  if (currentEnergy >= config.rangeCosts['long_range']) {
    availableRanges.push('long_range');
  }
  if (currentEnergy >= config.rangeCosts['mid_range']) {
    availableRanges.push('mid_range');
  }
  if (currentEnergy >= config.rangeCosts['short_range']) {
    availableRanges.push('short_range');
  }
  if (availableRanges.length === 0) {
    logWarn("No fishing ranges available with current energy!");
    return 'short_range';
  }
  return availableRanges[Math.floor(Math.random() * availableRanges.length)];
}

async function fish(token, fishingRange) {
  return new Promise((resolve, reject) => {
    let wsConnection = null;
    let gameStarted = false;
    let gameSuccess = false;
    const keyFrames = [];
    const requiredFrames = 10;
    const interpolationSteps = 30;
    let endSent = false;

    wsConnection = new WebSocket(`${config.wsUrl}/?token=${token}`);

    const timeout = setTimeout(() => {
      logWarn('Fishing timeout - closing connection');
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.close();
      }
      resolve(false);
    }, 60000);

    wsConnection.on('open', () => {
      wsConnection.send(JSON.stringify({
        cmd: 'prepare',
        range: fishingRange,
        is5x: config.is5x
      }));
    });

    wsConnection.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'initGame') {
          gameStarted = true;
          wsConnection.send(JSON.stringify({ cmd: 'start' }));
        }

        if (message.type === 'gameState') {
          const frame = message.frame || 0;
          const direction = message.dir || 0;
          const x = 450 + frame * 2 + direction * 5;
          const y = 426 + frame * 2 - direction * 3;
          keyFrames.push([x, y]);
          if (keyFrames.length === requiredFrames && !endSent) {
            const endCommand = {
              cmd: 'end',
              rep: { fs: 100, ns: 200, fps: 20, frs: keyFrames },
              en: 1
            };
            wsConnection.send(JSON.stringify(endCommand));
            endSent = true;
          }
        }

        if (message.type === 'gameOver') {
          gameSuccess = message.success;
          if (gameSuccess) {
            const fish = message.catchedFish.fishInfo;
            logSuccess(`Successfully caught a ${chalk.cyan(fish.fishName)}!`);
          } else {
            logError('Failed to catch fish');
          }
          clearTimeout(timeout);
          wsConnection.close();
          resolve(gameSuccess);
        }
      } catch (error) {
        logError(`Error parsing message: ${error.message}`);
      }
    });

    wsConnection.on('error', (error) => {
      logError(`WebSocket error: ${error.message}`);
      clearTimeout(timeout);
      reject(error);
    });

    wsConnection.on('close', () => {
      if (!gameStarted) {
        logError('Connection closed before fishing started');
        resolve(false);
      }
      clearTimeout(timeout);
    });
  });
}

async function showEnergyCountdown() {
  if (!energyRefreshTime) return;
  logWarn('Out of energy. Waiting for energy to refresh...');
  while (new Date() < energyRefreshTime) {
    const timeRemaining = energyRefreshTime - new Date();
    process.stdout.write(`\r Energy will refresh in: ${chalk.cyan(timeRemaining / 1000)} seconds`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log('\n');
  logSuccess('Energy refreshed!');
  energyRefreshTime = null;
  await new Promise(resolve => setTimeout(resolve, 5000));
}

async function runBot() {
  displayBanner();

  while (true) {
    for (const [index, token] of tokens.entries()) {
      logInfo(`------------------------------------------------------`);
      logInfo(`[FishingFrenzyBot] [Akun ${index + 1}] INFO: Memeriksa inventaris...`);
      const hasEnergy = await checkInventory(token);

      if (!hasEnergy) {
        await showEnergyCountdown();
        continue;
      }

      const fishingRange = selectFishingRange();
      logInfo(`[Akun ${index + 1}] 🎣 Starting fishing attempt with ${chalk.cyan(fishingRange)}...`);
      const success = await fish(token, fishingRange);

      if (success) {
        logSuccess(`[Akun ${index + 1}] Fishing attempt completed successfully. Waiting ${config.delayBetweenFishing / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, config.delayBetweenFishing));
      } else {
        logWarn(`[Akun ${index + 1}] Fishing attempt failed. Retrying...`);
        await new Promise(resolve => setTimeout(resolve, config.retryDelay));
      }
    }
  }
}

process.on('uncaughtException', (error) => {
  logError(`Uncaught exception: ${error}`);
  logWarn('Bot will restart in 1 minute...');
  setTimeout(() => runBot(), 60000);
});

runBot().catch(error => {
  logError(`Fatal error in bot: ${error}`);
  process.exit(1);
});
