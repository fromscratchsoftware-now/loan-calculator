import { defineConfig, type Plugin } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

let cachedChromium: any = null
let cachedRemoteBrowser: any = null

function getRemoteBrowserConfig() {
  const wsEndpoint =
    process.env.SMARTCART_REMOTE_BROWSER_WS_ENDPOINT ||
    process.env.BROWSERLESS_WS_ENDPOINT ||
    ''
  const protocol = (process.env.SMARTCART_REMOTE_BROWSER_PROTOCOL || 'playwright').toLowerCase()

  if (!wsEndpoint) {
    return null
  }

  return {
    wsEndpoint,
    protocol,
  }
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, ' ')
    .trim()
}

function titleFromSlug(url: URL): string | null {
  const parts = url.pathname
    .split('/')
    .filter(Boolean)
    .filter((part) => !/^\d+(\.html?)?$/i.test(part))
  const segment = parts.pop()
  if (!segment) {
    return null
  }

  const raw = segment.replace(/\.html?$/i, '')
  const tokens = raw
    .split(/[_-]+/)
    .filter((token) => token && token.toLowerCase() !== 'reg')

  if (!tokens.length) {
    return null
  }

  const words: string[] = []

  for (const token of tokens) {
    if (token.toLowerCase() === 's' && words.length) {
      words[words.length - 1] = `${words[words.length - 1]}'s`
      continue
    }

    words.push(token.charAt(0).toUpperCase() + token.slice(1))
  }

  return words.join(' ')
}

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content="([^"]+)"`, 'i'),
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content='([^']+)'`, 'i'),
    new RegExp(`<meta[^>]+content="([^"]+)"[^>]+property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+content='([^']+)'[^>]+property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content="([^"]+)"`, 'i'),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content='([^']+)'`, 'i'),
    new RegExp(`<meta[^>]+content="([^"]+)"[^>]+name=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+content='([^']+)'[^>]+name=["']${property}["']`, 'i'),
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      return decodeHtml(match[1])
    }
  }

  return null
}

function extractAttribute(html: string, attribute: string): string | null {
  const patterns = [
    new RegExp(`${attribute}="([^"]+)"`, 'i'),
    new RegExp(`${attribute}='([^']+)'`, 'i'),
    new RegExp(`${attribute}=\\\\"([^\\\\"]+)\\\\"`, 'i'),
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      return decodeHtml(match[1])
    }
  }

  return null
}

function extractPrice(html: string, hostname: string): number | null {
  const patterns =
    hostname.includes('target.com')
      ? [
          /\\"current_retail\\":([0-9]+(?:\.[0-9]+)?)/i,
          /\\"formatted_current_price\\":\\"\$?([0-9]+(?:\.[0-9]+)?)/i,
          /\\"reg_retail\\":([0-9]+(?:\.[0-9]+)?)/i,
          /"current_retail":([0-9]+(?:\.[0-9]+)?)/i,
          /"formatted_current_price":"\$?([0-9]+(?:\.[0-9]+)?)/i,
          /"reg_retail":([0-9]+(?:\.[0-9]+)?)/i,
        ]
      : hostname.includes('iherb.com')
        ? [
            /data-numeric-discounted-price=["']([0-9]+(?:\.[0-9]+)?)["']/i,
            /data-numeric-list-price=["']([0-9]+(?:\.[0-9]+)?)["']/i,
            /data-discounted-price=["']\$?([0-9]+(?:\.[0-9]+)?)["']/i,
            /data-list-price=["']\$?([0-9]+(?:\.[0-9]+)?)["']/i,
          ]
      : [
          /"price"\s*:\s*"([0-9]+\.[0-9]+)"/i, // Prefer exact string decimal (often ld+json)
          /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([0-9]+(?:\.[0-9]+)?)["']/i,
          /<meta[^>]+content=["']([0-9]+(?:\.[0-9]+)?)["'][^>]+property=["']product:price:amount["']/i,
          /"price"\s*:\s*"?([0-9]+(?:\.[0-9]+)?)"?/i, // Fallback catching anything
        ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      const parsed = Number.parseFloat(match[1])
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return null
}

async function extractWithPlaywright(url: URL) {
  const { chromium } = await import('playwright')
  const browser = cachedChromium || (await chromium.launch({ headless: true }))
  cachedChromium = browser
  return extractWithBrowserInstance(browser, url)
}

async function extractWithRemoteBrowser(url: URL) {
  const config = getRemoteBrowserConfig()
  if (!config) {
    throw new Error('Remote browser is not configured')
  }

  const { chromium } = await import('playwright')
  if (cachedRemoteBrowser && !cachedRemoteBrowser.isConnected()) {
    cachedRemoteBrowser = null
  }
  
  if (!cachedRemoteBrowser) {
    cachedRemoteBrowser =
      config.protocol === 'cdp'
        ? await chromium.connectOverCDP(config.wsEndpoint)
        : await chromium.connect(config.wsEndpoint)
  }

  try {
    return await extractWithBrowserInstance(cachedRemoteBrowser, url)
  } catch (error) {
    // If it failed because the browser was closed, clear cache for next time
    if (error instanceof Error && error.message.includes('has been closed')) {
      cachedRemoteBrowser = null
    }
    throw error
  }
}

async function extractWithBrowserInstance(browser: any, url: URL, retries = 1) {
  let lastError: Error | unknown;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 1200 },
      locale: 'en-US',
    })
    const page = await context.newPage()

    let interceptedPrice: number | null = null
    
    // Explicit API interception for dynamically-rendered storefronts (e.g., Jabra)
    if (url.hostname.includes('jabra.com') || url.hostname.includes('jabra.')) {
      page.on('response', async (response: any) => {
        if (response.url().includes('sfcc-prod-api.jabra.com') && response.url().includes('/products/') && response.status() === 200) {
          console.log(`[Jabra Extractor] Intercepted SFCC API: ${response.url()}`)
          try {
            const json = await response.json()
            console.log(`[Jabra Extractor] SFCC Payload Keys: ${Object.keys(json)}`)
            if (json?.data && Array.isArray(json.data)) {
              // Try to find the specific SKU from the URL, otherwise default to first item
              const targetSku = url.searchParams.get('sku')
              const matchedProduct = targetSku 
                ? json.data.find((item: any) => item.c_sku === targetSku) 
                : json.data[0]
                
              console.log(`[Jabra Extractor] Matched Product: ${matchedProduct?.c_sku}, Target: ${targetSku}, Price: ${matchedProduct?.c_formattedListedPrice}`)
              if (matchedProduct?.c_formattedListedPrice) {
                const priceMatch = matchedProduct.c_formattedListedPrice.replace(/[^0-9.]/g, '')
                const parsed = Number.parseFloat(priceMatch)
                if (Number.isFinite(parsed)) {
                  // If we already have a price and this is an accessory payload, don't overwrite
                  // The main product payload is usually the one containing the matching SKU
                  if (!interceptedPrice || matchedProduct.c_sku === targetSku) {
                    interceptedPrice = parsed
                    console.log(`[Jabra Extractor] Successfully intercepted price: ${interceptedPrice}`)
                  }
                }
              }
            }
          } catch (e) {
            console.error(`[Jabra Extractor] Error parsing response:`, e)
          }
        }
      })
    }

    try {
      await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 20000 })
      // Wait slightly longer for Jabra to ensure the API payload resolves
      await page.waitForTimeout(url.hostname.includes('jabra') ? 4000 : 2000)

      const html = await page.content()
      const hostname = url.hostname.replace(/^www\./, '')
      const title = (await page.title()).trim()

      const challengeSignals = [
        /just a moment/i,
        /attention required/i,
        /verify you are human/i,
        /cloudflare/i,
        /cf-mitigated/i,
        /datadome/i,
        /captcha-delivery/i,
        /access to this page has been denied/i,
        /access denied/i,
        /something went wrong/i,
      ]

      if (challengeSignals.some((pattern) => pattern.test(title) || pattern.test(html))) {
        // If we successfully intercepted a price via API (e.g., Jabra), the DOM's bot challenge 
        // string doesn't matter, we have the critical data we came for.
        if (!interceptedPrice) {
          throw new Error('Browser automation reached an anti-bot challenge instead of the product page')
        }
      }

      const rawName =
        extractAttribute(html, 'data-product-name') ||
        extractMeta(html, 'og:title') ||
        extractMeta(html, 'twitter:title') ||
        title ||
        titleFromSlug(url)
      const name = rawName ? rawName.replace(/^(buy now|buy)\s*\|\s*/i, "") : null
      const imageUrl =
        extractAttribute(html, 'data-product-primary-image-url') ||
        extractMeta(html, 'og:image') ||
        extractMeta(html, 'twitter:image')
        
      let price = interceptedPrice || extractPrice(html, hostname)

      if (!price) {
        const visiblePrice = await page.evaluate(() => {
          const bodyText = document.body?.innerText || ''
          const patterns = [
            /\$\s?([0-9]+(?:\.[0-9]{2})?)/,
            /USD\s?([0-9]+(?:\.[0-9]{2})?)/i,
          ]

          for (const pattern of patterns) {
            const match = bodyText.match(pattern)
            if (match?.[1]) {
              return Number.parseFloat(match[1].replace(/,/g, ''))
            }
          }

          return null
        })

        if (typeof visiblePrice === 'number' && Number.isFinite(visiblePrice)) {
          price = visiblePrice
        }
      }

      return {
        name,
        imageUrl,
        price,
        store: hostname.includes('bhphotovideo.com') ? 'B&H' : hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1),
        url: url.toString(),
      }
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt + 1} failed for ${url.hostname}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await context.close()
    }
  }
  throw lastError;
}

function productExtractorPlugin(): Plugin {
  return {
    name: 'smart-cart-product-extractor',
    configureServer(server) {
      server.middlewares.use('/__extract-product', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        try {
          const chunks: Buffer[] = []
          for await (const chunk of req) {
            chunks.push(Buffer.from(chunk))
          }

          const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
          const url = String(body.url || '')
          const validUrl = new URL(url)

          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 8000)
          
          let response
          let fetchError: Error | null = null
          try {
            response = await fetch(validUrl.toString(), {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
              },
              redirect: 'follow',
              signal: controller.signal
            })
          } catch (error) {
            fetchError = error instanceof Error ? error : new Error('Fetch failed')
          } finally {
            clearTimeout(timeoutId)
          }

          const runFallback = async (validUrl: URL, nativeData?: any) => {
            const hostname = validUrl.hostname.replace(/^www\./, '')
            const store = hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1)
            const titleGuess = titleFromSlug(validUrl)

            try {
              const browserData = await extractWithPlaywright(validUrl)
              if (browserData.name || browserData.imageUrl || browserData.price) {
                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({
                  ...browserData,
                  name: (browserData.name === titleGuess && nativeData?.name) ? nativeData.name : browserData.name,
                  imageUrl: browserData.imageUrl || nativeData?.imageUrl,
                }))
                return true
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Playwright extraction failed'
              console.warn(`Playwright fallback failed for ${validUrl.hostname}: ${message}`)
            }

            try {
              const remoteData = await extractWithRemoteBrowser(validUrl)
              if (remoteData.name || remoteData.imageUrl || remoteData.price) {
                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(
                  JSON.stringify({
                    ...remoteData,
                    name: (remoteData.name === titleGuess && nativeData?.name) ? nativeData.name : remoteData.name,
                    imageUrl: remoteData.imageUrl || nativeData?.imageUrl,
                    warning: (remoteData as any).warning || 'Extracted with remote browser session.',
                  }),
                )
                return true
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Remote browser extraction failed'
              console.warn(`Remote browser fallback failed for ${validUrl.hostname}: ${message}`)
            }

            // If all fallbacks fail, formulate a partial response
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                name: titleGuess || null,
                imageUrl: null,
                price: null,
                store: store,
                url: validUrl.toString(),
                warning: `${store} blocked automated extraction. Browser automation also failed. The product name was recovered from the link. Please fill in any missing details manually.`,
                extracted: false
              }),
            )
            return true
          }

          if (fetchError || !response || !response.ok) {
             await runFallback(validUrl)
             return
          }

          const html = await response.text()
          const hostname = validUrl.hostname.replace(/^www\./, '')
          const store = hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1)
          const rawName =
            extractAttribute(html, 'data-product-name') ||
            extractMeta(html, 'og:title') ||
            extractMeta(html, 'twitter:title') ||
            (() => {
              const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
              return titleMatch?.[1] ? decodeHtml(titleMatch[1]) : null
            })()
            
          const name = rawName ? rawName.replace(/^(buy now|buy)\s*\|\s*/i, "") : null
          const imageUrl =
            extractAttribute(html, 'data-product-primary-image-url') ||
            extractMeta(html, 'og:image') ||
            extractMeta(html, 'twitter:image')
          const price = extractPrice(html, hostname)

          // If the native fetch succeeded, but gave an empty skeleton, or a bot title, trigger fallback
          const isBotTitle = name && (name.toLowerCase() === hostname || name.toLowerCase() === hostname + '.com' || name.toLowerCase().includes('something went wrong') || name.toLowerCase().includes('access denied'))
          const requiresDynamicPrice = !price && (hostname.includes('jabra.com') || hostname.includes('jabra.'))
          
          if (((!name || isBotTitle) && !imageUrl && !price) || requiresDynamicPrice) {
            await runFallback(validUrl, { name, imageUrl, price })
            return
          }

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              name,
              imageUrl,
              price,
              store,
              url: validUrl.toString(),
            }),
          )
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown extraction error'
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: message, extracted: false }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    productExtractorPlugin(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
