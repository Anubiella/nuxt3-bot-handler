# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`nuxt3-bot-handler` is a small npm package: one h3 event handler (`createBotHandler`) that Nuxt 3 projects register as server middleware (`server/middleware/*.ts`) to block suspicious bots with 403s. The whole implementation lives in `src/middleware.ts`. It is an ES module and compiles with plain `tsc` to `dist/`.

## Commands

- `npm run build`: compile `src/` to `dist/middleware.js` and `.d.ts` with `tsc`
- `npm run dev`: `tsc --watch`
- `npm run check:dist`: fails if `dist/` is missing

The repo has no test suite and no linter; `*.test.ts` and `*.spec.ts` are gitignored. The README suggests testing manually by mounting the handler in a Nuxt app (`npx nuxi dev`) and sending requests with specific user-agents, e.g. `curl -A "curl/7.77.0" http://localhost:3000`, which should return 403.

`dist/` is gitignored. `prepublishOnly` only checks that `dist/` exists and does not rebuild it, so run `npm run build` before `npm publish`, or the package ships a stale build.

## Request pipeline (src/middleware.ts)

The checks run in this order, and each one can end the request early, so the order changes the result:

1. **IP resolution**: the `ipHeader` option if set, then the first entry of `x-forwarded-for` (client-spoofable), then the socket address, then the sentinel `'Unknown IP'`. The package stays host-agnostic: no platform-specific header is trusted by default.
2. **Blocked paths**: a pathname (query stripped, URI-decoded) matching `blockedPaths` (default `defaultBlockedPaths`: `.env`, VCS dirs, WordPress/PHP entry points, dump extensions) gets a 403 regardless of UA. This runs before the health/sitemap bypass. The defaults must never match `/.well-known/` or normal Nuxt routes. Then `/api/health*` and `/api/sitemap*` skip every remaining check.
3. **UA sanity**: an empty UA, a UA under 10 chars, or a short alphanumeric UA gets a 403.
4. **Structural check**: a UA with no `/`, or with no parentheses and no WebKit/Apple, or one that is a flat token, gets a 403 unless it matches an allowlisted bot.
5. **Meta IP bypass**: Facebook/Meta UAs coming from known Meta IP prefixes are allowed without a DNS check.
6. **Crawler verification**: the first matching `crawlerChecks` entry decides the outcome:
   - `hostnames: []` allows the request immediately, with no DNS check (used for AI agents, AdsBot, Cookiebot, etc.).
   - Otherwise it runs `dns.reverse(ip)`, and the resolved hostname must end with one of the listed suffixes or the request gets a 403.
   - DNS errors give a 403, except errors whose message contains "not implemented" (unenv/edge/serverless runtimes without `getHostByAddr`). Those are allowed.
   - This step is skipped entirely when the IP is `'Unknown IP'`.
7. **Generic bot patterns**: a UA that matches `botPatterns` and is not allowlisted gets a 403.

### Allowlist mechanics

- `allowlistedBots` is derived from `crawlerChecks` plus `uptime-kuma`. To allow a new crawler, add an entry to `crawlerChecks`. Include real reverse-DNS suffixes when the vendor publishes them; otherwise use an empty `hostnames` array.
- Generic patterns like `/bot/i` and `/crawl/i` in `botPatterns` would block most crawlers. Only the allowlist lets them through, and it also exempts them from the structural check in step 4.
- An allowlisted UA with an empty `hostnames` array is trusted on the UA string alone.

## Conventions

- When you change `crawlerChecks`, update the "Whitelisted Crawlers" list in `README.md` to match. Git history shows most changes are allowlist updates.
- Keep `verbose` as the only logging switch. All `console.log` calls are gated behind `options.verbose`.
- The module has a default export (`createBotHandler()` with default options) in addition to the named `createBotHandler` export.
