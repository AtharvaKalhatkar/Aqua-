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
      const cachedHtml = localStorage.getItem(cacheKey);
      if (cachedHtml) {
        content.innerHTML = cachedHtml;
      } else {
        content.innerHTML = '<div class="spinner"></div>';
      }
      // 1. Fetch all deliveries AND bills for this month simultaneously!
      const start = `${y}-${String(m).padStart(2,'0')}-01`;
      const nextM = m === 12 ? 1 : m + 1;
      const nextY = m === 12 ? y + 1 : y;
      const end = `${nextY}-${String(nextM).padStart(2,'0')}-01`;

      const [delRes, billRes] = await Promise.all([
        supabase
          .from('deliveries')
          .select('*, customers(name, route)')
          .gte('delivery_date', start)
          .lt('delivery_date', end)
          .order('delivery_date', { ascending: true }),
        
        supabase
          .from('bills')
          .select('customer_id, grand_total')
          .eq('bill_month', m)
          .eq('bill_year', y)
      ]);

      const dels = delRes.data || [];
      const bills = billRes.data || [];

      if (delRes.error) throw delRes.error;
      
      // Construct Bill Map: customerId -> moneyAmount
      const billMap = {};
      let totalMoney = 0;
      bills.forEach(b => {
        billMap[b.customer_id] = (billMap[b.customer_id] || 0) + (b.grand_total || 0);
        totalMoney += (b.grand_total || 0);
      });

      if (dels.length === 0) {
        content.innerHTML = '<div class="empty-state"><div class="empty-icon">📉</div><div class="empty-text">No deliveries logged for this period.</div></div>';
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
            background: var(--bg-card); 
            border: 1px solid var(--border-glass);
            border-radius: 12px;
            box-shadow: var(--shadow);
          }
          .matrix-table { 
            border-collapse: collapse; 
            font-size: 12px; 
            white-space: nowrap; 
            width: max-content;
            min-width: 100%;
          }
          .matrix-table th, .matrix-table td {
            padding: 8px 12px;
            border-right: 1px solid rgba(255,255,255,0.05);
            border-bottom: 1px solid rgba(255,255,255,0.05);
            text-align: center;
          }
          .matrix-table th {
            background: var(--bg-glass);
            color: var(--text-secondary);
            font-weight: 600;
            font-size: 10px;
          }
          /* Sticky First Column for Client Name */
          .sticky-col {
            position: sticky;
            left: 0;
            background: #151b2c !important;
            z-index: 10;
            text-align: left !important;
            min-width: 120px;
            max-width: 140px;
            overflow: hidden;
            text-overflow: ellipsis;
            border-right: 1.5px solid var(--border-glass) !important;
            box-shadow: 2px 0 8px rgba(0,0,0,0.3);
          }
          .day-col { min-width: 40px; }
          .active-cell {
            font-weight: 800;
            color: var(--accent-cyan);
            background: rgba(6, 182, 212, 0.05);
          }
          .tot-col {
             background: rgba(255,255,255,0.03);
             font-weight: 800;
          }
          .row-accent:nth-child(even) td { background-color: rgba(255,255,255,0.02); }
          .row-accent:nth-child(even) .sticky-col { background: #181f32 !important; }
        </style>

        <div class="flex-between mb-8" style="font-size:11px; color:var(--text-secondary)">
          <span>Swipe left/right to scroll days →</span>
          <span>Total Jars: ${totalJars}</span>
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
      html += `<th class="tot-col" style="color:var(--accent-cyan)">JARS</th><th class="tot-col" style="color:var(--accent-green)">BOTL</th><th class="tot-col" style="color:#fbc02d">AMOUNT</th></tr></thead><tbody>`;

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
        html += `<tr class="row-accent"><td class="sticky-col"><strong>${c.name}</strong></td>`;
        
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
             html += `<td style="opacity:0.2">—</td>`;
           }
        }
        
        // Add Totals — Lightning O(1) Direct Lookup
        const amt = billMap[c.cid] || 0;
        const displayAmt = amt > 0 ? `₹${Math.round(amt).toLocaleString('en-IN')}` : `<span style="opacity:0.2">—</span>`;
        
        html += `<td class="tot-col" style="color:var(--accent-cyan)">${c.jars}</td>
                 <td class="tot-col" style="color:var(--accent-green)">${c.bottles}</td>
                 <td class="tot-col" style="color:#fbc02d; font-weight:800;">${displayAmt}</td></tr>`;
      });

      // 4. Generate Footer Total Row!
      const displayTotalMoney = totalMoney > 0 ? `₹${Math.round(totalMoney).toLocaleString('en-IN')}` : `<span style="opacity:0.2">—</span>`;
      
      html += `</tbody><tfoot><tr style="background:rgba(255,255,255,0.08); border-top:2px solid var(--accent-cyan)">
               <td class="sticky-col" style="background:#1c243b !important; color:#fff; font-weight:800;">👑 TOTAL</td>`;
      
      // Footer: day-wise columnar totals
      for(let d = 1; d <= daysInMonth; d++) {
        if (dayTotals[d] && (dayTotals[d].j > 0 || dayTotals[d].b > 0)) {
          html += `<td style="font-weight:800; color:#fff; background:rgba(255,255,255,0.05)">${dayTotals[d].j}/${dayTotals[d].b}</td>`;
        } else {
          html += `<td style="opacity:0.2">—</td>`;
        }
      }
      
      // Footer: Absolute Grand Totals
      html += `<td class="tot-col" style="color:var(--accent-cyan); background:rgba(6,182,212,0.15); font-weight:900; font-size:13px;">${totalJars}</td>
               <td class="tot-col" style="color:var(--accent-green); background:rgba(16,185,129,0.15); font-weight:900; font-size:13px;">${totalBottles}</td>
               <td class="tot-col" style="color:#fbc02d; background:rgba(245,158,11,0.15); font-weight:900; font-size:13px;">${displayTotalMoney}</td>
               </tr></tfoot></table></div>
               
               <!-- Beautiful Summary Footer Panel -->
               <div class="card" style="margin-top:20px; border-top: 4px solid var(--accent-cyan); background: linear-gradient(135deg, #1e293b, #0f172a);">
                 <div style="font-weight:bold; margin-bottom:15px; font-size:14px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:8px;">📋 Monthly Summary Analytics</div>
                 <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:15px;">
                   <div style="background:rgba(6,182,212,0.08); padding:12px; border-radius:8px; text-align:center;">
                     <div style="font-size:11px; opacity:0.7; margin-bottom:4px;">Total Jars</div>
                     <div style="font-size:20px; font-weight:800; color:var(--accent-cyan)">${totalJars}</div>
                   </div>
                   <div style="background:rgba(16,185,129,0.08); padding:12px; border-radius:8px; text-align:center;">
                     <div style="font-size:11px; opacity:0.7; margin-bottom:4px;">Total Bottles</div>
                     <div style="font-size:20px; font-weight:800; color:var(--accent-green)">${totalBottles}</div>
                   </div>
                 </div>`;
                 
      if (totalMoney > 0) {
        // Mode A: Monetary Analytics activated (end of month)
        html += `<div style="background:rgba(245,158,11,0.12); padding:18px; border-radius:10px; text-align:center; border:2px solid #f59e0b;">
                   <div style="font-size:12px; font-weight:bold; color:#fbc02d; margin-bottom:6px; text-transform:uppercase; letter-spacing:1px;">👑 GRAND TOTAL REVENUE (BILLED)</div>
                   <div style="font-size:32px; font-weight:900; color:#fff; text-shadow: 0 0 10px rgba(245,158,11,0.4);">₹${Math.round(totalMoney).toLocaleString('en-IN')}</div>
                 </div>`;
      } else {
        // Mode B: Distribution Volumetric Mode (during physical delivery logging)
        html += `<div style="background:rgba(6,182,212,0.08); padding:18px; border-radius:10px; text-align:center; border:2px solid rgba(6,182,212,0.3);">
                   <div style="font-size:12px; font-weight:bold; color:var(--accent-cyan); margin-bottom:6px; text-transform:uppercase; letter-spacing:1px;">📊 GRAND TOTAL ITEMS (VOLUME)</div>
                   <div style="font-size:32px; font-weight:900; color:#fff; text-shadow: 0 0 10px rgba(6,182,212,0.3);">${totalJars + totalBottles} Units</div>
                 </div>`;
      }
      
      html += `</div>`;
               
      content.innerHTML = html;
      localStorage.setItem(cacheKey, html); // Sync to cache for next instant open!

    } catch (e) {
      console.error(e);
      content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Failed to fetch report: ${e.message}</div></div>`;
    }
  }
};
