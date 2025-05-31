# nuxt3-bot-handler

[![npm version](https://img.shields.io/npm/v/nuxt3-bot-handler.svg?style=flat&color=blue)](https://www.npmjs.com/package/nuxt3-bot-handler)
[![license](https://img.shields.io/npm/l/nuxt3-bot-handler.svg?style=flat)](https://github.com/Anubiella/nuxt3-bot-handler/blob/master/LICENSE)
[![downloads](https://img.shields.io/npm/dm/nuxt3-bot-handler.svg?style=flat)](https://www.npmjs.com/package/nuxt3-bot-handler)

🛡️ A Nuxt 3 server middleware to detect and block suspicious bots, protect SEO integrity, and allow only verified crawlers using reverse DNS validation and user-agent structure analysis.

---

## ✨ Features

- Detects malformed or spoofed user-agents
- DNS reverse lookup verification for SEO crawlers
- Blocks common scraping tools (curl, wget, headlesschrome, etc.)
- Whitelists official crawlers (Googlebot, Bingbot, Twitterbot, Applebot, etc.)
- Passes uptime checkers like `Uptime Kuma` safely
- Easy plug-and-play in any Nuxt 3 project

---

## 📦 Installation

### With npm
```bash
npm install nuxt3-bot-handler
```

### With pnpm
```bash
pnpm add nuxt3-bot-handler
```

---

## 🧩 Usage

In your Nuxt 3 project, add the middleware like this:

```ts
// server/middleware/bot-handler.ts
import botHandler from 'nuxt3-bot-handler'
export default botHandler
```

That's it — Nuxt will automatically run this middleware for every incoming request.

---

## 🔍 How It Works

This middleware performs the following checks:

1. **User-Agent Validation**  
   Blocks missing, too short, or generic user-agents (like "test", "curl", etc.)

2. **Suspicious Pattern Detection**  
   Matches against a list of known bot/scraper patterns (`axios`, `wget`, `headlesschrome`, etc.)

3. **DNS Reverse Lookup for SEO bots**  
   Verifies that the IP address belongs to the official domain of bots (e.g., `Googlebot` must resolve to `*.googlebot.com`)

4. **Bypasses for Facebook and Meta IPs**  
   Allows Facebook crawlers with specific IPv4/IPv6 prefixes even without reverse DNS

5. **Structural Checks on User-Agent**  
   Denies clients with flat or malformed User-Agent strings, unless explicitly allowlisted

---

## ⚙️ Configuration (coming soon)

In future versions, this package will support:
- IP or User-Agent allowlists/blacklists
- Rate limiting per bot/IP
- Logging hooks for custom tracking

---

## ✅ Whitelisted Crawlers

The middleware allows through these bots after DNS check:

- Googlebot
- Bingbot
- DuckDuckBot
- Yahoo Slurp
- YandexBot
- Applebot
- SemrushBot
- Screaming Frog SEO Spider
- Twitterbot
- facebot / facebookexternalhit / meta-externalagent
- uptime-kuma

---

## 🧪 Testing

To test locally:

```bash
npx nuxi dev
curl -A "curl/7.77.0" http://localhost:3000
```

Should return `403 Forbidden`.

---

## 📜 License

MIT © Lorenzo Furno

---

## 🤝 Contributing

Pull requests are welcome! If you have suggestions or want to help support more bots, open an issue or PR.
