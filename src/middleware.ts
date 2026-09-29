// package: nuxt3-bot-handler
// file: src/middleware.ts

import { reverse } from 'node:dns/promises'
import { defineEventHandler } from 'h3'
import type { H3Event } from 'h3'

export interface BotHandlerOptions {
  verbose?: boolean
  /**
   * Paths that are always rejected, whatever the User-Agent.
   * Strings match as a case-insensitive path prefix, RegExps are tested against the pathname.
   * Replaces the defaults: spread `defaultBlockedPaths` to extend them.
   */
  blockedPaths?: (string | RegExp)[]
  /**
   * Header your host sets to the real client IP (e.g. 'x-nf-client-connection-ip' on Netlify,
   * 'cf-connecting-ip' on Cloudflare). Only set it if the platform overwrites the header,
   * otherwise clients can spoof it. Falls back to x-forwarded-for, then the socket address.
   */
  ipHeader?: string
}

// Probes for secrets, VCS metadata and other stacks' admin/entry points.
// Never legitimate on a Nuxt site. `/.well-known/` is intentionally not covered.
export const defaultBlockedPaths: RegExp[] = [
  /(^|\/)\.env/i,
  /(^|\/)\.(git|svn|hg|aws|ssh|docker|vscode|idea)(\/|$)/i,
  /(^|\/)\.(htaccess|htpasswd|npmrc|DS_Store)$/i,
  /(^|\/)wp-(admin|login|content|includes|config)/i,
  /(^|\/)(phpmyadmin|pma|cgi-bin|server-status|xmlrpc\.php)(\/|$)/i,
  /(^|\/)vendor\/phpunit\//i,
  /\.(php\d?|asp|aspx|jsp|cgi|sql|bak|old|swp)$/i,
]

const getPathname = (url: string) => {
  const path = url.split('?')[0].split('#')[0]
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

export const createBotHandler = (options: BotHandlerOptions = {}) => {
  const blockedPaths = options.blockedPaths ?? defaultBlockedPaths

  return defineEventHandler(async (event: H3Event) => {
    const req = event.node.req
    const url = req.url || ''

    const ip =
      (options.ipHeader && req.headers[options.ipHeader.toLowerCase()]?.toString().split(',')[0]?.trim()) ||
      req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'Unknown IP'

    const pathname = getPathname(url)
    const isBlockedPath = blockedPaths.some(p =>
      typeof p === 'string'
        ? pathname.toLowerCase().startsWith(p.toLowerCase())
        : p.test(pathname)
    )

    if (isBlockedPath) {
      if (options.verbose) {
        console.log('🚫 Blocked path probe:', { ip, url })
      }
      event.node.res.statusCode = 403
      event.node.res.statusMessage = 'Forbidden'
      event.node.res.end('Access denied')
      return
    }

    if (url.startsWith('/api/health') || url.startsWith('/api/sitemap')) return

    const userAgent = req.headers['user-agent'] || ''

    if (options.verbose) {
      console.log('=== REQUEST LOG ===', { ip, userAgent })
    }

    const isEmptyUA = userAgent.trim() === ''
    const isTooShortUA = userAgent.length < 10
    const isGenericUA = /^[a-z0-9]+$/i.test(userAgent) && userAgent.length < 15

    if (isEmptyUA || isTooShortUA || isGenericUA) {
      if (options.verbose) {
        console.log('🚫 Suspicious User-Agent structure:', { ip, userAgent })
      }
      event.node.res.statusCode = 403
      event.node.res.statusMessage = 'Forbidden'
      event.node.res.end('Access denied: Invalid User-Agent')
      return
    }

    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /crawl/i, /fetch/i, /scrapy/i,
      /python/i, /httpclient/i, /curl/i, /wget/i, /axios/i,
      /node-fetch/i, /PostmanRuntime/i, /headlesschrome/i, /go-http-client/i,
      /java/i, /perl/i, /libwww/i, /Yeti/i, /AhrefsBot/i, /MJ12bot/i,
      /DotBot/i, /PetalBot/i, /SEOkicks/i, /Baiduspider/i, /Bytespider/i,
      /GPTBot/i, /ClaudeBot/i
    ]

    const crawlerChecks = [
      { agent: /Googlebot/i, hostnames: ['.googlebot.com', '.google.com'] },
      { agent: /AdsBot-Google/i, hostnames: [] },
      { agent: /Bingbot/i, hostnames: ['.search.msn.com'] },
      { agent: /Slurp/i, hostnames: ['.crawl.yahoo.net'] },
      { agent: /DuckDuckBot/i, hostnames: ['.duckduckgo.com'] },
      { agent: /YandexBot/i, hostnames: ['.yandex.com', '.yandex.ru'] },
      { agent: /SemrushBot/i, hostnames: ['.bot.semrush.com', '.semrush.com'] },
      { agent: /SiteAuditBot/i, hostnames: ['.bot.semrush.com', '.semrush.com'] },
      { agent: /Screaming Frog SEO Spider/i, hostnames: ['.screamingfrog.co.uk'] },
      { agent: /Applebot/i, hostnames: ['.applebot.apple.com'] },
      { agent: /Twitterbot/i, hostnames: ['.twitter.com'] },
      { agent: /facebot/i, hostnames: ['.facebook.com'] },
      { agent: /facebookexternalhit/i, hostnames: ['.facebook.com'] },
      { agent: /meta-externalagent/i, hostnames: ['.facebook.com'] },
      { agent: /ChatGPT-User/i, hostnames: [] },
      { agent: /OAI-SearchBot/i, hostnames: [] },
      { agent: /Claude-SearchBot/i, hostnames: [] },
      { agent: /Claude-User/i, hostnames: [] },
      { agent: /Gemini-Deep-Research/i, hostnames: [] },
      { agent: /Cookiebot/i, hostnames: []},
      { agent: /Greenflare/i, hostnames: []}
    ]

    const allowlistedBots = crawlerChecks.map(c => c.agent).concat([/uptime-kuma/i])
    const isAllowedBot = allowlistedBots.some(p => p.test(userAgent))
    const isSuspiciousBot = !isAllowedBot && botPatterns.some(p => p.test(userAgent))

    const lacksStructureUA =
      !userAgent.includes('/') ||
      (!/[()]/.test(userAgent) && !/WebKit|Apple/i.test(userAgent)) ||
      /^[a-zA-Z0-9 _-]{5,40}$/.test(userAgent)

    if (lacksStructureUA && !isAllowedBot) {
      if (options.verbose) {
        console.log('🚫 Anomalous User-Agent structure:', { ip, userAgent })
      }
      event.node.res.statusCode = 403
      event.node.res.statusMessage = 'Forbidden'
      event.node.res.end('Access denied: Anomalous User-Agent')
      return
    }

    const isMetaIPv6 = ip.startsWith('2a03:2880:')
    const isMetaIPv4 = ip.startsWith('31.13.') || ip.startsWith('69.171.') || ip.startsWith('66.220.') || ip.startsWith('129.134:')

    if (
      /(facebookexternalhit|meta-externalagent|facebot)/i.test(userAgent) &&
      (isMetaIPv6 || isMetaIPv4)
    ) {
      if (options.verbose) {
        console.log('✅ Meta IP DNS bypass allowed:', { ip, userAgent })
      }
      return
    }

    if (ip !== 'Unknown IP') {
      for (const { agent, hostnames } of crawlerChecks) {
        if (agent.test(userAgent)) {
          if (!hostnames.length) return
          try {
            const hostnamesResolved = await reverse(ip)
            const valid = hostnamesResolved.some(hn => hostnames.some(suffix => hn.endsWith(suffix)))
            if (!valid) {
              if (options.verbose) {
                console.log('🛑 Fake crawler detected:', { ip, userAgent, hostnamesResolved })
              }
              event.node.res.statusCode = 403
              event.node.res.statusMessage = 'Forbidden'
              event.node.res.end('Access denied: Suspicious bot')
              return
            }
          } catch (err: any) {
            const isBotInCrawlerChecks = crawlerChecks.some(({ agent }) => agent.test(userAgent))
            const errMsg = String(err?.message || err).toLowerCase()

            if (errMsg.includes('not implemented') && isBotInCrawlerChecks) {
              // Soft fallback for environments like unenv/serverless
              return
            }

            if (options.verbose) {
              console.log('❌ DNS reverse lookup failed:', {
                ip,
                userAgent,
                error: err.message,
              })
            }
            event.node.res.statusCode = 403
            event.node.res.statusMessage = 'Forbidden'
            event.node.res.end('Access denied: Suspicious bot')
            return
          }
        }
      }
    }

    if (isSuspiciousBot) {
      if (options.verbose) {
        console.log('🤖 Suspicious bot detected:', { ip, userAgent })
      }
      event.node.res.statusCode = 403
      event.node.res.statusMessage = 'Forbidden'
      event.node.res.end('Access denied: Suspicious bot')
      return
    }
  })
}

export default createBotHandler()
