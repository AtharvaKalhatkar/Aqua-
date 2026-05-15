/* ===== Bills Module ===== */
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
    div.innerHTML = '<div class="spinner"></div>';

    try {
      // 1. Get all recorded deliveries for this month
      const startDate = `${year}-${String(month).padStart(2,'0')}-01`;
      const nextM = month === 12 ? 1 : month + 1;
      const nextY = month === 12 ? year + 1 : year;
      const endDate = `${nextY}-${String(nextM).padStart(2,'0')}-01`;
      
      const { data: dels, error: delErr } = await supabase.from('deliveries')
        .select('*')
        .gte('delivery_date', startDate)
        .lt('delivery_date', endDate);
      
      // 2. Get generated bills
      const { data: bills, error: billErr } = await supabase.from('bills')
        .select('*').eq('bill_month', month).eq('bill_year', year);

      if (delErr || billErr) throw (delErr || billErr);

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

      // Fetch names
      const { data: custs } = await supabase.from('customers').select('id,name').in('id', allCustIds);
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

      let html = `<div style="background:var(--bg-slate); border:1px solid var(--border-slate); border-radius:var(--radius-md); padding:20px; margin-bottom:20px;">
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

    } catch (e) {
      console.error(e);
      div.innerHTML = '<div class="empty-state"><i data-lucide="alert-octagon" class="empty-icon-vector"></i><div class="empty-text">Ledger load failure: ' + e.message + '</div></div>';
      App.refreshIcons();
    }
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
        if (isNaN(jR) || isNaN(bR)) { alert("Please enter valid rates to finalize."); return; }
        
        const jA = jars * jR;
        const bA = bottles * bR;
        const total = jA + bA;

        // Removed window.confirm blocker to bypass browser suppression bugs
        
        const generatedId = Math.floor(Date.now() / 1000);

        const res = await OfflineVault.safeInsert('bills', {
          id: generatedId,
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
        alert("CRITICAL BUG DETECTED: " + (err.message || err));
      }
    };

    window.shareWhatsApp = function() {
      const jR = parseFloat(document.getElementById('tempJarRate').value) || 0;
      const bR = parseFloat(document.getElementById('tempBotRate').value) || 0;
      const jA = jars * jR;
      const bA = bottles * bR;
      const t = jA + bA;
      
      const rawMob = customerData?.mobile ? customerData.mobile.replace(/[^0-9]/g, "") : "";
      let mob = rawMob;
      if (mob.length === 10) mob = "91" + mob;

      const msg = `*Bhairavnath Cool Aqua* 💧\nDear ${decodedName},\nYour water delivery summary for *${fullMonths[curMonth]} ${curYear}* is ready.\n\n*Bill Summary:*\n🫙 Jars (20L): ${jars} x ₹${jR} = ₹${Math.round(jA)}\n🍶 Bottles (20L): ${bottles} x ₹${bR} = ₹${Math.round(bA)}\n--------------------\n*Grand Total: ₹${Math.round(t)}*\n\nPay instantly via UPI:\nupi://pay?pa=kalhatkaratharva01@okhdfcbank&pn=Bhairavnath%20Cool%20Aqua&am=${t}&cu=INR\n\nThank you for your business! 🙏`;
      
      const waUrl = `https://wa.me/${mob}?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, '_blank');
    };

    window.printTempBill = function() {
      const jR = parseFloat(document.getElementById('tempJarRate').value) || 0;
      const bR = parseFloat(document.getElementById('tempBotRate').value) || 0;
      const jA = jars * jR;
      const bA = bottles * bR;
      const t = jA + bA;
      
      function inWords(num) {
        if (num === 0) return "Zero";
        const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
        const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
        const helper = (n) => {
          if (n < 20) return a[n];
          if (n < 100) return b[Math.floor(n/10)] + (n%10!==0?" "+a[n%10]:"");
          if (n < 1000) return a[Math.floor(n/100)] + " Hundred" + (n%100!==0?" and " + helper(n%100):"");
          if (n < 100000) return helper(Math.floor(n/1000)) + " Thousand" + (n%1000!==0?" " + helper(n%1000):"");
          return helper(Math.floor(n/100000)) + " Lakh" + (n%100000!==0?" " + helper(n%100000):"");
        };
        return helper(num);
      }

      const upiLink = `upi://pay?pa=kalhatkaratharva01@okhdfcbank&pn=Bhairavnath%20Cool%20Aqua&am=${t}&cu=INR`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiLink)}`;
      
      const w = window.open('', '_blank');
      const dateStr = new Date().toLocaleDateString('en-IN');
      w.document.write(`
        <html>
        <head>
          <title>Invoice_${decodedName}</title>
          <style>
            body { font-family: "Times New Roman", Times, serif; margin: 0; padding: 30px; color: #000; font-size: 12px; line-height: 1.4; }
            .rel { text-align: center; font-style: italic; color: #666; font-size: 11px; }
            .brand { text-align: center; font-size: 28px; font-weight: bold; margin: 4px 0 2px 0; letter-spacing: 1px; }
            .addr { text-align: center; font-size: 11px; color: #333; }
            .phone { text-align: center; font-weight: bold; margin-top: 2px; font-size: 13px; }
            .hr-thick { border-top: 2px solid #000; margin: 8px 0 2px 0; }
            .hr-thin { border-top: 1px solid #000; margin-bottom: 15px; }
            .inv-head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 15px; }
            .inv-title { font-size: 22px; font-weight: bold; }
            .inv-date { text-align: right; font-size: 13px; }
            .billing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #ccc; margin-bottom: 20px; }
            .bg-box { padding: 10px; }
            .bg-box-title { font-size: 10px; font-weight: bold; color: #555; margin-bottom: 5px; }
            .bg-box-val { font-size: 15px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            th { background: #000; color: #fff; padding: 8px; font-weight: bold; text-align: center; border: 1px solid #000; }
            td { padding: 10px; border: 1px solid #ccc; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .total-row { background: #f9f9f9; font-weight: bold; }
            .grand-box { display: flex; justify-content: space-between; border: 2px solid #000; padding: 15px; margin-top: 5px; align-items: center; }
            .words { font-style: italic; color: #444; max-width: 65%; }
            .g-total-v { font-size: 22px; font-weight: bold; }
            .footer-grid { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 15px; margin-top: 20px; }
            .foot-box { border: 1px solid #ccc; padding: 10px; }
            .b-bold { font-weight: bold; display: block; margin-bottom: 5px; font-size: 10px; }
            .qr-img { display: block; margin: 5px auto; width: 100px; height: 100px; }
            .sig-box { display: flex; flex-direction: column; justify-content: flex-end; align-items: center; text-align: center; }
            .sig-line { border-top: 1px solid #666; width: 80%; margin-bottom: 5px; }
            .fine-print { text-align: center; margin-top: 25px; border-top: 1px solid #eee; padding-top: 5px; font-size: 9px; font-style: italic; color: #888; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body onload="setTimeout(()=> { window.print(); window.close(); }, 500);">
          <div class="rel">|| Shri Bhairavnath Prasanna ||</div>
          <div class="brand">BHAIRAVNATH COOL AQUA</div>
          <div class="addr">Bathe Wasti, Talawade, Tal. Haveli, Dist. Pune - 411 062</div>
          <div class="phone">Mob: 7030355656 / 8888355656</div>
          
          <div class="hr-thick"></div>
          <div class="hr-thin"></div>

          <div class="inv-head">
            <div class="inv-title">INVOICE</div>
            <div style="font-family: monospace; font-weight:bold;">Draft / Mobile</div>
            <div class="inv-date"><strong>Date:</strong> ${dateStr}</div>
          </div>

          <div class="billing-grid">
            <div class="bg-box" style="border-right: 1px solid #ccc;">
              <div class="bg-box-title">BILL TO</div>
              <div class="bg-box-val">${decodedName}</div>
            </div>
            <div class="bg-box">
              <div class="bg-box-title">BILLING PERIOD</div>
              <div>Month: <strong>${fullMonths[curMonth]} ${curYear}</strong></div>
            </div>
          </div>

          <table>
            <thead>
              <tr><th style="width:8%">#</th><th>Description</th><th style="width:15%">Qty</th><th style="width:15%">Rate</th><th style="width:20%">Amount</th></tr>
            </thead>
            <tbody>
              <tr><td class="text-center">1</td><td>20 Ltr Water Jar</td><td class="text-center"><strong>${jars}</strong></td><td class="text-center">₹${jR}</td><td class="text-right"><strong>₹${jA}</strong></td></tr>
              <tr><td class="text-center">2</td><td>20 Ltr Water Bottle</td><td class="text-center"><strong>${bottles}</strong></td><td class="text-center">₹${bR}</td><td class="text-right"><strong>₹${bA}</strong></td></tr>
              <tr class="total-row"><td colspan="3"></td><td class="text-right">TOTAL</td><td class="text-right">₹${t}</td></tr>
            </tbody>
          </table>

          <div class="grand-box">
            <div class="words">
              <div style="font-size: 10px; font-style: normal; font-weight: bold;">Amount in Words:</div>
              ${inWords(Math.round(t))} Rupees Only
            </div>
            <div style="text-align: right">
              <div style="font-size: 11px; font-weight: bold;">GRAND TOTAL</div>
              <div class="g-total-v">₹ ${Math.round(t).toLocaleString('en-IN')}</div>
            </div>
          </div>

          <div class="footer-grid">
            <div class="foot-box">
              <span class="b-bold">BANK DETAILS</span>
              <div>A/c Name: Bhairavnath Cool Aqua</div>
              <div>Bank: LONAVALA SAHAKARI BANK LTD.</div>
              <div>Branch: Talawade</div>
              <div>A/c No: 004002100000888</div>
              <div>IFSC: HDFC0CLSABL</div>
            </div>
            
            <div class="foot-box" style="text-align:center;">
              <span class="b-bold">SCAN TO PAY</span>
              <img src="${qrUrl}" class="qr-img" alt="QR" />
              <div style="font-size:9px; font-weight:bold;">kalhatkaratharva01@okhdfcbank</div>
            </div>

            <div class="foot-box sig-box" style="border:none;">
              <div style="flex-grow:1"></div>
              <div class="sig-line"></div>
              <div style="font-weight:bold; font-size:10px;">For Bhairavnath Cool Aqua</div>
              <div style="font-size:9px;">Authorized Signatory</div>
            </div>
          </div>

          <div class="fine-print">
            This is a computer generated estimate via Mobile App. | Bhairavnath Cool Aqua Management System
          </div>
        </body>
        </html>
      `);
      w.document.close();
    };

    App.showModal(`
      <div class="modal-title"><i data-lucide="file-plus"></i> Billing Portal</div>
      <div style="background:var(--bg-slate); border:1px solid var(--border-slate); border-radius:var(--radius-md); padding:20px; margin-bottom:20px;">
        <h3 style="margin:0 0 4px 0; font-size:15px; font-weight:800; color:var(--text-primary);">${decodedName}</h3>
        <p style="margin-bottom:18px; font-size:12px; font-weight:600; color:var(--text-secondary);">Billing Cycle: ${months[curMonth]} ${curYear}</p>
        
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding:10px 14px; background:rgba(255,255,255,0.03); border:1px solid var(--border-slate); border-radius:var(--radius-sm);">
           <span style="font-size:13px; font-weight:700; display:inline-flex; align-items:center; gap:6px;"><i data-lucide="droplets" style="width:14px; height:14px; color:var(--accent-cyan);"></i> Jars: <strong>${jars}</strong></span>
           <input type="number" id="tempJarRate" placeholder="Rate" oninput="calcTempBill()" style="width:80px; background:transparent; border:1px solid var(--border-slate-bright); color:white; border-radius:8px; padding:6px 10px; text-align:right; font-family:inherit; font-weight:700;">
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; padding:10px 14px; background:rgba(255,255,255,0.03); border:1px solid var(--border-slate); border-radius:var(--radius-sm);">
           <span style="font-size:13px; font-weight:700; display:inline-flex; align-items:center; gap:6px;"><i data-lucide="glass-water" style="width:14px; height:14px; color:var(--accent-violet);"></i> Bottles: <strong>${bottles}</strong></span>
           <input type="number" id="tempBotRate" placeholder="Rate" oninput="calcTempBill()" style="width:80px; background:transparent; border:1px solid var(--border-slate-bright); color:white; border-radius:8px; padding:6px 10px; text-align:right; font-family:inherit; font-weight:700;">
        </div>

        <div style="border-top:1px solid var(--border-slate); padding-top:14px; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Projected Total</span>
          <span id="tempTotalDisplay" style="font-size:22px; font-weight:800; color:var(--accent-cyan); letter-spacing:-0.02em;">₹0</span>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px;">
         <button class="btn btn-primary" onclick="saveOfficialBill()">
           <i data-lucide="check-circle"></i> Finalize
         </button>
         <button class="btn btn-outline" onclick="shareWhatsApp()" style="border-color:#25D366; color:#25D366;">
           <i data-lucide="message-square"></i> WhatsApp
         </button>
      </div>

      <button class="btn btn-outline mt-8" onclick="printTempBill()">
        <i data-lucide="printer"></i> Generate & Print Slip
      </button>
      <button class="btn btn-outline mt-8" onclick="App.closeModal()" style="opacity:0.6;">Cancel</button>
    `);
  },

  async showDetail(id) {
    const { data: b } = await supabase.from('bills').select('*').eq('id', id).single();
    if (!b) return;
    const { data: c } = await supabase.from('customers').select('name,mobile,email').eq('id', b.customer_id).single();
    
    const name = c?.name || 'Customer';
    const months = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const fullMonths = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
    const isPaid = b.status === 'PAID';

    window.printFinalized = function() {
      const jR = b.jar_rate, bR = b.bottle_rate, jars = b.total_jars, bottles = b.total_bottles;
      const jA = b.jar_amount, bA = b.bottle_amount, t = b.grand_total;
      
      function inWords(num) {
        if (num === 0) return "Zero";
        const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
        const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
        const helper = (n) => {
          if (n < 20) return a[n];
          if (n < 100) return b[Math.floor(n/10)] + (n%10!==0?" "+a[n%10]:"");
          if (n < 1000) return a[Math.floor(n/100)] + " Hundred" + (n%100!==0?" and " + helper(n%100):"");
          if (n < 100000) return helper(Math.floor(n/1000)) + " Thousand" + (n%1000!==0?" " + helper(n%1000):"");
          return helper(Math.floor(n/100000)) + " Lakh" + (n%100000!==0?" " + helper(n%100000):"");
        };
        return helper(num);
      }

      const upiLink = `upi://pay?pa=kalhatkaratharva01@okhdfcbank&pn=Bhairavnath%20Cool%20Aqua&am=${t}&cu=INR`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiLink)}`;
      const w = window.open('', '_blank');
      const dateStr = new Date().toLocaleDateString('en-IN');
      w.document.write(`
        <html>
        <head><title>Invoice_${name}</title><style>
          body { font-family: "Times New Roman", Times, serif; margin: 0; padding: 30px; color: #000; font-size: 12px; }
          .rel { text-align: center; font-style: italic; color: #666; }
          .brand { text-align: center; font-size: 28px; font-weight: bold; }
          .addr { text-align: center; font-size: 11px; }
          .phone { text-align: center; font-weight: bold; }
          .hr-thick { border-top: 2px solid #000; margin: 8px 0 2px 0; }
          .hr-thin { border-top: 1px solid #000; margin-bottom: 15px; }
          .inv-head { display: flex; justify-content: space-between; margin-bottom: 15px; }
          .inv-title { font-size: 22px; font-weight: bold; }
          .billing-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #ccc; margin-bottom: 20px; }
          .bg-box { padding: 10px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #000; color: #fff; padding: 8px; }
          td { padding: 10px; border: 1px solid #ccc; }
          .grand-box { display: flex; justify-content: space-between; border: 2px solid #000; padding: 15px; margin-top: 10px; }
          .g-total-v { font-size: 22px; font-weight: bold; }
          .footer-grid { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 15px; margin-top: 20px; }
          .foot-box { border: 1px solid #ccc; padding: 8px; }
          .sig-box { text-align: center; display: flex; flex-direction: column; justify-content: flex-end; }
          .fine-print { text-align: center; margin-top: 25px; border-top: 1px solid #eee; font-size: 9px; }
        </style></head>
        <body onload="setTimeout(()=> { window.print(); window.close(); }, 500);">
          <div class="rel">|| Shri Bhairavnath Prasanna ||</div>
          <div class="brand">BHAIRAVNATH COOL AQUA</div>
          <div class="addr">Bathe Wasti, Talawade, Tal. Haveli, Dist. Pune</div>
          <div class="phone">Mob: 7030355656 / 8888355656</div>
          <div class="hr-thick"></div><div class="hr-thin"></div>
          <div class="inv-head">
            <div class="inv-title">INVOICE</div>
            <div><strong>No:</strong> BCA-${b.bill_year % 100}${String(b.bill_month).padStart(2,'0')}-${b.id}</div>
            <div><strong>Date:</strong> ${dateStr}</div>
          </div>
          <div class="billing-grid">
            <div class="bg-box" style="border-right: 1px solid #ccc;"><div>BILL TO</div><strong>${name}</strong></div>
            <div class="bg-box"><div>BILLING PERIOD</div><strong>${fullMonths[b.bill_month]} ${b.bill_year}</strong></div>
          </div>
          <table>
            <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
            <tbody>
              <tr><td style="text-align:center;">1</td><td>20 Ltr Water Jar</td><td style="text-align:center;">${jars}</td><td style="text-align:center;">₹${jR}</td><td style="text-align:right;">₹${Math.round(jA)}</td></tr>
              <tr><td style="text-align:center;">2</td><td>20 Ltr Water Bottle</td><td style="text-align:center;">${bottles}</td><td style="text-align:center;">₹${bR}</td><td style="text-align:right;">₹${Math.round(bA)}</td></tr>
              <tr style="font-weight:bold; background:#f9f9f9;"><td colspan="3"></td><td style="text-align:right;">TOTAL</td><td style="text-align:right;">₹${Math.round(t)}</td></tr>
            </tbody>
          </table>
          <div class="grand-box">
            <div><div style="font-weight:bold;font-size:10px;">Amount in Words:</div><i>${inWords(Math.round(t))} Rupees Only</i></div>
            <div style="text-align:right;"><div style="font-weight:bold;">GRAND TOTAL</div><div class="g-total-v">₹${Math.round(t)}</div></div>
          </div>
          <div class="footer-grid">
            <div class="foot-box"><strong>BANK DETAILS</strong><br>A/c Name: Bhairavnath Cool Aqua<br>Bank: LONAVALA SAHAKARI BANK<br>A/c No: 004002100000888<br>IFSC: HDFC0CLSABL</div>
            <div class="foot-box" style="text-align:center;"><strong>SCAN TO PAY</strong><br><img src="${qrUrl}" style="width:80px;height:80px;"><br><div style="font-size:8px;">kalhatkaratharva01@okhdfcbank</div></div>
            <div class="foot-box sig-box" style="border:none;"><br><div style="border-top:1px solid #666;margin:0 auto;width:80%;"></div><strong>For Bhairavnath Cool Aqua</strong><br>Authorized Signatory</div>
          </div>
          <div class="fine-print">This is a computer generated invoice. | Bhairavnath Cool Aqua</div>
        </body></html>
      `);
      w.document.close();
    };

    window.shareWhatsAppFinal = function() {
      const rawMob = c?.mobile ? c.mobile.replace(/[^0-9]/g, "") : "";
      let mob = rawMob;
      if (mob.length === 10) mob = "91" + mob;
      const msg = `*Bhairavnath Cool Aqua* 💧\nDear ${name},\nYour invoice for *${fullMonths[b.bill_month]} ${b.bill_year}* is generated.\n\nJars: ${b.total_jars} x ₹${b.jar_rate}\nBottles: ${b.total_bottles} x ₹${b.bottle_rate}\n--------------------\n*Total Payable: ₹${Math.round(b.grand_total)}*\n\nPay instantly via UPI:\nupi://pay?pa=kalhatkaratharva01@okhdfcbank&pn=Bhairavnath%20Cool%20Aqua&am=${b.grand_total}&cu=INR\n\nThank you!`;
      window.open(`https://wa.me/${mob}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    window.sendEmailFinal = function() {
      const email = c?.email ? c.email.trim() : "";
      if (!email) {
        App.toast("No saved customer email.", "warning");
        return;
      }
      const subject = `Water Delivery Invoice - ${fullMonths[b.bill_month]} ${b.bill_year}`;
      const body = `Dear ${name},\n\nPlease find your monthly bill details:\n\nMonth: ${fullMonths[b.bill_month]} ${b.bill_year}\nJars: ${b.total_jars}\nBottles: ${b.total_bottles}\nTotal Payable: ₹${Math.round(b.grand_total)}\n\nKindly clear the dues. Thank you!`;
      
      const link = document.createElement('a');
      link.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      link.click();
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
         <button class="btn btn-outline" onclick="shareWhatsAppFinal()" style="border-color:#25D366; color:#25D366;">
           <i data-lucide="message-square"></i> WhatsApp
         </button>
         <button class="btn btn-outline" onclick="sendEmailFinal()" style="border-color:var(--accent-cyan); color:var(--accent-cyan);">
           <i data-lucide="mail"></i> Email Client
         </button>
      </div>
      
      <button class="btn btn-outline" onclick="printFinalized()" style="width:100%;">
        <i data-lucide="printer"></i> Print Invoice PDF
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
    if (!confirm('Permenantly erase this invoice from the ledger?')) return;
    const { error } = await supabase.from('bills').delete().eq('id', id);
    if (error) { App.toast('Operation failed.', 'warning'); return; }
    App.closeModal();
    App.toast('Ledger entry removed.');
    this.load();
  },

  async markPaid(id) {
    const { error } = await supabase.from('bills').update({ status: 'PAID', updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { App.toast('Operation failed.', 'warning'); return; }
    App.closeModal();
    App.toast('Invoice status set to PAID.');
    this.load();
  },

  async markPending(id) {
    const { error } = await supabase.from('bills').update({ status: 'PENDING', updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { App.toast('Operation failed.', 'warning'); return; }
    App.closeModal();
    App.toast('Invoice set to outstanding.');
    this.load();
  }
};
