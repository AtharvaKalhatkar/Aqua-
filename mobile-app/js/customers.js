/* ===== Customers Module ===== */
const Customers = {
  allCustomers: [],
  selectedRoute: 'All',

  async load() {
    const div = document.getElementById('customerList');
    
    // ⚡ Instant Cache Hydration
    let hydrated = false;
    const offline = localStorage.getItem('cache_customers');
    if (offline) {
      try {
        const parsed = JSON.parse(offline);
        this.allCustomers = parsed || [];
        this.renderRouteChips();
        this.renderList(this.allCustomers);
        hydrated = true;
      } catch(e) {
        console.warn("Customer Cache invalid.");
      }
    }

    // Only show spinner if there was absolutely NO cached data to show!
    if (!hydrated) {
      div.innerHTML = '<div class="spinner"></div>';
    }

    try {
      const { data, error } = await supabase.from('customers').select('*').order('name');
      if (error) throw error;
      
      this.allCustomers = data || [];
      
      // Update Local Storage for the next instant render!
      localStorage.setItem('cache_customers', JSON.stringify(this.allCustomers));
      
      this.renderRouteChips();
      this.renderList(this.allCustomers);
    } catch (e) {
      console.warn('[📶 Offline Customers] Failed live fetch:', e.message);
      if (!hydrated) {
        div.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Offline. No local data cached yet.</div></div>';
      } else {
        App.toast('📶 Offline Mode: Loaded saved customer records.', 'warning');
      }
    }
  },

  renderRouteChips() {
    const routes = [...new Set(this.allCustomers.map(c => c.route).filter(r => r && r.trim()))];
    let html = `<div class="chip ${this.selectedRoute==='All'?'active':''}" onclick="Customers.filterRoute('All')">All</div>`;
    routes.forEach(r => {
      html += `<div class="chip ${this.selectedRoute===r?'active':''}" onclick="Customers.filterRoute('${r}')">${r}</div>`;
    });
    document.getElementById('routeChips').innerHTML = html;
  },

  filterRoute(route) {
    this.selectedRoute = route;
    this.renderRouteChips();
    const filtered = route === 'All' ? this.allCustomers : this.allCustomers.filter(c => c.route === route);
    this.renderList(filtered);
  },

  search(query) {
    const q = query.toLowerCase();
    let filtered = this.allCustomers.filter(c =>
      c.name.toLowerCase().includes(q) || (c.mobile||'').includes(q) || (c.address||'').toLowerCase().includes(q)
    );
    if (this.selectedRoute !== 'All') filtered = filtered.filter(c => c.route === this.selectedRoute);
    this.renderList(filtered);
  },

  renderList(customers) {
    const div = document.getElementById('customerList');
    if (customers.length === 0) {
      div.innerHTML = '<div class="empty-state"><i data-lucide="users" class="empty-icon-vector"></i><div class="empty-text">No customer profiles found.</div></div>';
      App.refreshIcons();
      return;
    }
    let html = '';
    customers.forEach(c => {
      const color = App.getAvatarColor(c.name);
      html += `<div class="list-item" onclick="Customers.showDetail(${c.id})">
        <div class="list-avatar" style="background:${color}">${c.name.charAt(0).toUpperCase()}</div>
        <div class="list-content">
          <div class="list-name">${c.name}</div>
          <div class="list-detail">
            ${c.route ? '<span class="badge badge-route"><i data-lucide="map-pin"></i> '+c.route+'</span>' : '<span style="opacity:0.5">No route assigned</span>'}
          </div>
        </div>
        <div class="list-right">
          ${c.mobile ? `<a href="tel:${c.mobile}" onclick="event.stopPropagation()" style="display:flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,0.05); border:1px solid var(--border-slate); color:var(--accent-cyan);"><i data-lucide="phone" style="width:14px; height:14px;"></i></a>` : ''}
        </div>
      </div>`;
    });
    div.innerHTML = html;
    App.refreshIcons();
  },

  async showDetail(id) {
    const c = this.allCustomers.find(x => x.id === id);
    if (!c) return;
    App.showModal(`
      <div class="modal-title"><i data-lucide="user"></i> Profile: ${c.name}</div>
      <div style="background:var(--bg-slate); border:1px solid var(--border-slate); padding:20px; border-radius:var(--radius-md); margin-bottom:20px; display:flex; flex-direction:column; gap:14px;">
        <div style="display:flex; gap:10px; align-items:flex-start;">
          <i data-lucide="map" style="width:16px; height:16px; color:var(--text-muted); margin-top:2px;"></i>
          <div>
            <div style="font-size:10px; text-transform:uppercase; font-weight:800; color:var(--text-muted); letter-spacing:0.05em;">Address</div>
            <div style="font-size:13px; font-weight:600; color:var(--text-primary);">${c.address || 'Not specified'}</div>
          </div>
        </div>
        
        <div style="display:flex; gap:10px; align-items:flex-start;">
          <i data-lucide="phone-call" style="width:16px; height:16px; color:var(--text-muted); margin-top:2px;"></i>
          <div>
            <div style="font-size:10px; text-transform:uppercase; font-weight:800; color:var(--text-muted); letter-spacing:0.05em;">Mobile</div>
            <div style="font-size:13px; font-weight:700;">
              ${c.mobile ? `<a href="tel:${c.mobile}" style="color:var(--accent-cyan); text-decoration:none;">${c.mobile}</a>` : '<span style="opacity:0.5">N/A</span>'}
            </div>
          </div>
        </div>
        
        <div style="display:flex; gap:10px; align-items:flex-start;">
          <i data-lucide="mail" style="width:16px; height:16px; color:var(--text-muted); margin-top:2px;"></i>
          <div>
            <div style="font-size:10px; text-transform:uppercase; font-weight:800; color:var(--text-muted); letter-spacing:0.05em;">Email</div>
            <div style="font-size:13px; font-weight:600; color:var(--text-primary);">${c.email || 'None listed'}</div>
          </div>
        </div>

        <div style="display:flex; gap:10px; align-items:flex-start;">
          <i data-lucide="navigation" style="width:16px; height:16px; color:var(--text-muted); margin-top:2px;"></i>
          <div>
            <div style="font-size:10px; text-transform:uppercase; font-weight:800; color:var(--text-muted); letter-spacing:0.05em;">Route Group</div>
            <div><span class="badge badge-route" style="margin-top:4px;"><i data-lucide="map-pin"></i> ${c.route || 'Unassigned'}</span></div>
          </div>
        </div>
      </div>

      <button class="btn btn-primary" onclick="Customers.showEditForm(${c.id})">
        <i data-lucide="edit"></i> Edit Profile
      </button>
      ${c.mobile ? `<a href="tel:${c.mobile}" class="btn btn-success mt-8" style="text-decoration:none;"><i data-lucide="phone-outgoing"></i> Make Direct Call</a>` : ''}
      <button class="btn btn-danger mt-8" onclick="Customers.delete(${c.id})">
        <i data-lucide="trash-2"></i> Delete Client
      </button>
      <button class="btn btn-outline mt-8" onclick="App.closeModal()">Close</button>
    `);
  },

  showAddForm() {
    App.showModal(`
      <div class="modal-title"><i data-lucide="user-plus"></i> Add Customer</div>
      <div class="form-group">
        <label class="form-label">Name *</label>
        <input class="form-input" type="text" id="custName" placeholder="e.g. John Doe">
      </div>
      <div class="form-group">
        <label class="form-label">Address</label>
        <input class="form-input" type="text" id="custAddress" placeholder="Flat, wing, building...">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Mobile</label>
          <input class="form-input" type="tel" id="custMobile" placeholder="10 digit mobile" inputmode="tel">
        </div>
        <div class="form-group">
          <label class="form-label">Route</label>
          <input class="form-input" type="text" id="custRoute" placeholder="Sector name">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input class="form-input" type="email" id="custEmail" placeholder="Optional email">
      </div>
      <button class="btn btn-primary" onclick="Customers.save()">
        <i data-lucide="check-circle"></i> Save Customer
      </button>
      <button class="btn btn-outline mt-8" onclick="App.closeModal()">Cancel</button>
    `);
  },

  async showEditForm(id) {
    const c = this.allCustomers.find(x => x.id === id);
    if (!c) return;
    App.showModal(`
      <div class="modal-title"><i data-lucide="edit-3"></i> Edit Customer</div>
      <input type="hidden" id="custEditId" value="${c.id}">
      <div class="form-group">
        <label class="form-label">Name *</label>
        <input class="form-input" type="text" id="custName" value="${c.name||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Address</label>
        <input class="form-input" type="text" id="custAddress" value="${c.address||''}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Mobile</label>
          <input class="form-input" type="tel" id="custMobile" value="${c.mobile||''}">
        </div>
        <div class="form-group">
          <label class="form-label">Route</label>
          <input class="form-input" type="text" id="custRoute" value="${c.route||''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input class="form-input" type="email" id="custEmail" value="${c.email||''}">
      </div>
      <button class="btn btn-primary" onclick="Customers.update()"><i data-lucide="save"></i> Save Customer</button>
      <button class="btn btn-outline mt-8" onclick="App.closeModal()">Cancel</button>
    `);
  },

  async save() {
    const name = document.getElementById('custName').value.trim();
    if (!name) { App.toast('Name is required', 'warning'); return; }
    try {
      const res = await OfflineVault.safeInsert('customers', {
        name,
        address: document.getElementById('custAddress').value.trim(),
        mobile: document.getElementById('custMobile').value.trim(),
        route: document.getElementById('custRoute').value.trim(),
        email: document.getElementById('custEmail').value.trim()
      });
      if (res.error) throw res.error;
      App.closeModal();
      App.toast('Customer profile created successfully!');
      this.load();
    } catch (e) { App.toast('Error: ' + e.message, 'warning'); }
  },

  async update() {
    const id = parseInt(document.getElementById('custEditId').value);
    const name = document.getElementById('custName').value.trim();
    if (!name) { App.toast('Name is required', 'warning'); return; }
    try {
      const res = await OfflineVault.safeWrite('UPDATE', 'customers', {
        name,
        address: document.getElementById('custAddress').value.trim(),
        mobile: document.getElementById('custMobile').value.trim(),
        route: document.getElementById('custRoute').value.trim(),
        email: document.getElementById('custEmail').value.trim(),
        updated_at: new Date().toISOString()
      }, { id });

      if (res.error) throw res.error;
      App.closeModal();
      App.toast('Client changes saved.');
      this.load();
    } catch (e) { App.toast('Error: ' + e.message, 'warning'); }
  },

  async delete(id) {
    App.confirm('Are you sure you want to delete this client profile?', async () => {
      try {
        const res = await OfflineVault.safeWrite('DELETE', 'customers', null, { id });
        if (res.error) throw res.error;
        App.closeModal();
        App.toast('Customer profile archived.');
        this.load();
      } catch (e) { App.toast('Error: ' + e.message, 'warning'); }
    });
  }
};
