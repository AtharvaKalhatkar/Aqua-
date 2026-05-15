/* ===== App Core — Elite Minimalist Edition ===== */
const OWNER_PIN = '1234'; 

const App = {
  currentPage: 'Dashboard',

  navigate(page) {
    // Check Owner Security Privilege for the entire consolidated Vault
    if (page === 'Vault' && sessionStorage.getItem('owner_authed') !== 'true') {
      this.promptOwnerPin(page);
      return;
    }

    // Transition Page Display
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.dock-item').forEach(n => n.classList.remove('active'));
    
    const targetPageEl = document.getElementById('page' + page);
    if (targetPageEl) targetPageEl.classList.add('active');
    
    const targetDockIndex = ['Dashboard','Deliveries','Customers','Vault'].indexOf(page);
    const dockItems = document.querySelectorAll('.dock-item');
    if (dockItems[targetDockIndex]) dockItems[targetDockIndex].classList.add('active');
    
    this.currentPage = page;

    // Dispatch Page-Specific Revalidators
    if (page === 'Dashboard') Dashboard.load();
    else if (page === 'Deliveries') Deliveries.load();
    else if (page === 'Customers') Customers.load();
    else if (page === 'Vault') {
      // By default, trigger active subtab load (Bills/Invoices)
      this.switchVaultSubTab('bills');
    }

    // 🔥 Hydrate Vector SVG icons in view
    this.refreshIcons();
  },

  onIncomeClick() {
    if (sessionStorage.getItem('owner_authed') !== 'true') {
      this.promptOwnerPin('Dashboard');
    } else {
      this.navigate('Vault');
    }
  },

  promptOwnerPin(targetPage) {
    this.showModal(`
      <div style="text-align:center; padding:10px 0;">
        <div style="margin-bottom:16px; display:flex; justify-content:center; color:var(--accent-cyan)">
          <i data-lucide="shield-lock" style="width:44px; height:44px; stroke-width:1.5px;"></i>
        </div>
        <div class="modal-title" style="justify-content:center;">Financial Security Clearance</div>
        <p style="font-size:12px; color:var(--text-secondary); margin-bottom:24px; line-height:1.5;">
          Owner authentication required. Please enter your 4-digit security key to unlock.
        </p>
        
        <div class="form-group">
          <input type="password" id="ownerPinInput" class="form-input" 
                 placeholder="••••" maxlength="4" inputmode="numeric"
                 style="text-align:center; font-size:26px; letter-spacing:16px; font-weight:800; border:1px solid var(--border-slate-bright);"
                 onkeyup="if(event.key==='Enter') App.verifyPin('${targetPage}')">
        </div>
        
        <button class="btn btn-primary mt-16" onclick="App.verifyPin('${targetPage}')" style="width:100%">
          <i data-lucide="unlock"></i> Unlock Portal
        </button>
        <button class="btn btn-outline mt-8" onclick="App.closeModal()" style="width:100%">Cancel</button>
      </div>
    `);
    
    // Focus immediately & refresh lucide for shield-lock
    this.refreshIcons();
    setTimeout(() => {
      const el = document.getElementById('ownerPinInput');
      if (el) el.focus();
    }, 300);
  },

  verifyPin(targetPage) {
    const pinVal = document.getElementById('ownerPinInput').value;
    if (pinVal === OWNER_PIN) {
      sessionStorage.setItem('owner_authed', 'true');
      this.closeModal();
      this.toast('Security cleared successfully!', 'success');
      this.navigate(targetPage);
    } else {
      this.toast('Invalid PIN. Access Denied.', 'warning');
      const inEl = document.getElementById('ownerPinInput');
      if (inEl) {
        inEl.value = '';
        inEl.focus();
      }
    }
  },

  // Sub-navigation handler for Vault
  switchVaultSubTab(tab) {
    document.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
    
    const billsSec = document.getElementById('vaultBillsSection');
    const reportsSec = document.getElementById('vaultReportsSection');
    
    if (tab === 'bills') {
      document.getElementById('segBills').classList.add('active');
      if (billsSec) billsSec.style.display = 'block';
      if (reportsSec) reportsSec.style.display = 'none';
      if (typeof Bills !== 'undefined') Bills.load();
    } else {
      document.getElementById('segReports').classList.add('active');
      if (billsSec) billsSec.style.display = 'none';
      if (reportsSec) reportsSec.style.display = 'block';
      if (typeof Reports !== 'undefined') Reports.load();
    }
    this.refreshIcons();
  },

  onFabClick() {
    if (this.currentPage === 'Deliveries') Deliveries.showAddForm();
    else if (this.currentPage === 'Customers') Customers.showAddForm();
    else if (this.currentPage === 'Dashboard') { 
      this.navigate('Deliveries'); 
      setTimeout(() => Deliveries.showAddForm(), 300); 
    }
    else if (this.currentPage === 'Vault') {
      this.switchVaultSubTab('bills');
    }
  },

  toast(msg, type = 'success') {
    const t = document.getElementById('toast');
    if (!t) return;
    // Custom vectorized toast structure
    const icon = type === 'warning' ? 'alert-triangle' : 'check-circle';
    t.innerHTML = `<i data-lucide="${icon}" style="width:16px; height:16px;"></i> <span>${msg}</span>`;
    t.className = 'toast-pro ' + type + ' show';
    this.refreshIcons();
    setTimeout(() => t.classList.remove('show'), 2600);
  },

  showModal(html) {
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modal').classList.add('show');
    this.refreshIcons();
  },

  closeModal() {
    document.getElementById('modal').classList.remove('show');
  },

  refreshIcons() {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  },

  async syncNow() {
    const btn = document.getElementById('btnSync');
    btn.classList.add('syncing');
    document.getElementById('syncStatus').textContent = 'Syncing...';
    try {
      const ok = await checkConnection();
      if (ok) {
        document.getElementById('syncStatus').textContent = 'Connected';
        this.toast('Database cloud sync complete!');
        
        // Rehydrate current active context
        if (this.currentPage === 'Dashboard') Dashboard.load();
        else if (this.currentPage === 'Deliveries') Deliveries.load();
        else if (this.currentPage === 'Customers') Customers.load();
        else if (this.currentPage === 'Vault') {
          const isRep = document.getElementById('segReports').classList.contains('active');
          if (isRep && typeof Reports !== 'undefined') Reports.load();
          else if (typeof Bills !== 'undefined') Bills.load();
        }
      } else {
        document.getElementById('syncStatus').textContent = 'Offline';
        this.toast('Sync connection lost.', 'warning');
      }
    } catch (e) {
      document.getElementById('syncStatus').textContent = 'Sync Error';
      this.toast('Network sync halted.', 'warning');
    }
    setTimeout(() => btn.classList.remove('syncing'), 1000);
  },

  formatDate(d) {
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  },

  todayStr() {
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const formatter = new Intl.DateTimeFormat('en-CA', options);
    return formatter.format(new Date()); 
  },

  avatarColors: ['#00e5ff','#a78bfa','#10b981','#f59e0b','#f43f5e','#38bdf8','#c084fc','#34d399'],
  getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < (name||'').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return this.avatarColors[Math.abs(hash) % this.avatarColors.length];
  }
};

// Interactive overlay listeners
document.getElementById('modal').addEventListener('click', function(e) {
  if (e.target === this) App.closeModal();
});

// Global Boot Engine
document.addEventListener('DOMContentLoaded', async () => {
  const options = { weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone: 'Asia/Kolkata' };
  const dateEl = document.getElementById('dashDate');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-IN', options);
  }
  const ok = await checkConnection();
  document.getElementById('syncStatus').textContent = ok ? 'Connected' : 'Checking Key...';
  Dashboard.load();
});

// Global Suggestion auto-collapser
document.addEventListener('click', function(e) {
  const list = document.getElementById('custSuggestions');
  const input = document.getElementById('custSearchInput');
  if (list && input && !input.contains(e.target) && !list.contains(e.target)) {
    list.classList.remove('show');
  }
});

/* ==========================================
   🪂 GLOBAL GLITCH CATCHER & ERROR BOUNDARIES
   ========================================== */
window.onerror = function(message, source, lineno, colno, error) {
  console.error("[🪂 Global Error Intercepted]:", message);
  if (message.includes("Script error") || message.includes("Extension")) return false;
  if (typeof App !== 'undefined' && App.toast) {
    App.toast('Glitch secured. Restoration primed.', 'warning');
  }
  return false;
};

window.onunhandledrejection = function(event) {
  console.warn("[🪂 Network Rejection Blocked]:", event.reason);
  const reasonStr = String(event.reason || "");
  if (reasonStr.includes("Failed to fetch") || reasonStr.includes("NetworkError")) {
    if (typeof App !== 'undefined' && App.toast) {
      App.toast('Offline mode engaged. Local Vault operational!', 'warning');
    }
  } else {
    if (typeof App !== 'undefined' && App.toast) {
      App.toast('Temporary Cloud disruption secured.', 'warning');
    }
  }
};
