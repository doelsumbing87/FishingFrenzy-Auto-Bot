# 🎣 Fishing Frenzy Auto Bot - Doel Edition

An advanced automated fishing bot for [Fishing Frenzy](https://fishingfrenzy.co/) with enhanced features and optimizations.

> **🔗 Original Source:** [airdropinsiders/FishingFrenzy-Auto-Bot](https://github.com/airdropinsiders/FishingFrenzy-Auto-Bot)
> **🛠️ Modified by:** [Doel](https://github.com/doelsumbing87) 🚀

## ✨ Features

- **Multi-Account Support**: Run multiple accounts simultaneously with token-based authentication
- **Energy-Aware Fishing**: Intelligently selects fishing ranges based on available energy
- **Automated Operations**: 24/7 continuous fishing with retry and energy management
- **Comprehensive Logging**: Color-coded console logs for better monitoring
- **Error Handling**: Built-in error recovery and connection stability

## 📋 Requirements

- Node.js (v14 or higher)
- A valid Fishing Frenzy authentication token
- `token.txt` file with one token per line (for multi-account support)

## 🚀 Installation

1. Clone the repository:
```bash
git clone https://github.com/doelsumbing87/FishingFrenzy-Auto-Bot.git
cd FishingFrenzy-Auto-Bot
```

2. Install dependencies:
```bash
npm install
```

3. Create a `token.txt` file and add your Fishing Frenzy authentication token(s):
```bash
echo "YOUR_TOKEN_HERE" > token.txt
```
_For multiple accounts, add one token per line._

## 💻 Usage

Start the bot:
```bash
npm start
```

## ⚙️ Configuration

Modify the settings in `index.js` to customize the bot's behavior:

```javascript
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
```

## 📊 Energy Management

The bot intelligently selects fishing ranges based on available energy:
- `short_range`: Costs 1 energy
- `mid_range`: Costs 2 energy
- `long_range`: Costs 3 energy

When energy is depleted, the bot will wait for a refresh (default: 24 hours).

## 🔒 Authentication

To obtain your authentication token:
1. Log in to [Fishing Frenzy](https://fishingfrenzy.co/)
2. Open browser developer tools (F12)
3. Go to Application tab → Local Storage → fishingfrenzy.co
4. Copy the token value (without quotes)
5. Paste it into your `token.txt` file

## ⚠️ Disclaimer

This bot is for educational purposes only. Using automated scripts may violate Fishing Frenzy's terms of service. Use at your own risk.

## 📜 License

This project follows the MIT License. See the LICENSE file for details.

## 🤝 Contributions

Contributions and improvements are welcome! Feel free to submit a Pull Request.

## 📧 Contact

For questions or support, open an issue on GitHub or reach out to me at [GitHub](https://github.com/doelsumbing87).
