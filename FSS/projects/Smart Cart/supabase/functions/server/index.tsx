import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { parseHTML } from "npm:linkedom";

const app = new Hono();

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
  return c.json({ status: "ok" });
});

// Initialize seed data
app.post("/make-server-23b9846d/init-seed-data", async (c) => {
  try {
    // Check if seed data already exists
    const existingUsers = await kv.getByPrefix("user:");
    if (existingUsers.length > 0) {
      return c.json({ message: "Seed data already initialized", users: existingUsers });
    }

    // Create seed users
    const seedUsers = [
      // Admin user
      {
        id: "admin-001",
        email: "admin@smartcart.com",
        password: "admin123", // In production, this would be hashed
        role: "admin",
        name: "Admin User",
        verified: true,
        createdAt: new Date().toISOString(),
      },
      // Manager users
      {
        id: "manager-001",
        email: "manager1@smartcart.com",
        password: "manager123",
        role: "manager",
        name: "Sarah Johnson",
        verified: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: "manager-002",
        email: "manager2@smartcart.com",
        password: "manager123",
        role: "manager",
        name: "Michael Chen",
        verified: true,
        createdAt: new Date().toISOString(),
      },
      // Customer users
      {
        id: "customer-001",
        email: "customer1@example.com",
        password: "customer123",
        role: "customer",
        name: "Alice Williams",
        verified: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: "customer-002",
        email: "customer2@example.com",
        password: "customer123",
        role: "customer",
        name: "Bob Martinez",
        verified: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: "customer-003",
        email: "customer3@example.com",
        password: "customer123",
        role: "customer",
        name: "Charlie Davis",
        verified: true,
        createdAt: new Date().toISOString(),
      },
    ];

    // Store users
    const userKeys = seedUsers.map(user => `user:${user.id}`);
    await kv.mset(userKeys, seedUsers);

    // Create initial customer-manager assignments
    await kv.set("assignment:customer-001", { customerId: "customer-001", managerId: "manager-001", assignedAt: new Date().toISOString() });
    await kv.set("assignment:customer-002", { customerId: "customer-002", managerId: "manager-001", assignedAt: new Date().toISOString() });
    await kv.set("assignment:customer-003", { customerId: "customer-003", managerId: "manager-002", assignedAt: new Date().toISOString() });

    // Initialize system settings
    await kv.set("settings:system", {
      autoAssignEnabled: false,
      autoAssignManagerIds: [], // Changed from defaultManagerId to array
    });

    // Initialize default order statuses
    await kv.set("settings:orderStatuses", [
      "Order placed by customer",
      "Pending Payment",
      "Payment Received",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled"
    ]);

    console.log("Seed data initialized successfully");

    return c.json({ 
      message: "Seed data initialized successfully", 
      users: seedUsers.map(u => ({ id: u.id, email: u.email, role: u.role, name: u.name }))
    });
  } catch (error) {
    console.error("Error initializing seed data:", error);
    return c.json({ error: `Failed to initialize seed data: ${error.message}` }, 500);
  }
});

// Login endpoint
app.post("/make-server-23b9846d/login", async (c) => {
  try {
    const { email, password } = await c.req.json();

    // Get all users
    const usersData = await kv.getByPrefix("user:");
    const users = usersData || [];

    // Find user by email
    const user = users.find((u: any) => u.email === email);

    if (!user) {
      console.log(`Login failed: User not found for email ${email}`);
      return c.json({ error: "Invalid email or password" }, 401);
    }

    // Verify password (in production, use proper hashing)
    if (user.password !== password) {
      console.log(`Login failed: Invalid password for email ${email}`);
      return c.json({ error: "Invalid email or password" }, 401);
    }

    // Check if user is verified
    if (!user.verified) {
      console.log(`Login failed: User not verified for email ${email}`);
      return c.json({ error: "Please verify your email or phone number first" }, 401);
    }

    console.log(`User logged in successfully: ${email}`);

    // Return user info (exclude password)
    const { password: _, ...userWithoutPassword } = user;
    return c.json({ user: userWithoutPassword });
  } catch (error) {
    console.error("Login error:", error);
    return c.json({ error: `Login failed: ${error.message}` }, 500);
  }
});

// Send verification code
app.post("/make-server-23b9846d/send-verification", async (c) => {
  try {
    const { email, phone, method } = await c.req.json();

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store verification code (expires in 10 minutes)
    const verificationKey = method === 'email' ? `verification:email:${email}` : `verification:phone:${phone}`;
    await kv.set(verificationKey, {
      code,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    console.log(`Verification code sent via ${method}:`, code);

    // In production, send via email/SMS service
    // For demo, return the code
    return c.json({ 
      message: `Verification code sent via ${method}`,
      // TODO: Remove this in production - only for demo
      demoCode: code 
    });
  } catch (error) {
    console.error("Error sending verification:", error);
    return c.json({ error: `Failed to send verification: ${error.message}` }, 500);
  }
});

// Verify code
app.post("/make-server-23b9846d/verify-code", async (c) => {
  try {
    const { email, phone, code, method } = await c.req.json();

    const verificationKey = method === 'email' ? `verification:email:${email}` : `verification:phone:${phone}`;
    const storedVerification = await kv.get(verificationKey);

    if (!storedVerification) {
      return c.json({ error: "Verification code not found or expired" }, 400);
    }

    // Check expiration
    if (new Date(storedVerification.expiresAt) < new Date()) {
      await kv.del(verificationKey);
      return c.json({ error: "Verification code expired" }, 400);
    }

    // Check code
    if (storedVerification.code !== code) {
      return c.json({ error: "Invalid verification code" }, 400);
    }

    // Mark user as verified
    const usersData = await kv.getByPrefix("user:");
    const users = usersData || [];
    const user = users.find((u: any) => u.email === email);

    if (user) {
      user.verified = true;
      await kv.set(`user:${user.id}`, user);
    }

    // Delete verification code
    await kv.del(verificationKey);

    console.log(`User verified successfully: ${email || phone}`);

    return c.json({ message: "Verification successful", verified: true });
  } catch (error) {
    console.error("Error verifying code:", error);
    return c.json({ error: `Verification failed: ${error.message}` }, 500);
  }
});

// Signup endpoint
app.post("/make-server-23b9846d/signup", async (c) => {
  try {
    const { email, phone, password, name } = await c.req.json();

    if (!email || !phone || !password || !name) {
      return c.json({ error: "All fields are required" }, 400);
    }

    // Check if user already exists
    const usersData = await kv.getByPrefix("user:");
    const users = usersData || [];
    
    const existingUser = users.find((u: any) => u.email === email || u.phone === phone);
    if (existingUser) {
      return c.json({ error: "User with this email or phone already exists" }, 400);
    }

    // Create new user
    const userId = `customer-${Date.now()}`;
    const newUser = {
      id: userId,
      email,
      phone,
      password, // In production, hash this
      name,
      role: "customer",
      verified: false,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`user:${userId}`, newUser);

    // Auto-assign to manager if enabled with even distribution
    const settings = await kv.get("settings:system") || { autoAssignEnabled: false };
    if (settings.autoAssignEnabled && settings.autoAssignManagerIds?.length > 0) {
      // Get all current assignments
      const allAssignments = await kv.getByPrefix("assignment:");
      
      // Count customers per manager
      const managerCustomerCounts: Record<string, number> = {};
      settings.autoAssignManagerIds.forEach((managerId: string) => {
        managerCustomerCounts[managerId] = 0;
      });
      
      allAssignments.forEach((assignment: any) => {
        if (settings.autoAssignManagerIds.includes(assignment.managerId)) {
          managerCustomerCounts[assignment.managerId]++;
        }
      });
      
      // Find manager with least customers
      let selectedManagerId = settings.autoAssignManagerIds[0];
      let minCount = managerCustomerCounts[selectedManagerId];
      
      for (const managerId of settings.autoAssignManagerIds) {
        if (managerCustomerCounts[managerId] < minCount) {
          minCount = managerCustomerCounts[managerId];
          selectedManagerId = managerId;
        }
      }
      
      console.log(`Auto-assigning customer ${userId} to manager ${selectedManagerId} (has ${minCount} customers)`);
      
      await kv.set(`assignment:${userId}`, {
        customerId: userId,
        managerId: selectedManagerId,
        assignedAt: new Date().toISOString(),
      });
    }

    console.log(`New user registered: ${email}`);

    return c.json({ 
      message: "Signup successful. Please verify your email or phone number.",
      user: { id: userId, email, phone, name, role: "customer" }
    });
  } catch (error) {
    console.error("Signup error:", error);
    return c.json({ error: `Signup failed: ${error.message}` }, 500);
  }
});

// Get all users (admin only)
app.get("/make-server-23b9846d/users", async (c) => {
  try {
    const users = await kv.getByPrefix("user:");
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);
    
    return c.json({ users: usersWithoutPasswords });
  } catch (error) {
    console.error("Error fetching users:", error);
    return c.json({ error: `Failed to fetch users: ${error.message}` }, 500);
  }
});

// Update user role (admin only)
app.post("/make-server-23b9846d/update-user-role", async (c) => {
  try {
    const { userId, newRole } = await c.req.json();

    if (!userId || !newRole) {
      return c.json({ error: "User ID and new role are required" }, 400);
    }

    // Validate role
    if (!['customer', 'manager', 'admin'].includes(newRole)) {
      return c.json({ error: "Invalid role. Must be customer, manager, or admin" }, 400);
    }

    // Get user
    const user = await kv.get(`user:${userId}`);
    if (!user) {
      return c.json({ error: "User not found" }, 400);
    }

    // Prevent changing admin role if it's the last admin
    if (user.role === 'admin' && newRole !== 'admin') {
      const allUsers = await kv.getByPrefix("user:");
      const adminCount = allUsers.filter((u: any) => u.role === 'admin').length;
      if (adminCount <= 1) {
        return c.json({ error: "Cannot change role of the last admin user" }, 400);
      }
    }

    // Update user role
    const updatedUser = { ...user, role: newRole };
    await kv.set(`user:${userId}`, updatedUser);

    console.log(`User ${userId} role updated from ${user.role} to ${newRole}`);

    return c.json({ 
      message: "User role updated successfully",
      user: { ...updatedUser, password: undefined }
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    return c.json({ error: `Failed to update user role: ${error.message}` }, 500);
  }
});

// Activate or deactivate user account (admin only)
app.post("/make-server-23b9846d/update-user-status", async (c) => {
  try {
    const { userId, active } = await c.req.json();

    if (!userId || typeof active !== 'boolean') {
      return c.json({ error: "User ID and active status are required" }, 400);
    }

    // Get user
    const user = await kv.get(`user:${userId}`);
    if (!user) {
      return c.json({ error: "User not found" }, 400);
    }

    // Prevent deactivating the last admin
    if (user.role === 'admin' && !active) {
      const allUsers = await kv.getByPrefix("user:");
      const activeAdminCount = allUsers.filter((u: any) => u.role === 'admin' && u.active !== false).length;
      if (activeAdminCount <= 1) {
        return c.json({ error: "Cannot deactivate the last admin user" }, 400);
      }
    }

    // Update user status
    const updatedUser = { ...user, active };
    await kv.set(`user:${userId}`, updatedUser);

    console.log(`User ${userId} ${active ? 'activated' : 'deactivated'}`);

    return c.json({ 
      message: `User ${active ? 'activated' : 'deactivated'} successfully`,
      user: { ...updatedUser, password: undefined }
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    return c.json({ error: `Failed to update user status: ${error.message}` }, 500);
  }
});

// Get customer-manager assignments
app.get("/make-server-23b9846d/assignments", async (c) => {
  try {
    const assignments = await kv.getByPrefix("assignment:");
    return c.json({ assignments });
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return c.json({ error: `Failed to fetch assignments: ${error.message}` }, 500);
  }
});

// Assign customer to manager (admin only)
app.post("/make-server-23b9846d/assign-customer", async (c) => {
  try {
    const { customerId, managerId } = await c.req.json();

    if (!customerId || !managerId) {
      return c.json({ error: "Customer ID and Manager ID are required" }, 400);
    }

    // Verify customer and manager exist
    const customer = await kv.get(`user:${customerId}`);
    const manager = await kv.get(`user:${managerId}`);

    if (!customer || customer.role !== "customer") {
      return c.json({ error: "Invalid customer ID" }, 400);
    }

    if (!manager || manager.role !== "manager") {
      return c.json({ error: "Invalid manager ID" }, 400);
    }

    // Create or update assignment
    await kv.set(`assignment:${customerId}`, {
      customerId,
      managerId,
      assignedAt: new Date().toISOString(),
    });

    console.log(`Customer ${customerId} assigned to manager ${managerId}`);

    return c.json({ 
      message: "Customer assigned successfully",
      assignment: { customerId, managerId }
    });
  } catch (error) {
    console.error("Error assigning customer:", error);
    return c.json({ error: `Failed to assign customer: ${error.message}` }, 500);
  }
});

// Get system settings
app.get("/make-server-23b9846d/settings", async (c) => {
  try {
    const settings = await kv.get("settings:system") || {
      autoAssignEnabled: false,
      autoAssignManagerIds: [],
    };
    
    return c.json({ settings });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return c.json({ error: `Failed to fetch settings: ${error.message}` }, 500);
  }
});

// Update system settings (admin only)
app.post("/make-server-23b9846d/settings", async (c) => {
  try {
    const settings = await c.req.json();

    await kv.set("settings:system", {
      autoAssignEnabled: settings.autoAssignEnabled ?? false,
      autoAssignManagerIds: settings.autoAssignManagerIds || [],
    });

    console.log("System settings updated:", settings);

    return c.json({ 
      message: "Settings updated successfully",
      settings
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return c.json({ error: `Failed to update settings: ${error.message}` }, 500);
  }
});

// Get order statuses
app.get("/make-server-23b9846d/order-statuses", async (c) => {
  try {
    const statuses = await kv.get("settings:orderStatuses") || [
      "Order placed by customer",
      "Pending Payment",
      "Payment Received",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled"
    ];
    
    return c.json({ statuses });
  } catch (error) {
    console.error("Error fetching order statuses:", error);
    return c.json({ error: `Failed to fetch order statuses: ${error.message}` }, 500);
  }
});

// Update order statuses (admin only)
app.post("/make-server-23b9846d/order-statuses", async (c) => {
  try {
    const { statuses } = await c.req.json();

    if (!Array.isArray(statuses)) {
      return c.json({ error: "Statuses must be an array" }, 400);
    }

    await kv.set("settings:orderStatuses", statuses);

    console.log("Order statuses updated:", statuses);

    return c.json({ 
      message: "Order statuses updated successfully",
      statuses
    });
  } catch (error) {
    console.error("Error updating order statuses:", error);
    return c.json({ error: `Failed to update order statuses: ${error.message}` }, 500);
  }
});

// Get all orders
app.get("/make-server-23b9846d/orders", async (c) => {
  try {
    const orders = await kv.getByPrefix("order:");
    
    return c.json({ orders: orders || [] });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return c.json({ error: `Failed to fetch orders: ${error.message}` }, 500);
  }
});

// Create/Update order
app.post("/make-server-23b9846d/orders", async (c) => {
  try {
    const orderData = await c.req.json();
    
    if (!orderData.id) {
      return c.json({ error: "Order ID is required" }, 400);
    }

    await kv.set(`order:${orderData.id}`, orderData);

    console.log("Order saved:", orderData.id);

    return c.json({ 
      message: "Order saved successfully",
      order: orderData
    });
  } catch (error) {
    console.error("Error saving order:", error);
    return c.json({ error: `Failed to save order: ${error.message}` }, 500);
  }
});

// Helper function to extract product name from iHerb URL when HTML is not accessible
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

// Extract product metadata from URL
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
    } catch (fetchError) {
      // Check if it's an HTTP/2 error - this is expected for sites with strict security
      if (fetchError.message.includes('http2 error') || fetchError.message.includes('protocol error')) {
        console.log(`Protocol restriction detected for ${validUrl.hostname} (expected - site has strict security)`);
        
        // For eBay, return normalized URL and store name
        if (validUrl.hostname.includes('ebay.com')) {
          const itemIdMatch = validUrl.pathname.match(/\/itm\/(?:[^\/]+\/)?(\d+)/);
          if (itemIdMatch && itemIdMatch[1]) {
            console.log(`eBay protocol error - returning item ID: ${itemIdMatch[1]}`);
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
        
        // For iHerb, return extracted product name from URL even with protocol error
        if (iherbProductName) {
          console.log(`Returning iHerb product name from URL despite protocol error`);
          return c.json({ 
            name: iherbProductName,
            imageUrl: null,
            price: null,
            store: 'iHerb',
            description: null,
            url: url,
            warning: 'Product name extracted from URL. iHerb blocked automated request. Please manually enter the price and image URL.'
          });
        }
        
        return c.json({ 
          error: `Unable to access ${validUrl.hostname} due to protocol restrictions. Please manually enter product details.`,
          details: 'This website has strict security measures that prevent automated access.'
        }, 400);
      }
      
      // Other network errors
      console.log(`Network error accessing ${url}: ${fetchError.message}`);
      
      // For eBay, return normalized URL and store name
      if (validUrl.hostname.includes('ebay.com')) {
        const itemIdMatch = validUrl.pathname.match(/\/itm\/(?:[^\/]+\/)?(\d+)/);
        if (itemIdMatch && itemIdMatch[1]) {
          console.log(`eBay network error - returning item ID: ${itemIdMatch[1]}`);
          return c.json({ 
            name: null,
            imageUrl: null,
            price: null,
            store: 'eBay',
            description: null,
            url: fetchUrl,
            warning: `✅ eBay URL saved (item #${itemIdMatch[1]}). Network error occurred. Please visit the page and manually enter: product name, price, and right-click image → "Copy image address" to paste here.`
          });
        }
      }
      
      // For iHerb, return extracted product name from URL even with network error
      if (iherbProductName) {
        console.log(`Returning iHerb product name from URL despite network error`);
        return c.json({ 
          name: iherbProductName,
          imageUrl: null,
          price: null,
          store: 'iHerb',
          description: null,
          url: url,
          warning: 'Product name extracted from URL. iHerb blocked automated request. Please manually enter the price and image URL.'
        });
      }
      
      return c.json({ 
        error: `Unable to access the website. The site may be blocking automated requests.`,
        details: fetchError.message 
      }, 400);
    }

    if (!response.ok) {
      // Log only unexpected errors (not 403 which is expected for some sites)
      if (response.status !== 403) {
        console.error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      } else {
        console.log(`Website blocking request: ${url} (403 Forbidden - expected behavior)`);
      }
      
      // For eBay, return normalized URL and store name even if fetch fails
      if (validUrl.hostname.includes('ebay.com')) {
        const itemIdMatch = validUrl.pathname.match(/\/itm\/(?:[^\/]+\/)?(\d+)/);
        if (itemIdMatch && itemIdMatch[1]) {
          console.log(`eBay ${response.status} error - returning item ID: ${itemIdMatch[1]}`);
          return c.json({ 
            name: null,
            imageUrl: null,
            price: null,
            store: 'eBay',
            description: null,
            url: fetchUrl,
            warning: `✅ eBay URL saved (item #${itemIdMatch[1]}). eBay blocked automated extraction (${response.status}). Please visit the page and manually enter: product name, price, and right-click image → "Copy image address" to paste here.`
          });
        }
      }
      
      // For iHerb, return extracted product name from URL even if fetch fails with 403
      if (iherbProductName) {
        console.log(`Returning iHerb product name from URL despite ${response.status} error`);
        return c.json({ 
          name: iherbProductName,
          imageUrl: null,
          price: null,
          store: 'iHerb',
          description: null,
          url: url,
          warning: 'Product name extracted from URL. iHerb blocked automated request. Please manually enter the price and image URL.'
        });
      }
      
      // Provide helpful error message based on status code
      let errorMessage = `Failed to fetch URL: ${response.statusText}`;
      if (response.status === 403) {
        errorMessage = `Website is blocking automated requests (403 Forbidden). Please manually enter product details.`;
      } else if (response.status === 503 || response.status === 429) {
        errorMessage = `Website is rate limiting requests. Please try again in a moment or enter details manually.`;
      }
      
      return c.json({ error: errorMessage, statusCode: response.status }, 400);
    }

    const html = await response.text();

    // Parse HTML into DOM for more reliable extraction
    const { document } = parseHTML(html);
    console.log('DOM parsed successfully');

    // Check if we got a CAPTCHA or bot detection page
    const captchaIndicators = [
      /robot or human/i,
      /please verify you are a human/i,
      /access denied/i,
      /security check/i,
      /enable javascript/i,
      /enable cookies/i,
      /captcha/i,
      /cloudflare/i,
      /just a moment/i,
      /checking your browser/i,
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