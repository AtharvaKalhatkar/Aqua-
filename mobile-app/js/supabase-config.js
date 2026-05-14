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
try {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
  
  async safeInsert(table, record) {
    // Attempt absolute realtime push first
    try {
      const { error } = await supabase.from(table).insert(record);
      if (!error) return { success: true, error: null };
      
      // Check if network issue
      if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
        throw new Error("Network Fail");
      }
      return { success: false, error }; // Standard db validation error
    } catch (e) {
      console.warn(`[📶 Offline Mode] Securing ${table} insert in phone storage...`);
    }

    // Lock data into the Vault securely
    const queue = this.getQueue();
    queue.push({ table, record, stamp: new Date().toISOString() });
    this.saveQueue(queue);

    if (typeof App !== 'undefined' && App.toast) {
      App.toast('Saved to local vault. Auto-sync pending.', 'warning');
    }
    return { success: true, error: null, offline: true };
  },

  isSyncing: false,
  async processQueue() {
    if (this.isSyncing) return;
    const queue = this.getQueue();
    if (queue.length === 0) return;

    this.isSyncing = true;
    console.log(`[Vault] Processing ${queue.length} stored entries...`);

    const failed = [];
    let syncedCount = 0;

    for (const item of queue) {
      try {
        const { error } = await supabase.from(item.table).insert(item.record);
        if (error) {
          if (error.code === '23505') {
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
      App.toast(`Online. Synced ${syncedCount} records to the cloud.`, 'success');
      if (App.currentPage === 'Dashboard' && typeof Dashboard !== 'undefined') Dashboard.load();
      else if (App.currentPage === 'Deliveries' && typeof Deliveries !== 'undefined') Deliveries.load();
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

