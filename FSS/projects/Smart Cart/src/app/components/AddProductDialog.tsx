import { useState, useEffect, useRef } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import type { CartItem } from "../pages/Cart";
import { projectId, publicAnonKey } from "@/utils/supabase/info";

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (product: Omit<CartItem, "id">) => void;
  onSaveForLater?: (product: Omit<CartItem, "id">) => void;
  initialUrl?: string;
  initialPreDom?: string;
  initialData?: {name?: string, price?: number, image?: string};
}

export function AddProductDialog({ open, onOpenChange, onAdd, onSaveForLater, initialUrl, initialPreDom, initialData }: AddProductDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    url: initialUrl || "",
    price: "",
    imageUrl: "",
    quantity: "1",
    store: "",
    notes: "",
  });
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionMessage, setExtractionMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);
  const [lastExtractedUrl, setLastExtractedUrl] = useState<string>("");
  
  // Refs for focusing after extraction
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  
  // Ref for the latest form data to access in useEffect without adding to dependencies
  const formDataRef = useRef(formData);
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  const prevInitialUrlRef = useRef(initialUrl);

  // Auto-save existing form data if user shares another product while dialog is open
  useEffect(() => {
    if (open && initialUrl && initialUrl !== prevInitialUrlRef.current) {
      const currentData = formDataRef.current;
      
      // Auto-save the existing product if it's filled out
      if (currentData.name && currentData.price && currentData.url) {
        console.log("Auto-saving previous product before loading new one:", currentData.name);
        onAdd({
          name: currentData.name,
          url: currentData.url,
          price: Number(currentData.price),
          imageUrl: currentData.imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
          quantity: parseInt(currentData.quantity) || 1,
          store: currentData.store || "Unknown",
          notes: currentData.notes || "",
        });
      }

      // Pre-fill with the newly arrived URL
      setFormData({
        name: "",
        url: initialUrl,
        price: "",
        imageUrl: "",
        quantity: "1",
        store: "",
        notes: "",
      });
      
      // Keep extraction messages clear, let the hook re-extract
      setExtractionMessage(null);
      setIsExtracting(false);
      setLastExtractedUrl("");
    }
    prevInitialUrlRef.current = initialUrl;
  }, [initialUrl, open, onAdd]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      // Clear the form when dialog is closed
      setFormData({
        name: "",
        url: initialUrl || "",
        price: "",
        imageUrl: "",
        quantity: "1",
        store: "",
        notes: "",
      });
      setExtractionMessage(null);
      setIsExtracting(false);
      setLastExtractedUrl("");
      localStorage.removeItem('draft_product');
    } else if (initialUrl && !formData.url) {
      setFormData(prev => ({ ...prev, url: initialUrl }));
    }
  }, [open]); // removed initialUrl from deps to let the other hook handle changes

  // Continuously save draft to recover on full page reload when another item is shared
  useEffect(() => {
    if (open && formData.url) {
      localStorage.setItem('draft_product', JSON.stringify(formData));
    }
  }, [formData, open]);

  // Auto-trigger extraction when URL changes
  useEffect(() => {
    if (!open || !formData.url || isExtracting) return;

    // Check if URL is valid
    let isValidUrl = false;
    let urlObj;
    try {
      urlObj = new URL(formData.url);
      isValidUrl = true;
    } catch {
      // Invalid URL, don't auto-trigger
      return;
    }

    // Immediately extract and set store name from domain
    if (isValidUrl && urlObj) {
      const storeName = extractStoreNameFromUrl(urlObj);
      if (storeName && formData.store !== storeName) {
        setFormData(prev => ({ ...prev, store: storeName }));
      }
    }

    // Only auto-trigger if URL is valid and different from last extracted URL
    if (isValidUrl && formData.url !== lastExtractedUrl) {
      // Debounce: wait 800ms after user stops typing
      const timer = setTimeout(() => {
        console.log("🤖 Auto-triggering extraction for:", formData.url);
        autoFillFromUrl();
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [formData.url, open]);

  const autoFillFromUrl = async () => {
    console.log("🚀 autoFillFromUrl called!");
    console.log("Current URL:", formData.url);
    
    if (!formData.url) {
      alert("⚠️ Please enter a product URL first.");
      return;
    }

    // Validate URL format
    try {
      new URL(formData.url);
    } catch {
      alert("⚠️ Please enter a valid URL (e.g., https://example.com/product)");
      return;
    }

    setIsExtracting(true);
    setExtractionMessage(null); // Clear previous messages
    console.log(`🔍 Starting auto-fill for: ${formData.url}`);

    let data: any = null; // Declare outside try block so it's accessible in finally

    try {
      // If we have fully populated initialData from the extension, just use that immediately!
      if (initialData && initialData.name && initialData.price) {
        console.log("📝 Found pre-extracted data directly from extension params!", initialData);
        let siteName = "Unknown";
        try {
          const domain = new URL(formData.url).hostname.replace(/^www\./, '').split('.')[0];
          siteName = domain.charAt(0).toUpperCase() + domain.slice(1);
        } catch (e) {}
        
        data = {
          name: initialData.name,
          price: initialData.price,
          imageUrl: initialData.image,
          store: siteName,
          url: formData.url
        };
      }
      // If no direct data, try the injected pre_dom payload
      else if (initialPreDom) {
        console.log("📝 Found pre-extracted DOM from extension! Size:", initialPreDom.length);
        
        try {
          // Decode the base64 injected HTML payload
          const decodedHtml = decodeURIComponent(escape(atob(decodeURIComponent(initialPreDom))));
          data = parseMetadataFromHTML(decodedHtml, formData.url);
          
          if (data && (data.name || data.price || data.imageUrl)) {
            console.log("✅ Extension DOM extraction successful!", data);
          } else {
             console.log("⚠️ Extension DOM extraction returned partial data, attempting fallback...", data);
             data = null;
          }
        } catch (e) {
          console.error("Failed to parse extension DOM payload", e);
        }
      }

      // FIRST: Try client-side extraction (if extension payload didn't work)
      if (!data) {
        console.log("📱 Attempting client-side extraction...");
        data = await extractMetadataClientSide(formData.url);
      }
      
      console.log("Client-side data:", data);
      
      if (data && (data.name || data.price || data.imageUrl)) {
        console.log("✅ Client-side extraction successful!", data);
      } else {
        console.log("⚠️ Client-side extraction returned no data, trying server-side...");
        // FALLBACK: If client-side fails due to CORS, try server-side
        data = await extractMetadataServerSide(formData.url);
        console.log("Server-side data:", data);
      }

      // Check if we got any useful data
      if (!data || (!data.name && !data.price && !data.imageUrl && !data.store && !data.warning)) {
        console.log("❌ No metadata extracted from either method");
        // Only show the generic message if we haven't already shown a specific one
        if (!extractionMessage) {
          setExtractionMessage({ 
            type: 'warning', 
            text: '⚠️ Could not extract product information. Please enter details manually.' 
          });
        }
        return;
      }

      // Auto-fill the form with extracted data
      setFormData({
        ...formData,
        name: data.name || formData.name,
        imageUrl: data.imageUrl || formData.imageUrl,
        price: data.price ? String(data.price) : formData.price,
        store: data.store || formData.store,
        url: data.url || formData.url, // Use normalized URL from server (eBay tracking params removed)
      });

      // Show success or warning message
      if (data.warning) {
        // Server returned a warning (e.g., eBay blocked but URL saved)
        setExtractionMessage({ 
          type: 'warning', 
          text: data.warning 
        });
        console.log("⚠️ Extraction completed with warning:", data.warning);
      } else {
        // Show success message
        const extractedFields = [];
        if (data.name) extractedFields.push('name');
        if (data.price) extractedFields.push('price');
        if (data.imageUrl) extractedFields.push('image');
        if (data.store) extractedFields.push('store');
        
        setExtractionMessage({ 
          type: 'success', 
          text: `✅ Successfully extracted: ${extractedFields.join(', ')}` 
        });

        console.log("✅ Product data extracted successfully:", data);

        // Automatically add to catalog if it's a complete product
        if (data.name && data.price && data.imageUrl) {
          try {
            const existingCatalogStr = localStorage.getItem('catalog');
            const catalog = existingCatalogStr ? JSON.parse(existingCatalogStr) : [];
            const productUrl = data.url || formData.url;
            const exists = catalog.some((item: any) => item.url === productUrl);
            
            if (!exists) {
              const categoriesMap: Record<string, string[]> = {
                // Electronics & Tech
                'jabra': ['Electronics', 'Audio', 'Office'],
                'speaker': ['Electronics', 'Audio'],
                'headphone': ['Electronics', 'Audio'],
                'earbuds': ['Electronics', 'Audio'],
                'monitor': ['Electronics', 'Computers & Accessories'],
                'laptop': ['Electronics', 'Computers & Accessories'],
                'mouse': ['Electronics', 'Computers & Accessories'],
                'keyboard': ['Electronics', 'Computers & Accessories'],
                'inmo': ['Electronics', 'Wearables'],
                'watch': ['Watches', 'Wrist Watches'],
                'band': ['Watches', 'Watch Bands'],
                // Hardware & Tools
                'makita': ['Hardware', 'Tools'],
                'drill': ['Hardware', 'Tools'],
                'router': ['Hardware', 'Tools'],
                'saw': ['Hardware', 'Tools'],
                'wrench': ['Hardware', 'Tools'],
                // Clothing & Apparel
                'hoka': ['Shoes', 'Athletic Shoes', 'Sports & Outdoors'],
                'shirt': ['Clothing', 'Apparel'],
                't-shirt': ['Clothing', 'Apparel'],
                'dress': ['Clothing', 'Dresses'],
                'pants': ['Clothing', 'Apparel'],
                'jeans': ['Clothing', 'Apparel'],
                'sweater': ['Clothing', 'Sweaters'],
                'shoes': ['Shoes'],
                'sneaker': ['Shoes', 'Sneakers'],
                // Beauty & Skincare
                'cleanser': ['Beauty & Personal Care', 'Skincare'],
                'moisturizer': ['Beauty & Personal Care', 'Skincare'],
                'serum': ['Beauty & Personal Care', 'Skincare'],
                'cream': ['Beauty & Personal Care', 'Skincare'],
                'lotion': ['Beauty & Personal Care', 'Skincare'],
                'sunscreen': ['Beauty & Personal Care', 'Skincare'],
                'spf': ['Beauty & Personal Care', 'Skincare'],
                'treatment': ['Beauty & Personal Care', 'Skincare'],
                'toner': ['Beauty & Personal Care', 'Skincare'],
                'niacinamide': ['Beauty & Personal Care', 'Skincare'],
                'retinol': ['Beauty & Personal Care', 'Skincare'],
                'hyaluronic': ['Beauty & Personal Care', 'Skincare'],
                'makeup': ['Beauty & Personal Care', 'Makeup'],
                'mascara': ['Beauty & Personal Care', 'Makeup'],
                'lipstick': ['Beauty & Personal Care', 'Makeup'],
                // Toys, Games & Collectibles
                'card': ['Toys & Hobbies', 'Collectibles'],
                'magic': ['Toys & Hobbies', 'Collectibles'],
                'toy': ['Toys & Hobbies'],
                'lego': ['Toys & Hobbies', 'Building Toys'],
                'game': ['Toys & Hobbies', 'Games'],
                'puzzle': ['Toys & Hobbies', 'Puzzles'],
                // Home & Kitchen
                'blender': ['Home & Kitchen', 'Appliances'],
                'coffee maker': ['Home & Kitchen', 'Appliances'],
                'vacuum': ['Home & Kitchen', 'Appliances'],
                'pillow': ['Home & Kitchen', 'Bedding'],
                'towel': ['Home & Kitchen', 'Bath'],
                // Books & Media
                'book': ['Books & Media'],
                'novel': ['Books & Media'],
                // Pharmacy & Health
                'shampoo': ['Pharmacy', 'Personal Care'],
                'nizoral': ['Pharmacy', 'Personal Care'],
                'vitamin': ['Pharmacy', 'Supplements'],
                'calcium': ['Pharmacy', 'Supplements'],
                'magnesium': ['Pharmacy', 'Supplements'],
                'zinc': ['Pharmacy', 'Supplements'],
              };
              
              const newCategories: string[] = [];
              const titleLower = data.name.toLowerCase();
              
              for (const [key, categoryArray] of Object.entries(categoriesMap)) {
                if (titleLower.includes(key)) {
                  newCategories.push(...categoryArray);
                }
              }

              let itemCategories = newCategories.length > 0 
                ? Array.from(new Set(newCategories)) 
                : ['Miscellaneous'];
                
              // Dynamic Demographic Tagging for Apparel & Shoes
              if (itemCategories.includes('Clothing') || itemCategories.includes('Shoes') || itemCategories.includes('Apparel')) {
                 const hasWomen = /\b(women\'?s?|ladies|womens)\b/.test(titleLower);
                 const hasMen = /\b(men\'?s?|mens)\b/.test(titleLower);
                 const hasKids = /\b(kid\'?s?|boy\'?s?|girl\'?s?|toddler)\b/.test(titleLower);

                 if (hasWomen) {
                    itemCategories.unshift('Women');
                 } else if (hasMen) {
                    itemCategories.unshift('Men');
                 } else if (hasKids) {
                    itemCategories.unshift('Kids');
                 }
              }

              // Force override if watch items were somehow falsely tagged
              if (titleLower.includes('watch') || titleLower.includes('band') || titleLower.includes('casio')) {
                if (itemCategories.includes('Clothing') || itemCategories.includes('Footwear') || itemCategories.includes('Wearables') || itemCategories.includes('Accessories') || itemCategories.includes('Shoes')) {
                  itemCategories = itemCategories.filter(c => c !== 'Clothing' && c !== 'Footwear' && c !== 'Wearables' && c !== 'Accessories' && c !== 'Shoes' && c !== 'Athletic Shoes');
                  if (itemCategories.length === 0) itemCategories.push('Miscellaneous');
                }
              }

              const newCatalogItem = {
                id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
                name: data.name,
                url: productUrl,
                price: Number(data.price),
                imageUrl: data.imageUrl,
                store: data.store || formData.store || 'Unknown',
                categories: itemCategories,
                addedAt: new Date().toISOString()
              };
              catalog.unshift(newCatalogItem);
              localStorage.setItem('catalog', JSON.stringify(catalog));
              console.log("🌟 Automatically added search result to public catalog:", data.name);
            }
          } catch (e) {
            console.error("Failed to add extracted product to catalog", e);
          }
        }
      }
      
      // Focus on notes area only if there wasn't a warning, so warnings stay visible
      if (!data.warning) {
        setTimeout(() => {
          notesRef.current?.focus();
          notesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    } catch (error: any) {
      console.error("❌ Unexpected error during auto-fill:", error);
      setExtractionMessage({ 
        type: 'error', 
        text: `❌ Error: ${error.message}` 
      });
    } finally {
      console.log("🏁 Finally block - setting isExtracting to false");
      setIsExtracting(false);
      // Mark the normalized URL as extracted to prevent re-extraction
      if (data?.url) {
        setLastExtractedUrl(data.url);
      }
    }
  };

  // Client-side metadata extraction (runs in browser, no bot detection)
  const extractMetadataClientSide = async (url: string) => {
    try {
      // Fetch HTML directly from browser
      const response = await fetch(url, {
        method: "GET",
        mode: "cors", // Try CORS first
        credentials: "omit",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      return parseMetadataFromHTML(html, url);
    } catch (error: any) {
      console.log("Client-side fetch failed (likely CORS):", error.message);
      return null;
    }
  };

  // Server-side metadata extraction (fallback when CORS blocks client-side)
  const extractMetadataServerSide = async (url: string) => {
    let localData: any = null;

    try {
      const localResponse = await fetch("/__extract-product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      localData = await localResponse.json();
      console.log("🧩 Local extractor response:", localData);
    } catch (error) {
      console.log("Local extractor unavailable, falling back to Supabase function:", error);
    }

    try {
      console.log(`🌐 Sending URL to server for extraction: ${url}`);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-23b9846d/extract-product`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ url }),
        }
      );

      const data = await response.json();
      
      console.log(`📦 Server response status: ${response.status}`);
      console.log(`📦 Server response data:`, data);

      if (!response.ok) {
        if (localData && (localData.name || localData.price || localData.imageUrl || localData.store)) {
          return localData;
        }

        // Handle expected errors gracefully - show in-page message
        if (response.status === 403 || data.error?.includes("403") || data.error?.includes("Forbidden") || data.error?.includes("blocking")) {
          console.warn(`🔒 Website blocking extraction: ${data.error}`);
          setExtractionMessage({ 
            type: 'warning', 
            text: '🔒 This website (iHerb, Amazon, etc.) blocks automated data extraction. Please manually fill in: 1) Copy product name from page, 2) Copy price, 3) Right-click product image → "Copy image address" and paste here.' 
          });
          // Return empty object to prevent further error messages
          return { extracted: false };
        } else if (response.status === 429 || data.error?.includes("429") || data.error?.includes("rate limit")) {
          console.warn(`⏱️ Rate limited: ${data.error}`);
          setExtractionMessage({ 
            type: 'warning', 
            text: '⏱️ Too many requests. Please wait a moment and try again.' 
          });
          return { extracted: false };
        } else {
          console.error(`⚠️ Extraction failed: ${data.error}`);
          setExtractionMessage({ 
            type: 'error', 
            text: `⚠️ Could not auto-fill from this URL. ${data.error || "Please enter product details manually."}` 
          });
          return { extracted: false };
        }
      }

      // If the Supabase Edge function acts as an HTML proxy, parse its content into metadata
      let serverParsedData = data;
      if (data && data.content && typeof data.content === 'string') {
        serverParsedData = parseMetadataFromHTML(data.content, url);
      }

      const mergedData = {
        ...(serverParsedData || {}),
        ...(localData || {}),
        name: localData?.name || serverParsedData?.name || null,
        imageUrl: localData?.imageUrl || serverParsedData?.imageUrl || null,
        price: localData?.price || serverParsedData?.price || null,
        store: localData?.store || serverParsedData?.store || null,
        url: localData?.url || serverParsedData?.url || url,
        warning: localData?.warning || serverParsedData?.warning,
      };

      let finalWarning = mergedData.warning;
      // Re-evaluate the warning based on the merged final data
      if (mergedData.name && mergedData.price && mergedData.imageUrl && mergedData.name !== mergedData.store) {
        // We successfully extracted all key fields, no warning needed
        finalWarning = undefined;
      } else if (mergedData.name && mergedData.price && !mergedData.imageUrl && mergedData.name !== mergedData.store) {
        // We got name and price, but missing the image
        finalWarning = "Extracted name and price. Please right-click product image on the site → \"Copy image address\" and paste.";
      }

      // Cleanup duplicate checkmarks
      if (finalWarning && finalWarning.startsWith("✅ ")) {
        finalWarning = finalWarning.substring(3);
      }
      
      mergedData.warning = finalWarning;

      // Handle warning field in successful response (e.g., iHerb with partial extraction)
      if (mergedData.warning) {
        console.log(`✅ Partial extraction with warning: ${mergedData.warning}`);
        setExtractionMessage({ 
          type: 'warning', 
          text: `✅ ${mergedData.warning}` 
        });
      } else {
        console.log(`✅ Successful extraction: name="${mergedData.name}", price=$${mergedData.price}, image=${mergedData.imageUrl ? 'yes' : 'no'}`);
      }

      return mergedData;
    } catch (error: any) {
      console.error("Server extraction network error:", error);
      if (localData && (localData.name || localData.price || localData.imageUrl || localData.store)) {
        return localData;
      }
      setExtractionMessage({ 
        type: 'error', 
        text: '❌ Network error. Please check your connection and try again, or enter details manually.' 
      });
      return { extracted: false };
    }
  };

  // Parse metadata from HTML (shared logic for client and server)
  const parseMetadataFromHTML = (html: string, url: string) => {
    const extractMeta = (property: string): string | null => {
      // Try Open Graph tags
      const ogRegex = new RegExp(`<meta\\s+property=["']${property}["']\\s+content=["']([^"']+)["']`, 'i');
      const ogMatch = html.match(ogRegex);
      if (ogMatch) return ogMatch[1];

      // Try name attribute
      const nameRegex = new RegExp(`<meta\\s+name=["']${property}["']\\s+content=["']([^"']+)["']`, 'i');
      const nameMatch = html.match(nameRegex);
      if (nameMatch) return nameMatch[1];

      // Try reversed order
      const reverseRegex = new RegExp(`<meta\\s+content=["']([^"']+)["']\\s+(?:property|name)=["']${property}["']`, 'i');
      const reverseMatch = html.match(reverseRegex);
      if (reverseMatch) return reverseMatch[1];

      return null;
    };

    const extractAttribute = (attribute: string): string | null => {
      const patterns = [
        new RegExp(`${attribute}=["']([^"']+)["']`, 'i'),
        new RegExp(`${attribute}=\\"([^\\"]+)\\"`, 'i'),
      ];

      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          return match[1]
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&#x27;/g, "'")
            .replace(/&#xAE;/g, "®")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">");
        }
      }

      return null;
    };

    // Extract JSON-LD structured data
    const extractJsonLd = (): any[] => {
      const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
      let match;
      const jsonLdObjects = [];

      while ((match = jsonLdRegex.exec(html)) !== null) {
        try {
          const data = JSON.parse(match[1]);
          jsonLdObjects.push(data);
        } catch (e) {
          // Invalid JSON, skip
        }
      }

      return jsonLdObjects;
    };

    const jsonLdObjects = extractJsonLd();
    const urlObj = new URL(url);

    // Extract product information
    let productName = extractAttribute("data-product-name") || extractMeta("og:title") || extractMeta("twitter:title") || extractMeta("title");
    let productImage = extractAttribute("data-product-primary-image-url") || extractMeta("og:image") || extractMeta("twitter:image");
    let productPrice = extractMeta("product:price:amount") || extractMeta("og:price:amount") || extractMeta("product:price");

    // Search for Product or Book schema in JSON-LD
    let productData = null;
    for (const obj of jsonLdObjects) {
      // Direct Product or Book type
      if (obj["@type"] === "Product" || obj["@type"] === "Book") {
        productData = obj;
        break;
      }
      // Product/Book in @graph array
      if (Array.isArray(obj["@graph"])) {
        const found = obj["@graph"].find((item: any) => 
          item["@type"] === "Product" || item["@type"] === "Book"
        );
        if (found) {
          productData = found;
          break;
        }
      }
    }

    // Enhanced price extraction from HTML
    if (!productPrice) {
      const pricePatterns = [
        // Common price patterns
        /data-numeric-discounted-price=["']([\d,]+\.?\d*)["']/i,
        /data-numeric-list-price=["']([\d,]+\.?\d*)["']/i,
        /data-discounted-price=["']\$?([\d,]+\.?\d*)["']/i,
        /data-list-price=["']\$?([\d,]+\.?\d*)["']/i,
        /"price"\s*:\s*"([\d,]+\.\d+)"/i, // Prefer exact string decimal
        /data-price=["']([\d,]+\.?\d*)["']/i,
        /<span[^>]*class="[^"]*price[^"]*"[^>]*>[\s\S]*?\$?([\d,]+\.?\d*)/i,
        // Book-specific patterns
        /price["']\s*:\s*["']?\$?([\d,]+\.?\d*)/i,
        /"priceCurrency"\s*:\s*"USD",\s*"price"\s*:\s*"?([\d,]+\.?\d*)/i,
        /"price"\s*:\s*"?([\d,]+\.?\d*)"?/i, // Fallback catching anything
        // AbeBooks specific
        /item-price["'][^>]*>[\s\S]*?\$?\s*([\d,]+\.?\d*)/i,
        /"item_price":\s*"([\d,]+\.?\d*)"/i,
        /class="[^"]*price[^"]*"[^>]*>\s*US\$\s*([\d,]+\.?\d*)/i,
      ];

      for (const pattern of pricePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          productPrice = match[1];
          console.log(`💰 Found price with pattern ${pattern}: ${match[1]}`);
          break;
        }
      }
    }

    // Enhance with JSON-LD data
    if (productData) {
      productName = productName || productData.name;
      productImage = productImage || productData.image?.[0] || productData.image;
      
      // Handle offers (Product schema)
      if (productData.offers) {
        const offer = Array.isArray(productData.offers) ? productData.offers[0] : productData.offers;
        productPrice = productPrice || offer.price || offer.lowPrice;
      }
    }

    // Extract site name
    let siteName = extractMeta("og:site_name") || urlObj.hostname.replace(/^www\./, "");

    // Clean up title
    if (productName) {
      // Remove generic prefixes
      productName = productName.replace(/^(buy now|buy)\s*\|\s*/i, "");
      
      if (siteName) {
        // Only remove the site name if it's at the end of the title (e.g., "Product Name | Amazon")
        productName = productName.replace(new RegExp(`\\s*[-|]\\s*${siteName}(?:\\.[a-z]+)?\\s*$`, "i"), "");
      }
    }

    // Parse price to number
    let priceNumber = null;
    if (productPrice) {
      const priceMatch = String(productPrice).match(/[\d,.]+/);
      if (priceMatch) {
        priceNumber = parseFloat(priceMatch[0].replace(/,/g, ""));
      }
    }

    // Make image URL absolute
    if (productImage && !productImage.startsWith("http")) {
      productImage = new URL(productImage, url).toString();
    }

    console.log("📊 Parsed metadata:", {
      name: productName,
      imageUrl: productImage,
      price: priceNumber,
      store: siteName,
      foundJsonLd: !!productData,
    });

    return {
      name: productName || null,
      imageUrl: productImage || null,
      price: priceNumber,
      store: siteName,
      url: url,
    };
  };

  // Extract store name from URL domain
  const extractStoreNameFromUrl = (urlObj: URL): string => {
    let domain = urlObj.hostname;
    
    // Remove www. prefix
    domain = domain.replace(/^www\./, '');
    
    // Remove common TLDs
    domain = domain.replace(/\.(com|net|org|co\.uk|co|io|ai|store|shop)$/i, '');
    
    // Handle special cases for multi-part domains (e.g., amazon.co.uk -> amazon)
    const parts = domain.split('.');
    const mainDomain = parts[0];
    
    // Format the domain name (capitalize first letter)
    const formattedName = mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
    
    return formattedName;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.url || !formData.price || !formData.store) {
      return;
    }

    onAdd({
      name: formData.name,
      url: formData.url,
      price: parseFloat(formData.price),
      imageUrl: formData.imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
      quantity: parseInt(formData.quantity) || 1,
      store: formData.store,
      notes: formData.notes,
    });

    // Reset form
    setFormData({
      name: "",
      url: "",
      price: "",
      imageUrl: "",
      quantity: "1",
      store: "",
      notes: "",
    });

    // Clear extraction message
    setExtractionMessage(null);

    onOpenChange(false);
  };

  const handleSaveForLaterClicked = (e: React.MouseEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.url || !formData.price || !formData.store) {
      alert("Please ensure all required fields are filled out.");
      return;
    }

    const payload = {
      name: formData.name,
      url: formData.url,
      price: parseFloat(formData.price),
      imageUrl: formData.imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
      quantity: parseInt(formData.quantity) || 1,
      store: formData.store,
      notes: formData.notes,
    };

    if (onSaveForLater) {
      onSaveForLater(payload);
    } else {
      // Fallback
      const savedItemsStr = localStorage.getItem('smartcart_saved_items');
      const savedItems = savedItemsStr ? JSON.parse(savedItemsStr) : [];
      const existingIndex = savedItems.findIndex((si: any) => si.url === payload.url);
      if (existingIndex < 0) {
        savedItems.push({ ...payload, id: Date.now().toString() });
        localStorage.setItem('smartcart_saved_items', JSON.stringify(savedItems));
        window.dispatchEvent(new Event('savedItemsUpdated'));
      }
    }

    setFormData({
      name: "",
      url: "",
      price: "",
      imageUrl: "",
      quantity: "1",
      store: "",
      notes: "",
    });
    setExtractionMessage(null);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl text-gray-900">Add Product</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="size-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Product URL *
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => {
                setFormData({ ...formData, url: e.target.value });
                setExtractionMessage(null); // Clear message when URL changes
              }}
              placeholder="https://example.com/product"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <button
              type="button"
              onClick={autoFillFromUrl}
              disabled={isExtracting || !formData.url}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Extracting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  <span>Auto-fill from URL</span>
                </>
              )}
            </button>
            
            {/* Extraction status message */}
            {extractionMessage && (
              <div className={`mt-2 p-3 rounded-lg text-sm ${
                extractionMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                extractionMessage.type === 'warning' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {extractionMessage.text}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Product Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Wireless Headphones"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                Price (USD) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="99.99"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Store Name *
            </label>
            <input
              type="text"
              value={formData.store}
              onChange={(e) => setFormData({ ...formData, store: e.target.value })}
              placeholder="e.g., Amazon, Best Buy, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Product Image URL
            </label>
            <input
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://example.com/image.jpg (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty for a default product image
            </p>
            {formData.imageUrl && (
              <div className="mt-2">
                <p className="text-xs text-gray-600 mb-1">Preview:</p>
                <img
                  src={formData.imageUrl}
                  alt="Preview"
                  className="size-20 object-cover rounded border border-gray-200"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400";
                  }}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              ref={notesRef}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any special instructions or preferences..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-3 pt-4 flex-col sm:flex-row">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveForLaterClicked}
              className="flex-1 px-4 py-2 border border-indigo-600 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors whitespace-nowrap"
            >
              Save for Later
            </button>
            <button
              ref={submitButtonRef}
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
            >
              Add to Cart
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
