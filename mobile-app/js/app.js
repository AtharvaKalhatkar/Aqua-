/* ===== App Core — Navigation, Toast, Modal, Sync ===== */
const OWNER_PIN = '1234'; // ← CHANGE YOUR 4-DIGIT OWNER PASSWORD HERE!

const App = {
  currentPage: 'Dashboard',

  navigate(page) {
    // Check Owner Security Privilege for Financial Tabs
    if ((page === 'Bills' || page === 'Reports') && sessionStorage.getItem('owner_authed') !== 'true') {
      this.promptOwnerPin(page);
      return;
    }

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('page' + page).classList.add('active');
    document.querySelectorAll('.nav-item')[['Dashboard','Deliveries','Customers','Bills','Reports'].indexOf(page)].classList.add('active');
    this.currentPage = page;
    if (page === 'Dashboard') Dashboard.load();
    else if (page === 'Deliveries') Deliveries.load();
    else if (page === 'Customers') Customers.load();
    else if (page === 'Bills') Bills.load();
    else if (page === 'Reports') { if (typeof Reports !== 'undefined') Reports.load(); }
  },

  promptOwnerPin(targetPage) {
    this.showModal(`
      <div style="text-align:center; padding:10px 0;">
        <div style="font-size:36px; margin-bottom:10px;">🔒</div>
        <div class="modal-title">Owner Access Required</div>
        <p style="font-size:13px; opacity:0.7; margin-bottom:20px;">Please enter your 4-digit password to unlock Billing & Reports.</p>
        
        <div class="form-group">
          <input type="password" id="ownerPinInput" class="form-input" 
                 placeholder="••••" maxlength="4" inputmode="numeric"
                 style="text-align:center; font-size:28px; letter-spacing:15px; font-weight:bold; border:2px solid var(--accent-blue);"
                 onkeyup="if(event.key==='Enter') App.verifyPin('${targetPage}')">
        </div>
        
        <button class="btn btn-success mt-8" onclick="App.verifyPin('${targetPage}')" style="width:100%">🔓 Unlock Access</button>
        <button class="btn btn-outline mt-8" onclick="App.closeModal()" style="width:100%">Cancel</button>
      </div>
    `);
    // Auto-focus the pin input immediately
    setTimeout(() => {
      const el = document.getElementById('ownerPinInput');
      if (el) el.focus();
    }, 300);
  },

  verifyPin(targetPage) {
    const pinVal = document.getElementById('ownerPinInput').value;
    if (pinVal === OWNER_PIN) {
      sessionStorage.setItem('owner_authed', 'true'); // Remember authorization for the day
      this.closeModal();
      this.toast('Security cleared! 🔓');
      this.navigate(targetPage);
    } else {
      this.toast('Wrong Password! Access Denied. ❌', 'error');
      document.getElementById('ownerPinInput').value = '';
      document.getElementById('ownerPinInput').focus();
    }
  },

  onFabClick() {
    if (this.currentPage === 'Deliveries') Deliveries.showAddForm();
    else if (this.currentPage === 'Customers') Customers.showAddForm();
    else if (this.currentPage === 'Dashboard') { this.navigate('Deliveries'); setTimeout(() => Deliveries.showAddForm(), 300); }
    else if (this.currentPage === 'Bills') Bills.load();
  },

  toast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast ' + type + ' show';
    setTimeout(() => t.classList.remove('show'), 2500);
  },

  showModal(html) {
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modal').classList.add('show');
  },

  closeModal() {
    document.getElementById('modal').classList.remove('show');
  },

  async syncNow() {
    const btn = document.getElementById('btnSync');
    btn.classList.add('syncing');
    document.getElementById('syncStatus').textContent = 'Syncing...';
    try {
      const ok = await checkConnection();
      if (ok) {
        document.getElementById('syncStatus').textContent = '✅ Connected';
        this.toast('Refreshed successfully!', 'success');
        
        // Reload active page data dynamically
        if (this.currentPage === 'Dashboard') Dashboard.load();
        else if (this.currentPage === 'Deliveries') Deliveries.load();
        else if (this.currentPage === 'Customers') Customers.load();
        else if (this.currentPage === 'Bills') Bills.load();
        else if (this.currentPage === 'Reports' && typeof Reports !== 'undefined') Reports.load();
        
      } else {
        document.getElementById('syncStatus').textContent = '❌ Offline';
        this.toast('Connection failed', 'error');
      }
    } catch (e) {
      document.getElementById('syncStatus').textContent = '❌ Error';
      this.toast('Sync error: ' + e.message, 'error');
    }
    setTimeout(() => btn.classList.remove('syncing'), 800);
  },

  formatDate(d) {
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  },

  todayStr() {
    // Force Asia/Kolkata timezone to override browser emulator offsets
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const formatter = new Intl.DateTimeFormat('en-CA', options); // en-CA outputs YYYY-MM-DD naturally
    return formatter.format(new Date()); 
  },

  avatarColors: ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899','#14b8a6'],
  getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < (name||'').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return this.avatarColors[Math.abs(hash) % this.avatarColors.length];
  }
};

// Close modal on overlay click
document.getElementById('modal').addEventListener('click', function(e) {
  if (e.target === this) App.closeModal();
});

// Init on load
document.addEventListener('DOMContentLoaded', async () => {
  const options = { weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone: 'Asia/Kolkata' };
  const dateEl = document.getElementById('dashDate');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-IN', options);
  }
  const ok = await checkConnection();
  document.getElementById('syncStatus').textContent = ok ? '✅ Connected' : '❌ Check API Key';
  Dashboard.load();
});

// Global Auto-Dismiss for Search Suggestions
document.addEventListener('click', function(e) {
  const list = document.getElementById('custSuggestions');
  const input = document.getElementById('custSearchInput');
  if (list && input && !input.contains(e.target) && !list.contains(e.target)) {
    list.classList.remove('show');
  }
});
