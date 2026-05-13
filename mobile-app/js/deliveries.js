/* ===== Deliveries Module ===== */
const Deliveries = {
  selectedDate: null,

  async load() {
    this.selectedDate = this.selectedDate || App.todayStr();
    this.renderDateChips();
    await this.fetchDeliveries();
  },

  renderDateChips() {
    const chips = document.getElementById('deliveryDateChips');
    const today = new Date();
    let html = '';
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
      const label = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : d.toLocaleDateString('en-IN', { day:'numeric', month:'short' });
      html += `<div class="chip ${ds === this.selectedDate ? 'active' : ''}" onclick="Deliveries.selectDate('${ds}')">${label}</div>`;
    }
    chips.innerHTML = html;
  },

  selectDate(ds) {
    this.selectedDate = ds;
    this.renderDateChips();
    this.fetchDeliveries();
  },

  async fetchDeliveries() {
    const div = document.getElementById('deliveryList');
    div.innerHTML = '<div class="spinner"></div>';
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*, customers(name)')
        .eq('delivery_date', this.selectedDate)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Cache successful response for offline visual memory
      localStorage.setItem('cache_del_' + this.selectedDate, JSON.stringify(data));
      
      this.renderDeliveriesList(data, false);
    } catch (e) {
      // Catch network error and try to load from Offline Memory Cache
      const offlineData = localStorage.getItem('cache_del_' + this.selectedDate);
      if (offlineData) {
        try {
          const parsed = JSON.parse(offlineData);
          this.renderDeliveriesList(parsed, true); // true flag for offline status
          return;
        } catch(ex) {}
      }
      div.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Offline. No cached data found.</div></div>';
    }
  },

  renderDeliveriesList(data, isOffline) {
    const div = document.getElementById('deliveryList');
    document.getElementById('deliveryCount').textContent = (data||[]).length;

    if (!data || data.length === 0) {
      div.innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><div class="empty-text">No deliveries found.</div></div>';
      return;
    }

    let totalJ = 0, totalB = 0, html = '';
    
    // Display offline banner if working from cache
    if (isOffline) {
      html += `<div style="background:#f59e0b1c; color:#d97706; border:1px solid #f59e0b50; border-radius:8px; padding:10px; margin-bottom:15px; font-size:12px; text-align:center; font-weight:600;">
        📴 Showing Offline Saved Data
      </div>`;
    }

    data.forEach(d => {
      const name = d.customers?.name || 'Customer #' + d.customer_id;
      const color = App.getAvatarColor(name);
      totalJ += d.jar_qty; totalB += d.bottle_qty;
      html += `<div class="list-item" onclick="Deliveries.showDetail(${d.id})">
        <div class="list-avatar" style="background:${color}">${name.charAt(0).toUpperCase()}</div>
        <div class="list-content">
          <div class="list-name">${name}</div>
          <div class="list-detail">🫙 ${d.jar_qty} Jars · 🍶 ${d.bottle_qty} Bottles</div>
        </div>
        <div class="list-right">
          <div class="list-value">${d.jar_qty + d.bottle_qty}</div>
          <div class="list-sub">items</div>
        </div>
      </div>`;
    });

    // Summary card
    html = `<div class="card" style="margin-bottom:12px;border-left:3px solid var(--accent-green)">
      <div class="flex-between"><span style="font-weight:600">📊 Total: ${data.length} deliveries</span>
      <span style="font-weight:700;color:var(--accent-green)">🫙 ${totalJ} · 🍶 ${totalB}</span></div></div>` + html;
    
    div.innerHTML = html;
  },

  cachedCusts: [],

  async showAddForm() {
    let custs = [];
    try {
      const { data } = await supabase.from('customers').select('id,name,route').order('name');
      custs = data || [];
      if (custs.length > 0) {
        localStorage.setItem('cache_cust_dropdown', JSON.stringify(custs));
      }
    } catch (e) {
      const offlineCusts = localStorage.getItem('cache_cust_dropdown');
      if (offlineCusts) {
        custs = JSON.parse(offlineCusts);
      }
    }

    if (!custs || custs.length === 0) {
      App.toast('Cannot load customers list! Network issue.', 'error');
      return;
    }
    this.cachedCusts = custs;

    App.showModal(`
      <div class="modal-title">➕ New Delivery</div>
      <div class="form-group" style="position:relative">
        <label class="form-label">Customer</label>
        <input type="text" class="form-input" id="custSearchInput" placeholder="🔍 Type name to search..." autocomplete="off" 
          onfocus="Deliveries.filterCusts(this.value)" 
          oninput="Deliveries.filterCusts(this.value)">
        <input type="hidden" id="addDelCustomer">
        <div id="custSuggestions" class="suggestions-list"></div>
      </div>
      <div class="form-group">
        <label class="form-label">Date</label>
        <input class="form-input" type="date" id="addDelDate" value="${App.todayStr()}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">🫙 Jars</label>
          <input class="form-input" type="number" id="addDelJars" value="1" min="0" inputmode="numeric">
        </div>
        <div class="form-group">
          <label class="form-label">🍶 Bottles</label>
          <input class="form-input" type="number" id="addDelBottles" value="0" min="0" inputmode="numeric">
        </div>
      </div>
      <button class="btn btn-success" onclick="Deliveries.save()">✅ Save Delivery</button>
      <button class="btn btn-outline mt-8" onclick="App.closeModal()">Cancel</button>
    `);
  },

  filterCusts(q) {
    const list = document.getElementById('custSuggestions');
    const val = q.trim().toLowerCase();
    const matched = this.cachedCusts.filter(c => 
      c.name.toLowerCase().includes(val) || (c.route && c.route.toLowerCase().includes(val))
    ).slice(0, 10); // Show top 10 results max for mobile speed

    if (matched.length === 0) {
      list.innerHTML = '<div class="suggestion-item" style="color:var(--text-muted)">No customer found</div>';
    } else {
      list.innerHTML = matched.map(c => `
        <div class="suggestion-item" onclick="Deliveries.selectCust(${c.id}, '${c.name.replace(/'/g, "\\'")}')">
          ${c.name} ${c.route ? `<span>(${c.route})</span>` : ''}
        </div>
      `).join('');
    }
    list.classList.add('show');
  },

  selectCust(id, name) {
    document.getElementById('addDelCustomer').value = id;
    document.getElementById('custSearchInput').value = name;
    document.getElementById('custSuggestions').classList.remove('show');
  },

  async save() {
    const customerId = parseInt(document.getElementById('addDelCustomer').value);
    const date = document.getElementById('addDelDate').value;
    const jars = parseInt(document.getElementById('addDelJars').value) || 0;
    const bottles = parseInt(document.getElementById('addDelBottles').value) || 0;

    if (!customerId || !date) { App.toast('Fill all fields', 'error'); return; }
    if (jars === 0 && bottles === 0) { App.toast('Enter jar or bottle quantity', 'error'); return; }

    try {
      const res = await OfflineVault.safeInsert('deliveries', {
        id: Math.floor(Date.now() / 1000), // Dynamic High-Entropy Mobile ID
        customer_id: customerId,
        delivery_date: date,
        jar_qty: jars,
        bottle_qty: bottles,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      if (res.error) throw res.error;
      App.closeModal();
      App.toast('Delivery saved! 🚚');
      this.selectedDate = date;
      this.load();
    } catch (e) {
      App.toast('Error: ' + e.message, 'error');
    }
  },

  async showDetail(id) {
    const { data: d } = await supabase.from('deliveries').select('*, customers(name)').eq('id', id).single();
    if (!d) return;
    App.showModal(`
      <div class="modal-title">📦 Delivery Details</div>
      <div class="card">
        <p style="margin-bottom:8px"><strong>Customer:</strong> ${d.customers?.name || 'N/A'}</p>
        <p style="margin-bottom:8px"><strong>Date:</strong> ${App.formatDate(d.delivery_date)}</p>
        <p style="margin-bottom:8px"><strong>🫙 Jars:</strong> ${d.jar_qty}</p>
        <p><strong>🍶 Bottles:</strong> ${d.bottle_qty}</p>
      </div>
      <button class="btn btn-danger mt-8" onclick="Deliveries.delete(${d.id})">🗑️ Delete Delivery</button>
      <button class="btn btn-outline mt-8" onclick="App.closeModal()">Close</button>
    `);
  },

  async delete(id) {
    if (!confirm('Delete this delivery?')) return;
    const { error } = await supabase.from('deliveries').delete().eq('id', id);
    if (error) { App.toast('Error deleting', 'error'); return; }
    App.closeModal();
    App.toast('Delivery deleted');
    this.fetchDeliveries();
  }
};
