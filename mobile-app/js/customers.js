/* ===== Customers Module ===== */
const Customers = {
  allCustomers: [],
  customerDues: {},
  selectedRoute: 'All',

  async load() {
    const div = document.getElementById('customerList');
    
    // ⚡ Instant Cache Hydration
    let hydrated = false;
    const offline = localStorage.getItem('cache_customers');
    const offlineDues = localStorage.getItem('cache_dues');
    if (offline) {
      try {
        this.allCustomers = JSON.parse(offline) || [];
        this.customerDues = offlineDues ? JSON.parse(offlineDues) : {};
        this.renderRouteChips();
        this.renderList(this.allCustomers);
        hydrated = true;
      } catch(e) {
        console.warn("Customer Cache invalid.");
      }
    }

    if (!hydrated) {
      div.innerHTML = '<div class="spinner"></div>';
    }

    try {
      // Fetch both customers and bills to calculate total due dynamically
      const [custRes, billRes] = await Promise.all([
        supabase.from('customers').select('*').order('name'),
        supabase.from('bills').select('customer_id, grand_total, status')
      ]);

      if (custRes.error) throw custRes.error;
      
      this.allCustomers = custRes.data || [];
      const bills = billRes.data || [];
      
      // Calculate dues
      this.customerDues = {};
      this.allCustomers.forEach(c => {
         let billed = 0;
         let paid = c.total_paid || 0; // Manual partial payments tracking
         let cbills = bills.filter(b => b.customer_id === c.id);
         cbills.forEach(b => {
           billed += (b.grand_total || 0);
           if (b.status === 'PAID') paid += (b.grand_total || 0);
         });
         this.customerDues[c.id] = billed - paid;
      });
      
      localStorage.setItem('cache_customers', JSON.stringify(this.allCustomers));
      localStorage.setItem('cache_dues', JSON.stringify(this.customerDues));
      
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
      const dueAmt = this.customerDues[c.id] || 0;
      let dueBadge = '';
      if (dueAmt > 0) {
        dueBadge = `<span style="font-weight:800; color:#ef4444; font-size:13px; margin-left:auto;">₹${dueAmt} Due</span>`;
      } else if (dueAmt < 0) {
        dueBadge = `<span style="font-weight:800; color:#10b981; font-size:13px; margin-left:auto;">₹${Math.abs(dueAmt)} Adv</span>`;
      } else {
        dueBadge = `<span style="font-weight:800; color:#10b981; font-size:13px; margin-left:auto;">Clear</span>`;
      }

      html += `<div class="list-item" onclick="Customers.showDetail(${c.id})">
        <div class="list-avatar" style="background:${color}">${c.name.charAt(0).toUpperCase()}</div>
        <div class="list-content" style="display:flex; flex-direction:row; align-items:center; width:100%;">
          <div style="display:flex; flex-direction:column; flex:1;">
            <div class="list-name">${c.name}</div>
            <div class="list-detail">
              ${c.route ? '<span class="badge badge-route"><i data-lucide="map-pin"></i> '+c.route+'</span>' : '<span style="opacity:0.5">No route assigned</span>'}
            </div>
          </div>
          ${dueBadge}
        </div>
        <div class="list-right">
          ${c.mobile ? `<a href="tel:${c.mobile}" onclick="event.stopPropagation()" style="display:flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,0.05); border:1px solid var(--border-slate); color:var(--accent-cyan); margin-left:10px;"><i data-lucide="phone" style="width:14px; height:14px;"></i></a>` : ''}
        </div>
      </div>`;
    });
    div.innerHTML = html;
    App.refreshIcons();
  },

  async showDetail(id) {
    const c = this.allCustomers.find(x => x.id === id);
    if (!c) return;
    const dueAmt = this.customerDues[id] || 0;
    
    App.showModal(`
      <div class="modal-title" style="display:flex; justify-content:space-between; align-items:center;">
        <div><i data-lucide="user"></i> ${c.name}</div>
      </div>
      
      <!-- Balance Card -->
      <div style="background:linear-gradient(135deg, rgba(37,99,235,0.1), rgba(0,229,255,0.05)); border:1px solid var(--accent-cyan); border-radius:var(--radius-md); padding:16px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Total Outstanding</div>
          <div style="font-size:24px; font-weight:800; color:${dueAmt > 0 ? '#ef4444' : (dueAmt < 0 ? '#10b981' : '#10b981')};">
            ₹${Math.abs(dueAmt)} ${dueAmt > 0 ? 'Due' : (dueAmt < 0 ? 'Adv' : 'Clear')}
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <button class="btn btn-primary" onclick="Customers.recordPayment(${c.id}, ${dueAmt}, '${c.mobile || ''}')" style="font-size:12px; padding:8px 12px; height:auto;">
            <i data-lucide="indian-rupee" style="width:14px; height:14px;"></i> Record Pay
          </button>
          <button class="btn btn-outline" onclick="Customers.addPreviousDue(${c.id})" style="font-size:10px; padding:4px 8px; height:auto; color:var(--text-secondary); border-color:var(--border-slate-bright);">
            <i data-lucide="plus" style="width:10px; height:10px;"></i> Add Due
          </button>
        </div>
      </div>

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

      ${dueAmt > 0 ? `
        <button class="btn btn-outline" onclick="Customers.sendPaymentReminder('${c.name}', '${c.mobile || ''}', ${dueAmt})" style="border-color:#25D366; color:#25D366; width:100%; margin-bottom:10px;">
          <i data-lucide="message-square"></i> Send Payment Reminder
        </button>
      ` : ''}

      <button class="btn btn-outline" onclick="Customers.showEditForm(${c.id})" style="width:100%; margin-bottom:10px;">
        <i data-lucide="edit"></i> Edit Profile
      </button>
      <button class="btn btn-danger" onclick="Customers.delete(${c.id})" style="width:100%;">
        <i data-lucide="trash-2"></i> Delete Client
      </button>
      <button class="btn btn-outline mt-8" onclick="App.closeModal()">Close</button>
    `);
  },

  addPreviousDue(id) {
    App.showModal(`
      <div class="modal-title" style="color:var(--accent-amber);"><i data-lucide="plus-circle"></i> Add Previous Dues</div>
      <p style="font-size:12px; color:var(--text-secondary); margin-bottom:20px;">
        This will instantly increase the total outstanding amount for past months.
      </p>
      
      <div class="form-group">
        <label class="form-label">Amount to Add (₹)</label>
        <input class="form-input" type="number" id="prevDueAmt" placeholder="e.g. 500" style="font-size:20px; font-weight:800;">
      </div>
      
      <button class="btn btn-primary mt-8" onclick="Customers.savePreviousDue(${id})" style="width:100%; background:linear-gradient(135deg, #f59e0b, #d97706); border:none;">
        <i data-lucide="check-circle"></i> Add to Dues
      </button>
    `);
  },

  async savePreviousDue(id) {
    const amt = parseFloat(document.getElementById('prevDueAmt').value);
    if (!amt || amt <= 0) {
      App.toast('Please enter a valid amount', 'warning');
      return;
    }
    
    try {
      const record = {
        customer_id: id,
        bill_month: 0,
        bill_year: 0,
        total_jars: 0,
        total_bottles: 0,
        grand_total: amt,
        status: 'PENDING'
      };
      
      const { error } = await supabase.from('bills').insert(record);
      if (error) throw error;
      
      App.closeModal();
      App.toast('Previous due added successfully!', 'success');
      this.load();
    } catch(e) {
      App.toast('Error adding due: ' + e.message, 'error');
    }
  },

  recordPayment(id, dueAmt, mobile) {
    App.showModal(`
      <div class="modal-title" style="color:var(--accent-cyan);"><i data-lucide="indian-rupee"></i> Record Payment</div>
      <p style="font-size:12px; color:var(--text-secondary); margin-bottom:20px;">
        Total Outstanding: <strong>₹${dueAmt}</strong>
      </p>
      
      <div class="form-group">
        <label class="form-label">Amount Received (₹)</label>
        <input class="form-input" type="number" id="payAmount" placeholder="e.g. 5000" style="font-size:20px; font-weight:800;">
      </div>
      
      <button class="btn btn-primary mt-8" onclick="Customers.savePayment(${id}, ${dueAmt}, '${mobile}')" style="width:100%;">
        <i data-lucide="check-circle"></i> Confirm Payment
      </button>
      <button class="btn btn-outline mt-8" onclick="Customers.showDetail(${id})" style="width:100%;">Cancel</button>
    `);
  },

  async savePayment(id, currentDue, mobile) {
    const amtStr = document.getElementById('payAmount').value;
    const amt = parseFloat(amtStr);
    if (!amt || amt <= 0) return App.toast('Enter a valid amount', 'warning');
    
    App.toast('Saving payment...', 'info');
    const c = this.allCustomers.find(x => x.id === id);
    const newTotalPaid = (c.total_paid || 0) + amt;
    const newDue = currentDue - amt;

    try {
      const { error } = await supabase.from('customers').update({ total_paid: newTotalPaid }).eq('id', id);
      if (error) {
        if (error.code === 'PGRST204' || error.message.includes("Could not find the 'total_paid' column")) {
           App.alert("CRITICAL ERROR: You have not created the 'total_paid' column in Supabase yet! Please go to Supabase -> Table Editor -> customers -> Add Column -> Name: 'total_paid', Type: 'float8', Default Value: '0'", 'error');
           return;
        }
        throw error;
      }
      
      // Update local cache manually
      c.total_paid = newTotalPaid;
      this.customerDues[id] = newDue;
      
      App.toast('Payment Recorded!', 'success');
      
      App.showModal(`
        <div class="modal-title" style="color:#10b981;"><i data-lucide="check-circle"></i> Payment Saved</div>
        <div style="background:var(--bg-slate); border:1px solid var(--border-slate); border-radius:var(--radius-md); padding:20px; margin-bottom:20px; text-align:center;">
          <div style="font-size:12px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Amount Paid</div>
          <div style="font-size:28px; font-weight:800; color:#10b981; margin-bottom:12px;">₹${amt}</div>
          
          <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; border-top:1px solid var(--border-slate); padding-top:12px;">Remaining Balance</div>
          <div style="font-size:20px; font-weight:800; color:${newDue > 0 ? '#ef4444' : '#10b981'};">₹${newDue}</div>
        </div>
        
        <button class="btn btn-outline" onclick="Customers.sharePaymentWhatsApp('${c.name}', '${mobile}', ${amt}, ${newDue})" style="border-color:#25D366; color:#25D366; width:100%; margin-bottom:12px;">
          <i data-lucide="message-square"></i> Send WhatsApp Receipt
        </button>
        <button class="btn btn-primary" onclick="Customers.load(); App.closeModal();" style="width:100%;">Done</button>
      `);
      
    } catch (e) {
      App.toast('Error saving payment: ' + e.message, 'error');
    }
  },

  sharePaymentWhatsApp(name, mobile, amt, newDue) {
    if (!mobile) return App.toast('No mobile number saved for this customer', 'warning');
    const rawMob = mobile.replace(/[^0-9]/g, "");
    let mob = rawMob;
    if (mob.length === 10) mob = "91" + mob;
    
    let msg = `*Bhairavnath Cool Aqua* 💧\nDear ${name},\nWe have received your payment of *₹${amt}*.\n`;
    if (newDue > 0) {
      msg += `Your remaining pending balance is *₹${newDue}*.\n\nPay instantly via UPI:\nupi://pay?pa=7030355656-6@ibl&pn=Bhairavnath%20Cool%20Aqua&am=${newDue}&cu=INR`;
    } else {
      msg += `Your account is fully cleared. Thank you!`;
    }
    
    window.open(`https://wa.me/${mob}?text=${encodeURIComponent(msg)}`, '_blank');
  },

  sendPaymentReminder(name, mobile, dueAmt) {
    if (!mobile) return App.toast('No mobile number saved for this customer', 'warning');
    const rawMob = mobile.replace(/[^0-9]/g, "");
    let mob = rawMob;
    if (mob.length === 10) mob = "91" + mob;
    
    const msg = `*Bhairavnath Cool Aqua* 💧\nDear ${name},\nThis is a gentle reminder that your pending balance is *₹${dueAmt}*.\n\nKindly clear your dues via UPI link below:\nupi://pay?pa=7030355656-6@ibl&pn=Bhairavnath%20Cool%20Aqua&am=${dueAmt}&cu=INR`;
    
    window.open(`https://wa.me/${mob}?text=${encodeURIComponent(msg)}`, '_blank');
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
      // Manually calculate next ID to bypass broken database sequence
      const maxRes = await supabase.from('customers').select('id').order('id', { ascending: false }).limit(1);
      const nextId = (maxRes.data && maxRes.data.length > 0) ? maxRes.data[0].id + 1 : 1;
      
      const record = {
        id: nextId,
        name,
        address: document.getElementById('custAddress').value.trim(),
        mobile: document.getElementById('custMobile').value.trim(),
        route: document.getElementById('custRoute').value.trim(),
        email: document.getElementById('custEmail').value.trim()
      };
      const { error } = await supabase.from('customers').insert(record);
      if (error) throw error;
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
