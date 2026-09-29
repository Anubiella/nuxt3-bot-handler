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
- **Customizable verbosity with options**

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
import { createBotHandler } from 'nuxt3-bot-handler'

export default createBotHandler({ verbose: true })
```

Or for minimal logging:

```ts
export default createBotHandler({ verbose: false })
```

That's it — Nuxt will automatically run this middleware for every incoming request.

### Client IP header

By default the client IP is read from `x-forwarded-for`, then the socket address. If your host sets a trusted header with the real client IP, pass it with `ipHeader`:

```ts
createBotHandler({ ipHeader: 'x-nf-client-connection-ip' }) // Netlify
createBotHandler({ ipHeader: 'cf-connecting-ip' })          // Cloudflare
```

Only use a header your platform overwrites on every request, otherwise clients can spoof it.

### Blocking vulnerability scanners

Requests probing for secrets or other stacks' admin pages (`/.env`, `/.env.local`, `/.git/config`, `/wp-login.php`, `/phpmyadmin`, `*.php`, `*.sql`, …) are rejected with `403` before any other check, whatever the User-Agent. `/.well-known/` is never blocked.

To add your own paths, extend the defaults (strings match as a path prefix, RegExps are tested against the pathname):

```ts
import { createBotHandler, defaultBlockedPaths } from 'nuxt3-bot-handler'

export default createBotHandler({
  blockedPaths: [...defaultBlockedPaths, '/old-admin', /\/backup\//i],
})
```

Passing `blockedPaths` without spreading `defaultBlockedPaths` replaces the defaults; `blockedPaths: []` disables the check.

---

## 🔍 How It Works

This middleware performs the following checks:

0. **Blocked Path Probes**  
   Rejects requests for `.env` files, VCS folders, WordPress/PHP entry points and similar scanner targets

1. **User-Agent Validation**  
   Blocks missing, too short, or generic user-agents (like "test", "curl", etc.)

2. **Suspicious Pattern Detection**  
   Matches against a list of known bot/scraper patterns (`axios`, `wget`, `headlesschrome`, etc.)

3. **DNS Reverse Lookup for SEO bots**  
   Verifies that the IP address belongs to the official domain of bots (e.g., Googlebot must resolve to *.googlebot.com) using dns.reverse().
   If the DNS reverse lookup fails due to network issues or unresolvable hostnames, the request is blocked to avoid spoofing.
   However, if the error is caused by unsupported functionality (e.g., "Not implemented: cares.ChannelWrap.prototype.getHostByAddr"), the lookup is skipped, and a warning is logged (if verbose mode is enabled), without blocking the request.
   This prevents false positives in restricted environments such as edge runtimes or some serverless deployments.

4. **Bypasses for Facebook and Meta IPs**  
   Allows Facebook crawlers with specific IPv4/IPv6 prefixes even without reverse DNS

5. **Structural Checks on User-Agent**  
   Denies clients with flat or malformed User-Agent strings, unless explicitly allowlisted

6. **Verbose Option for Logging**  
   Toggle detailed console logging using the `verbose: true|false` option

---

## ✅ Whitelisted Crawlers

**Verified via reverse DNS** — allowed only if the IP resolves to the bot's official domain:

- Googlebot
- Bingbot
- DuckDuckBot
- Yahoo Slurp
- YandexBot
- Applebot
- SemrushBot
- SiteAuditBot (Semrush)
- Screaming Frog SEO Spider
- Twitterbot
- facebot / facebookexternalhit / meta-externalagent (also allowed without DNS from known Meta IP ranges)

**Allowed by User-Agent only** — no DNS verification, so a spoofed User-Agent will pass:

- AdsBot-Google
- ChatGPT-User
- OAI-SearchBot
- Claude-SearchBot
- Claude-User
- Gemini-Deep-Research
- Cookiebot
- Greenflare
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
