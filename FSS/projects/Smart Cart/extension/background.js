chrome.action.onClicked.addListener(async (tab) => {
  if (tab && tab.url) {
    let extractedData = {};
    
    try {
      // Inject script to extract data locally from the DOM
      const injectionResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const data = { name: null, price: null, imageUrl: null };

          // 1. Try JSON-LD
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
          if (!data.imageUrl) data.imageUrl = getMeta("og:image");
          if (!data.price) {
              const priceMeta = getMeta("product:price:amount");
              if (priceMeta) data.price = parseFloat(priceMeta);
          }

          // 3. Try generic DOM scraping for price if still missing
          if (!data.price) {
            // AcmeTools specifically puts price in some elements.
            // Let's grab it by regex on the body text if we're desperate, but looking at standard classes is better.
            const priceEl = document.querySelector('.price, [itemprop="price"], .product-price');
            if (priceEl) {
               // Use simpler regex to avoid escaping issues: search for $ followed by optional space then digits
               const text = priceEl.textContent || '';
               const dollarIdx = text.indexOf('$');
               if (dollarIdx !== -1) {
                  const priceStr = text.substring(dollarIdx + 1).match(/[0-9,]+\.[0-9]{2}/);
                  if (priceStr && priceStr[0]) {
                     data.price = parseFloat(priceStr[0].replace(/,/g, ''));
                  }
               }
            }
          }

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
    
    chrome.tabs.query({ url: "http://localhost:5173/*" }, (tabs) => {
      if (tabs && tabs.length > 0) {
        // We found an existing tab! Let's update it to the new URL silently
        const existingTab = tabs[0];
        
        // Update its URL without making it active
        chrome.tabs.update(existingTab.id, { 
          url: smartCartUrl,
          active: false // Prevent stealing focus
        });
        
      } else {
        // No existing Smart Cart tab found, so open a new one silently
        chrome.tabs.create({ url: smartCartUrl, active: false });
      }
    });
  }
});
