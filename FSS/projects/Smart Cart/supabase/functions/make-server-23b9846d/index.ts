import { Hono } from "npm:hono@4";
import { parseHTML } from "npm:linkedom";
import { cors } from "npm:hono@4/cors";
import { logger } from "npm:hono@4/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();

// Create Supabase client for accessing the database
const getSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
};

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-23b9846d/health", (c) => {
  console.log("Health check called");
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Initialize seed data
app.post("/make-server-23b9846d/init-seed-data", async (c) => {
  try {
    const supabase = getSupabaseClient();
    
    // Check if seed data already exists
    const { data: existingUsers } = await supabase
      .from('kv_store_23b9846d')
      .select('*')
      .like('key', 'user:%')
      .limit(1);
    
    if (existingUsers && existingUsers.length > 0) {
      return c.json({ message: "Seed data already initialized" });
    }

    // Create seed users
    const seedUsers = [
      // Admin user
      {
        key: "user:admin-001",
        value: JSON.stringify({
          id: "admin-001",
          email: "admin@smartcart.com",
          password: "admin123",
          role: "admin",
          name: "Admin User",
          verified: true,
          createdAt: new Date().toISOString(),
        })
      },
      // Manager users
      {
        key: "user:manager-001",
        value: JSON.stringify({
          id: "manager-001",
          email: "manager1@smartcart.com",
          password: "manager123",
          role: "manager",
          name: "Sarah Johnson",
          verified: true,
          createdAt: new Date().toISOString(),
        })
      },
      {
        key: "user:manager-002",
        value: JSON.stringify({
          id: "manager-002",
          email: "manager2@smartcart.com",
          password: "manager123",
          role: "manager",
          name: "Michael Chen",
          verified: true,
          createdAt: new Date().toISOString(),
        })
      },
      // Customer users
      {
        key: "user:customer-001",
        value: JSON.stringify({
          id: "customer-001",
          email: "customer1@example.com",
          password: "customer123",
          role: "customer",
          name: "Alice Williams",
          phone: "+1234567890",
          verified: true,
          createdAt: new Date().toISOString(),
        })
      },
      {
        key: "user:customer-002",
        value: JSON.stringify({
          id: "customer-002",
          email: "customer2@example.com",
          password: "customer123",
          role: "customer",
          name: "Bob Martinez",
          phone: "+1234567891",
          verified: true,
          createdAt: new Date().toISOString(),
        })
      },
      {
        key: "user:customer-003",
        value: JSON.stringify({
          id: "customer-003",
          email: "customer3@example.com",
          password: "customer123",
          role: "customer",
          name: "Charlie Davis",
          phone: "+1234567892",
          verified: true,
          createdAt: new Date().toISOString(),
        })
      },
    ];

    // Insert all seed users
    const { error: usersError } = await supabase
      .from('kv_store_23b9846d')
      .insert(seedUsers);

    if (usersError) {
      console.error("Error inserting seed users:", usersError);
      return c.json({ error: "Failed to insert seed users" }, 500);
    }

    // Create initial assignments
    const assignments = [
      {
        key: "assignment:customer-001",
        value: JSON.stringify({
          customerId: "customer-001",
          managerId: "manager-001",
          assignedAt: new Date().toISOString(),
        })
      },
      {
        key: "assignment:customer-002",
        value: JSON.stringify({
          customerId: "customer-002",
          managerId: "manager-001",
          assignedAt: new Date().toISOString(),
        })
      },
      {
        key: "assignment:customer-003",
        value: JSON.stringify({
          customerId: "customer-003",
          managerId: "manager-002",
          assignedAt: new Date().toISOString(),
        })
      },
    ];

    const { error: assignError } = await supabase
      .from('kv_store_23b9846d')
      .insert(assignments);

    if (assignError) {
      console.error("Error inserting assignments:", assignError);
    }

    // Initialize settings
    const { error: settingsError } = await supabase
      .from('kv_store_23b9846d')
      .insert({
        key: "settings:system",
        value: JSON.stringify({
          autoAssignEnabled: false,
          autoAssignManagerIds: [],
        })
      });

    if (settingsError) {
      console.error("Error inserting settings:", settingsError);
    }

    return c.json({ message: "Seed data initialized successfully" });
  } catch (error) {
    console.error("Error initializing seed data:", error);
    return c.json({ error: `Failed to initialize seed data: ${error}` }, 500);
  }
});

// Login endpoint
app.post("/make-server-23b9846d/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    console.log(`Login attempt for: ${email}`);

    const supabase = getSupabaseClient();
    
    // Find user by email
    const { data: users } = await supabase
      .from('kv_store_23b9846d')
      .select('*')
      .like('key', 'user:%');

    if (!users || users.length === 0) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    // Parse users and find matching email
    const user = users
      .map(row => typeof row.value === 'string' ? JSON.parse(row.value) : row.value)
      .find(u => u.email === email);

    if (!user || user.password !== password) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    
    return c.json({ user: userWithoutPassword });
  } catch (error) {
    console.error("Login error:", error);
    return c.json({ error: `Login failed: ${error}` }, 500);
  }
});

// Get all users
app.get("/make-server-23b9846d/users", async (c) => {
  try {
    const supabase = getSupabaseClient();
    
    const { data: userRows } = await supabase
      .from('kv_store_23b9846d')
      .select('*')
      .like('key', 'user:%');

    const users = (userRows || [])
      .map(row => {
        const user = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

    return c.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return c.json({ error: `Failed to fetch users: ${error}` }, 500);
  }
});

// Get all assignments
app.get("/make-server-23b9846d/assignments", async (c) => {
  try {
    const supabase = getSupabaseClient();
    
    const { data: assignmentRows } = await supabase
      .from('kv_store_23b9846d')
      .select('*')
      .like('key', 'assignment:%');

    const assignments = (assignmentRows || []).map(row => typeof row.value === 'string' ? JSON.parse(row.value) : row.value);

    return c.json({ assignments });
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return c.json({ error: `Failed to fetch assignments: ${error}` }, 500);
  }
});

// Assign customer to manager
app.post("/make-server-23b9846d/assign-customer", async (c) => {
  try {
    const { customerId, managerId } = await c.req.json();
    
    const supabase = getSupabaseClient();
    
    // Check if assignment already exists
    const { data: existing } = await supabase
      .from('kv_store_23b9846d')
      .select('*')
      .eq('key', `assignment:${customerId}`)
      .single();

    const assignment = {
      customerId,
      managerId,
      assignedAt: new Date().toISOString(),
    };

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('kv_store_23b9846d')
        .update({ value: JSON.stringify(assignment) })
        .eq('key', `assignment:${customerId}`);

      if (error) {
        return c.json({ error: "Failed to update assignment" }, 500);
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('kv_store_23b9846d')
        .insert({
          key: `assignment:${customerId}`,
          value: JSON.stringify(assignment)
        });

      if (error) {
        return c.json({ error: "Failed to create assignment" }, 500);
      }
    }

    return c.json({ message: "Customer assigned successfully" });
  } catch (error) {
    console.error("Error assigning customer:", error);
    return c.json({ error: `Failed to assign customer: ${error}` }, 500);
  }
});

// Get settings
app.get("/make-server-23b9846d/settings", async (c) => {
  try {
    const supabase = getSupabaseClient();
    
    const { data } = await supabase
      .from('kv_store_23b9846d')
      .select('*')
      .eq('key', 'settings:system')
      .single();

    let parsedSettings = { autoAssignEnabled: false, autoAssignManagerIds: [] };
    if (data && data.value) {
      parsedSettings = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    }

    return c.json({ settings: parsedSettings });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return c.json({ settings: { autoAssignEnabled: false, autoAssignManagerIds: [] } });
  }
});

// Update settings
app.post("/make-server-23b9846d/settings", async (c) => {
  try {
    const settings = await c.req.json();
    
    const supabase = getSupabaseClient();
    
    // Check if settings exist
    const { data: existing } = await supabase
      .from('kv_store_23b9846d')
      .select('*')
      .eq('key', 'settings:system')
      .single();

    if (existing) {
      const { error } = await supabase
        .from('kv_store_23b9846d')
        .update({ value: JSON.stringify(settings) })
        .eq('key', 'settings:system');

      if (error) {
        return c.json({ error: "Failed to update settings" }, 500);
      }
    } else {
      const { error } = await supabase
        .from('kv_store_23b9846d')
        .insert({
          key: 'settings:system',
          value: JSON.stringify(settings)
        });

      if (error) {
        return c.json({ error: "Failed to create settings" }, 500);
      }
    }

    return c.json({ message: "Settings updated successfully" });
  } catch (error) {
    console.error("Error updating settings:", error);
    return c.json({ error: `Failed to update settings: ${error}` }, 500);
  }
});

// Custom Pages - Database Driven table (instead of KV)
app.get("/make-server-23b9846d/custom_pages", async (c) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('custom_pages').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return c.json({ pages: data });
  } catch (error) {
    console.error("Error fetching custom pages:", error);
    return c.json({ error: "Failed to fetch custom pages" }, 500);
  }
});

app.post("/make-server-23b9846d/custom_pages", async (c) => {
  try {
    const payload = await c.req.json();
    const supabase = getSupabaseClient();
    
    // Check if updating or inserting
    if (payload.id) {
       const { data, error } = await supabase.from('custom_pages')
         .update({ title: payload.title, slug: payload.slug, content: payload.content })
         .eq('id', payload.id)
         .select()
         .single();
       if (error) throw error;
       return c.json({ page: data });
    } else {
       const { data, error } = await supabase.from('custom_pages')
         .insert({ title: payload.title, slug: payload.slug, content: payload.content })
         .select()
         .single();
       if (error) throw error;
       return c.json({ page: data });
    }
  } catch (error) {
    console.error("Error saving custom page:", error);
    return c.json({ error: "Failed to save custom page" }, 500);
  }
});

app.delete("/make-server-23b9846d/custom_pages/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('custom_pages').delete().eq('id', id);
    if (error) throw error;
    return c.json({ message: "Page deleted successfully" });
  } catch (error) {
    console.error("Error deleting custom page:", error);
    return c.json({ error: "Failed to delete custom page" }, 500);
  }
});

const extractProductNameFromIherbUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    
    // iHerb URLs typically follow pattern: /pr/product-name-slug/12345
    const pathParts = urlObj.pathname.split('/');
    const productSlug = pathParts.find(part => part.includes('-') && part.length > 10);
    
    if (!productSlug) return null;
    
    // Convert slug to readable name with smart formatting
    const words = productSlug.split('-');
    const formattedWords = words.map((word, index) => {
      // Handle possessives (barlean-s -> Barlean's)
      if (word === 's' && index > 0) {
        return "'s";
      }
      
      // Handle numbers with units (16, oz, 454, g)
      if (/^\d+$/.test(word)) {
        return word; // Keep numbers as-is
      }
      
      // Handle unit abbreviations after numbers (oz, g, ml, mg, etc.)
      if (index > 0 && /^\d+$/.test(words[index - 1]) && /^(oz|g|mg|ml|lb|kg|fl)$/.test(word)) {
        return word; // Keep units lowercase
      }
      
      // Handle special terms that should have specific formatting
      if (word.match(/^omega$/i)) {
        return 'Omega'; // Next word might be -3, will be handled separately
      }
      
      // Handle numbers with hyphens (omega-3 -> Omega-3)
      if (/^\d+$/.test(word) && index > 0 && words[index - 1].match(/^omega$/i)) {
        return `-${word}`;
      }
      
      // Capitalize first letter of regular words
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
    
    // Join and clean up
    let name = formattedWords.join(' ')
      .replace(/\s+'s/g, "'s") // Fix possessives: "Barlean 's" -> "Barlean's"
      .replace(/\s+-/g, '-') // Fix hyphens: "Omega -3" -> "Omega-3"
      .replace(/\(\s+/g, '(') // Fix opening parentheses spacing
      .replace(/\s+\)/g, ')') // Fix closing parentheses spacing
      .replace(/\s+,/g, ','); // Fix comma spacing
    
    return name;
  } catch {
    return null;
  }
};
app.post("/make-server-23b9846d/extract-product", async (c) => {
  try {
    const { url } = await c.req.json();

    if (!url) {
      return c.json({ error: "URL is required" }, 400);
    }

    // Validate URL format
    let validUrl;
    try {
      validUrl = new URL(url);
    } catch {
      return c.json({ error: "Invalid URL format" }, 400);
    }

    // ALWAYS extract store name from domain
    const extractStoreNameFromUrl = (urlObj: URL): string => {
      let domain = urlObj.hostname;
      
      // Remove www. prefix
      domain = domain.replace(/^www\./, '');
      
      // Remove common TLDs
      domain = domain.replace(/\.(com|net|org|co\.uk|co|io|ai|store|shop)$/i, '');
      
      // Handle special cases for multi-part domains (e.g., amazon.co.uk -> amazon)
      const parts = domain.split('.');
      const mainDomain = parts[0];
      
      // Format the domain name (capitalize first letter, handle special cases)
      let formattedName = mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
      
      // Special formatting for known stores
      if (mainDomain.toLowerCase() === 'iherb') formattedName = 'iHerb';
      if (mainDomain.toLowerCase() === 'ebay') formattedName = 'eBay';
      if (mainDomain.toLowerCase() === 'etsy') formattedName = 'Etsy';
      
      return formattedName;
    };

    const storeName = extractStoreNameFromUrl(validUrl);
    console.log(`🏪 Extracted store name from URL: ${storeName}`);

    // Normalize eBay URLs - remove tracking parameters for cleaner extraction
    let fetchUrl = url;
    if (validUrl.hostname.includes('ebay.com')) {
      // Extract item ID from eBay URL (format: /itm/{item-id} or /itm/{title}/{item-id})
      const itemIdMatch = validUrl.pathname.match(/\/itm\/(?:[^\/]+\/)?(\d+)/);
      if (itemIdMatch && itemIdMatch[1]) {
        const itemId = itemIdMatch[1];
        // Create clean eBay URL without tracking parameters
        fetchUrl = `https://www.ebay.com/itm/${itemId}`;
        console.log(`📦 Normalized eBay URL from ${url} to ${fetchUrl}`);
      }
    }

    // Special handling for iHerb - prepare URL-based extraction as fallback
    let iherbProductName = null;
    if (validUrl.hostname.includes('iherb.com')) {
      const pathMatch = validUrl.pathname.match(/\/pr\/([^\/]+)\/(\d+)/);
      if (pathMatch && pathMatch[1]) {
        const slug = decodeURIComponent(pathMatch[1]);
        
        // Convert URL slug to proper product name
        iherbProductName = slug
          // First, preserve numeric compounds like "omega-3", "vitamin-d3"
          .replace(/(\w+)-(\d+)/g, '$1-$2')
          // Convert remaining dashes to spaces
          .replace(/-/g, ' ')
          // Fix possessives: "barlean s" → "barlean's"
          .replace(/\b(\w+)\s+s\b/gi, "$1's")
          // Capitalize each word
          .replace(/\b\w/g, l => l.toUpperCase())
          // Fix common patterns
          .replace(/\bOmega\s*3\b/gi, 'Omega-3')
          .replace(/\bVitamin\s*D(\d*)\b/gi, 'Vitamin D$1')
          .replace(/\bEpa\b/gi, 'EPA')
          .replace(/\bDha\b/gi, 'DHA')
          // Handle units: "16 Oz" → "16 oz", "454 G" → "454 g"
          .replace(/\b(\d+)\s+Oz\b/gi, '$1 oz')
          .replace(/\b(\d+)\s+G\b(?!\w)/gi, '$1 g')
          .replace(/\b(\d+)\s+Mg\b/gi, '$1 mg')
          .replace(/\b(\d+)\s+Ml\b/gi, '$1 ml')
          .replace(/\b(\d+)\s+Lb\b/gi, '$1 lb')
          .replace(/\b(\d+)\s+Kg\b/gi, '$1 kg')
          // Handle parentheses for weight conversions
          .replace(/\b(\d+\s+oz)\s+(\d+\s+g)\b/gi, '$1 ($2)')
          .replace(/\b(\d+\s+lb)\s+(\d+\s+kg)\b/gi, '$1 ($2)');
        
        console.log(`Prepared iHerb fallback name from URL: "${iherbProductName}"`);
      }
    }

    // Special handling for Walmart URLs - extract product name from URL path
    // Walmart URL format: /ip/{product-name}/{product-id}
    let walmartProductName = null;
    let walmartProductId = null;
    if (validUrl.hostname.includes('walmart.com')) {
      const pathMatch = validUrl.pathname.match(/\/ip\/([^\/]+)\/(\d+)/);
      if (pathMatch && pathMatch[1] && pathMatch[2]) {
        // Decode URL-encoded name and replace hyphens with spaces
        walmartProductName = decodeURIComponent(pathMatch[1]).replace(/-/g, ' ');
        walmartProductId = pathMatch[2];
        console.log(`Extracted from Walmart URL - Name: ${walmartProductName}, ID: ${walmartProductId}`);
      }
    }

    // Try Walmart API if we have a product ID
    if (walmartProductId) {
      try {
        console.log(`Attempting Walmart API fetch for product ID: ${walmartProductId}`);
        const walmartApiUrl = `https://www.walmart.com/terra-firma/item/${walmartProductId}`;
        const apiResponse = await fetch(walmartApiUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Accept": "application/json",
            "Referer": url,
          },
        });

        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          console.log(`Walmart API response received`);
          console.log(`API data structure:`, JSON.stringify(apiData).substring(0, 500));
          
          // Extract data from API response
          const product = apiData?.payload?.products?.[walmartProductId];
          if (product) {
            console.log(`Product found in API response`);
            console.log(`Product priceInfo:`, JSON.stringify(product?.priceInfo));
            
            // Try multiple paths for price extraction
            const price = 
              product?.priceInfo?.currentPrice?.price ||
              product?.priceInfo?.currentPrice?.priceString ||
              product?.priceMap?.price ||
              product?.price ||
              product?.currentPrice;
              
            const image = product?.imageInfo?.thumbnailUrl || product?.imageInfo?.allImages?.[0]?.url;
            const name = product?.name || walmartProductName;
            
            console.log(`Extracted from Walmart API - Name: ${name}, Price: ${price}, Image: ${image}`);
            
            return c.json({
              name: name,
              imageUrl: image || null,
              price: price ? parseFloat(String(price).replace(/[^0-9.]/g, '')) : null,
              store: 'walmart.com',
              description: product?.shortDescription || null,
              url: url,
            });
          }
        } else {
          console.log(`Walmart API returned ${apiResponse.status}, falling back to HTML parsing`);
        }
      } catch (apiError) {
        console.log(`Walmart API error: ${apiError.message}, falling back to HTML parsing`);
      }
    }

    // Fetch the URL with proper headers to avoid being blocked
    let response;
    let html = "";
    let nativeFetchFailed = false;

    try {
      response = await fetch(fetchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Connection": "keep-alive",
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "Cache-Control": "max-age=0",
          "DNT": "1",
          "Referer": validUrl.origin + "/",
        },
        redirect: "follow",
      });
      
      if (!response.ok) {
         nativeFetchFailed = true;
         console.log(`Website blocked request: ${url} (Status ${response.status})`);
      } else {
         html = await response.text();
         
         const captchaIndicators = [
            /robot or human/i,
            /please verify you are a human/i,
            /access to this page has been denied/i,
            /access denied/i,
            /datadome/i,
            /just a moment/i,
            /checking your browser/i,
            /attention required/i,
         ];
          
         for (const indicator of captchaIndicators) {
            if (indicator.test(html)) {
                console.log(`Bot detection page detected for: ${url}`);
                nativeFetchFailed = true;
                break;
            }
         }
      }
    } catch (fetchError) {
      console.log(`Network error accessing ${url}: ${fetchError.message}`);
      nativeFetchFailed = true;
    }

    if (nativeFetchFailed) {
       const browserlessToken = Deno.env.get('BROWSERLESS_TOKEN');
       if (browserlessToken) {
           console.log(`Native fetch failed or bot detected, trying Browserless fallback ...`);
           try {
               const bReq = await fetch(`https://chrome.browserless.io/content?token=${browserlessToken}&stealth=true`, {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({
                       url: fetchUrl,
                       gotoOptions: { waitUntil: 'domcontentloaded' }
                   })
               });
               if (bReq.ok) {
                   html = await bReq.text();
                   nativeFetchFailed = false; // Successfully acquired HTML
                   console.log(`Browserless fallback succeeded.`);
               } else {
                   console.log(`Browserless fallback failed with status ${bReq.status}`);
               }
           } catch (err) {
               console.log(`Browserless fallback error: ${err.message}`);
           }
       } else {
           console.log("No Browserless token configured, cannot fallback.");
       }
    }

    // Process ultimate failures if we still couldn't get HTML
    if (nativeFetchFailed) {
      // Provide helpful error message based on status code
      
      // For eBay, return normalized URL and store name
      if (validUrl.hostname.includes('ebay.com')) {
        const itemIdMatch = validUrl.pathname.match(/\/itm\/(?:[^\/]+\/)?(\d+)/);
        if (itemIdMatch && itemIdMatch[1]) {
          return c.json({ 
            name: null, imageUrl: null, price: null, store: 'eBay', description: null, url: fetchUrl,
            warning: `✅ eBay URL saved. eBay blocked automated extraction. Please visit the page and manually enter: product name, price, and image address.`
          });
        }
      }
      
      // For iHerb, return extracted product name from URL
      if (typeof iherbProductName !== "undefined" && iherbProductName) {
        return c.json({ 
          name: iherbProductName, imageUrl: null, price: null, store: 'iHerb', description: null, url: url,
          warning: 'Product name extracted from URL. iHerb blocked automated request. Please manually enter the price and image URL.'
        });
      }
      
      const statusText = response && response.status === 403 ? "403 Forbidden" : (response?.status || 400);
      return c.json({ error: `Website is blocking automated requests (${statusText}). Please manually enter product details.`, statusCode: response?.status || 400 }, 400);
    }


    // Parse HTML into DOM for more reliable extraction
    const { document } = parseHTML(html);
    console.log('DOM parsed successfully');

    // Check if we got a CAPTCHA or bot detection page
    const captchaIndicators = [
      /robot or human/i,
      /please verify you are a human/i,
      /access to this page has been denied/i,
      /access denied/i,
      /datadome/i,
      /just a moment/i,
      /checking your browser/i,
      /attention required/i,
    ];

    for (const indicator of captchaIndicators) {
      if (indicator.test(html)) {
        console.log(`Bot detection page detected for: ${url}`);
        
        // If we have eBay URL, provide item ID for manual entry
        if (validUrl.hostname.includes('ebay.com')) {
          const itemIdMatch = validUrl.pathname.match(/\/itm\/(?:[^\/]+\/)?(\d+)/);
          if (itemIdMatch && itemIdMatch[1]) {
            console.log(`eBay bot detection - returning item ID: ${itemIdMatch[1]}`);
            return c.json({ 
              name: null,
              imageUrl: null,
              price: null,
              store: 'eBay',
              description: null,
              url: fetchUrl,
              warning: `✅ eBay URL saved (item #${itemIdMatch[1]}). eBay blocked automated extraction. Please visit the page and manually enter: product name, price, and right-click image → "Copy image address" to paste here.`
            });
          }
        }
        
        // If we have Walmart product name from URL, return it with partial data
        if (walmartProductName) {
          console.log(`Returning Walmart product name from URL despite bot detection`);
          return c.json({ 
            name: walmartProductName,
            imageUrl: null,
            price: null,
            store: 'walmart.com',
            description: null,
            url: url,
            warning: 'Product name extracted from URL. Please verify price and other details.'
          });
        }
        
        // For all other sites, return partial data with the URL and store name
        const storeName = validUrl.hostname.replace(/^www\./, '').split('.')[0];
        const formattedStoreName = storeName.charAt(0).toUpperCase() + storeName.slice(1);
        
        console.log(`Returning partial data for ${formattedStoreName} despite bot detection`);
        return c.json({ 
          name: null,
          imageUrl: null,
          price: null,
          store: formattedStoreName,
          description: null,
          url: url,
          warning: `✅ URL saved. Website blocked automated extraction. Please manually fill in: 1) Product name, 2) Price, 3) Right-click product image → "Copy image address" and paste.`
        });
      }
    }

    // Extract metadata using regex (for Open Graph, meta tags, and JSON-LD)
    const extractMeta = (property: string): string | null => {
      // Try Open Graph tags
      const ogRegex = new RegExp(`<meta\\s+property=["']${property}["']\\s+content=["']([^"']+)["']`, 'i');
      const ogMatch = html.match(ogRegex);
      if (ogMatch) return ogMatch[1];

      // Try name attribute
      const nameRegex = new RegExp(`<meta\\s+name=["']${property}["']\\s+content=["']([^"']+)["']`, 'i');
      const nameMatch = html.match(nameRegex);
      if (nameMatch) return nameMatch[1];

      // Try reversed order (content before property/name)
      const reverseRegex = new RegExp(`<meta\\s+content=["']([^"']+)["']\\s+(?:property|name)=["']${property}["']`, 'i');
      const reverseMatch = html.match(reverseRegex);
      if (reverseMatch) return reverseMatch[1];

      return null;
    };

    // Extract JSON-LD structured data for product info
    const extractJsonLd = (): any => {
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

      // Find Product or Book schema
      for (const obj of jsonLdObjects) {
        if (obj["@type"] === "Product" || obj["@type"] === "Book" || (Array.isArray(obj["@graph"]) && obj["@graph"].some((item: any) => item["@type"] === "Product" || item["@type"] === "Book"))) {
          return obj;
        }
      }

      return null;
    };

    const jsonLd = extractJsonLd();

    // Extract product information
    let productName = extractMeta("og:title") || extractMeta("twitter:title") || extractMeta("title");
    let productImage = extractMeta("og:image") || extractMeta("twitter:image");
    let productPrice = extractMeta("product:price:amount") || extractMeta("og:price:amount");
    let productDescription = extractMeta("og:description") || extractMeta("description");

    // Special handling for Amazon images
    if (validUrl.hostname.includes("amazon.")) {
      // Look for high-res Amazon product images
      const amazonImagePatterns = [
        /"large":"(https:\/\/[^"]+\.jpg)"/i,
        /"hiRes":"(https:\/\/[^"]+\.jpg)"/i,
        /data-old-hires=["'](https:\/\/[^"']+)["']/i,
        /data-a-dynamic-image=["']({[^}]+})["']/i,
      ];

      for (const pattern of amazonImagePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          if (pattern.toString().includes("dynamic-image")) {
            // Parse the JSON object to get the first image
            try {
              const images = JSON.parse(match[1]);
              const firstImage = Object.keys(images)[0];
              if (firstImage) {
                productImage = firstImage;
                break;
              }
            } catch (e) {
              // Continue to next pattern
            }
          } else {
            productImage = match[1];
            break;
          }
        }
      }

      // Special handling for Amazon prices to bypass zip codes
      const azPriceElements = document.querySelectorAll('.a-price .a-offscreen, #corePriceDisplay_desktop_feature_div .a-price .a-offscreen, #priceblock_ourprice');
      for (const azPrice of Array.from(azPriceElements) as any[]) {
        if (azPrice && azPrice.textContent) {
          const text = azPrice.textContent.trim();
          const match = text.match(/[\d,]+\.\d{2}/);
          if (match) {
            productPrice = match[0].replace(/,/g, '');
            console.log(`Extracted Amazon price via Server DOM parsing: $${productPrice}`);
            break;
          }
        }
      }
    }

    // Special handling for iHerb
    if (validUrl.hostname.includes("iherb.com")) {
      console.log('Detected iHerb URL, applying special extraction logic');
      
      // Extract product name from <title> tag (most reliable for iHerb)
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        // Decode HTML entities: &#x27; = ', &#xAE; = ®, &#x2B; = +, etc.
        const decodedTitle = titleMatch[1]
          .replace(/&#x27;/g, "'")
          .replace(/&#xAE;/g, "®")
          .replace(/&#x2B;/g, "+")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .trim();
        
        productName = decodedTitle;
        console.log(`Extracted product name from iHerb title tag: ${productName}`);
      }
      
      // Extract price from iHerb-specific patterns
      const iherbPricePatterns = [
        // Most reliable: numeric data attributes
        /data-numeric-discounted-price=["']([0-9.]+)["']/i,
        /data-numeric-list-price=["']([0-9.]+)["']/i,
        // String data attributes
        /data-discount-price=["']\$([0-9.]+)["']/i,
        /data-list-price=["']\$([0-9.]+)["']/i,
        // HTML elements
        /<span class=["']discount-price["']>\$([0-9.]+)<\/span>/i,
        /<b class=["']discount-price["']>\$([0-9.]+)<\/b>/i,
        /<span class=["']list-price["']>\$([0-9.]+)<\/span>/i,
        // JSON in data attributes
        /"DiscountPriceDecimal":([0-9.]+)/i,
        /"discountPrice":"?\$?([0-9.]+)"?/i,
        /"listPrice":"?\$?([0-9.]+)"?/i,
      ];
      
      for (const pattern of iherbPricePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          const testPrice = parseFloat(match[1]);
          if (testPrice > 0 && testPrice < 1000000) {
            productPrice = match[1];
            console.log(`Extracted iHerb price: $${productPrice} using pattern: ${pattern}`);
            break;
          }
        }
      }
      
      // Extract image from iHerb-specific patterns
      const iherbImagePatterns = [
        // Data attributes (most reliable)
        /data-image-url=["']([^"']+cloudinary\.images-iherb\.com[^"']+)["']/i,
        // Meta tags
        /<meta property=["']og:image["'] content=["']([^"']+cloudinary\.images-iherb\.com[^"']+)["']/i,
        /<meta content=["']([^"']+cloudinary\.images-iherb\.com[^"']+)["'] property=["']og:image["']/i,
        // JSON data
        /"imageUrl":"([^"]+cloudinary\.images-iherb\.com[^"]+)"/i,
        /"image":"([^"]+cloudinary\.images-iherb\.com[^"]+)"/i,
      ];
      
      for (const pattern of iherbImagePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          productImage = match[1];
          console.log(`Extracted iHerb image: ${productImage}`);
          break;
        }
      }
      
      // If we got iHerb data, we can skip the generic extraction
      if (productName && productPrice && productImage) {
        console.log('iHerb extraction successful, returning data');
        
        const priceNumber = parseFloat(String(productPrice).replace(/[^0-9.]/g, ''));
        
        return c.json({
          name: productName,
          imageUrl: productImage,
          price: priceNumber,
          store: 'iHerb',
          description: null,
          url: url,
        });
      }
    }

    // Special handling for eBay
    if (validUrl.hostname.includes("ebay.com")) {
      console.log('Detected eBay URL, applying special extraction logic');
      
      // eBay-specific title extraction
      const ebayTitlePatterns = [
        // Title tag (most reliable)
        /<title>([^|<]+)(?:\||<)/i,
        // Meta tags
        /<meta property=[\"']og:title[\"'] content=[\"']([^\"']+)[\"']/i,
        /<meta content=[\"']([^\"']+)[\"'] property=[\"']og:title[\"']/i,
        // Heading
        /<h1[^>]*class=[\"'][^\"']*product[^\"']*title[^\"']*[\"'][^>]*>([^<]+)</i,
        /<h1[^>]*>([^<]+)</i,
      ];
      
      for (const pattern of ebayTitlePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          const title = match[1].trim();
          // Clean up eBay suffix (e.g., " | eBay")
          productName = title.replace(/\s*\|\s*eBay\s*$/i, '').trim();
          console.log(`Extracted eBay title: ${productName}`);
          break;
        }
      }
      
      // eBay-specific price patterns
      const ebayPricePatterns = [
        // JSON-LD or structured data
        /"price":"([0-9.]+)"/i,
        /"value":"([0-9.]+)"/i,
        // Data attributes
        /data-price=["']([0-9.]+)["']/i,
        /data-currentprice=["']([0-9.]+)["']/i,
        // Class-based
        /<span[^>]*class=["'][^"']*price[^"']*["'][^>]*>[\s\S]*?\$?([0-9,]+\.?[0-9]*)[\s\S]*?<\/span>/i,
        /<div[^>]*class=["'][^"']*price[^"']*["'][^>]*>[\s\S]*?\$?([0-9,]+\.?[0-9]*)[\s\S]*?<\/div>/i,
        // Itemprop
        /<span[^>]*itemprop=["']price["'][^>]*>[\s\S]*?\$?([0-9,]+\.?[0-9]*)/i,
        /<meta[^>]*itemprop=["']price["'][^>]*content=["']([0-9.]+)["']/i,
      ];
      
      for (const pattern of ebayPricePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          const testPrice = parseFloat(match[1].replace(/,/g, ""));
          if (testPrice > 0 && testPrice < 10000000) {
            productPrice = match[1];
            console.log(`Extracted eBay price: $${productPrice}`);
            break;
          }
        }
      }
      
      // eBay-specific image patterns
      const ebayImagePatterns = [
        // High-resolution image in meta tags
        /<meta property=["']og:image["'] content=["']([^"']+)["']/i,
        /<meta content=["']([^"']+)["'] property=["']og:image["']/i,
        // Image in JSON-LD
        /"image":"([^"]+)"/i,
        /"imageUrl":"([^"]+)"/i,
        // Main product image
        /<img[^>]*id=["']icImg["'][^>]*src=["']([^"']+)["']/i,
        /<img[^>]*class=["'][^"']*mainimage[^"']*["'][^>]*src=["']([^"']+)["']/i,
      ];
      
      for (const pattern of ebayImagePatterns) {
        const match = html.match(pattern);
        if (match && match[1] && !match[1].includes('data:image')) {
          productImage = match[1];
          console.log(`Extracted eBay image: ${productImage}`);
          break;
        }
      }
    }

    // Try more price patterns
    if (!productPrice) {
      productPrice = 
        extractMeta("product:price") ||
        extractMeta("price") ||
        extractMeta("product_price") ||
        extractMeta("twitter:data1") || // Sometimes used for price
        extractMeta("twitter:label1");
    }

    // Enhance with JSON-LD data if available
    if (jsonLd) {
      if (jsonLd["@type"] === "Product" || jsonLd["@type"] === "Book") {
        productName = productName || jsonLd.name;
        productImage = productImage || jsonLd.image?.[0] || jsonLd.image;
        
        if (jsonLd.offers) {
          const offer = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers;
          productPrice = productPrice || offer.price || offer.lowPrice || offer.highPrice;
        }
      } else if (jsonLd["@graph"]) {
        const product = jsonLd["@graph"].find((item: any) => item["@type"] === "Product" || item["@type"] === "Book");
        if (product) {
          productName = productName || product.name;
          productImage = productImage || product.image?.[0] || product.image;
          
          if (product.offers) {
            const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
            productPrice = productPrice || offer.price || offer.lowPrice || offer.highPrice;
          }
        }
      }
    }

    // If still no price found, try to extract from title/heading tags
    if (!productPrice) {
      // Look for common price patterns in the HTML
      const pricePatterns = [
        /["']price["']\s*:\s*["']?([\d,]+\.?\d*)/i,
        /data-price=["']([\d,]+\.?\d*)["']/i,
        /"price":\s*"?([\d,]+\.?\d*)"?/i,
        /<span[^>]*class="[^"]*price[^"]*"[^>]*>[\s\S]*?\$?([\d,]+\.?\d*)/i,
      ];

      for (const pattern of pricePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          productPrice = match[1];
          break;
        }
      }
    }

    // FALLBACK: If no name found, try extracting from description or title tag
    if (!productName && productDescription) {
      // For book sites, use the full description as the product name if it's descriptive
      // (e.g., "The Hobbit, First Edition, 1st Printing")
      if (productDescription.length < 200) {
        productName = productDescription.trim();
        console.log(`Extracted name from description: ${productName}`);
      } else {
        // If description is too long, try to extract just the title part
        const titleMatch = productDescription.match(/^([^-]+?)(?:\s*-\\s*|\s+by\s+)/i);
        if (titleMatch) {
          productName = titleMatch[1].trim();
          console.log(`Extracted name from description (title part): ${productName}`);
        }
      }
    }

    // FALLBACK: Extract from <title> tag if still no name
    if (!productName) {
      const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleTagMatch) {
        productName = titleTagMatch[1].trim();
        console.log(`Extracted name from title tag: ${productName}`);
      }
    }

    // FALLBACK: For Walmart, use the product name from URL if we still don't have a name
    if (!productName && walmartProductName) {
      productName = walmartProductName;
      console.log(`Using Walmart product name from URL as final fallback: ${productName}`);
    }

    // FALLBACK: Try to find price in HTML with aggressive patterns
    if (!productPrice) {
      const abebooksPatterns = [
        // AbeBooks specific patterns - id and data-test-id
        /id=[\"']book-price[\"'][^>]*>[\\s\\S]*?US\\$\\s*([\\d,]+\\.?\\d*)/i,
        /data-test-id=[\"']item-price[\"'][^>]*>[\\s\\S]*?US\\$\\s*([\\d,]+\\.?\\d*)/i,
        /class=[\"']buybox-price[\"'][^>]*>[\\s\\S]*?US\\$\\s*([\\d,]+\\.?\\d*)/i,
        // Other patterns
        /item-price[\"'][^>]*>[\\s\\S]*?US\\$\\s*([\\d,]+\\.?\\d*)/i,
        /price[\"'][^>]*>[\\s\\S]*?\\$\\s*([\\d,]+\\.?\\d*)/i,
        /<strong[^>]*>[\\s\\S]*?US\\$\\s*([\\d,]+\\.?\\d*)/i,
        // Generic patterns
        /US\\$\\s*([\\d,]+\\.?\\d*)/i,
        /USD\\s*([\\d,]+\\.?\\d*)/i,
        /\\$\\s*([\\d,]+\\.?\\d*)/i,
      ];

      for (const pattern of abebooksPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          const testPrice = parseFloat(match[1].replace(/,/g, ""));
          // Sanity check: price should be reasonable (between $0.01 and $1,000,000)
          if (testPrice > 0 && testPrice < 1000000) {
            productPrice = match[1];
            console.log(`Extracted price with pattern ${pattern}: ${productPrice}`);
            break;
          }
        }
      }
    }

    // DOM-BASED: Try DOM selectors for price if still not found
    if (!productPrice) {
      console.log('Trying DOM-based price extraction');
      const priceSelectors = [
        '[data-test-id*="price"]',
        '[id*="price"]',
        '[class*="price"]',
        '[itemprop="price"]',
        '.product-price',
        '#product-price',
        '.price',
        '[data-price]',
        'span.sales', // Hoka and similar sites
        '.prices .sales', // Hoka specific
        '[data-product-price]', // Hoka product tiles
      ];

      for (const selector of priceSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            const text = el.textContent?.trim() || '';
            // Also check data-product-price attribute
            const dataPrice = el.getAttribute?.('data-product-price');
            
            if (dataPrice) {
              const testPrice = parseFloat(dataPrice.replace(/,/g, ""));
              if (testPrice > 0 && testPrice < 1000000) {
                productPrice = dataPrice;
                console.log(`Extracted price from data attribute: ${productPrice}`);
                break;
              }
            }
            
            const priceMatch = text.match(/\$?\s*([\d,]+\.?\d*)/);
            if (priceMatch && priceMatch[1]) {
              const testPrice = parseFloat(priceMatch[1].replace(/,/g, ""));
              if (testPrice > 0 && testPrice < 1000000) {
                productPrice = priceMatch[1];
                console.log(`Extracted price with DOM selector ${selector}: ${productPrice}`);
                break;
              }
            }
          }
          if (productPrice) break;
        } catch (e) {
          // Continue to next selector
        }
      }
    }

    // FALLBACK: Try to find image in HTML
    if (!productImage) {
      const imagePatterns = [
        // AbeBooks specific patterns - <a> tag with full-size image
        /<a[^>]+data-test-id=[\"']book-cover-image[\"'][^>]+href=[\"']([^\"']+)[\"']/i,
        /<a[^>]+href=[\"']([^\"']+)[\"'][^>]+data-test-id=[\"']book-cover-image[\"']/i,
        // AbeBooks img tags
        /<img[^>]+id=[\"']?img\d+[\"']?[^>]+src=[\"']([^\"']+)[\"']/i,
        /<img[^>]+id=[\"']?book-image[\"']?[^>]+src=[\"']([^\"']+)[\"']/i,
        /<img[^>]+src=[\"']([^\"']+)[\"'][^>]+id=[\"']?book-image[\"']?/i,
        /<img[^>]+data-test-id=[\"']product-image[\"'][^>]+src=[\"']([^\"']+)[\"']/i,
        /<img[^>]+src=[\"']([^\"']+)[\"'][^>]+data-test-id=[\"']product-image[\"']/i,
        // Common product image patterns
        /<img[^>]+class=[\"'][^\"']*product[^\"']*[\"'][^>]+src=[\"']([^\"']+)[\"']/i,
        /<img[^>]+src=[\"']([^\"']+)[\"'][^>]+class=[\"'][^\"']*product[^\"']*[\"']/i,
        // Generic img tags with book/item in class or id
        /<img[^>]+class=[\"'][^\"']*(?:book|item|gallery)[^\"']*[\"'][^>]+src=[\"']([^\"']+)[\"']/i,
        /<img[^>]+src=[\"']([^\"']+)[\"'][^>]+class=[\"'][^\"']*(?:book|item|gallery)[^\"']*[\"']/i,
      ];

      for (const pattern of imagePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          // Skip placeholder, data URIs, and tiny tracking pixels
          if (!match[1].includes('data:image') && 
              !match[1].includes('placeholder') && 
              !match[1].includes('1x1') &&
              !match[1].includes('tracking')) {
            productImage = match[1];
            console.log(`Extracted image with pattern: ${productImage}`);
            break;
          }
        }
      }
    }

    // Clean up title (remove site name suffix if present)
    if (productName && storeName) {
      productName = productName.replace(new RegExp(`\\s*[-|]\\s*${storeName}.*$`, "i"), "");
    }

    // Parse price to number
    let priceNumber = null;
    if (productPrice) {
      // Remove currency symbols and parse
      const priceMatch = String(productPrice).match(/[\d,.]+/);
      if (priceMatch) {
        priceNumber = parseFloat(priceMatch[0].replace(/,/g, ""));
      }
    }

    // Make image URL absolute if it's relative
    if (productImage && !productImage.startsWith("http")) {
      productImage = new URL(productImage, url).toString();
    }

    // Identify hidden bot/WAF challenge pages (e.g. Fanatics/store.nba.com)
    const isBotTitle = productName && (
      productName.toLowerCase() === validUrl.hostname.toLowerCase() || 
      productName.toLowerCase() === storeName.toLowerCase() || 
      productName.toLowerCase() === validUrl.hostname.replace(/^www\./, '').toLowerCase() ||
      productName.toLowerCase().includes('http error') ||
      productName.toLowerCase().includes('access denied') ||
      productName.toLowerCase().includes('just a moment')
    );

    if (isBotTitle && !productPrice && !productImage) {
      console.log(`Hidden bot challenge page detected from title: ${productName}`);
      return c.json({
        name: null,
        imageUrl: null,
        price: null,
        store: storeName.charAt(0).toUpperCase() + storeName.slice(1),
        description: null,
        url: fetchUrl,
        warning: `✅ URL saved. Website blocked automated extraction. Please manually fill in: 1) Product name, 2) Price, 3) Right-click product image → "Copy image address" and paste.`
      });
    }

    const result = {
      name: productName || null,
      imageUrl: productImage || null,
      price: priceNumber,
      store: storeName, // Always use domain-based store name
      description: productDescription || null,
      url: fetchUrl, // Use normalized URL (strips tracking params for eBay, etc.)
    };

    console.log("Extracted metadata:", result);

    return c.json(result);
  } catch (error) {
    console.error("Error extracting product metadata:", error);
    return c.json({ error: `Failed to extract metadata: ${error.message}` }, 500);
  }
});

// Image proxy endpoint to handle CORS and referrer restrictions
app.get("/make-server-23b9846d/proxy-image", async (c) => {
  try {
    const imageUrl = c.req.query("url");

    if (!imageUrl) {
      return c.json({ error: "Image URL is required" }, 400);
    }

    console.log(`Proxying image: ${imageUrl}`);

    // Fetch the image
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Referer": new URL(imageUrl).origin,
      },
    });

    if (!response.ok) {
      return c.json({ error: `Failed to fetch image: ${response.statusText}` }, 400);
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    return new Response(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error proxying image:", error);
    return c.json({ error: `Failed to proxy image: ${error.message}` }, 500);
  }
});

// Send message (customers to managers, managers to customers, admins to anyone)
app.post("/make-server-23b9846d/send-message", async (c) => {
  try {
    const { fromUserId, toUserId, subject, body } = await c.req.json();

    if (!fromUserId || !toUserId || !subject || !body) {
      return c.json({ error: "All fields are required" }, 400);
    }

    // Verify users exist
    const fromUser = await kv.get(`user:${fromUserId}`);
    const toUser = await kv.get(`user:${toUserId}`);

    if (!fromUser || !toUser) {
      return c.json({ error: "Invalid user ID" }, 400);
    }

    // Create message
    const messageId = `message-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const message = {
      id: messageId,
      fromUserId,
      fromUserName: fromUser.name,
      fromUserEmail: fromUser.email,
      toUserId,
      toUserName: toUser.name,
      toUserEmail: toUser.email,
      subject,
      body,
      sentAt: new Date().toISOString(),
      read: false,
    };

    await kv.set(`message:${messageId}`, message);

    // Send copy to all admins
    const allUsers = await kv.getByPrefix("user:");
    const admins = allUsers.filter((u: any) => u.role === 'admin' && u.id !== fromUserId);
    
    for (const admin of admins) {
      const copyId = `message-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const adminCopy = {
        ...message,
        id: copyId,
        toUserId: admin.id,
        toUserName: admin.name,
        toUserEmail: admin.email,
        isAdminCopy: true,
        originalToUser: toUser.name,
      };
      await kv.set(`message:${copyId}`, adminCopy);
    }

    console.log(`Message sent from ${fromUser.email} to ${toUser.email}, copies sent to ${admins.length} admins`);

    return c.json({ 
      message: "Message sent successfully",
      messageId 
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return c.json({ error: `Failed to send message: ${error.message}` }, 500);
  }
});

// Get messages for a user
app.get("/make-server-23b9846d/messages/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    
    if (!userId) {
      return c.json({ error: "User ID is required" }, 400);
    }

    // Get all messages
    const allMessages = await kv.getByPrefix("message:");
    
    // Filter messages for this user (sent or received)
    const userMessages = allMessages.filter((msg: any) => 
      msg.toUserId === userId || msg.fromUserId === userId
    );

    // Sort by date (newest first)
    userMessages.sort((a: any, b: any) => 
      new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    );

    return c.json({ messages: userMessages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return c.json({ error: `Failed to fetch messages: ${error.message}` }, 500);
  }
});

// Mark message as read
app.post("/make-server-23b9846d/mark-message-read", async (c) => {
  try {
    const { messageId } = await c.req.json();

    if (!messageId) {
      return c.json({ error: "Message ID is required" }, 400);
    }

    const message = await kv.get(`message:${messageId}`);
    
    if (!message) {
      return c.json({ error: "Message not found" }, 400);
    }

    message.read = true;
    await kv.set(`message:${messageId}`, message);

    return c.json({ message: "Message marked as read" });
  } catch (error) {
    console.error("Error marking message as read:", error);
    return c.json({ error: `Failed to mark message as read: ${error.message}` }, 500);
  }
});

Deno.serve(app.fetch);


console.log("Starting make-server-23b9846d Edge Function...");
Deno.serve(app.fetch);
