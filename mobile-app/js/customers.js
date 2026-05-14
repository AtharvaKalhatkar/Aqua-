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
      div.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-text">No customers found</div></div>';
      return;
    }
    let html = '';
    customers.forEach(c => {
      const color = App.getAvatarColor(c.name);
      html += `<div class="list-item" onclick="Customers.showDetail(${c.id})">
        <div class="list-avatar" style="background:${color}">${c.name.charAt(0).toUpperCase()}</div>
        <div class="list-content">
          <div class="list-name">${c.name}</div>
          <div class="list-detail">${c.address || 'No address'} ${c.route ? '· <span class="badge badge-route">'+c.route+'</span>' : ''}</div>
        </div>
        <div class="list-right">
          ${c.mobile ? `<a href="tel:${c.mobile}" onclick="event.stopPropagation()" style="font-size:20px;text-decoration:none">📞</a>` : ''}
        </div>
      </div>`;
    });
    div.innerHTML = html;
  },

  async showDetail(id) {
    const c = this.allCustomers.find(x => x.id === id);
    if (!c) return;
    App.showModal(`
      <div class="modal-title">👤 ${c.name}</div>
      <div class="card">
        <p style="margin-bottom:10px">📍 <strong>Address:</strong> ${c.address || 'N/A'}</p>
        <p style="margin-bottom:10px">📱 <strong>Mobile:</strong> ${c.mobile ? `<a href="tel:${c.mobile}" style="color:var(--accent-cyan)">${c.mobile}</a>` : 'N/A'}</p>
        <p style="margin-bottom:10px">📧 <strong>Email:</strong> ${c.email || 'N/A'}</p>
        <p>🗺️ <strong>Route:</strong> <span class="badge badge-route">${c.route || 'Not set'}</span></p>
      </div>
      <button class="btn btn-primary mt-8" onclick="Customers.showEditForm(${c.id})">✏️ Edit Customer</button>
      ${c.mobile ? `<a href="tel:${c.mobile}" class="btn btn-success mt-8" style="text-decoration:none">📞 Call Now</a>` : ''}
      <button class="btn btn-danger mt-8" onclick="Customers.delete(${c.id})">🗑️ Delete</button>
      <button class="btn btn-outline mt-8" onclick="App.closeModal()">Close</button>
    `);
  },

  showAddForm() {
    App.showModal(`
      <div class="modal-title">➕ New Customer</div>
      <div class="form-group">
        <label class="form-label">Name *</label>
        <input class="form-input" type="text" id="custName" placeholder="Customer name">
      </div>
      <div class="form-group">
        <label class="form-label">Address</label>
        <input class="form-input" type="text" id="custAddress" placeholder="Full address">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Mobile</label>
          <input class="form-input" type="tel" id="custMobile" placeholder="9876543210" inputmode="tel">
        </div>
        <div class="form-group">
          <label class="form-label">Route</label>
          <input class="form-input" type="text" id="custRoute" placeholder="Route name">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input class="form-input" type="email" id="custEmail" placeholder="email@example.com">
      </div>
      <button class="btn btn-success" onclick="Customers.save()">✅ Add Customer</button>
      <button class="btn btn-outline mt-8" onclick="App.closeModal()">Cancel</button>
    `);
  },

  async showEditForm(id) {
    const c = this.allCustomers.find(x => x.id === id);
    if (!c) return;
    App.showModal(`
      <div class="modal-title">✏️ Edit Customer</div>
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
      <button class="btn btn-primary" onclick="Customers.update()">💾 Update Customer</button>
      <button class="btn btn-outline mt-8" onclick="App.closeModal()">Cancel</button>
    `);
  },

  async save() {
    const name = document.getElementById('custName').value.trim();
    if (!name) { App.toast('Name is required', 'error'); return; }
    try {
      const generatedId = Math.floor(Date.now() / 1000);
      const res = await OfflineVault.safeInsert('customers', {
        id: generatedId,
        name,
        address: document.getElementById('custAddress').value.trim(),
        mobile: document.getElementById('custMobile').value.trim(),
        route: document.getElementById('custRoute').value.trim(),
        email: document.getElementById('custEmail').value.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      if (res.error) throw res.error;
      App.closeModal();
      App.toast('Customer added! 👤');
      this.load();
    } catch (e) { App.toast('Error: ' + e.message, 'error'); }
  },

  async update() {
    const id = parseInt(document.getElementById('custEditId').value);
    const name = document.getElementById('custName').value.trim();
    if (!name) { App.toast('Name is required', 'error'); return; }
    try {
      const { error } = await supabase.from('customers').update({
        name,
        address: document.getElementById('custAddress').value.trim(),
        mobile: document.getElementById('custMobile').value.trim(),
        route: document.getElementById('custRoute').value.trim(),
        email: document.getElementById('custEmail').value.trim(),
        updated_at: new Date().toISOString()
      }).eq('id', id);
      if (error) throw error;
      App.closeModal();
      App.toast('Customer updated! ✅');
      this.load();
    } catch (e) { App.toast('Error: ' + e.message, 'error'); }
  },

  async delete(id) {
    if (!confirm('Delete this customer? All their deliveries and bills will remain.')) return;
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
      App.closeModal();
      App.toast('Customer deleted');
      this.load();
    } catch (e) { App.toast('Error: ' + e.message, 'error'); }
  }
};
