chrome.action.onClicked.addListener(async (tab) => {
  if (tab && tab.url) {
    let extractedData = {};
    
    try {
      // Inject script to extract data locally from the DOM
      // This approach completely bypasses Cloudflare/Akamai/WAF because it
      // runs directly in the user's browser where they have already passed all CAPTCHAs
      const injectionResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const data = { name: null, price: null, imageUrl: null };

          // HELPER: Get clean text
          const cleanText = (str) => {
             if (!str) return "";
             return str.replace(/\s+/g, ' ').trim();
          };

          // 1. Try JSON-LD (Most reliable for E-commerce)
          const scripts = document.querySelectorAll('script[type="application/ld+json"]');
          for (const script of scripts) {
              try {
                  const json = JSON.parse(script.textContent);
                  // JSON-LD can be an array, or an object, or a Graph
                  const items = Array.isArray(json) ? json : (json['@graph'] || [json]);
                  for (const item of items) {
                      if (item['@type'] === 'Product' || item['@type'] === 'ProductGroup') {
                          if (!data.name && item.name) data.name = item.name;
                          if (!data.imageUrl && item.image) {
                              data.imageUrl = Array.isArray(item.image) ? item.image[0] : (item.image.url || item.image);
                          }
                          if (!data.price && item.offers) {
                              const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
                              for (const offer of offers) {
                                  if (offer.price) {
                                      data.price = parseFloat(offer.price);
                                      break;
                                  } else if (offer.lowPrice) {
                                      data.price = parseFloat(offer.lowPrice);
                                      break;
                                  }
                              }
                          }
                      }
                  }
              } catch (e) {}
          }

          // 2. Try Meta Tags
          const getMeta = (prop) => {
              let el = document.querySelector(`meta[property="${prop}"]`) || document.querySelector(`meta[name="${prop}"]`);
              return el ? el.getAttribute("content") : null;
          };

          if (!data.name) data.name = getMeta("og:title") || document.title;
          if (!data.imageUrl) data.imageUrl = getMeta("og:image") || getMeta("twitter:image");
          if (!data.price) {
              const priceMeta = getMeta("product:price:amount") || getMeta("price");
              if (priceMeta) {
                  const pMatch = priceMeta.match(/[\d,]+\.?\d*/);
                  if (pMatch) data.price = parseFloat(pMatch[0].replace(/,/g, ''));
              }
          }

          // 3. Amazon specific site scraping
          if (document.location.hostname.includes("amazon.")) {
              const azPrice = document.querySelector('.a-price .a-offscreen, #corePriceDisplay_desktop_feature_div .a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice');
              if (azPrice) {
                  const text = azPrice.textContent.trim();
                  const match = text.match(/[\d,]+\.\d{2}/);
                  if (match) {
                      data.price = parseFloat(match[0].replace(/,/g, ''));
                  }
              }
              const azTitle = document.querySelector('#productTitle');
              if (azTitle && !data.name) {
                  data.name = azTitle.textContent.trim();
              }
              const azImg = document.querySelector('#landingImage');
              if (azImg && !data.imageUrl) {
                  data.imageUrl = azImg.getAttribute('src');
              }
          }

          // 4. Robust DOM traversal for Price (Bypasses rendering firewalls)
          if (!data.price) {
              const priceSelectors = [
                  '[data-test-id*="price"]', '[id*="price"]', '[class*="price"]',
                  '[itemprop="price"]', '.product-price', '#product-price', '.price',
                  '[data-price]', 'span.sales', '.prices .sales', '[data-product-price]'
              ];
              for (const selector of priceSelectors) {
                  try {
                      const elements = document.querySelectorAll(selector);
                      for (const el of elements) {
                          const text = el.textContent?.trim() || '';
                          const dataPrice = el.getAttribute('data-product-price') || el.getAttribute('data-price');
                          if (dataPrice) {
                              const testPrice = parseFloat(dataPrice.replace(/,/g, ""));
                              if (testPrice > 0 && testPrice < 1000000) {
                                  data.price = testPrice;
                                  break;
                              }
                          }
                          const priceMatch = text.match(/\$\s*([\d,]+\.?\d*)/) || text.match(/([\d,]+\.\d{2})/);
                          if (priceMatch && priceMatch[1]) {
                              const testPrice = parseFloat(priceMatch[1].replace(/,/g, ""));
                              if (testPrice > 0 && testPrice < 1000000) {
                                  data.price = testPrice;
                                  break;
                              }
                          }
                      }
                      if (data.price) break;
                  } catch (e) {}
              }
          }
          
          // 5. Robust DOM traversal for Image
          if (!data.imageUrl) {
              const imgSelectors = [
                  'img[class*="product"]', 'img[id*="product"]', 
                  'img[class*="main"]', 'img[data-test-id*="image"]',
                  '.gallery img', '.product-image img'
              ];
              for (const selector of imgSelectors) {
                  try {
                      const img = document.querySelector(selector);
                      if (img) {
                          const src = img.getAttribute('src');
                          if (src && !src.includes('data:image') && !src.includes('placeholder') && !src.includes('1x1')) {
                              data.imageUrl = src;
                              break;
                          }
                      }
                  } catch (e) {}
              }
              // Generic fallback to biggest image
              if (!data.imageUrl) {
                  const imgs = document.querySelectorAll('img[src]');
                  for (const img of imgs) {
                      const src = img.getAttribute('src');
                      if (src && !src.includes('data:image') && !src.includes('placeholder') && img.width > 200) {
                          data.imageUrl = src;
                          break;
                      }
                  }
              }
          }

          // Make image absolute
          if (data.imageUrl && !data.imageUrl.startsWith("http")) {
             try {
                data.imageUrl = new URL(data.imageUrl, window.location.href).toString();
             } catch(e) {}
          }
          
          if (data.name) data.name = cleanText(data.name);

          return data;
        }
      });
      
      if (injectionResults && injectionResults[0] && injectionResults[0].result) {
        extractedData = injectionResults[0].result;
      }
    } catch (e) {
      console.warn("Could not inject script to extract local data:", e);
    }
    
    // Build the URL with the tab URL and any locally extracted data
    const params = new URLSearchParams();
    params.append('url', tab.url);
    if (extractedData.name) params.append('name', extractedData.name);
    if (extractedData.price) params.append('price', extractedData.price.toString());
    if (extractedData.imageUrl) params.append('image', extractedData.imageUrl);
    
    const smartCartUrl = `http://localhost:5173/add-from-share?${params.toString()}`;
    
    chrome.tabs.create({ url: smartCartUrl, active: true });
  }
});
