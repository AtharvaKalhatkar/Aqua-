/* ===== Backup & Restore Module ===== */
const Backup = {
  BACKUP_INTERVAL_DAYS: 5,

  load() {
    const div = document.getElementById('backupContent');
    const lastBackup = localStorage.getItem('aqua_last_backup_date');
    const lastBackupStr = lastBackup ? new Date(lastBackup).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : 'Never';
    
    // Check if backup is due
    let backupDue = false;
    let daysSince = 0;
    if (!lastBackup) {
      backupDue = true;
    } else {
      const diff = Date.now() - new Date(lastBackup).getTime();
      daysSince = Math.floor(diff / (1000 * 60 * 60 * 24));
      backupDue = daysSince >= this.BACKUP_INTERVAL_DAYS;
    }

    const alertBanner = backupDue ? `
      <div style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); border-radius:var(--radius-md); padding:14px 16px; margin-bottom:20px; display:flex; align-items:center; gap:10px;">
        <i data-lucide="alert-triangle" style="width:20px; height:20px; color:var(--accent-amber); flex-shrink:0;"></i>
        <div>
          <div style="font-size:12px; font-weight:800; color:var(--accent-amber); margin-bottom:2px;">Backup Overdue!</div>
          <div style="font-size:10px; font-weight:600; color:var(--text-secondary);">It's been ${daysSince > 0 ? daysSince + ' days' : 'too long'} since your last backup. Please download a backup now.</div>
        </div>
      </div>` : `
      <div style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2); border-radius:var(--radius-md); padding:14px 16px; margin-bottom:20px; display:flex; align-items:center; gap:10px;">
        <i data-lucide="shield-check" style="width:20px; height:20px; color:var(--accent-emerald); flex-shrink:0;"></i>
        <div>
          <div style="font-size:12px; font-weight:800; color:var(--accent-emerald); margin-bottom:2px;">Backup Up to Date</div>
          <div style="font-size:10px; font-weight:600; color:var(--text-secondary);">Next backup recommended in ${this.BACKUP_INTERVAL_DAYS - daysSince} days.</div>
        </div>
      </div>`;

    div.innerHTML = `
      ${alertBanner}

      <!-- Info Card -->
      <div style="background:var(--bg-slate); border:1px solid var(--border-slate); border-radius:var(--radius-md); padding:20px; margin-bottom:20px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
          <div style="width:40px; height:40px; border-radius:12px; background:rgba(0,229,255,0.08); display:flex; align-items:center; justify-content:center; color:var(--accent-cyan);">
            <i data-lucide="database" style="width:20px; height:20px;"></i>
          </div>
          <div>
            <div style="font-size:14px; font-weight:800; color:var(--text-primary);">Data Backup</div>
            <div style="font-size:10px; font-weight:600; color:var(--text-secondary);">Last backup: ${lastBackupStr}</div>
          </div>
        </div>
        <p style="font-size:11px; font-weight:500; color:var(--text-secondary); line-height:1.6; margin-bottom:0;">
          Download a complete backup of all customers, deliveries, and bills data as a JSON file. 
          Works <strong style="color:var(--accent-cyan);">offline</strong> using cached data. This file can be restored later if needed.
        </p>
      </div>

      <!-- Download Backup Button -->
      <button class="btn btn-primary" onclick="Backup.downloadBackup()" style="width:100%; margin-bottom:12px; background:linear-gradient(135deg, #00e5ff, #2563eb); border:none;">
        <i data-lucide="download"></i> Download Full Backup
      </button>

      <!-- Restore Section -->
      <div style="background:var(--bg-slate); border:1px solid var(--border-slate); border-radius:var(--radius-md); padding:20px; margin-top:20px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
          <div style="width:40px; height:40px; border-radius:12px; background:rgba(167,139,250,0.08); display:flex; align-items:center; justify-content:center; color:var(--accent-violet);">
            <i data-lucide="upload" style="width:20px; height:20px;"></i>
          </div>
          <div>
            <div style="font-size:14px; font-weight:800; color:var(--text-primary);">Restore from Backup</div>
            <div style="font-size:10px; font-weight:600; color:var(--text-secondary);">Upload a previously saved backup file</div>
          </div>
        </div>
        <p style="font-size:11px; font-weight:500; color:var(--text-secondary); line-height:1.6; margin-bottom:16px;">
          <strong style="color:var(--accent-rose);">⚠ Warning:</strong> Restoring will add all records from the backup file to the database. 
          Duplicate entries (same ID) will be skipped. Requires internet connection.
        </p>
        <button class="btn btn-outline" onclick="document.getElementById('restoreFileInput').click()" style="width:100%; border-color:var(--accent-violet); color:var(--accent-violet);">
          <i data-lucide="folder-open"></i> Select Backup File to Restore
        </button>
        <input type="file" id="restoreFileInput" accept=".json" style="display:none;" onchange="Backup.handleRestore(event)">
      </div>

      <!-- Offline Vault Status -->
      <div style="background:var(--bg-slate); border:1px solid var(--border-slate); border-radius:var(--radius-md); padding:16px; margin-top:20px;">
        <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px;">
          <i data-lucide="wifi-off" style="width:10px; height:10px; display:inline; vertical-align:middle; margin-right:4px;"></i> 
          Offline Vault Queue
        </div>
        <div style="font-size:13px; font-weight:700; color:var(--text-primary);" id="offlineQueueCount">
          ${(() => { try { return JSON.parse(localStorage.getItem('aqua_vault') || '[]').length; } catch { return 0; } })()} pending items
        </div>
        <div style="font-size:10px; font-weight:500; color:var(--text-secondary); margin-top:4px;">
          These will auto-sync when internet is available.
        </div>
      </div>
    `;
    App.refreshIcons();
  },

  async downloadBackup() {
    App.toast('Preparing backup...', 'success');
    
    let backupData = {
      version: '1.0',
      app: 'Bhairavnath Cool Aqua',
      created_at: new Date().toISOString(),
      device_time: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      data: {
        customers: [],
        deliveries: [],
        bills: []
      }
    };

    try {
      // Try fetching from Supabase first (online)
      const [custRes, delRes, billRes] = await Promise.all([
        supabase.from('customers').select('*').order('id'),
        supabase.from('deliveries').select('*').order('id'),
        supabase.from('bills').select('*').order('id')
      ]);

      if (custRes.error) throw custRes.error;

      backupData.data.customers = custRes.data || [];
      backupData.data.deliveries = delRes.data || [];
      backupData.data.bills = billRes.data || [];
      backupData.source = 'cloud';
    } catch (e) {
      // Fallback: build from offline cached data
      console.warn('Online fetch failed, building backup from offline cache...');
      backupData.source = 'offline_cache';

      // Gather cached customers
      const cachedCusts = localStorage.getItem('cache_cust_dropdown');
      if (cachedCusts) {
        try { backupData.data.customers = JSON.parse(cachedCusts); } catch(ex) {}
      }

      // Gather cached deliveries from all date keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cache_del_')) {
          try {
            const dels = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(dels)) {
              dels.forEach(d => {
                if (!backupData.data.deliveries.find(x => x.id === d.id)) {
                  backupData.data.deliveries.push(d);
                }
              });
            }
          } catch(ex) {}
        }
      }

      // Gather cached bills from all month keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cache_bills_')) {
          try {
            const cached = JSON.parse(localStorage.getItem(key));
            if (cached && Array.isArray(cached.bills)) {
              cached.bills.forEach(b => {
                if (!backupData.data.bills.find(x => x.id === b.id)) {
                  backupData.data.bills.push(b);
                }
              });
            }
          } catch(ex) {}
        }
      }

      // Include offline vault queue
      try {
        const queue = JSON.parse(localStorage.getItem('aqua_vault') || '[]');
        if (queue.length > 0) backupData.offline_queue = queue;
      } catch(ex) {}
    }

    // Generate and download the file
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const dateTag = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).replace(/-/g, '');
    const filename = `AquaBackup_${dateTag}.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Record backup timestamp
    localStorage.setItem('aqua_last_backup_date', new Date().toISOString());

    const summary = `${backupData.data.customers.length} customers, ${backupData.data.deliveries.length} deliveries, ${backupData.data.bills.length} bills`;
    App.toast(`Backup saved! (${summary})`, 'success');
    
    // Refresh the UI to update "last backup" display
    setTimeout(() => this.load(), 500);
  },

  async handleRestore(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Reset file input so same file can be selected again
    event.target.value = '';

    const isMr = App.currentLang === 'mr';

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.data || !backup.data.customers) {
        App.alert('Invalid backup file. Missing required data structure.', 'error');
        return;
      }

      const custCount = (backup.data.customers || []).length;
      const delCount = (backup.data.deliveries || []).length;
      const billCount = (backup.data.bills || []).length;
      const source = backup.source || 'unknown';
      const createdAt = backup.device_time || backup.created_at || 'Unknown';

      App.confirm(
        `Restore backup from <strong>${createdAt}</strong>?<br><br>` +
        `<strong>${custCount}</strong> customers, <strong>${delCount}</strong> deliveries, <strong>${billCount}</strong> bills<br><br>` +
        `Source: ${source === 'cloud' ? 'Cloud Backup ☁️' : 'Offline Cache 📱'}<br><br>` +
        `<small style="color:var(--accent-amber);">Existing duplicate records (same ID) will be skipped.</small>`,
        () => this.executeRestore(backup)
      );
    } catch (e) {
      App.alert('Failed to read backup file: ' + e.message, 'error');
    }
  },

  async executeRestore(backup) {
    App.toast('Restoring data... Please wait.', 'success');

    let restored = { customers: 0, deliveries: 0, bills: 0 };
    let errors = 0;

    // Restore customers
    for (const cust of (backup.data.customers || [])) {
      try {
        const { error } = await supabase.from('customers').upsert(cust, { onConflict: 'id', ignoreDuplicates: true });
        if (!error) restored.customers++;
        else if (error.code === '23505') restored.customers++; // Already exists
        else errors++;
      } catch (e) { errors++; }
    }

    // Restore deliveries
    for (const del of (backup.data.deliveries || [])) {
      try {
        // Remove nested customer data if present
        const cleanDel = { ...del };
        delete cleanDel.customers;
        const { error } = await supabase.from('deliveries').upsert(cleanDel, { onConflict: 'id', ignoreDuplicates: true });
        if (!error) restored.deliveries++;
        else if (error.code === '23505') restored.deliveries++;
        else errors++;
      } catch (e) { errors++; }
    }

    // Restore bills
    for (const bill of (backup.data.bills || [])) {
      try {
        const { error } = await supabase.from('bills').upsert(bill, { onConflict: 'id', ignoreDuplicates: true });
        if (!error) restored.bills++;
        else if (error.code === '23505') restored.bills++;
        else errors++;
      } catch (e) { errors++; }
    }

    // Restore offline queue if present
    if (backup.offline_queue && Array.isArray(backup.offline_queue) && backup.offline_queue.length > 0) {
      const existingQueue = OfflineVault.getQueue();
      const combined = [...existingQueue, ...backup.offline_queue];
      OfflineVault.saveQueue(combined);
    }

    const msg = `Restore complete!\n${restored.customers} customers, ${restored.deliveries} deliveries, ${restored.bills} bills restored.${errors > 0 ? ` (${errors} errors)` : ''}`;
    App.alert(msg, errors > 0 ? 'warning' : 'success');
    
    // Refresh the page
    this.load();
  }
};

// Auto-check backup reminder on app start
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const lastBackup = localStorage.getItem('aqua_last_backup_date');
    if (lastBackup) {
      const diff = Date.now() - new Date(lastBackup).getTime();
      const daysSince = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (daysSince >= 5) {
        App.toast('⚠️ Backup is overdue! Go to Vault → Backup.', 'warning');
      }
    } else {
      // First time — nudge for backup
      App.toast('💡 Set up your first backup in Vault → Backup.', 'warning');
    }
  }, 5000);
});
