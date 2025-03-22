const fs = require("fs");
const axios = require("axios");
const WebSocket = require("ws");
const chalk = require("chalk");

const API_URL = "https://api.fishingfrenzy.co/v1";
const TOKEN_PATH = "token.txt";
const LOG_PREFIX = "[FishingFrenzyBot]";
const RETRY_DELAY = 10000;
const ACCOUNT_DELAY = 15000;
const ENERGY_REFRESH_TIME = 24 * 60 * 60 * 1000;


function logInfo(account, message) {
    console.log(chalk.blue(`${LOG_PREFIX} [${account}] INFO: ${message}`));
}

function logError(account, message) {
    console.error(chalk.red(`${LOG_PREFIX} [${account}] ERROR: ${message}`));
}

function logWarning(account, message) {
    console.warn(chalk.yellow(`${LOG_PREFIX} [${account}] WARNING: ${message}`));
}

function formatTime(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}


async function fetchAccountData(authToken) {
    try {
        const response = await axios.get(`${API_URL}/inventory`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        return response.data;
    } catch (error) {
        logError("Global", "Gagal mengambil data akun. Mencoba lagi...");
        return null;
    }
}


function selectFishingRange(energy) {
    if (energy >= 3) {
        return "long_range";
    } else if (energy >= 2) {
        return "mid_range";
    } else if (energy >= 1) {
        return "short_range";
    } else {
        return null; 
    }
}


async function fish(account, authToken, selectedRange) {
    return new Promise((resolve) => {
        const ws = new WebSocket(`wss://api.fishingfrenzy.co/?token=${authToken}`);

        ws.on("open", () => {
            logInfo(account, `Terhubung ke WebSocket. Memulai memancing di range ${selectedRange}...`);
            ws.send(JSON.stringify({ cmd: "prepare", range: selectedRange }));
        });

        ws.on("message", (data) => {
            const message = JSON.parse(data);
            if (message.type === "initGame") {
                ws.send(JSON.stringify({ cmd: "start" }));
            }
            if (message.type === "gameOver") {
                logInfo(account, `Memancing selesai: ${message.success ? "Sukses" : "Gagal"}`);
                ws.close();
            }
        });

        ws.on("close", () => {
            logWarning(account, "Koneksi WebSocket ditutup. Mencoba kembali dalam 10 detik...");
            setTimeout(resolve, RETRY_DELAY);
        });

        ws.on("error", (error) => {
            logError(account, `Kesalahan WebSocket: ${error.message}`);
            ws.close();
            resolve();
        });
    });
}


async function startBot() {
    if (!fs.existsSync(TOKEN_PATH)) {
        logError("Global", "File token tidak ditemukan!");
        return;
    }

    const tokens = fs.readFileSync(TOKEN_PATH, "utf8").split("\n").map(t => t.trim()).filter(t => t);
    
    console.log(chalk.cyan("=================================================="));
    console.log(chalk.cyan("    Fishing Frenzy Auto Bot - Doel Edition      "));
    console.log(chalk.yellow("    Original Source: https://github.com/airdropinsiders/FishingFrenzy-Auto-Bot"));
    console.log(chalk.cyan("=================================================="));
    
    for (const [index, token] of tokens.entries()) {
        const account = `Akun ${index + 1}`;
        logInfo(account, "Memeriksa inventaris...");
        const data = await fetchAccountData(token);

        if (data) {
            console.log(chalk.yellow(`Profil Akun ${index + 1}:`));
            console.log(chalk.green(` User ID    : ${data.userId}`));
            console.log(chalk.green(` Gold       : ${data.gold}`));
            console.log(chalk.green(` Energy     : ${data.energy}`));
            console.log(chalk.green(` Fish Points: ${data.fishPoints}`));
            console.log(chalk.green(` EXP        : ${data.exp}`));
            console.log(chalk.green(` Level      : ${data.level}`));
            console.log(chalk.cyan("==================================================\n"));
        }

        if (data && data.energy > 0) {
            const selectedRange = selectFishingRange(data.energy);
            if (selectedRange) {
                logInfo(account, `Energi tersedia: ${data.energy}. Memulai memancing di range ${selectedRange}...`);
                await fish(account, token, selectedRange);
            } else {
                logWarning(account, "Energi tidak cukup untuk memancing.");
            }
        } else {
            logWarning(account, "Energi habis. Menunggu pemulihan...");
        }

        await new Promise(resolve => setTimeout(resolve, ACCOUNT_DELAY));
    }

    logInfo("Global", "Semua akun telah diproses. Mengulang kembali...");
    setTimeout(startBot, RETRY_DELAY);
}

startBot();
