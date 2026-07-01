/* ===== Dashboard Module ===== */
const Dashboard = {
  async load() {
    // ⚡ Instant Hydration (Stale-While-Revalidate Step 1)
    let renderedCache = false;
    const offlineData = localStorage.getItem('cache_dashboard');
    if (offlineData) {
      try {
        const parsed = JSON.parse(offlineData);
        this.render(parsed, true); // Hydrate the screen instantly with stored data
        renderedCache = true;
      } catch (ex) {
        console.warn("Stale Dashboard Cache corrupt, skipping hydration.");
      }
    }

    try {
      const today = App.todayStr();
      // Set formatted current date subtitle forced to India Timezone
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' };
      const dEl = document.getElementById('dashDate');
      if (dEl) {
        dEl.textContent = new Date().toLocaleDateString('en-US', options);
      }

      // Correct month/year extraction aligned with India Timezone
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', month: 'numeric', year: 'numeric' }).formatToParts(new Date());
      const month = parseInt(parts.find(p => p.type === 'month').value);
      const year = parseInt(parts.find(p => p.type === 'year').value);

      // Fetch Fresh Stats from Cloud
      const [custRes, delRes, billsRes] = await Promise.all([
        supabase.from('customers').select('id', { count:'exact', head:true }),
        supabase.from('deliveries').select('id', { count:'exact', head:true }).eq('delivery_date', today),
        supabase.from('bills').select('*').eq('bill_month', month).eq('bill_year', year)
      ]);

      const bills = billsRes.data || [];

      // Today's deliveries
      const { data: todayDels } = await supabase
        .from('deliveries')
        .select('*, customers(name)')
        .eq('delivery_date', today)
        .order('created_at', { ascending: false });

      // Fetch customer names for pending bills
      const pending = bills.filter(b => b.status === 'PENDING');
      let pendingCusts = [];
      if (pending.length > 0) {
        const custIds = [...new Set(pending.map(b => b.customer_id))];
        const { data } = await supabase.from('customers').select('id,name').in('id', custIds);
        pendingCusts = data || [];
      }

      // Package data for caching
      const payload = {
        totalCustomers: custRes.count || 0,
        todayDeliveriesCount: delRes.count || 0,
        bills: bills,
        todayDels: todayDels || [],
        pendingCusts: pendingCusts
      };

      // Save new fresh copy to Local Storage
      localStorage.setItem('cache_dashboard', JSON.stringify(payload));
      
      // Repaint with fresh, validated cloud numbers! (Stale-While-Revalidate Step 2)
      this.render(payload, false);

    } catch (e) {
      console.warn('[📶 Offline Dashboard] Live fetch failed, maintaining cache loop...');
      if (!renderedCache) {
        document.getElementById('todayDeliveries').innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Offline. No cached data found.</div></div>';
      }
    }
  },

  render(data, isOffline) {
    document.getElementById('statCustomers').textContent = data.totalCustomers;
    document.getElementById('statDeliveries').textContent = data.todayDeliveriesCount;

    const bills = data.bills || [];
    const pending = bills.filter(b => b.status === 'PENDING');
    const totalIncome = bills.reduce((s, b) => s + (b.grand_total || 0), 0);
    
    document.getElementById('statPending').textContent = pending.length;
    const incEl = document.getElementById('statIncome');
    if (incEl) {
      incEl.textContent = '₹' + Math.round(totalIncome).toLocaleString('en-IN');
    }

    // Render Today Deliveries
    const todayDiv = document.getElementById('todayDeliveries');
    document.getElementById('todayCount').textContent = (data.todayDels||[]).length;

    let topHtml = '';
    if (isOffline) {
      topHtml = `<div style="background:rgba(245,158,11,0.08); color:var(--accent-amber); border:1px solid rgba(245,158,11,0.2); border-radius:12px; padding:10px; margin-bottom:16px; font-size:10px; text-align:center; font-weight:800; display:flex; align-items:center; justify-content:center; gap:6px;">
        <i data-lucide="cloud-off" style="width:12px; height:12px;"></i> ${App.t('localVaultLoaded')}
      </div>`;
    }

    if (!data.todayDels || data.todayDels.length === 0) {
      todayDiv.innerHTML = topHtml + `<div class="empty-state"><i data-lucide="truck" class="empty-icon-vector"></i><div class="empty-text">${App.t('noDeliveries')}</div></div>`;
    } else {
      let html = topHtml;
      data.todayDels.forEach(d => {
        const name = d.customers?.name || 'Customer #' + d.customer_id;
        const color = App.getAvatarColor(name);
        const entryTime = d.created_at ? (() => { let ts = d.created_at; if (!ts.endsWith('Z') && !ts.includes('+')) ts += 'Z'; return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).toLowerCase(); })() : '';

        html += `<div class="list-item" onclick="Deliveries.showDetail(${d.id})">
          <div class="list-avatar" style="background:${color}">${name.charAt(0).toUpperCase()}</div>
          <div class="list-content">
            <div class="list-name">${name}</div>
            <div class="list-detail">
              <span class="badge badge-cyan">
                <i data-lucide="droplets"></i> ${d.jar_qty} ${App.t('jars')}
              </span>
              <span class="badge badge-violet">
                <i data-lucide="glass-water"></i> ${d.bottle_qty} ${App.t('bottles')}
              </span>
              ${entryTime ? `
              <span class="badge badge-muted">
                <i data-lucide="clock"></i> ${entryTime}
              </span>` : ''}
            </div>
          </div>
          <div class="list-right"><div class="list-value">${d.jar_qty + d.bottle_qty}</div><div class="list-sub">${App.t('items')}</div></div>
        </div>`;
      });
      todayDiv.innerHTML = html;
    }

    // Render Pending Bills
    const pendDiv = document.getElementById('pendingBillsList');
    if (pending.length === 0) {
      pendDiv.innerHTML = `<div class="empty-state"><i data-lucide="check-circle-2" class="empty-icon-vector" style="color:var(--accent-emerald)"></i><div class="empty-text">${App.t('allCollections')}</div></div>`;
    } else {
      const custMap = {};
      (data.pendingCusts||[]).forEach(c => custMap[c.id] = c.name);

      let html = '';
      pending.forEach(b => {
        const name = custMap[b.customer_id] || 'Customer #' + b.customer_id;
        const color = App.getAvatarColor(name);
        html += `<div class="list-item" onclick="App.navigate('Vault')">
          <div class="list-avatar" style="background:${color}">${name.charAt(0).toUpperCase()}</div>
          <div class="list-content">
            <div class="list-name">${name}</div>
            <div class="list-detail"><span class="badge badge-pending"><i data-lucide="clock"></i> PENDING</span></div>
          </div>
          <div class="list-right"><div class="list-value" style="color:var(--accent-amber)">₹${Math.round(b.grand_total).toLocaleString('en-IN')}</div></div>
        </div>`;
      });
      pendDiv.innerHTML = html;
    }

    // Hydrate the freshly painted vectors!
    App.refreshIcons();
  },

  async deleteDelivery(id) {
    const msg = App.currentLang === 'mr' ? 'ही डिलिव्हरी नोंद कायमची काढून टाकायची?' : 'Permanently delete this today\'s delivery entry?';
    App.confirm(msg, async () => {
      try {
        const res = await OfflineVault.safeWrite('DELETE', 'deliveries', null, { id });
        if (res.error) throw res.error;
        App.toast(App.currentLang === 'mr' ? 'डिलिव्हरी नोंद यशस्वीरीत्या काढून टाकली.' : 'Log entry removed successfully.');
        this.load();
      } catch (e) {
        App.toast('Failed to delete: ' + e.message, 'warning');
      }
    });
  }
};
