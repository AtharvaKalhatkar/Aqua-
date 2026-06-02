/* ===== Reports Module — Date-wise Register ===== */
const Reports = {
  initialized: false,

  init() {
    if (this.initialized) return;
    const mSelect = document.getElementById('reportMonth');
    const ySelect = document.getElementById('reportYear');
    if (!mSelect || !ySelect) return;
    
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    mSelect.innerHTML = months.map((m, i) => `<option value="${i+1}" ${i === new Date().getMonth() ? 'selected' : ''}>${m}</option>`).join('');
    
    const cy = new Date().getFullYear();
    const years = [cy - 1, cy, cy + 1];
    ySelect.innerHTML = years.map(y => `<option value="${y}" ${y === cy ? 'selected' : ''}>${y}</option>`).join('');
    
    this.initialized = true;
  },

  async load() {
    const content = document.getElementById('reportContent');
    if (!content) return;

    try {
      this.init();
      const mSelect = document.getElementById('reportMonth');
      const ySelect = document.getElementById('reportYear');

      const m = (mSelect && mSelect.value) ? parseInt(mSelect.value) : new Date().getMonth() + 1;
      const y = (ySelect && ySelect.value) ? parseInt(ySelect.value) : new Date().getFullYear();
      const cacheKey = `report_grid_${y}_${m}`;

      // Modern Speed Hack: Hydrate from local cache instantly!
      let hydrated = false;
      const cachedHtml = localStorage.getItem(cacheKey);
      if (cachedHtml) {
        content.innerHTML = cachedHtml;
        hydrated = true;
      } else {
        content.innerHTML = '<div class="spinner"></div>';
      }
      // 1. Fetch all deliveries (with pagination to bypass 1000 limit) AND bills for this month
      const start = `${y}-${String(m).padStart(2,'0')}-01`;
      const nextM = m === 12 ? 1 : m + 1;
      const nextY = m === 12 ? y + 1 : y;
      const end = `${nextY}-${String(nextM).padStart(2,'0')}-01`;

      let allDeliveries = [];
      let fetchMore = true;
      let fromIdx = 0;
      const step = 1000;
      
      while(fetchMore) {
         const { data, error } = await supabase
          .from('deliveries')
          .select('*, customers(name, route)')
          .gte('delivery_date', start)
          .lt('delivery_date', end)
          .order('delivery_date', { ascending: true })
          .range(fromIdx, fromIdx + step - 1);
          
         if (error) throw error;
         if (data && data.length > 0) {
            allDeliveries = allDeliveries.concat(data);
            fromIdx += step;
         }
         if (!data || data.length < step) fetchMore = false;
      }

      const { data: bills, error: billError } = await supabase
          .from('bills')
          .select('customer_id, grand_total')
          .eq('bill_month', m)
          .eq('bill_year', y);

      if (billError) throw billError;

      const dels = allDeliveries;
      
      // Construct Bill Map: customerId -> moneyAmount
      const billMap = {};
      let totalMoney = 0;
      bills.forEach(b => {
        billMap[b.customer_id] = (billMap[b.customer_id] || 0) + (b.grand_total || 0);
        totalMoney += (b.grand_total || 0);
      });

      const statEl = document.getElementById('statIncome');
      if (statEl) {
        statEl.textContent = '₹' + Math.round(totalMoney).toLocaleString('en-IN');
      }

      if (dels.length === 0) {
        content.innerHTML = '<div class="empty-state"><i data-lucide="line-chart" class="empty-icon-vector"></i><div class="empty-text">No ledger logs recorded for this period.</div></div>';
        App.refreshIcons();
        return;
      }

      // 2. Group by customer
      const customerMap = {};
      let totalJars = 0, totalBottles = 0;

      dels.forEach(d => {
        const cid = d.customer_id;
        const name = d.customers?.name || `Customer #${cid}`;
        
        if (!customerMap[cid]) {
          customerMap[cid] = {
            cid: cid,
            name,
            route: d.customers?.route || 'Unassigned',
            jars: 0,
            bottles: 0,
            dates: []
          };
        }
        
        customerMap[cid].jars += d.jar_qty;
        customerMap[cid].bottles += d.bottle_qty;
        customerMap[cid].dates.push({
          day: new Date(d.delivery_date).getDate(),
          j: d.jar_qty,
          b: d.bottle_qty
        });

        totalJars += d.jar_qty;
        totalBottles += d.bottle_qty;
      });

      // 3. Generate EXACT Spreadsheet Matrix as of Desktop
      const daysInMonth = new Date(y, m, 0).getDate();
      
      let html = `
        <style>
          .matrix-wrapper { 
            width: 100%; 
            overflow-x: auto; 
            background: var(--bg-slate); 
            border: 1px solid var(--border-slate);
            border-radius: 12px;
          }
          .matrix-table { 
            border-collapse: collapse; 
            font-size: 11px; 
            white-space: nowrap; 
            width: max-content;
            min-width: 100%;
          }
          .matrix-table th, .matrix-table td {
            padding: 8px 10px;
            border-right: 1px solid var(--border-slate);
            border-bottom: 1px solid var(--border-slate);
            text-align: center;
            font-weight: 600;
          }
          .matrix-table th {
            background: rgba(255,255,255,0.02);
            color: var(--text-muted);
            font-weight: 800;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          /* Sticky First Column for Client Name - OLED Integration */
          .sticky-col {
            position: sticky;
            left: 0;
            background: var(--bg-sticky-col, #0a0b0d) !important;
            color: var(--text-primary) !important;
            z-index: 10;
            text-align: left !important;
            min-width: 120px;
            max-width: 140px;
            overflow: hidden;
            text-overflow: ellipsis;
            border-right: 1.5px solid var(--border-slate) !important;
            font-weight: 700;
          }
          .day-col { min-width: 38px; }
          .active-cell {
            font-weight: 800;
            color: var(--accent-cyan);
            background: rgba(0, 229, 255, 0.04);
          }
          .tot-col {
             background: rgba(255,255,255,0.02);
             font-weight: 800;
          }
          .row-accent:nth-child(even) td { background-color: rgba(255,255,255,0.01); }
          .row-accent:nth-child(even) .sticky-col { background: var(--bg-sticky-col-alt, #0e1014) !important; }
        </style>

        <div class="flex-between mb-8" style="font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted)">
          <span style="display:inline-flex; align-items:center; gap:4px;"><i data-lucide="move-horizontal" style="width:10px; height:10px;"></i> Scroll Matrix</span>
          <span>Dispatched Jars: ${totalJars}</span>
        </div>

        <div class="matrix-wrapper">
          <table class="matrix-table">
            <thead>
              <tr>
                <th class="sticky-col" style="z-index:11; top:0;">Customer</th>
      `;

      // Header: Days 1 to N
      for (let d = 1; d <= daysInMonth; d++) {
        html += `<th class="day-col">${d}</th>`;
      }
      
      // Header: Totals
      html += `<th class="tot-col" style="color:var(--accent-cyan)">JARS</th><th class="tot-col" style="color:var(--accent-violet)">BOTL</th><th class="tot-col" style="color:var(--accent-emerald)">REVENUE</th></tr></thead><tbody>`;

      // Day-wise column totals
      const dayTotals = {};
      dels.forEach(d => {
        const day = new Date(d.delivery_date).getDate();
        if (!dayTotals[day]) dayTotals[day] = {j:0, b:0};
        dayTotals[day].j += d.jar_qty;
        dayTotals[day].b += d.bottle_qty;
      });

      // Rows
      Object.values(customerMap).sort((a,b) => a.name.localeCompare(b.name)).forEach(c => {
        html += `<tr class="row-accent"><td class="sticky-col">${c.name}</td>`;
        
        // Map of this customer's days for lookup
        const dMap = {};
        c.dates.forEach(item => {
          if(!dMap[item.day]) dMap[item.day] = {j:0,b:0};
          dMap[item.day].j += item.j;
          dMap[item.day].b += item.b;
        });

        // Add Day Cells
        for(let d = 1; d <= daysInMonth; d++) {
           if (dMap[d]) {
             const val = `${dMap[d].j}/${dMap[d].b}`;
             html += `<td class="active-cell">${val}</td>`;
           } else {
             html += `<td style="opacity:0.15">—</td>`;
           }
        }
        
        // Add Totals
        const amt = billMap[c.cid] || 0;
        const displayAmt = amt > 0 ? `₹${Math.round(amt).toLocaleString('en-IN')}` : `<span style="opacity:0.2">—</span>`;
        
        html += `<td class="tot-col" style="color:var(--accent-cyan)">${c.jars}</td>
                 <td class="tot-col" style="color:var(--accent-violet)">${c.bottles}</td>
                 <td class="tot-col" style="color:var(--accent-emerald); font-weight:800;">${displayAmt}</td></tr>`;
      });

      // 4. Generate Footer Total Row!
      const displayTotalMoney = totalMoney > 0 ? `₹${Math.round(totalMoney).toLocaleString('en-IN')}` : `<span style="opacity:0.2">—</span>`;
      
      html += `</tbody><tfoot><tr style="background:rgba(255,255,255,0.05); border-top:2.5px solid var(--accent-cyan)">
               <td class="sticky-col" style="background:#000 !important; color:#fff; font-weight:900;">TOTAL</td>`;
      
      // Footer: day-wise columnar totals
      for(let d = 1; d <= daysInMonth; d++) {
        if (dayTotals[d] && (dayTotals[d].j > 0 || dayTotals[d].b > 0)) {
          html += `<td style="font-weight:800; color:#fff; background:rgba(255,255,255,0.03)">${dayTotals[d].j}/${dayTotals[d].b}</td>`;
        } else {
          html += `<td style="opacity:0.2">—</td>`;
        }
      }
      
      // Footer: Absolute Grand Totals
      html += `<td class="tot-col" style="color:var(--accent-cyan); background:rgba(0,229,255,0.12); font-weight:900; font-size:12px;">${totalJars}</td>
               <td class="tot-col" style="color:var(--accent-violet); background:rgba(138,43,226,0.12); font-weight:900; font-size:12px;">${totalBottles}</td>
               <td class="tot-col" style="color:var(--accent-emerald); background:rgba(0,230,118,0.12); font-weight:900; font-size:12px;">${displayTotalMoney}</td>
               </tr></tfoot></table></div>
               
               <!-- Beautiful Summary Footer Panel -->
               <div style="background:var(--bg-slate); border:1px solid var(--border-slate); border-radius:var(--radius-md); padding:20px; margin-top:20px;">
                 <div style="font-weight:800; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted); margin-bottom:16px; font-size:11px; display:flex; align-items:center; gap:6px; padding-bottom:10px; border-bottom:1px solid var(--border-slate);">
                   <i data-lucide="bar-chart-2" style="width:14px; height:14px; color:var(--accent-cyan);"></i> Aggregate Period Metrics
                 </div>
                 <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px; margin-bottom:16px;">
                   <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-slate); padding:14px; border-radius:10px;">
                     <div style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:4px; display:flex; align-items:center; gap:4px;"><i data-lucide="droplets" style="width:10px; height:10px; color:var(--accent-cyan);"></i> Volume (Jars)</div>
                     <div style="font-size:22px; font-weight:800; color:var(--accent-cyan)">${totalJars}</div>
                   </div>
                   <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-slate); padding:14px; border-radius:10px;">
                     <div style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:4px; display:flex; align-items:center; gap:4px;"><i data-lucide="glass-water" style="width:10px; height:10px; color:var(--accent-violet);"></i> Volume (Bottles)</div>
                     <div style="font-size:22px; font-weight:800; color:var(--accent-violet)">${totalBottles}</div>
                   </div>
                 </div>`;
                 
      if (totalMoney > 0) {
        html += `<div style="background:rgba(0,230,118,0.03); border:1px solid rgba(0,230,118,0.2); padding:20px; border-radius:12px; text-align:center;">
                   <div style="font-size:10px; font-weight:800; color:var(--accent-emerald); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.05em;">Finalized Net Dues</div>
                   <div style="font-size:32px; font-weight:900; color:#fff; letter-spacing:-0.03em;">₹${Math.round(totalMoney).toLocaleString('en-IN')}</div>
                 </div>`;
      } else {
        html += `<div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-slate); padding:20px; border-radius:12px; text-align:center;">
                   <div style="font-size:10px; font-weight:800; color:var(--text-muted); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.05em;">Gross Quantity Loaded</div>
                   <div style="font-size:32px; font-weight:900; color:#fff; letter-spacing:-0.02em;">${totalJars + totalBottles} <span style="font-size:14px; opacity:0.5;">items</span></div>
                 </div>`;
      }
      
      html += `</div>`;
               
      content.innerHTML = html;
      App.refreshIcons();
      localStorage.setItem(cacheKey, html);

    } catch (e) {
      console.error(e);
      App.alert("Matrix Sync Error: " + e.message, "error");
      if (!hydrated) {
        content.innerHTML = `<div class="empty-state"><i data-lucide="alert-octagon" class="empty-icon-vector"></i><div class="empty-text">Aggregation failure: ${e.message}</div></div>`;
        App.refreshIcons();
      } else {
        App.toast('📶 Loaded offline report matrix.', 'warning');
      }
    }
  }
};
