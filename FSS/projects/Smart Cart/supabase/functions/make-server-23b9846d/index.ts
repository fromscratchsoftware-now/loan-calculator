import { Hono } from "npm:hono@4";
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

console.log("Starting make-server-23b9846d Edge Function...");
Deno.serve(app.fetch);
