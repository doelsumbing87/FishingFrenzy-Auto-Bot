const axios = require('axios');
const WebSocket = require('ws');
const chalk = require('chalk');
const fs = require('fs');

// ===================================================
//  Fishing Frenzy Auto Bot - Modified by Doel 🎣
//  Original Source: https://github.com/airdropinsiders/FishingFrenzy-Auto-Bot
//  Modified by: https://github.com/doelsumbing87 🚀
// ===================================================

let tokens = [];
try {
  tokens = fs.readFileSync('token.txt', 'utf8').trim().split('\n');
} catch (error) {
  console.error(chalk.red('❌ Failed to read token.txt:'), error.message);
  process.exit(1);
}

if (tokens.length === 0) {
  console.error(chalk.red('⚠️ No tokens found in token.txt'));
  process.exit(1);
}

console.log(chalk.cyan('\n=================================================='));
console.log(chalk.cyan('     🎣 Fishing Frenzy Auto Bot - Doel Edition 🎣  '));
console.log(chalk.cyan('=================================================='));
console.log(chalk.green(`🛠️ Modified by: https://github.com/doelsumbing87 🚀`));
console.log(chalk.yellow(`📜 Original Source: https://github.com/airdropinsiders/FishingFrenzy-Auto-Bot`));
console.log(chalk.magenta(`✨ Modifikasi untuk multi akun dan pengalaman lebih optimal! ✨`));
console.log(chalk.yellow(`🎣 Running bot for ${tokens.length} accounts...`));
console.log(chalk.cyan('==================================================\n'));

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

const runBotForAccount = async (authToken, accountIndex) => {
  const headers = {
    'authorization': `Bearer ${authToken}`,
    'accept': 'application/json',
    'content-type': 'application/json',
  };

  async function checkInventory() {
    try {
      const response = await axios.get(`${config.apiBaseUrl}/v1/inventory`, { headers });
      return response.data.energy > 0;
    } catch (error) {
      console.error(chalk.red(`❌ [Account ${accountIndex}] Failed to check inventory:`), error.message);
      return false;
    }
  }

  async function fish() {
    return new Promise((resolve) => {
      const ws = new WebSocket(`${config.wsUrl}/?token=${authToken}`);
      ws.on('open', () => ws.send(JSON.stringify({ cmd: 'prepare', range: config.fishingRange, is5x: config.is5x })));
      ws.on('message', (data) => {
        const message = JSON.parse(data);
        if (message.type === 'gameOver') {
          console.log(chalk.green(`🎣 [Account ${accountIndex}] Fishing Result:`), message.success ? chalk.green('✅ Success!') : chalk.red('❌ Failed!'));
          ws.close();
          resolve(message.success);
        }
      });
      ws.on('error', (error) => {
        console.error(chalk.red(`⚠️ [Account ${accountIndex}] WebSocket error:`), error.message);
        resolve(false);
      });
    });
  }

  while (true) {
    const hasEnergy = await checkInventory();
    if (!hasEnergy) {
      console.log(chalk.yellow(`⚡ [Account ${accountIndex}] Out of energy. Waiting to refresh...`));
      await new Promise(resolve => setTimeout(resolve, config.energyRefreshHours * 3600000));
      continue;
    }

    console.log(chalk.blue(`🎣 [Account ${accountIndex}] Starting fishing...`));
    const success = await fish();
    await new Promise(resolve => setTimeout(resolve, success ? config.delayBetweenFishing : config.retryDelay));
  }
};

tokens.forEach((token, index) => runBotForAccount(token, index + 1));
