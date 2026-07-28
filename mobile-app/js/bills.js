/* ===== Bills Module ===== */

// --- PDF Generation & Sharing Helpers ---
async function __genPDF(html) {
  return new Promise((resolve, reject) => {
    try {
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed; left:-9999px; top:0; width:595px; background:#fff; z-index:-1; padding:30px; box-sizing:border-box;';
      container.innerHTML = html;
      document.body.appendChild(container);
      
      const images = container.querySelectorAll('img');
      const imgPromises = Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(r => { img.onload = r; img.onerror = r; });
      });
      
      Promise.all(imgPromises).then(() => {
        setTimeout(() => {
          html2canvas(container, { scale: 2, useCORS: true, allowTaint: false, backgroundColor: '#ffffff' }).then(canvas => {
            document.body.removeChild(container);
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const imgW = pageW - 20;
            const imgH = (canvas.height * imgW) / canvas.width;
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 10, 10, imgW, Math.min(imgH, pageH - 20));
            resolve(pdf.output('blob'));
          }).catch(err => {
            document.body.removeChild(container);
            reject(err);
          });
        }, 500); // 500ms delay to ensure layout is fully resolved
      });
    } catch (e) {
      reject(e);
    }
  });
}



function __invWords(num) {
  if (num === 0) return "Zero";
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const h = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n/10)] + (n%10!==0?" "+a[n%10]:"");
    if (n < 1000) return a[Math.floor(n/100)] + " Hundred" + (n%100!==0?" and " + h(n%100):"");
    if (n < 100000) return h(Math.floor(n/1000)) + " Thousand" + (n%1000!==0?" " + h(n%1000):"");
    return h(Math.floor(n/100000)) + " Lakh" + (n%100000!==0?" " + h(n%100000):"");
  };
  return h(num);
}

function __invCSS() { return `
  body { font-family: "Times New Roman", Times, serif; margin:0; padding:30px; color:#000; font-size:12px; line-height:1.4; }
  .rel { text-align:center; font-style:italic; color:#666; font-size:11px; }
  .brand { text-align:center; font-size:28px; font-weight:bold; margin:4px 0 2px; letter-spacing:1px; }
  .addr { text-align:center; font-size:11px; color:#333; }
  .phone { text-align:center; font-weight:bold; margin-top:2px; font-size:13px; }
  .hr-tk { border-top:2px solid #000; margin:8px 0 2px; }
  .hr-tn { border-top:1px solid #000; margin-bottom:15px; }
  .inv-hd { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:15px; }
  .inv-tt { font-size:22px; font-weight:bold; }
  .bg { display:grid; grid-template-columns:1fr 1fr; border:1px solid #ccc; margin-bottom:20px; }
  .bg > div { padding:10px; }
  .bg1 { border-right:1px solid #ccc; }
  .bg-s { font-size:10px; font-weight:bold; color:#555; margin-bottom:5px; }
  table { width:100%; border-collapse:collapse; margin-bottom:10px; }
  th { background:#000; color:#fff; padding:8px; font-weight:bold; text-align:center; border:1px solid #000; }
  td { padding:10px; border:1px solid #ccc; }
  .tr { text-align:right; }
  .tc { text-align:center; }
  .trw { background:#f9f9f9; font-weight:bold; }
  .gb { display:flex; justify-content:space-between; border:2px solid #000; padding:15px; margin-top:5px; align-items:center; }
  .gv { font-size:22px; font-weight:bold; }
  .fg { display:grid; grid-template-columns:1.5fr 1fr 1fr; gap:15px; margin-top:20px; }
  .fb { border:1px solid #ccc; padding:10px; }
  .qr { display:block; margin:5px auto; width:100px; height:100px; }
  .fp { text-align:center; margin-top:25px; border-top:1px solid #eee; padding-top:5px; font-size:9px; font-style:italic; color:#888; }
`; }

function __invHeader() { return `
  <div class="rel" style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-style:normal;font-size:13px;margin-bottom:8px;">॥ श्री भैरवनाथ प्रसन्न ॥</div>
  <div style="text-align:center;margin-bottom:6px;"><img src="https://atharvakalhatkar.github.io/Aqua-/mobile-app/icons/logo.png" style="width:50px;height:50px;border-radius:50%;"></div>
  <div class="brand">BHAIRAVNATH COOL AQUA</div>
  <div class="addr">Bathe Wasti, Talawade, Tal. Haveli, Dist. Pune - 411 062</div>
  <div class="phone">Mob: 7030355656 / 8888355656</div>
  <div class="hr-tk"></div><div class="hr-tn"></div>
`; }

const Bills = {
  initialized: false,
  init() {
    if (this.initialized) return;
    const ms = document.getElementById('billMonth');
    const ys = document.getElementById('billYear');
    const now = new Date();
    const months = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
    ms.innerHTML = '';
    for (let i = 1; i <= 12; i++) {
      ms.innerHTML += `<option value="${i}" ${i===now.getMonth()+1?'selected':''}>${months[i]}</option>`;
    }
    ys.innerHTML = '';
    for (let y = now.getFullYear(); y >= now.getFullYear()-2; y--) {
      ys.innerHTML += `<option value="${y}">${y}</option>`;
    }
    this.initialized = true;
  },

  async load() {
    this.init();
    const month = parseInt(document.getElementById('billMonth').value);
    const year = parseInt(document.getElementById('billYear').value);
    const div = document.getElementById('billList');
    
    const cacheKey = 'cache_bills_' + month + '_' + year;
    let hydrated = false;

    // ⚡ Stale-While-Revalidate: Check Offline Storage first
    const offline = localStorage.getItem(cacheKey);
    if (offline) {
      try {
        const cached = JSON.parse(offline);
        this.renderBills(cached.dels, cached.bills, cached.custs, true);
        hydrated = true;
      } catch (e) {
        console.warn("Bills cache corrupt.");
      }
    }

    if (!hydrated) {
      div.innerHTML = '<div class="spinner"></div>';
    }

    try {
      // 1. Get all recorded deliveries for this month
      const startDate = `${year}-${String(month).padStart(2,'0')}-01`;
      const nextM = month === 12 ? 1 : month + 1;
      const nextY = month === 12 ? year + 1 : year;
      const endDate = `${nextY}-${String(nextM).padStart(2,'0')}-01`;
      
      // 1. Get all recorded deliveries for this month (Paginated to bypass 1000-row limit)
      let allDels = [];
      let page = 0;
      const pageSize = 1000;
      let delErr = null;
      while (true) {
        const { data: chunk, error } = await supabase.from('deliveries')
          .select('*')
          .gte('delivery_date', startDate)
          .lt('delivery_date', endDate)
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) { delErr = error; break; }
        if (!chunk || chunk.length === 0) break;
        allDels.push(...chunk);
        if (chunk.length < pageSize) break;
        page++;
      }
      const dels = allDels;
      
      // 2. Get generated bills
      const { data: bills, error: billErr } = await supabase.from('bills')
        .select('*').eq('bill_month', month).eq('bill_year', year);

      if (delErr || billErr) throw (delErr || billErr);

      // Pre-aggregate for customer search
      const delMapTemp = {};
      (dels || []).forEach(d => {
        if (!delMapTemp[d.customer_id]) delMapTemp[d.customer_id] = true;
      });
      const billedCustIdsTemp = new Set((bills || []).map(b => b.customer_id));
      const activeCustIdsTemp = new Set(Object.keys(delMapTemp).map(Number));
      const allCustIdsTemp = [...new Set([...billedCustIdsTemp, ...activeCustIdsTemp])];

      // 3. Fetch associated customer names
      let custs = [];
      if (allCustIdsTemp.length > 0) {
        const { data } = await supabase.from('customers').select('id,name').in('id', allCustIdsTemp);
        custs = data || [];
      }

      // Persist in storage for future offline startups
      localStorage.setItem(cacheKey, JSON.stringify({ dels: dels||[], bills: bills||[], custs }));

      this.renderBills(dels, bills, custs, false);

    } catch (e) {
      console.error(e);
      if (!hydrated) {
        div.innerHTML = '<div class="empty-state"><i data-lucide="alert-octagon" class="empty-icon-vector"></i><div class="empty-text">Ledger load failure: ' + e.message + '</div></div>';
        App.refreshIcons();
      } else {
        App.toast('📶 Offline Ledger copy maintained.', 'warning');
      }
    }
  },

  renderBills(dels, bills, custs, isOffline) {
    const div = document.getElementById('billList');

    // Aggregate delivery counts by customer
    const delMap = {};
    (dels || []).forEach(d => {
      if (!delMap[d.customer_id]) delMap[d.customer_id] = { jars: 0, bottles: 0 };
      delMap[d.customer_id].jars += (d.jar_qty || 0);
      delMap[d.customer_id].bottles += (d.bottle_qty || 0);
    });

    // Build a master list of customer IDs involved in this month
    const billedCustIds = new Set((bills || []).map(b => b.customer_id));
    const activeCustIds = new Set(Object.keys(delMap).map(Number));
    const allCustIds = [...new Set([...billedCustIds, ...activeCustIds])];

    if (allCustIds.length === 0) {
      document.getElementById('billCount').textContent = '0';
      const statEl = document.getElementById('statIncome');
      if (statEl) statEl.textContent = '₹0';
      div.innerHTML = '<div class="empty-state"><i data-lucide="file-text" class="empty-icon-vector"></i><div class="empty-text">No ledger activity recorded for this billing cycle.</div></div>';
      App.refreshIcons();
      return;
    }

    const nameMap = {};
    (custs || []).forEach(c => nameMap[c.id] = c.name);

    document.getElementById('billCount').textContent = allCustIds.length;

    // Total stats
    const totalAmount = (bills||[]).reduce((s,b) => s + (b.grand_total||0), 0);
    const paidAmount = (bills||[]).filter(b=>b.status==='PAID').reduce((s,b) => s + (b.grand_total||0), 0);

    const statEl = document.getElementById('statIncome');
    if (statEl) {
      statEl.textContent = '₹' + Math.round(totalAmount).toLocaleString('en-IN');
    }

    let html = '';
    if (isOffline) {
      html += `<div style="background:rgba(245,158,11,0.08); color:var(--accent-amber); border:1px solid rgba(245,158,11,0.2); border-radius:12px; padding:10px; margin-bottom:16px; font-size:10px; text-align:center; font-weight:800; display:flex; align-items:center; justify-content:center; gap:6px;">
        <i data-lucide="cloud-off" style="width:12px; height:12px;"></i> SHOWING OFFLINE LEDGER ARCHIVE
      </div>`;
    }

    html += `<div style="background:var(--bg-slate); border:1px solid var(--border-slate); border-radius:var(--radius-md); padding:20px; margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; padding-bottom:14px; border-bottom:1px solid var(--border-slate);">
        <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Ledger Total</div>
        <div style="font-size:20px; font-weight:800; color:var(--text-primary);">₹${Math.round(totalAmount).toLocaleString('en-IN')}</div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <div style="display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:var(--accent-emerald);">
          <i data-lucide="check-circle" style="width:12px; height:12px;"></i> Paid: ₹${Math.round(paidAmount).toLocaleString('en-IN')}
        </div>
        <div style="display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:var(--accent-amber);">
          <i data-lucide="clock" style="width:12px; height:12px;"></i> Unpaid: ₹${Math.round(totalAmount - paidAmount).toLocaleString('en-IN')}
        </div>
      </div>
    </div>`;

    // Combine data points for rendering
    const displayRows = allCustIds.map(cid => {
      const bill = (bills || []).find(b => b.customer_id === cid);
      const d = delMap[cid] || { jars: 0, bottles: 0 };
      return {
        cid,
        name: nameMap[cid] || 'Customer #' + cid,
        bill,
        d,
        isGenerated: !!bill
      };
    });

    // Sort alphabetically
    displayRows.sort((a,b) => a.name.localeCompare(b.name));

    displayRows.forEach(row => {
      const color = App.getAvatarColor(row.name);
      if (row.isGenerated) {
        const isPaid = row.bill.status === 'PAID';
        html += `<div class="list-item" onclick="Bills.showDetail(${row.bill.id})">
          <div class="list-avatar" style="background:${color}">${row.name.charAt(0).toUpperCase()}</div>
          <div class="list-content">
            <div class="list-name">${row.name}</div>
            <div class="list-detail">
              <i data-lucide="droplets" class="icon-xxs"></i> ${row.bill.total_jars} &nbsp;·&nbsp; <i data-lucide="glass-water" class="icon-xxs"></i> ${row.bill.total_bottles} &nbsp;·&nbsp; <span class="badge ${isPaid?'badge-paid':'badge-pending'}">${row.bill.status}</span>
            </div>
          </div>
          <div class="list-right"><div class="list-value" style="color:${isPaid?'var(--accent-emerald)':'var(--accent-amber)'}">₹${Math.round(row.bill.grand_total)}</div></div>
        </div>`;
      } else {
        html += `<div class="list-item" onclick="Bills.showUnbilledDetail('${encodeURIComponent(row.name)}', ${row.d.jars}, ${row.d.bottles}, ${row.cid})">
          <div class="list-avatar" style="background:${color}">${row.name.charAt(0).toUpperCase()}</div>
          <div class="list-content">
            <div class="list-name">${row.name}</div>
            <div class="list-detail">
              <i data-lucide="droplets" class="icon-xxs"></i> ${row.d.jars} &nbsp;·&nbsp; <i data-lucide="glass-water" class="icon-xxs"></i> ${row.d.bottles} &nbsp;·&nbsp; <span class="badge" style="background:rgba(255,255,255,0.04); color:var(--accent-cyan);"><i data-lucide="activity" style="width:8px; height:8px;"></i> OPEN</span>
            </div>
          </div>
          <div class="list-right"><div class="list-value" style="color:var(--text-muted); font-size:11px; font-weight:700;">Draft</div></div>
        </div>`;
      }
    });
    
    div.innerHTML = html;
    App.refreshIcons();
  },

  async showUnbilledDetail(name, jars, bottles, cid) {
    const decodedName = decodeURIComponent(name);
    const months = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const fullMonths = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
    const curMonth = parseInt(document.getElementById('billMonth').value);
    const curYear = parseInt(document.getElementById('billYear').value);
    
    // Pre-fetch customer details for mobile number for WhatsApp integration
    let customerData = null;
    try {
      const { data } = await supabase.from('customers').select('mobile').eq('id', cid).single();
      customerData = data;
    } catch(e) {}

    window.calcTempBill = function() {
      const jR = parseFloat(document.getElementById('tempJarRate').value) || 0;
      const bR = parseFloat(document.getElementById('tempBotRate').value) || 0;
      const t = (jars * jR) + (bottles * bR);
      document.getElementById('tempTotalDisplay').textContent = '₹' + Math.round(t).toLocaleString('en-IN');
    };

    window.saveOfficialBill = async function() {
      try {
        const jR = parseFloat(document.getElementById('tempJarRate').value);
        const bR = parseFloat(document.getElementById('tempBotRate').value);
        if (isNaN(jR) || isNaN(bR)) { App.alert("Please enter valid rates to finalize.", "warning"); return; }
        
        const jA = jars * jR;
        const bA = bottles * bR;
        const total = jA + bA;

        // Removed window.confirm blocker to bypass browser suppression bugs
        const res = await OfflineVault.safeInsert('bills', {
          customer_id: cid,
          bill_month: curMonth,
          bill_year: curYear,
          total_jars: jars,
          total_bottles: bottles,
          jar_rate: jR,
          bottle_rate: bR,
          jar_amount: jA,
          bottle_amount: bA,
          grand_total: total,
          status: 'PENDING',
          generated_at: new Date().toISOString()
        });
        
        if (res.error) throw res.error;
        App.toast("Official Bill Finalized Successfully! 💾");
        App.closeModal();
        Bills.load(); // Reload the list
      } catch (err) {
        App.alert("CRITICAL BUG DETECTED: " + (err.message || err), "error");
      }
    };

    window.shareWhatsApp = async function() {
      const jR = parseFloat(document.getElementById('tempJarRate').value) || 0;
      const bR = parseFloat(document.getElementById('tempBotRate').value) || 0;
      const jA = jars * jR;
      const bA = bottles * bR;
      const t = jA + bA;
      
      const rawMob = customerData?.mobile ? customerData.mobile.replace(/[^0-9]/g, "") : "";
      let mob = rawMob;
      if (mob.length === 10) mob = "91" + mob;

      // Build text message
      const msg = `॥ श्री भैरवनाथ प्रसन्न ॥
*BHAIRAVNATH COOL AQUA*
Bathe Wasti, Talawade, Tal. Haveli, Dist. Pune - 411 062
📞 7030355656 / 8888355656
─────────────────────
*INVOICE (Draft)*
📅 ${new Date().toLocaleDateString('en-IN')}
👤 *${decodedName}*
📆 ${fullMonths[curMonth]} ${curYear}
─────────────────────
*| Item | Qty | Rate | Amount*
1) 20L Jars     ${jars} × ₹${jR} = ₹${Math.round(jA)}
2) 20L Bottles  ${bottles} × ₹${bR} = ₹${Math.round(bA)}
─────────────────────
*Grand Total: ₹${Math.round(t).toLocaleString('en-IN')}*
(${__invWords(Math.round(t))} Rupees Only)
─────────────────────
*BANK DETAILS*
A/c: Bhairavnath Cool Aqua
Bank: LONAVALA SAHAKARI BANK LTD., Talawade
A/c No: 004002100000888
IFSC: HDFC0CLSABL
─────────────────────
✅ *Pay instantly via UPI:*
upi://pay?pa=7030355656-6@ibl&pn=Bhairavnath%20Cool%20Aqua&am=${t}&cu=INR
─────────────────────
Thank you for your business! 🙏
- Bhairavnath Cool Aqua`;

      // Try generating PDF + Web Share (sends PDF file + text directly to WhatsApp)
      try {
        const dateStr = new Date(curYear, curMonth, 1).toLocaleDateString('en-IN');
        const upiLink = `upi://pay?pa=7030355656-6@ibl&pn=Bhairavnath%20Cool%20Aqua&am=${t}&cu=INR`;
        const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(upiLink)}&size=150&margin=1`;
        const w = __invWords(Math.round(t));
        const html = `<html><head><style>${__invCSS()}</style></head><body>
          ${__invHeader()}
          <div class="inv-hd"><div class="inv-tt">INVOICE</div><div style="font-family:monospace;font-weight:bold;">Draft / Mobile</div><div><strong>Date:</strong> ${dateStr}</div></div>
          <div class="bg"><div class="bg1"><div class="bg-s">BILL TO</div><div style="font-size:15px;font-weight:bold;">${decodedName}</div></div><div><div class="bg-s">BILLING PERIOD</div><div style="font-size:12px;"><strong>1 ${fullMonths[curMonth]} to ${new Date(curYear, curMonth, 0).getDate()} ${fullMonths[curMonth]} ${curYear}</strong></div></div></div>
          <table><thead><tr><th style="width:8%">#</th><th>Description</th><th style="width:15%">Qty</th><th style="width:15%">Rate</th><th style="width:20%">Amount</th></tr></thead>
          <tbody><tr><td class="tc">1</td><td>20 Ltr Water Jar</td><td class="tc"><strong>${jars}</strong></td><td class="tc">₹${jR}</td><td class="tr"><strong>₹${Math.round(jA)}</strong></td></tr>
          <tr><td class="tc">2</td><td>20 Ltr Water Bottle</td><td class="tc"><strong>${bottles}</strong></td><td class="tc">₹${bR}</td><td class="tr"><strong>₹${Math.round(bA)}</strong></td></tr>
          <tr class="trw"><td colspan="3"></td><td class="tr">TOTAL</td><td class="tr">₹${Math.round(t)}</td></tr></tbody></table>
          <div class="gb"><div><div style="font-size:10px;font-weight:bold;">Amount in Words:</div>${w} Rupees Only</div><div class="tr"><div style="font-size:11px;font-weight:bold;">GRAND TOTAL</div><div class="gv">₹ ${Math.round(t).toLocaleString('en-IN')}</div></div></div>
          <div class="fg"><div class="fb"><span style="font-weight:bold;display:block;margin-bottom:5px;font-size:10px;">BANK DETAILS</span><div>A/c Name: Bhairavnath Cool Aqua</div><div>Bank: LONAVALA SAHAKARI BANK LTD.</div><div>Branch: Talawade</div><div>A/c No: 004002100000888</div><div>IFSC: HDFC0CLSABL</div></div>
          <div class="fb" style="text-align:center;"><span style="font-weight:bold;display:block;margin-bottom:5px;font-size:10px;">SCAN TO PAY</span><img src="${qrUrl}" class="qr" alt="QR"><div style="font-size:9px;font-weight:bold;">7030355656-6@ibl</div></div>
          <div class="fb" style="border:none;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;text-align:center;"><div style="flex-grow:1; display:flex; align-items:flex-end; justify-content:center; min-height:70px; position:relative;"><img src="icons/stamp.png" crossorigin="anonymous" style="height:75px; width:auto; object-fit:contain; opacity:0.85; position:absolute; bottom:5px; z-index:1;" onerror="this.style.display='none'"></div><div style="border-top:1px solid #666;width:80%;margin-bottom:5px;position:relative;z-index:2;"></div><div style="font-weight:bold;font-size:10px;position:relative;z-index:2;">For Bhairavnath Cool Aqua</div><div style="font-size:9px;position:relative;z-index:2;">Authorized Signatory</div></div></div>
          <div class="fp">This is a computer generated estimate via Mobile App. | Bhairavnath Cool Aqua Management System</div>
        </body></html>`;
        const blob = await __genPDF(html);
        const f = new File([blob], `Invoice_${decodedName}.pdf`, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [f] })) {
          await navigator.share({ files: [f], text: msg });
          return;
        }
      } catch(e) { console.warn('Web Share failed, falling back:', e); }

      // Fallback: download PDF + open WhatsApp text
      try {
        const dateStr = new Date(curYear, curMonth, 1).toLocaleDateString('en-IN');
        const upiLink = `upi://pay?pa=7030355656-6@ibl&pn=Bhairavnath%20Cool%20Aqua&am=${t}&cu=INR`;
        const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(upiLink)}&size=150&margin=1`;
        const w = __invWords(Math.round(t));
        const html = `<html><head><style>${__invCSS()}</style></head><body>
          ${__invHeader()}
          <div class="inv-hd"><div class="inv-tt">INVOICE</div><div style="font-family:monospace;font-weight:bold;">Draft / Mobile</div><div><strong>Date:</strong> ${dateStr}</div></div>
          <div class="bg"><div class="bg1"><div class="bg-s">BILL TO</div><div style="font-size:15px;font-weight:bold;">${decodedName}</div></div><div><div class="bg-s">BILLING PERIOD</div><div style="font-size:12px;"><strong>1 ${fullMonths[curMonth]} to ${new Date(curYear, curMonth, 0).getDate()} ${fullMonths[curMonth]} ${curYear}</strong></div></div></div>
          <table><thead><tr><th style="width:8%">#</th><th>Description</th><th style="width:15%">Qty</th><th style="width:15%">Rate</th><th style="width:20%">Amount</th></tr></thead>
          <tbody><tr><td class="tc">1</td><td>20 Ltr Water Jar</td><td class="tc"><strong>${jars}</strong></td><td class="tc">₹${jR}</td><td class="tr"><strong>₹${Math.round(jA)}</strong></td></tr>
          <tr><td class="tc">2</td><td>20 Ltr Water Bottle</td><td class="tc"><strong>${bottles}</strong></td><td class="tc">₹${bR}</td><td class="tr"><strong>₹${Math.round(bA)}</strong></td></tr>
          <tr class="trw"><td colspan="3"></td><td class="tr">TOTAL</td><td class="tr">₹${Math.round(t)}</td></tr></tbody></table>
          <div class="gb"><div><div style="font-size:10px;font-weight:bold;">Amount in Words:</div>${w} Rupees Only</div><div class="tr"><div style="font-size:11px;font-weight:bold;">GRAND TOTAL</div><div class="gv">₹ ${Math.round(t).toLocaleString('en-IN')}</div></div></div>
          <div class="fg"><div class="fb"><span style="font-weight:bold;display:block;margin-bottom:5px;font-size:10px;">BANK DETAILS</span><div>A/c Name: Bhairavnath Cool Aqua</div><div>Bank: LONAVALA SAHAKARI BANK LTD.</div><div>Branch: Talawade</div><div>A/c No: 004002100000888</div><div>IFSC: HDFC0CLSABL</div></div>
          <div class="fb" style="text-align:center;"><span style="font-weight:bold;display:block;margin-bottom:5px;font-size:10px;">SCAN TO PAY</span><img src="${qrUrl}" class="qr" alt="QR"><div style="font-size:9px;font-weight:bold;">7030355656-6@ibl</div></div>
          <div class="fb" style="border:none;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;text-align:center;"><div style="flex-grow:1; display:flex; align-items:flex-end; justify-content:center; min-height:70px; position:relative;"><img src="icons/stamp.png" crossorigin="anonymous" style="height:75px; width:auto; object-fit:contain; opacity:0.85; position:absolute; bottom:5px; z-index:1;" onerror="this.style.display='none'"></div><div style="border-top:1px solid #666;width:80%;margin-bottom:5px;position:relative;z-index:2;"></div><div style="font-weight:bold;font-size:10px;position:relative;z-index:2;">For Bhairavnath Cool Aqua</div><div style="font-size:9px;position:relative;z-index:2;">Authorized Signatory</div></div></div>
          <div class="fp">This is a computer generated estimate via Mobile App. | Bhairavnath Cool Aqua Management System</div>
        </body></html>`;
        const blob = await __genPDF(html);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice_${decodedName}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        App.toast('PDF downloaded. Now sharing via WhatsApp...', 'info');
      } catch(e) { console.warn('PDF download failed:', e); }
      
      window.open(`https://wa.me/${mob}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    window.printTempBill = async function() {
      const jR = parseFloat(document.getElementById('tempJarRate').value) || 0;
      const bR = parseFloat(document.getElementById('tempBotRate').value) || 0;
      const jA = jars * jR;
      const bA = bottles * bR;
      const t = jA + bA;
      const dateStr = new Date(curYear, curMonth, 1).toLocaleDateString('en-IN');
      const upiLink = `upi://pay?pa=7030355656-6@ibl&pn=Bhairavnath%20Cool%20Aqua&am=${t}&cu=INR`;
      const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(upiLink)}&size=150&margin=1`;
      const w = __invWords(Math.round(t));
      const html = `<html><head><style>${__invCSS()}</style></head><body>
        ${__invHeader()}
        <div class="inv-hd"><div class="inv-tt">INVOICE</div><div style="font-family:monospace;font-weight:bold;">Draft / Mobile</div><div><strong>Date:</strong> ${dateStr}</div></div>
        <div class="bg"><div class="bg1"><div class="bg-s">BILL TO</div><div style="font-size:15px;font-weight:bold;">${decodedName}</div></div><div><div class="bg-s">BILLING PERIOD</div><div style="font-size:12px;"><strong>1 ${fullMonths[curMonth]} to ${new Date(curYear, curMonth, 0).getDate()} ${fullMonths[curMonth]} ${curYear}</strong></div></div></div>
        <table><thead><tr><th style="width:8%">#</th><th>Description</th><th style="width:15%">Qty</th><th style="width:15%">Rate</th><th style="width:20%">Amount</th></tr></thead>
        <tbody><tr><td class="tc">1</td><td>20 Ltr Water Jar</td><td class="tc"><strong>${jars}</strong></td><td class="tc">₹${jR}</td><td class="tr"><strong>₹${Math.round(jA)}</strong></td></tr>
        <tr><td class="tc">2</td><td>20 Ltr Water Bottle</td><td class="tc"><strong>${bottles}</strong></td><td class="tc">₹${bR}</td><td class="tr"><strong>₹${Math.round(bA)}</strong></td></tr>
        <tr class="trw"><td colspan="3"></td><td class="tr">TOTAL</td><td class="tr">₹${Math.round(t)}</td></tr></tbody></table>
        <div class="gb"><div><div style="font-size:10px;font-weight:bold;">Amount in Words:</div>${w} Rupees Only</div><div class="tr"><div style="font-size:11px;font-weight:bold;">GRAND TOTAL</div><div class="gv">₹ ${Math.round(t).toLocaleString('en-IN')}</div></div></div>
        <div class="fg"><div class="fb"><span style="font-weight:bold;display:block;margin-bottom:5px;font-size:10px;">BANK DETAILS</span><div>A/c Name: Bhairavnath Cool Aqua</div><div>Bank: LONAVALA SAHAKARI BANK LTD.</div><div>Branch: Talawade</div><div>A/c No: 004002100000888</div><div>IFSC: HDFC0CLSABL</div></div>
        <div class="fb" style="text-align:center;"><span style="font-weight:bold;display:block;margin-bottom:5px;font-size:10px;">SCAN TO PAY</span><img src="${qrUrl}" class="qr" alt="QR"><div style="font-size:9px;font-weight:bold;">7030355656-6@ibl</div></div>
        <div class="fb" style="border:none;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;text-align:center;"><div style="flex-grow:1; display:flex; align-items:flex-end; justify-content:center; min-height:70px; position:relative;"><img src="icons/stamp.png" crossorigin="anonymous" style="height:75px; width:auto; object-fit:contain; opacity:0.85; position:absolute; bottom:5px; z-index:1;" onerror="this.style.display='none'"></div><div style="border-top:1px solid #666;width:80%;margin-bottom:5px;position:relative;z-index:2;"></div><div style="font-weight:bold;font-size:10px;position:relative;z-index:2;">For Bhairavnath Cool Aqua</div><div style="font-size:9px;position:relative;z-index:2;">Authorized Signatory</div></div></div>
        <div class="fp">This is a computer generated estimate via Mobile App. | Bhairavnath Cool Aqua Management System</div>
      </body></html>`;
      try {
        const blob = await __genPDF(html);
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      } catch(e) {
        console.warn('PDF generation failed, using fallback:', e);
        const w = window.open('', '_blank');
        w.document.write(`<html><head><title>Invoice_${decodedName}</title><style>${__invCSS()}</style></head><body>
          ${__invHeader()}
          <div class="inv-hd"><div class="inv-tt">INVOICE</div><div style="font-family:monospace;font-weight:bold;">Draft / Mobile</div><div><strong>Date:</strong> ${dateStr}</div></div>
          <div class="bg"><div class="bg1"><div class="bg-s">BILL TO</div><div style="font-size:15px;font-weight:bold;">${decodedName}</div></div><div><div class="bg-s">BILLING PERIOD</div><div style="font-size:12px;"><strong>1 ${fullMonths[curMonth]} to ${new Date(curYear, curMonth, 0).getDate()} ${fullMonths[curMonth]} ${curYear}</strong></div></div></div>
          <table><thead><tr><th style="width:8%">#</th><th>Description</th><th style="width:15%">Qty</th><th style="width:15%">Rate</th><th style="width:20%">Amount</th></tr></thead>
          <tbody><tr><td class="tc">1</td><td>20 Ltr Water Jar</td><td class="tc"><strong>${jars}</strong></td><td class="tc">₹${jR}</td><td class="tr"><strong>₹${Math.round(jA)}</strong></td></tr>
          <tr><td class="tc">2</td><td>20 Ltr Water Bottle</td><td class="tc"><strong>${bottles}</strong></td><td class="tc">₹${bR}</td><td class="tr"><strong>₹${Math.round(bA)}</strong></td></tr>
          <tr class="trw"><td colspan="3"></td><td class="tr">TOTAL</td><td class="tr">₹${Math.round(t)}</td></tr></tbody></table>
          <div class="gb"><div><div style="font-size:10px;font-weight:bold;">Amount in Words:</div>${w} Rupees Only</div><div class="tr"><div style="font-size:11px;font-weight:bold;">GRAND TOTAL</div><div class="gv">₹ ${Math.round(t).toLocaleString('en-IN')}</div></div></div>
          <div class="fg"><div class="fb"><span style="font-weight:bold;display:block;margin-bottom:5px;font-size:10px;">BANK DETAILS</span><div>A/c Name: Bhairavnath Cool Aqua</div><div>Bank: LONAVALA SAHAKARI BANK LTD.</div><div>Branch: Talawade</div><div>A/c No: 004002100000888</div><div>IFSC: HDFC0CLSABL</div></div>
          <div class="fb" style="text-align:center;"><span style="font-weight:bold;display:block;margin-bottom:5px;font-size:10px;">SCAN TO PAY</span><img src="${qrUrl}" class="qr" alt="QR"><div style="font-size:9px;font-weight:bold;">7030355656-6@ibl</div></div>
          <div class="fb" style="border:none;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;text-align:center;"><div style="flex-grow:1; display:flex; align-items:flex-end; justify-content:center; min-height:70px; position:relative;"><img src="icons/stamp.png" crossorigin="anonymous" style="height:75px; width:auto; object-fit:contain; opacity:0.85; position:absolute; bottom:5px; z-index:1;" onerror="this.style.display='none'"></div><div style="border-top:1px solid #666;width:80%;margin-bottom:5px;position:relative;z-index:2;"></div><div style="font-weight:bold;font-size:10px;position:relative;z-index:2;">For Bhairavnath Cool Aqua</div><div style="font-size:9px;position:relative;z-index:2;">Authorized Signatory</div></div></div>
          <div class="fp">This is a computer generated estimate via Mobile App. | Bhairavnath Cool Aqua Management System</div>
        </body></html>`);
        w.document.close();
      }
    };

    App.showModal(`
      <div class="modal-title"><i data-lucide="file-plus"></i> Billing Portal</div>
      <div style="background:var(--bg-slate); border:1px solid var(--border-slate); border-radius:var(--radius-md); padding:20px; margin-bottom:20px;">
        <h3 style="margin:0 0 4px 0; font-size:15px; font-weight:800; color:var(--text-primary);">${decodedName}</h3>
        <p style="margin-bottom:18px; font-size:12px; font-weight:600; color:var(--text-secondary);">Billing Cycle: ${months[curMonth]} ${curYear}</p>
        
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding:10px 14px; background:rgba(255,255,255,0.03); border:1px solid var(--border-slate); border-radius:var(--radius-sm);">
           <span style="font-size:13px; font-weight:700; display:inline-flex; align-items:center; gap:6px;"><i data-lucide="droplets" style="width:14px; height:14px; color:var(--accent-cyan);"></i> Jars: <strong>${jars}</strong></span>
           <input type="number" id="tempJarRate" placeholder="Rate" oninput="calcTempBill()" style="width:80px; background:transparent; border:1px solid var(--border-slate-bright); color:var(--text-primary); border-radius:8px; padding:6px 10px; text-align:right; font-family:inherit; font-weight:700;">
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; padding:10px 14px; background:rgba(255,255,255,0.03); border:1px solid var(--border-slate); border-radius:var(--radius-sm);">
           <span style="font-size:13px; font-weight:700; display:inline-flex; align-items:center; gap:6px;"><i data-lucide="glass-water" style="width:14px; height:14px; color:var(--accent-violet);"></i> Bottles: <strong>${bottles}</strong></span>
           <input type="number" id="tempBotRate" placeholder="Rate" oninput="calcTempBill()" style="width:80px; background:transparent; border:1px solid var(--border-slate-bright); color:var(--text-primary); border-radius:8px; padding:6px 10px; text-align:right; font-family:inherit; font-weight:700;">
        </div>

        <div style="border-top:1px solid var(--border-slate); padding-top:14px; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Projected Total</span>
          <span id="tempTotalDisplay" style="font-size:22px; font-weight:800; color:var(--accent-cyan); letter-spacing:-0.02em;">₹0</span>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px;">
         <button class="btn btn-outline" onclick="printTempBill()">
           <i data-lucide="file-text"></i> Open PDF
         </button>
         <button class="btn btn-outline" onclick="shareWhatsApp()" style="border-color:#25D366; color:#25D366;">
           <i data-lucide="message-square"></i> Share PDF
         </button>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px;">
         <button class="btn btn-primary" onclick="saveOfficialBill()">
           <i data-lucide="check-circle"></i> Finalize
         </button>
         <button class="btn btn-outline" onclick="App.closeModal()" style="opacity:0.6;">Cancel</button>
      </div>
    `);
  },

  async showDetail(id) {
    let b, c;
    try {
      const resB = await supabase.from('bills').select('*').eq('id', id).single();
      b = resB.data;
      if (b) {
        const resC = await supabase.from('customers').select('name,mobile,email').eq('id', b.customer_id).single();
        c = resC.data;
      }
    } catch (e) {
      App.toast('Cannot load bill details offline.', 'warning');
      return;
    }
    if (!b) return;
    
    const name = c?.name || 'Customer';
    const months = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const fullMonths = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
    const isPaid = b.status === 'PAID';

    window.printFinalized = async function() {
      const jR = b.jar_rate, bR = b.bottle_rate, jars = b.total_jars, bottles = b.total_bottles;
      const jA = b.jar_amount, bA = b.bottle_amount, t = b.grand_total;
      const dateStr = new Date(b.bill_year, b.bill_month, 1).toLocaleDateString('en-IN');
      const invNo = `BCA-${b.bill_year % 100}${String(b.bill_month).padStart(2,'0')}-${b.id}`;
      const upiLink = `upi://pay?pa=7030355656-6@ibl&pn=Bhairavnath%20Cool%20Aqua&am=${t}&cu=INR`;
      const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(upiLink)}&size=150&margin=1`;
      const w = __invWords(Math.round(t));
      const html = `<html><head><style>${__invCSS()}</style></head><body>
        ${__invHeader()}
        <div class="inv-hd"><div class="inv-tt">INVOICE</div><div><strong>No:</strong> ${invNo}</div><div><strong>Date:</strong> ${dateStr}</div></div>
        <div class="bg"><div class="bg1"><div class="bg-s">BILL TO</div><div style="font-size:15px;font-weight:bold;">${name}</div></div><div><div class="bg-s">BILLING PERIOD</div><div style="font-size:12px;"><strong>1 ${fullMonths[b.bill_month]} to ${new Date(b.bill_year, b.bill_month, 0).getDate()} ${fullMonths[b.bill_month]} ${b.bill_year}</strong></div></div></div>
        <table><thead><tr><th style="width:8%">#</th><th>Description</th><th style="width:15%">Qty</th><th style="width:15%">Rate</th><th style="width:20%">Amount</th></tr></thead>
        <tbody><tr><td class="tc">1</td><td>20 Ltr Water Jar</td><td class="tc"><strong>${jars}</strong></td><td class="tc">₹${jR}</td><td class="tr"><strong>₹${Math.round(jA)}</strong></td></tr>
        <tr><td class="tc">2</td><td>20 Ltr Water Bottle</td><td class="tc"><strong>${bottles}</strong></td><td class="tc">₹${bR}</td><td class="tr"><strong>₹${Math.round(bA)}</strong></td></tr>
        <tr class="trw"><td colspan="3"></td><td class="tr">TOTAL</td><td class="tr">₹${Math.round(t)}</td></tr></tbody></table>
        <div class="gb"><div><div style="font-size:10px;font-weight:bold;">Amount in Words:</div>${w} Rupees Only</div><div class="tr"><div style="font-size:11px;font-weight:bold;">GRAND TOTAL</div><div class="gv">₹ ${Math.round(t).toLocaleString('en-IN')}</div></div></div>
        <div class="fg"><div class="fb"><span style="font-weight:bold;display:block;margin-bottom:5px;font-size:10px;">BANK DETAILS</span><div>A/c Name: Bhairavnath Cool Aqua</div><div>Bank: LONAVALA SAHAKARI BANK LTD.</div><div>Branch: Talawade</div><div>A/c No: 004002100000888</div><div>IFSC: HDFC0CLSABL</div></div>
        <div class="fb" style="text-align:center;"><span style="font-weight:bold;display:block;margin-bottom:5px;font-size:10px;">SCAN TO PAY</span><img src="${qrUrl}" class="qr" alt="QR"><div style="font-size:9px;font-weight:bold;">7030355656-6@ibl</div></div>
        <div class="fb" style="border:none;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;text-align:center;"><div style="flex-grow:1; display:flex; align-items:flex-end; justify-content:center; min-height:70px; position:relative;"><img src="icons/stamp.png" crossorigin="anonymous" style="height:75px; width:auto; object-fit:contain; opacity:0.85; position:absolute; bottom:5px; z-index:1;" onerror="this.style.display='none'"></div><div style="border-top:1px solid #666;width:80%;margin-bottom:5px;position:relative;z-index:2;"></div><div style="font-weight:bold;font-size:10px;position:relative;z-index:2;">For Bhairavnath Cool Aqua</div><div style="font-size:9px;position:relative;z-index:2;">Authorized Signatory</div></div></div>
        <div class="fp">This is a computer generated invoice. | Bhairavnath Cool Aqua Management System</div>
      </body></html>`;
      try {
        const blob = await __genPDF(html);
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      } catch(e) {
        console.warn('PDF generation failed, using fallback:', e);
        const w = window.open('', '_blank');
        w.document.write(`<html><head><title>Invoice_${name}</title><style>${__invCSS()}</style></head><body>
          ${__invHeader()}
          <div class="inv-hd"><div class="inv-tt">INVOICE</div><div><strong>No:</strong> ${invNo}</div><div><strong>Date:</strong> ${dateStr}</div></div>
          <div class="bg"><div class="bg1"><div class="bg-s">BILL TO</div><div style="font-size:15px;font-weight:bold;">${name}</div></div><div><div class="bg-s">BILLING PERIOD</div><div style="font-size:12px;"><strong>1 ${fullMonths[b.bill_month]} to ${new Date(b.bill_year, b.bill_month, 0).getDate()} ${fullMonths[b.bill_month]} ${b.bill_year}</strong></div></div></div>
          <table><thead><tr><th style="width:8%">#</th><th>Description</th><th style="width:15%">Qty</th><th style="width:15%">Rate</th><th style="width:20%">Amount</th></tr></thead>
          <tbody><tr><td class="tc">1</td><td>20 Ltr Water Jar</td><td class="tc"><strong>${jars}</strong></td><td class="tc">₹${jR}</td><td class="tr"><strong>₹${Math.round(jA)}</strong></td></tr>
          <tr><td class="tc">2</td><td>20 Ltr Water Bottle</td><td class="tc"><strong>${bottles}</strong></td><td class="tc">₹${bR}</td><td class="tr"><strong>₹${Math.round(bA)}</strong></td></tr>
          <tr class="trw"><td colspan="3"></td><td class="tr">TOTAL</td><td class="tr">₹${Math.round(t)}</td></tr></tbody></table>
          <div class="gb"><div><div style="font-size:10px;font-weight:bold;">Amount in Words:</div>${w} Rupees Only</div><div class="tr"><div style="font-size:11px;font-weight:bold;">GRAND TOTAL</div><div class="gv">₹ ${Math.round(t).toLocaleString('en-IN')}</div></div></div>
          <div class="fg"><div class="fb"><span style="font-weight:bold;display:block;margin-bottom:5px;font-size:10px;">BANK DETAILS</span><div>A/c Name: Bhairavnath Cool Aqua</div><div>Bank: LONAVALA SAHAKARI BANK LTD.</div><div>Branch: Talawade</div><div>A/c No: 004002100000888</div><div>IFSC: HDFC0CLSABL</div></div>
          <div class="fb" style="text-align:center;"><span style="font-weight:bold;display:block;margin-bottom:5px;font-size:10px;">SCAN TO PAY</span><img src="${qrUrl}" class="qr" alt="QR"><div style="font-size:9px;font-weight:bold;">7030355656-6@ibl</div></div>
          <div class="fb" style="border:none;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;text-align:center;"><div style="flex-grow:1; display:flex; align-items:flex-end; justify-content:center; min-height:70px; position:relative;"><img src="icons/stamp.png" crossorigin="anonymous" style="height:75px; width:auto; object-fit:contain; opacity:0.85; position:absolute; bottom:5px; z-index:1;" onerror="this.style.display='none'"></div><div style="border-top:1px solid #666;width:80%;margin-bottom:5px;position:relative;z-index:2;"></div><div style="font-weight:bold;font-size:10px;position:relative;z-index:2;">For Bhairavnath Cool Aqua</div><div style="font-size:9px;position:relative;z-index:2;">Authorized Signatory</div></div></div>
          <div class="fp">This is a computer generated invoice. | Bhairavnath Cool Aqua Management System</div>
        </body></html>`);
        w.document.close();
      }
    };

    window.shareWhatsAppFinal = async function() {
      const rawMob = c?.mobile ? c.mobile.replace(/[^0-9]/g, "") : "";
      let mob = rawMob;
      if (mob.length === 10) mob = "91" + mob;
      
      const t = b.grand_total;
      const invNo = `BCA-${b.bill_year % 100}${String(b.bill_month).padStart(2,'0')}-${b.id}`;
      const msg = `॥ श्री भैरवनाथ प्रसन्न ॥
*BHAIRAVNATH COOL AQUA*
Bathe Wasti, Talawade, Tal. Haveli, Dist. Pune - 411 062
📞 7030355656 / 8888355656
─────────────────────
*INVOICE*
🧾 No: ${invNo}
📅 ${new Date().toLocaleDateString('en-IN')}
👤 *${name}*
📆 ${fullMonths[b.bill_month]} ${b.bill_year}
─────────────────────
*| Item | Qty | Rate | Amount*
1) 20L Jars     ${b.total_jars} × ₹${b.jar_rate} = ₹${Math.round(b.jar_amount)}
2) 20L Bottles  ${b.total_bottles} × ₹${b.bottle_rate} = ₹${Math.round(b.bottle_amount)}
─────────────────────
*Grand Total: ₹${Math.round(t).toLocaleString('en-IN')}*
(${__invWords(Math.round(t))} Rupees Only)
─────────────────────
*BANK DETAILS*
A/c: Bhairavnath Cool Aqua
Bank: LONAVALA SAHAKARI BANK LTD., Talawade
A/c No: 004002100000888
IFSC: HDFC0CLSABL
─────────────────────
✅ *Pay instantly via UPI:*
upi://pay?pa=7030355656-6@ibl&pn=Bhairavnath%20Cool%20Aqua&am=${t}&cu=INR
─────────────────────
Thank you for your business! 🙏
- Bhairavnath Cool Aqua`;

      // Try generating PDF + Web Share (sends PDF file + text directly to WhatsApp)
      try {
        const dateStr = new Date(b.bill_year, b.bill_month, 1).toLocaleDateString('en-IN');
        const upiLink = `upi://pay?pa=7030355656-6@ibl&pn=Bhairavnath%20Cool%20Aqua&am=${t}&cu=INR`;
        const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(upiLink)}&size=150&margin=1`;
        const w = __invWords(Math.round(t));
        const html = `<html><head><style>${__invCSS()}</style></head><body>
          ${__invHeader()}
          <div class="inv-hd"><div class="inv-tt">INVOICE</div><div><strong>No:</strong> ${invNo}</div><div><strong>Date:</strong> ${dateStr}</div></div>
          <div class="bg"><div class="bg1"><div class="bg-s">BILL TO</div><div style="font-size:15px;font-weight:bold;">${name}</div></div><div><div class="bg-s">BILLING PERIOD</div><div style="font-size:12px;"><strong>1 ${fullMonths[b.bill_month]} to ${new Date(b.bill_year, b.bill_month, 0).getDate()} ${fullMonths[b.bill_month]} ${b.bill_year}</strong></div></div></div>
          <table><thead><tr><th style="width:8%">#</th><th>Description</th><th style="width:15%">Qty</th><th style="width:15%">Rate</th><th style="width:20%">Amount</th></tr></thead>
          <tbody><tr><td class="tc">1</td><td>20 Ltr Water Jar</td><td class="tc"><strong>${b.total_jars}</strong></td><td class="tc">₹${b.jar_rate}</td><td class="tr"><strong>₹${Math.round(b.jar_amount)}</strong></td></tr>
          <tr><td class="tc">2</td><td>20 Ltr Water Bottle</td><td class="tc"><strong>${b.total_bottles}</strong></td><td class="tc">₹${b.bottle_rate}</td><td class="tr"><strong>₹${Math.round(b.bottle_amount)}</strong></td></tr>
          <tr class="trw"><td colspan="3"></td><td class="tr">TOTAL</td><td class="tr">₹${Math.round(t)}</td></tr></tbody></table>
          <div class="gb"><div><div style="font-size:10px;font-weight:bold;">Amount in Words:</div>${w} Rupees Only</div><div class="tr"><div style="font-size:11px;font-weight:bold;">GRAND TOTAL</div><div class="gv">₹ ${Math.round(t).toLocaleString('en-IN')}</div></div></div>
          <div class="fg"><div class="fb"><span style="font-weight:bold;display:block;margin-bottom:5px;font-size:10px;">BANK DETAILS</span><div>A/c Name: Bhairavnath Cool Aqua</div><div>Bank: LONAVALA SAHAKARI BANK LTD.</div><div>Branch: Talawade</div><div>A/c No: 004002100000888</div><div>IFSC: HDFC0CLSABL</div></div>
          <div class="fb" style="text-align:center;"><span style="font-weight:bold;display:block;margin-bottom:5px;font-size:10px;">SCAN TO PAY</span><img src="${qrUrl}" class="qr" alt="QR"><div style="font-size:9px;font-weight:bold;">7030355656-6@ibl</div></div>
          <div class="fb" style="border:none;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;text-align:center;"><div style="flex-grow:1; display:flex; align-items:flex-end; justify-content:center; min-height:70px; position:relative;"><img src="icons/stamp.png" crossorigin="anonymous" style="height:75px; width:auto; object-fit:contain; opacity:0.85; position:absolute; bottom:5px; z-index:1;" onerror="this.style.display='none'"></div><div style="border-top:1px solid #666;width:80%;margin-bottom:5px;position:relative;z-index:2;"></div><div style="font-weight:bold;font-size:10px;position:relative;z-index:2;">For Bhairavnath Cool Aqua</div><div style="font-size:9px;position:relative;z-index:2;">Authorized Signatory</div></div></div>
          <div class="fp">This is a computer generated invoice. | Bhairavnath Cool Aqua Management System</div>
        </body></html>`;
        const blob = await __genPDF(html);
        const f = new File([blob], `Invoice_${name}.pdf`, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [f] })) {
          await navigator.share({ files: [f], text: msg });
          return;
        }
      } catch(e) { console.warn('Web Share failed, falling back:', e); }

      // Fallback: download PDF + open WhatsApp text
      try {
        const dateStr = new Date(b.bill_year, b.bill_month, 1).toLocaleDateString('en-IN');
        const upiLink = `upi://pay?pa=7030355656-6@ibl&pn=Bhairavnath%20Cool%20Aqua&am=${t}&cu=INR`;
        const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(upiLink)}&size=150&margin=1`;
        const w = __invWords(Math.round(t));
        const html = `<html><head><style>${__invCSS()}</style></head><body>
          ${__invHeader()}
          <div class="inv-hd"><div class="inv-tt">INVOICE</div><div><strong>No:</strong> ${invNo}</div><div><strong>Date:</strong> ${dateStr}</div></div>
          <div class="bg"><div class="bg1"><div class="bg-s">BILL TO</div><div style="font-size:15px;font-weight:bold;">${name}</div></div><div><div class="bg-s">BILLING PERIOD</div><div style="font-size:12px;"><strong>1 ${fullMonths[b.bill_month]} to ${new Date(b.bill_year, b.bill_month, 0).getDate()} ${fullMonths[b.bill_month]} ${b.bill_year}</strong></div></div></div>
          <table><thead><tr><th style="width:8%">#</th><th>Description</th><th style="width:15%">Qty</th><th style="width:15%">Rate</th><th style="width:20%">Amount</th></tr></thead>
          <tbody><tr><td class="tc">1</td><td>20 Ltr Water Jar</td><td class="tc"><strong>${b.total_jars}</strong></td><td class="tc">₹${b.jar_rate}</td><td class="tr"><strong>₹${Math.round(b.jar_amount)}</strong></td></tr>
          <tr><td class="tc">2</td><td>20 Ltr Water Bottle</td><td class="tc"><strong>${b.total_bottles}</strong></td><td class="tc">₹${b.bottle_rate}</td><td class="tr"><strong>₹${Math.round(b.bottle_amount)}</strong></td></tr>
          <tr class="trw"><td colspan="3"></td><td class="tr">TOTAL</td><td class="tr">₹${Math.round(t)}</td></tr></tbody></table>
          <div class="gb"><div><div style="font-size:10px;font-weight:bold;">Amount in Words:</div>${w} Rupees Only</div><div class="tr"><div style="font-size:11px;font-weight:bold;">GRAND TOTAL</div><div class="gv">₹ ${Math.round(t).toLocaleString('en-IN')}</div></div></div>
          <div class="fg"><div class="fb"><span style="font-weight:bold;display:block;margin-bottom:5px;font-size:10px;">BANK DETAILS</span><div>A/c Name: Bhairavnath Cool Aqua</div><div>Bank: LONAVALA SAHAKARI BANK LTD.</div><div>Branch: Talawade</div><div>A/c No: 004002100000888</div><div>IFSC: HDFC0CLSABL</div></div>
          <div class="fb" style="text-align:center;"><span style="font-weight:bold;display:block;margin-bottom:5px;font-size:10px;">SCAN TO PAY</span><img src="${qrUrl}" class="qr" alt="QR"><div style="font-size:9px;font-weight:bold;">7030355656-6@ibl</div></div>
          <div class="fb" style="border:none;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;text-align:center;"><div style="flex-grow:1; display:flex; align-items:flex-end; justify-content:center; min-height:70px; position:relative;"><img src="icons/stamp.png" crossorigin="anonymous" style="height:75px; width:auto; object-fit:contain; opacity:0.85; position:absolute; bottom:5px; z-index:1;" onerror="this.style.display='none'"></div><div style="border-top:1px solid #666;width:80%;margin-bottom:5px;position:relative;z-index:2;"></div><div style="font-weight:bold;font-size:10px;position:relative;z-index:2;">For Bhairavnath Cool Aqua</div><div style="font-size:9px;position:relative;z-index:2;">Authorized Signatory</div></div></div>
          <div class="fp">This is a computer generated invoice. | Bhairavnath Cool Aqua Management System</div>
        </body></html>`;
        const blob = await __genPDF(html);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice_${name}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        App.toast('PDF downloaded. Now sharing via WhatsApp...', 'info');
      } catch(e) { console.warn('PDF download failed:', e); }
      
      window.open(`https://wa.me/${mob}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    window.sendEmailFinal = function() {
      const email = c?.email ? c.email.trim() : "";
      if (!email) {
        App.toast("No saved customer email.", "warning");
        return;
      }
      
      const t = b.grand_total;
      const subject = `Bill - Bhairavnath Cool Aqua - ${fullMonths[b.bill_month]} ${b.bill_year}`;
      const body = `*Bhairavnath Cool Aqua* 💧\nDear ${name},\nYour water delivery bill for *${fullMonths[b.bill_month]} ${b.bill_year}* is ready.\n\n*Bill Summary:*\nJars (20L): ${b.total_jars} x ₹${b.jar_rate} = ₹${Math.round(b.jar_amount)}\nBottles (20L): ${b.total_bottles} x ₹${b.bottle_rate} = ₹${Math.round(b.bottle_amount)}\n--------------------\n*Grand Total: ₹${Math.round(t)}*\n\nPay instantly via UPI (Click below on mobile):\nupi://pay?pa=7030355656-6@ibl&pn=Bhairavnath%20Cool%20Aqua&am=${t}&cu=INR\n\nThank you for your business!\nMob: 7030355656 / 8888355656`;
      
      const link = document.createElement('a');
      link.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      link.click();
    };

    window.sendPaymentReminder = function() {
      const rawMob = c?.mobile ? c.mobile.replace(/[^0-9]/g, "") : "";
      let mob = rawMob;
      if (mob.length === 10) mob = "91" + mob;
      
      const t = b.grand_total;
      const upiLink = `upi://pay?pa=7030355656-6@ibl&pn=Bhairavnath%20Cool%20Aqua&am=${t}&cu=INR`;
      const msg = `॥ श्री भैरवनाथ प्रसन्न ॥\n*Payment Reminder* 💧\n\nHello ${name},\nYour water bill of *₹${Math.round(t).toLocaleString('en-IN')}* for *${fullMonths[b.bill_month]} ${b.bill_year}* is pending. \n\n✅ *Pay instantly via UPI (Click below):*\n${upiLink}\n\nThank you!\n- Bhairavnath Cool Aqua`;

      window.open(`https://wa.me/${mob}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    App.showModal(`
      <div class="modal-title"><i data-lucide="file-check"></i> Finalized Invoice</div>
      <div style="background:var(--bg-slate); border:1px solid var(--border-slate); border-radius:var(--radius-md); padding:20px; margin-bottom:20px;">
        <h3 style="margin:0 0 4px 0; font-size:15px; font-weight:800; color:var(--text-primary);">${name}</h3>
        <p style="margin-bottom:18px; font-size:12px; font-weight:600; color:var(--text-secondary); display:flex; align-items:center; gap:4px;"><i data-lucide="calendar" style="width:12px; height:12px;"></i> Period: ${months[b.bill_month]} ${b.bill_year}</p>
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; padding-bottom:16px; border-bottom:1px solid var(--border-slate);">
          <div>
            <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:var(--text-muted); margin-bottom:4px; display:flex; align-items:center; gap:4px;"><i data-lucide="droplets" style="width:12px; height:12px; color:var(--accent-cyan);"></i> Jars</div>
            <div style="font-size:13px; font-weight:700;">${b.total_jars} × ₹${b.jar_rate}</div>
            <div style="font-size:11px; font-weight:800; color:var(--accent-cyan); margin-top:2px;">₹${Math.round(b.jar_amount)}</div>
          </div>
          <div>
            <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:var(--text-muted); margin-bottom:4px; display:flex; align-items:center; gap:4px;"><i data-lucide="glass-water" style="width:12px; height:12px; color:var(--accent-violet);"></i> Bottles</div>
            <div style="font-size:13px; font-weight:700;">${b.total_bottles} × ₹${b.bottle_rate}</div>
            <div style="font-size:11px; font-weight:800; color:var(--accent-violet); margin-top:2px;">₹${Math.round(b.bottle_amount)}</div>
          </div>
        </div>
        
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Grand Total</span>
          <span style="font-size:22px; font-weight:800; color:var(--accent-cyan); letter-spacing:-0.02em;">₹${Math.round(b.grand_total).toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div style="margin:16px 0; text-align:center;">
        <span class="badge ${isPaid?'badge-paid':'badge-pending'}" style="padding:6px 16px; font-size:11px; font-weight:800;">
          <i data-lucide="${isPaid?'check-circle':'clock'}"></i> ${isPaid?'SETTLED / PAID':'OUTSTANDING'}
        </span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
         <button class="btn btn-outline" onclick="printFinalized()">
           <i data-lucide="file-text"></i> Open PDF
         </button>
         <button class="btn btn-outline" onclick="shareWhatsAppFinal()" style="border-color:#25D366; color:#25D366;">
           <i data-lucide="message-square"></i> Share PDF
         </button>
      </div>
      
      <button class="btn btn-outline" onclick="sendPaymentReminder()" style="border-color:#25D366; color:#25D366; width:100%; margin-bottom:10px;">
        <i data-lucide="bell"></i> Send Payment Reminder
      </button>

      <hr style="margin:20px 0; border:none; border-top:1px dashed var(--border-slate-bright);">

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
         ${!isPaid ? `<button class="btn btn-success" onclick="Bills.markPaid(${b.id})"><i data-lucide="check"></i> Set Paid</button>` : `<button class="btn btn-outline" onclick="Bills.markPending(${b.id})"><i data-lucide="x"></i> Unsettle</button>`}
         <button class="btn btn-danger" onclick="Bills.deleteBill(${b.id})"><i data-lucide="trash-2"></i> Delete</button>
      </div>
      <button class="btn btn-outline mt-8" onclick="App.closeModal()" style="opacity:0.6;">Close</button>
    `);
  },

  async deleteBill(id) {
    App.confirm('Permanently erase this invoice from the ledger?', async () => {
      try {
        const res = await OfflineVault.safeWrite('DELETE', 'bills', null, { id });
        if (res.error) throw res.error;
        App.closeModal();
        App.toast('Ledger entry removed.');
        this.load();
      } catch (e) {
        App.toast('Operation failed: ' + e.message, 'warning');
      }
    });
  },

  async markPaid(id) {
    try {
      const res = await OfflineVault.safeWrite('UPDATE', 'bills', { status: 'PAID', updated_at: new Date().toISOString() }, { id });
      if (res.error) throw res.error;
      App.closeModal();
      App.toast('Invoice status set to PAID.');
      this.load();
    } catch (e) {
      App.toast('Operation failed: ' + e.message, 'warning');
    }
  },

  async markPending(id) {
    try {
      const res = await OfflineVault.safeWrite('UPDATE', 'bills', { status: 'PENDING', updated_at: new Date().toISOString() }, { id });
      if (res.error) throw res.error;
      App.closeModal();
      App.toast('Invoice set to outstanding.');
      this.load();
    } catch (e) {
      App.toast('Operation failed: ' + e.message, 'warning');
    }
  },

  async showBulkBillingModal() {
    const curMonth = parseInt(document.getElementById('billMonth').value);
    const curYear = parseInt(document.getElementById('billYear').value);
    
    App.showModal(`
      <div style="text-align:center; padding:30px;">
        <div class="spinner" style="margin:0 auto 15px auto;"></div>
        <p style="font-size:12px; color:var(--text-secondary);">Calculating unbilled ledger data...</p>
      </div>
    `);
    
    try {
      const startDate = `${curYear}-${String(curMonth).padStart(2,'0')}-01`;
      const nextM = curMonth === 12 ? 1 : curMonth + 1;
      const nextY = curMonth === 12 ? curYear + 1 : curYear;
      const endDate = `${nextY}-${String(nextM).padStart(2,'0')}-01`;
      
      let allDels = [];
      let page = 0;
      while (true) {
        const { data: chunk } = await supabase.from('deliveries')
          .select('*')
          .gte('delivery_date', startDate)
          .lt('delivery_date', endDate)
          .range(page * 1000, (page + 1) * 1000 - 1);
        if (!chunk || chunk.length === 0) break;
        allDels.push(...chunk);
        if (chunk.length < 1000) break;
        page++;
      }
      const dels = allDels;
      const { data: bills } = await supabase.from('bills').select('*').eq('bill_month', curMonth).eq('bill_year', curYear);
      const { data: custs } = await supabase.from('customers').select('id, name');
      
      const custMap = {};
      (custs || []).forEach(c => custMap[c.id] = c.name);
      
      const delMap = {};
      (dels || []).forEach(d => {
        if (!delMap[d.customer_id]) delMap[d.customer_id] = { jars: 0, bottles: 0 };
        delMap[d.customer_id].jars += (d.jar_qty || 0);
        delMap[d.customer_id].bottles += (d.bottle_qty || 0);
      });
      
      const billedIds = new Set((bills || []).map(b => b.customer_id));
      const activeIds = Object.keys(delMap).map(Number);
      const unbilledIds = activeIds.filter(id => !billedIds.has(id));
      
      if (unbilledIds.length === 0) {
        App.closeModal();
        App.toast('All active customers are already billed!', 'success');
        return;
      }
      
      const prevM = curMonth === 1 ? 12 : curMonth - 1;
      const prevY = curMonth === 1 ? curYear - 1 : curYear;
      const { data: prevBills } = await supabase.from('bills').select('customer_id, jar_rate, bottle_rate').eq('bill_month', prevM).eq('bill_year', prevY);
      
      const rateMap = {};
      (prevBills || []).forEach(b => {
         rateMap[b.customer_id] = { jar: b.jar_rate, bottle: b.bottle_rate };
      });
      
      window.executeMobileBulkBilling = async function() {
          App.confirm('Generate ' + unbilledIds.length + ' invoices? Please ensure all rates are entered correctly.', () => {
              App.confirm('WARNING: Final Confirmation. Are you ABSOLUTELY sure? This will lock in the rates and instantly generate the bills.', async () => {
                  App.closeModal();
                  App.toast('Processing ' + unbilledIds.length + ' bills...', 'info');
                  
                  let successCount = 0;
                  for (let cid of unbilledIds) {
                      const qty = delMap[cid];
                      const jarRate = parseFloat(document.getElementById(`jar-rate-${cid}`).value) || 0;
                      const botRate = parseFloat(document.getElementById(`bot-rate-${cid}`).value) || 0;
                      
                      const jA = qty.jars * jarRate;
                      const bA = qty.bottles * botRate;
                      const total = jA + bA;
                      
                      const res = await OfflineVault.safeInsert('bills', {
                        customer_id: cid,
                        bill_month: curMonth,
                        bill_year: curYear,
                        total_jars: qty.jars,
                        total_bottles: qty.bottles,
                        jar_rate: jarRate,
                        bottle_rate: botRate,
                        jar_amount: jA,
                        bottle_amount: bA,
                        grand_total: total,
                        status: 'PENDING',
                        generated_at: new Date().toISOString()
                      });
                      
                      if (!res.error) successCount++;
                  }
                  
                  App.toast('Bulk generation complete: ' + successCount + ' generated.', 'success');
                  Bills.load();
              });
          });
      };
      
      const listHtml = unbilledIds.map(cid => {
        const qty = delMap[cid];
        const name = custMap[cid] || `Customer #${cid}`;
        const prevJarRate = rateMap[cid] ? rateMap[cid].jar : 40;
        const prevBotRate = rateMap[cid] ? rateMap[cid].bottle : 30;
        
        return `
          <tr style="border-bottom:1px solid var(--border-slate-bright);">
            <td style="padding:10px 4px; font-weight:bold; color:var(--text-primary);">
              <div style="max-width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${name}</div>
              <div style="font-size:10px; color:var(--text-secondary); font-weight:normal;">
                Delivered: ${qty.jars} Jars / ${qty.bottles} Bottles
              </div>
            </td>
            <td style="padding:10px 4px; text-align:center;">
              <div style="display:inline-flex; align-items:center; gap:2px;">
                <span style="font-size:10px; color:var(--text-secondary);">₹</span>
                <input type="number" id="jar-rate-${cid}" value="${prevJarRate}" style="width:52px; padding:5px; border:1px solid var(--border-slate); border-radius:4px; background:var(--bg-card); color:var(--text-primary); text-align:center; font-size:12px; font-weight:bold;">
              </div>
            </td>
            <td style="padding:10px 4px; text-align:center;">
              <div style="display:inline-flex; align-items:center; gap:2px;">
                <span style="font-size:10px; color:var(--text-secondary);">₹</span>
                <input type="number" id="bot-rate-${cid}" value="${prevBotRate}" style="width:52px; padding:5px; border:1px solid var(--border-slate); border-radius:4px; background:var(--bg-card); color:var(--text-primary); text-align:center; font-size:12px; font-weight:bold;">
              </div>
            </td>
          </tr>
        `;
      }).join('');
      
      App.showModal(`
        <div class="modal-title"><i data-lucide="zap"></i> Auto Bulk Billing</div>
        <div style="font-size:12px; color:var(--text-secondary); margin-bottom:15px; text-align:center; line-height:1.4;">
          Review and customize monthly rates below before generating <strong>${unbilledIds.length}</strong> invoices.
        </div>
        
        <div style="max-height:280px; overflow-y:auto; border:1px solid var(--border-slate); border-radius:var(--radius-md); background:var(--bg-slate); padding:4px 8px; margin-bottom:15px;">
          <table style="width:100%; border-collapse:collapse; font-size:11px; text-align:left;">
            <thead>
              <tr style="border-bottom:2px solid var(--border-slate); color:var(--text-secondary); font-weight:800; font-size:10px;">
                <th style="padding:6px 4px;">CUSTOMER</th>
                <th style="padding:6px 4px; text-align:center;">JAR RATE</th>
                <th style="padding:6px 4px; text-align:center;">BOTTLE RATE</th>
              </tr>
            </thead>
            <tbody>
              ${listHtml}
            </tbody>
          </table>
        </div>
        
        <button class="btn btn-primary" onclick="executeMobileBulkBilling()" style="width:100%; margin-bottom:10px; background:linear-gradient(135deg, #3b82f6, #8b5cf6); border:none;"><i data-lucide="check-circle"></i> Generate ${unbilledIds.length} Invoices</button>
        <button class="btn btn-outline" onclick="App.closeModal()" style="width:100%;">Cancel</button>
      `);
      
      if (window.lucide) window.lucide.createIcons();
    } catch(e) {
      App.closeModal();
      App.toast('Failed calculation preview: ' + e.message, 'warning');
    }
  }
};
