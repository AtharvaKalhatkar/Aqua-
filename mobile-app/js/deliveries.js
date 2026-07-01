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
      div.innerHTML = '<div class="empty-state"><i data-lucide="cloud-off" class="empty-icon-vector"></i><div class="empty-text">Network required. Offline history not available.</div></div>';
      App.refreshIcons();
    }
  },

  renderDeliveriesList(data, isOffline) {
    const div = document.getElementById('deliveryList');
    document.getElementById('deliveryCount').textContent = (data||[]).length;

    if (!data || data.length === 0) {
      div.innerHTML = '<div class="empty-state"><i data-lucide="package" class="empty-icon-vector"></i><div class="empty-text">No logistics records logged for this date.</div></div>';
      App.refreshIcons();
      return;
    }

    let totalJ = 0, totalB = 0, html = '';
    
    if (isOffline) {
      html += `<div style="background:rgba(245,158,11,0.08); color:var(--accent-amber); border:1px solid rgba(245,158,11,0.2); border-radius:12px; padding:10px; margin-bottom:16px; font-size:10px; text-align:center; font-weight:800; display:flex; align-items:center; justify-content:center; gap:6px;">
        <i data-lucide="cloud-off" style="width:12px; height:12px;"></i> SHOWING OFFLINE LOG COPY
      </div>`;
    }

    data.forEach(d => {
      const name = d.customers?.name || 'Customer #' + d.customer_id;
      const color = App.getAvatarColor(name);
      totalJ += d.jar_qty; totalB += d.bottle_qty;
      const entryTime = d.created_at ? (() => { let ts = d.created_at; if (!ts.endsWith('Z') && !ts.includes('+')) ts += 'Z'; return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).toLowerCase(); })() : '';
      
      html += `<div class="list-item" onclick="Deliveries.showDetail(${d.id})">
        <div class="list-avatar" style="background:${color}">${name.charAt(0).toUpperCase()}</div>
        <div class="list-content">
          <div class="list-name">${name}</div>
          <div class="list-detail">
            <span class="badge badge-cyan">
              <i data-lucide="droplets"></i> ${d.jar_qty} Jars
            </span>
            <span class="badge badge-violet">
              <i data-lucide="glass-water"></i> ${d.bottle_qty} Bottles
            </span>
            ${entryTime ? `
            <span class="badge badge-muted">
              <i data-lucide="clock"></i> ${entryTime}
            </span>` : ''}
          </div>
        </div>
        <div class="list-right">
          <div class="list-value">${d.jar_qty + d.bottle_qty}</div>
          <div class="list-sub">total items</div>
        </div>
      </div>`;
    });

    // Elite summary ribbon
    html = `<div style="background:var(--bg-slate); border:1px solid var(--border-slate); border-radius:var(--radius-md); padding:16px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
      <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; display:flex; align-items:center; gap:6px;">
        <i data-lucide="bar-chart-2" style="width:14px; height:14px; color:var(--accent-cyan);"></i> Daily Volume
      </div>
      <div style="font-size:13px; font-weight:800; color:var(--text-primary); display:flex; gap:10px;">
        <span style="display:inline-flex; align-items:center; gap:4px;"><i data-lucide="droplets" style="width:12px; height:12px; color:var(--accent-cyan);"></i> ${totalJ}</span>
        <span style="color:var(--border-slate-bright)">|</span>
        <span style="display:inline-flex; align-items:center; gap:4px;"><i data-lucide="glass-water" style="width:12px; height:12px; color:var(--accent-violet);"></i> ${totalB}</span>
      </div>
    </div>` + html;
    
    div.innerHTML = html;
    App.refreshIcons();
  },

  cachedCusts: [],

  async showAddForm() {
    let custs = [];
    try {
      const { data, error } = await supabase.from('customers').select('id,name,route').order('name');
      if (error) throw error;
      
      custs = data || [];
      if (custs.length > 0) {
        localStorage.setItem('cache_cust_dropdown', JSON.stringify(custs));
      }
    } catch (e) {
      const offlineCusts = localStorage.getItem('cache_cust_dropdown');
      if (offlineCusts) {
        try { custs = JSON.parse(offlineCusts); } catch (ex) {}
      }
    }

    if (!custs || custs.length === 0) {
      App.toast('Cannot load customers list. Check connectivity.', 'warning');
      return;
    }
    this.cachedCusts = custs;

    App.showModal(`
      <div class="modal-title"><i data-lucide="truck"></i> Record Delivery</div>
      <div class="form-group" style="position:relative">
        <label class="form-label">Find Customer</label>
        <div class="search-bar-pro" style="margin-bottom:0;">
          <i data-lucide="search" class="search-icon-vector" style="color:var(--accent-cyan)"></i>
          <input type="text" class="form-input" id="custSearchInput" placeholder="Search name..." autocomplete="off" 
            onfocus="Deliveries.filterCusts(this.value)" 
            oninput="Deliveries.filterCusts(this.value)"
            style="padding-left:44px;">
        </div>
        <input type="hidden" id="addDelCustomer">
        <div id="custSuggestions" class="suggestions-list"></div>
      </div>
      <div class="form-group">
        <label class="form-label">Date</label>
        <input class="form-input" type="date" id="addDelDate" value="${App.todayStr()}" onchange="Deliveries.checkExistingEntry()">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Jars</label>
          <input class="form-input" type="number" id="addDelJars" placeholder="0" min="0" inputmode="numeric">
        </div>
        <div class="form-group">
          <label class="form-label">Bottles</label>
          <input class="form-input" type="number" id="addDelBottles" placeholder="0" min="0" inputmode="numeric">
        </div>
      </div>
      <input type="hidden" id="addDelId">
      <button class="btn btn-primary" id="saveDelBtn" onclick="Deliveries.save()">
        <i data-lucide="check-circle"></i> Save Delivery
      </button>
      <button class="btn btn-outline mt-8" onclick="App.closeModal()">Cancel</button>
    `);
  },

  filterCusts(q) {
    const list = document.getElementById('custSuggestions');
    const val = q.trim().toLowerCase();
    const matched = this.cachedCusts.filter(c => 
      c.name.toLowerCase().includes(val) || (c.route && c.route.toLowerCase().includes(val))
    ).slice(0, 10);

    if (matched.length === 0) {
      list.innerHTML = '<div class="suggestion-item" style="color:var(--text-muted)">No match found</div>';
    } else {
      list.innerHTML = matched.map(c => `
        <div class="suggestion-item" onclick="Deliveries.selectCust(${c.id}, '${c.name.replace(/'/g, "\\'")}')">
          ${c.name} ${c.route ? `<span>· ${c.route}</span>` : ''}
        </div>
      `).join('');
    }
    list.classList.add('show');
  },

  selectCust(id, name) {
    document.getElementById('addDelCustomer').value = id;
    document.getElementById('custSearchInput').value = name;
    document.getElementById('custSuggestions').classList.remove('show');
    this.checkExistingEntry();
  },

  async checkExistingEntry() {
    const cid = document.getElementById('addDelCustomer').value;
    const date = document.getElementById('addDelDate').value;
    if (!cid || !date) return;
    
    try {
      const { data, error } = await supabase.from('deliveries').select('id, jar_qty, bottle_qty').eq('customer_id', cid).eq('delivery_date', date).maybeSingle();
      
      if (data && !error) {
        document.getElementById('addDelJars').value = data.jar_qty;
        document.getElementById('addDelBottles').value = data.bottle_qty;
        document.getElementById('addDelId').value = data.id;
        document.getElementById('saveDelBtn').innerHTML = '<i data-lucide="refresh-cw"></i> Update Existing Entry';
      } else {
        document.getElementById('addDelJars').value = '';
        document.getElementById('addDelBottles').value = '';
        document.getElementById('addDelId').value = '';
        document.getElementById('saveDelBtn').innerHTML = '<i data-lucide="check-circle"></i> Save Delivery';
      }
      if (window.lucide) window.lucide.createIcons();
    } catch(e) {
      console.error(e);
    }
  },

  async save() {
    const customerId = parseInt(document.getElementById('addDelCustomer').value);
    const date = document.getElementById('addDelDate').value;
    const existingId = document.getElementById('addDelId').value;
    
    const jarsVal = document.getElementById('addDelJars').value.trim();
    const bottlesVal = document.getElementById('addDelBottles').value.trim();
    const jars = jarsVal === "" ? 0 : (parseInt(jarsVal) || 0);
    const bottles = bottlesVal === "" ? 0 : (parseInt(bottlesVal) || 0);

    if (!customerId || !date) { App.toast('Specify customer and date.', 'warning'); return; }
    if (jars === 0 && bottles === 0) { App.toast('Quantity must be greater than 0.', 'warning'); return; }

    try {
      let res;
      if (existingId) {
        res = await OfflineVault.safeWrite('UPDATE', 'deliveries', { jar_qty: jars, bottle_qty: bottles }, { id: parseInt(existingId) });
      } else {
        res = await OfflineVault.safeInsert('deliveries', {
          customer_id: customerId,
          delivery_date: date,
          jar_qty: jars,
          bottle_qty: bottles,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      
      if (res.error) throw res.error;
      App.closeModal();
      App.toast(existingId ? 'Log entry updated.' : 'Log entry successfully recorded.');
      this.selectedDate = date;
      this.load();
    } catch (e) {
      App.toast('Vault Error: ' + e.message, 'warning');
    }
  },

  async showDetail(id) {
    let d;
    try {
      const res = await supabase.from('deliveries').select('*, customers(name)').eq('id', id).single();
      d = res.data;
    } catch (e) {
      const cached = localStorage.getItem('cache_del_' + App.todayStr());
      if (cached) {
        const parsed = JSON.parse(cached);
        d = parsed.find(x => x.id === id);
      }
    }
    if (!d) { App.toast('Cannot load details offline.', 'warning'); return; }
    App.showModal(`
      <div class="modal-title"><i data-lucide="file-text"></i> Log Details</div>
      <div style="background:var(--bg-slate); border:1px solid var(--border-slate); border-radius:var(--radius-md); padding:20px; margin-bottom:20px; display:flex; flex-direction:column; gap:12px;">
        <div>
          <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.05em; margin-bottom:2px;">Recipient Customer</div>
          <div style="font-size:14px; font-weight:700; color:var(--text-primary);">${d.customers?.name || 'Unnamed Profile'}</div>
        </div>
        
        <div>
          <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.05em; margin-bottom:2px;">Drop-off Date</div>
          <div style="font-size:13px; font-weight:600; color:var(--text-secondary);">${App.formatDate(d.delivery_date)}</div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; padding-top:8px; border-top:1px solid var(--border-slate);">
          <div>
            <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:var(--text-muted); margin-bottom:2px;">Jars</div>
            <div style="display:flex; align-items:center; gap:4px;">
              <i data-lucide="droplets" style="width:14px; height:14px; color:var(--accent-cyan);"></i>
              <input type="number" id="editDelJars" value="${d.jar_qty}" min="0" class="form-input" style="padding: 4px 8px; font-size:16px; font-weight:800; color:var(--accent-cyan); text-align:center; height:32px;">
            </div>
          </div>
          <div>
            <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:var(--text-muted); margin-bottom:2px;">Bottles</div>
            <div style="display:flex; align-items:center; gap:4px;">
              <i data-lucide="glass-water" style="width:14px; height:14px; color:var(--accent-violet);"></i>
              <input type="number" id="editDelBottles" value="${d.bottle_qty}" min="0" class="form-input" style="padding: 4px 8px; font-size:16px; font-weight:800; color:var(--accent-violet); text-align:center; height:32px;">
            </div>
          </div>
        </div>
      </div>

      <button class="btn btn-primary" onclick="Deliveries.update(${d.id})" style="margin-bottom:10px;">
        <i data-lucide="save"></i> Save Changes
      </button>
      <button class="btn btn-danger" onclick="Deliveries.delete(${d.id})">
        <i data-lucide="trash-2"></i> Delete Log Record
      </button>
      <button class="btn btn-outline mt-8" onclick="App.closeModal()">Close</button>
    `);
  },

  async update(id) {
    const jarsVal = document.getElementById('editDelJars').value.trim();
    const bottlesVal = document.getElementById('editDelBottles').value.trim();
    const jars = jarsVal === "" ? 0 : (parseInt(jarsVal) || 0);
    const bottles = bottlesVal === "" ? 0 : (parseInt(bottlesVal) || 0);

    if (jars === 0 && bottles === 0) {
      App.toast('Quantity must be greater than 0.', 'warning');
      return;
    }

    try {
      // Offline vault safe update logic mapping to safeWrite
      const res = await OfflineVault.safeWrite('UPDATE', 'deliveries', { jar_qty: jars, bottle_qty: bottles }, { id });
      if (res.error) throw res.error;
      
      App.closeModal();
      App.toast('Log entry successfully updated.');
      this.fetchDeliveries();
    } catch (e) {
      App.toast('Failed to update: ' + e.message, 'warning');
    }
  },

  async delete(id) {
    App.confirm('Permanently delete this delivery entry?', async () => {
      try {
        const res = await OfflineVault.safeWrite('DELETE', 'deliveries', null, { id });
        if (res.error) throw res.error;
        App.closeModal();
        App.toast('Log entry removed.');
        this.fetchDeliveries();
      } catch (e) {
        App.toast('Failed to delete: ' + e.message, 'warning');
      }
    });
  }
};
