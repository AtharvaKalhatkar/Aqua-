/*=============================================
  Supabase Configuration
  
  HOW TO SET UP:
  1. Go to https://supabase.com/dashboard
  2. Open your project (uszuutvdfavikxbyrduy)
  3. Go to Settings → API
  4. Copy the "anon public" key
  5. Replace YOUR_ANON_KEY_HERE below
=============================================*/

const SUPABASE_URL = 'https://uszuutvdfavikxbyrduy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzenV1dHZkZmF2aWt4YnlyZHV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NTczODEsImV4cCI6MjA5NDEzMzM4MX0.o-m2FoorW7H3J8wA5_v9OlfKbU007u2QM41VjnwimR0';  // ← PASTE YOUR KEY HERE

var supabase;

// Fast-fail fetch wrapper for instant offline loading
const fastFetch = async (url, options) => {
  if (!navigator.onLine) {
    throw new Error('Failed to fetch (Offline Mode)');
  }
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 3000); // 3 second timeout
  options.signal = controller.signal;
  try {
    const response = await fetch(url, options);
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
};

try {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { fetch: fastFetch }
  });
} catch (e) {
  console.error('Supabase init failed:', e);
}

// Helper: check connection
async function checkConnection() {
  try {
    const { data, error } = await supabase.from('customers').select('id', { count: 'exact', head: true });
    return !error;
  } catch { return false; }
}

/*=========================================================
  🔒 OFFLINE VAULT ARCHITECTURE
  Ensures unconditional, safe storage when signal is lost!
=========================================================*/
const OfflineVault = {
  getQueue() {
    try { return JSON.parse(localStorage.getItem('aqua_vault') || '[]'); } 
    catch { return []; }
  },
  
  saveQueue(queue) {
    localStorage.setItem('aqua_vault', JSON.stringify(queue));
  },
  
  async safeWrite(action, table, record, condition = null) {
    // Attempt direct push first
    try {
      let res;
      if (action === 'INSERT') {
        res = await supabase.from(table).insert(record);
      } else if (action === 'UPDATE') {
        res = await supabase.from(table).update(record).match(condition);
      } else if (action === 'DELETE') {
        res = await supabase.from(table).delete().match(condition);
      }
      
      const { error } = res || {};
      if (!error) return { success: true, error: null };
      
      // Check if connection issue
      if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.code === 'PGRST116')) {
        throw new Error("Network Fail");
      }
      return { success: false, error };
    } catch (e) {
      console.warn(`[📶 Offline Mode] Securing ${action} on ${table} in storage...`);
    }

    // Lock data into the Vault securely
    const queue = this.getQueue();
    queue.push({ action, table, record, condition, stamp: new Date().toISOString() });
    this.saveQueue(queue);

    if (typeof App !== 'undefined' && App.toast) {
      App.toast(`Offline: Saved ${action.toLowerCase()} to phone storage.`, 'warning');
    }
    
    return { success: true, error: null, offline: true };
  },
  
  _idCounter: 0,
  uid() {
    this._idCounter++;
    // Generate a safe integer (max 2.14B). Current Date.now()/1000 is ~1.78B.
    return Math.floor(Date.now() / 1000) + this._idCounter;
  },

  async safeInsert(table, record) {
    if (!record.id) record.id = this.uid();
    return this.safeWrite('INSERT', table, record);
  },

  isSyncing: false,
  async processQueue() {
    if (this.isSyncing) return;
    const queue = this.getQueue();
    if (queue.length === 0) return;

    this.isSyncing = true;
    console.log(`[Vault] Processing ${queue.length} stored offline actions...`);

    const failed = [];
    let syncedCount = 0;

    for (const item of queue) {
      try {
        const action = item.action || 'INSERT'; // Backwards compatibility
        let res;
        
        if (action === 'INSERT') {
          res = await supabase.from(item.table).insert(item.record);
        } else if (action === 'UPDATE') {
          res = await supabase.from(item.table).update(item.record).match(item.condition);
        } else if (action === 'DELETE') {
          res = await supabase.from(item.table).delete().match(item.condition);
        }

        const { error } = res || {};
        if (error) {
          if (error.code === '23505') { // Already exists
            syncedCount++;
          } else {
            failed.push(item);
          }
        } else {
          syncedCount++;
        }
      } catch (e) {
        failed.push(item);
      }
    }

    this.saveQueue(failed);
    this.isSyncing = false;

    if (syncedCount > 0 && typeof App !== 'undefined') {
      App.toast(`Online. Synced ${syncedCount} records to cloud!`, 'success');
      // Reload the current active screen
      if (App.currentPage === 'Dashboard' && typeof Dashboard !== 'undefined') Dashboard.load();
      else if (App.currentPage === 'Deliveries' && typeof Deliveries !== 'undefined') Deliveries.load();
      else if (App.currentPage === 'Customers' && typeof Customers !== 'undefined') Customers.load();
      else if (App.currentPage === 'Vault') {
        const isRep = document.getElementById('segReports') && document.getElementById('segReports').classList.contains('active');
        const isHist = document.getElementById('segHistory') && document.getElementById('segHistory').classList.contains('active');
        if (isRep && typeof Reports !== 'undefined') Reports.load();
        else if (isHist && typeof Reports !== 'undefined') Reports.loadHistory();
        else if (typeof Bills !== 'undefined') Bills.load();
      }
    }
  }
};

// Listeners: Trigger vault clearing immediately when signal restores
window.addEventListener('online', () => {
  console.log("🌐 Internet Restored! Clearing Offline Vault...");
  setTimeout(() => OfflineVault.processQueue(), 1500);
});

// Background Heartbeat: Double check every 25 seconds
setInterval(() => {
  if (navigator.onLine) {
    OfflineVault.processQueue();
  }
}, 25000);

