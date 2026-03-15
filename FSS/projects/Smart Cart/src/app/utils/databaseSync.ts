import { projectId, publicAnonKey } from "../../utils/supabase/info";

// Determine if we are in production
const isLive = (import.meta as any).env.PROD;

export class DatabaseSync {
  static async initialize() {
    if (!isLive) return;
    
    console.log("🟢 Live deployment detected. Hydrating locally from Database...");
    
    try {
      // Hydrate all keys from Supabase kv_store
      const res = await fetch(`https://${projectId}.supabase.co/rest/v1/kv_store_23b9846d`, {
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      const data = await res.json();
      
      if (Array.isArray(data)) {
        data.forEach((row: any) => {
          // Identify if the key represents a global collection we want to share
          const stringVal = typeof row.value === 'string' ? row.value : JSON.stringify(row.value);
          localStorage.setItem(`_db_${row.key}`, stringVal);
          
          // Recreate active global states locally so app works immediately
          if (['orders', 'catalog', 'adminConfig'].includes(row.key) || row.key.startsWith('user:')) {
            localStorage.setItem(row.key, stringVal); 
          }
        });
      }
    } catch (e) {
      console.error("Database Hydration Error:", e);
    }
  }

  static hookLocalStorage() {
    if (!isLive) return;

    const originalSetItem = window.localStorage.setItem;
    const originalRemoveItem = window.localStorage.removeItem;

    // Keys that should be synced globally to the database
    // All other keys (like cart items for anonymous users) stay only locally
    const globalKeys = ['orders', 'catalog', 'adminConfig'];
    
    // We also want to sync specific user records like user:id
    const isGlobalKey = (key: string) => globalKeys.includes(key) || key.startsWith('user:') || key.startsWith('settings:');

    window.localStorage.setItem = function(key, value) {
      originalSetItem.apply(this, [key, value]);
      
      // Ignore keys that are just internal caches
      if (key.startsWith('_db_')) return;

      if (isGlobalKey(key)) {
        DatabaseSync.persistToDB(key, value);
      }
    };

    window.localStorage.removeItem = function(key) {
      originalRemoveItem.apply(this, [key]);
      
      // Ignore keys that are just internal caches
      if (key.startsWith('_db_')) return;

      if (isGlobalKey(key)) {
        DatabaseSync.deleteFromDB(key);
      }
    };
  }

  static async persistToDB(key: string, value: string) {
    try {
      // Prepare value object
      let parsedValue;
      try { parsedValue = JSON.parse(value); } catch { parsedValue = value; }

      const res = await fetch(`https://${projectId}.supabase.co/rest/v1/kv_store_23b9846d?key=eq.${key}`, {
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      const existing = await res.json();
      
      if (existing && existing.length > 0) {
        await fetch(`https://${projectId}.supabase.co/rest/v1/kv_store_23b9846d?key=eq.${key}`, {
          method: 'PATCH',
          headers: {
             'apikey': publicAnonKey,
             'Authorization': `Bearer ${publicAnonKey}`,
             'Content-Type': 'application/json',
             'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ value: parsedValue }) 
        });
      } else {
        await fetch(`https://${projectId}.supabase.co/rest/v1/kv_store_23b9846d`, {
          method: 'POST',
          headers: {
             'apikey': publicAnonKey,
             'Authorization': `Bearer ${publicAnonKey}`,
             'Content-Type': 'application/json',
             'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ key, value: parsedValue })
        });
      }
    } catch(e) {
      console.error('DB Sync Error', e);
    }
  }

  static async deleteFromDB(key: string) {
    try {
      await fetch(`https://${projectId}.supabase.co/rest/v1/kv_store_23b9846d?key=eq.${key}`, {
        method: 'DELETE',
        headers: {
           'apikey': publicAnonKey,
           'Authorization': `Bearer ${publicAnonKey}`
        }
      });
    } catch(e) {
      console.error('DB Delete Error', e);
    }
  }
}
