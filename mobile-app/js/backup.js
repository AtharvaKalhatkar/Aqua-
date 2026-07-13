/* ===== Vault (Custom Invoices, Backup & Restore) Module ===== */
const Backup = {
  BACKUP_INTERVAL_DAYS: 5,
  currentTab: 'invoices', // 'invoices', 'backup', 'status'

  load() {
    const div = document.getElementById('backupContent');
    
    // Header Tabs
    const tabsHtml = `
      <div style="display:flex; background:var(--bg-slate); padding:4px; border-radius:12px; border:1px solid var(--border-slate); margin-bottom:20px; overflow:hidden;">
        <div onclick="Backup.switchTab('invoices')" style="flex:1; text-align:center; padding:10px; font-size:12px; font-weight:700; cursor:pointer; border-radius:8px; ${this.currentTab==='invoices'?'background:var(--accent-cyan); color:#000;':'color:var(--text-secondary);'}">Custom Invoices</div>
        <div onclick="Backup.switchTab('backup')" style="flex:1; text-align:center; padding:10px; font-size:12px; font-weight:700; cursor:pointer; border-radius:8px; ${this.currentTab==='backup'?'background:var(--accent-cyan); color:#000;':'color:var(--text-secondary);'}">Backup</div>
        <div onclick="Backup.switchTab('status')" style="flex:1; text-align:center; padding:10px; font-size:12px; font-weight:700; cursor:pointer; border-radius:8px; ${this.currentTab==='status'?'background:var(--accent-cyan); color:#000;':'color:var(--text-secondary);'}">Sync Status</div>
      </div>
    `;

    let contentHtml = '';

    if (this.currentTab === 'invoices') {
      contentHtml = this.renderInvoicesTab();
    } else if (this.currentTab === 'backup') {
      contentHtml = this.renderBackupTab();
    } else if (this.currentTab === 'status') {
      contentHtml = this.renderStatusTab();
    }

    div.innerHTML = tabsHtml + contentHtml;
    App.refreshIcons();
    
    if (this.currentTab === 'invoices') {
      this.renderInvoiceList();
    }
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.load();
  },

  renderInvoicesTab() {
    return `
      <div style="background:var(--bg-slate); border:1px solid var(--border-slate); border-radius:var(--radius-md); padding:20px; margin-bottom:20px;">
        <h3 style="margin:0 0 16px 0; font-size:14px; font-weight:800; color:var(--text-primary); display:flex; align-items:center; gap:6px;"><i data-lucide="file-plus" style="width:16px; height:16px; color:var(--accent-cyan);"></i> Create Custom Invoice</h3>
        
        <input type="hidden" id="ci_id" value="">
        <div style="display:grid; grid-template-columns:1fr; gap:10px; margin-bottom:15px;">
          <div>
            <label style="font-size:11px; font-weight:700; color:var(--text-secondary); margin-bottom:4px; display:block;">Customer Name *</label>
            <input type="text" id="ci_name" class="form-input" placeholder="Enter name">
          </div>
          <div>
            <label style="font-size:11px; font-weight:700; color:var(--text-secondary); margin-bottom:4px; display:block;">Address (Optional)</label>
            <input type="text" id="ci_address" class="form-input" placeholder="Enter address">
          </div>
          <div>
            <label style="font-size:11px; font-weight:700; color:var(--text-secondary); margin-bottom:4px; display:block;">Mobile No (Optional)</label>
            <input type="tel" id="ci_mobile" class="form-input" placeholder="Enter mobile number">
          </div>
          <div>
            <label style="font-size:11px; font-weight:700; color:var(--text-secondary); margin-bottom:4px; display:block;">Invoice Date</label>
            <input type="date" id="ci_date" class="form-input" value="${new Date().toISOString().split('T')[0]}">
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
          <div>
            <label style="font-size:11px; font-weight:700; color:var(--accent-cyan); display:block; margin-bottom:4px;">Jars Qty</label>
            <input type="number" id="ci_jars" class="form-input" placeholder="0">
          </div>
          <div>
            <label style="font-size:11px; font-weight:700; color:var(--text-muted); display:block; margin-bottom:4px;">Jar Rate (₹)</label>
            <input type="number" id="ci_jar_rate" class="form-input" placeholder="0">
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px;">
          <div>
            <label style="font-size:11px; font-weight:700; color:var(--accent-violet); display:block; margin-bottom:4px;">Bottles Qty</label>
            <input type="number" id="ci_bottles" class="form-input" placeholder="0">
          </div>
          <div>
            <label style="font-size:11px; font-weight:700; color:var(--text-muted); display:block; margin-bottom:4px;">Bottle Rate (₹)</label>
            <input type="number" id="ci_bottle_rate" class="form-input" placeholder="0">
          </div>
        </div>

        <button class="btn btn-primary" onclick="Backup.saveCustomInvoice()" style="width:100%;">
          <i data-lucide="save"></i> Save & Generate Invoice
        </button>
      </div>

      <div style="margin-top:30px;">
        <h3 style="font-size:14px; font-weight:800; color:var(--text-primary); margin-bottom:16px; border-bottom:1px solid var(--border-slate); padding-bottom:8px;">Past Custom Invoices</h3>
        <div id="customInvoiceList"></div>
      </div>
    `;
  },

  getCustomInvoices() {
    try {
      return JSON.parse(localStorage.getItem('aqua_custom_invoices') || '[]');
    } catch(e) { return []; }
  },

  saveCustomInvoice() {
    const idField = document.getElementById('ci_id').value;
    const name = document.getElementById('ci_name').value.trim();
    const address = document.getElementById('ci_address').value.trim();
    const mobile = document.getElementById('ci_mobile').value.trim();
    const date = document.getElementById('ci_date').value;
    const jars = parseInt(document.getElementById('ci_jars').value) || 0;
    const jarRate = parseFloat(document.getElementById('ci_jar_rate').value) || 0;
    const bottles = parseInt(document.getElementById('ci_bottles').value) || 0;
    const bottleRate = parseFloat(document.getElementById('ci_bottle_rate').value) || 0;

    if (!name) return App.toast('Name is required.', 'warning');
    if (jars === 0 && bottles === 0) return App.toast('Enter at least some quantity.', 'warning');

    const grandTotal = (jars * jarRate) + (bottles * bottleRate);

    let invoices = this.getCustomInvoices();
    
    if (idField) {
      const idx = invoices.findIndex(i => i.id == idField);
      if (idx !== -1) {
        invoices[idx] = { ...invoices[idx], name, address, mobile, date, jars, jarRate, bottles, bottleRate, grandTotal };
      }
    } else {
      invoices.push({
        id: Date.now(),
        name, address, mobile, date, jars, jarRate, bottles, bottleRate, grandTotal
      });
    }

    localStorage.setItem('aqua_custom_invoices', JSON.stringify(invoices));
    App.toast('Invoice saved successfully!', 'success');
    
    // Clear form
    document.getElementById('ci_id').value = '';
    document.getElementById('ci_name').value = '';
    document.getElementById('ci_address').value = '';
    document.getElementById('ci_jars').value = '';
    document.getElementById('ci_bottles').value = '';
    
    this.renderInvoiceList();
  },

  editCustomInvoice(id) {
    const inv = this.getCustomInvoices().find(i => i.id == id);
    if (!inv) return;
    document.getElementById('ci_id').value = inv.id;
    document.getElementById('ci_name').value = inv.name;
    document.getElementById('ci_address').value = inv.address;
    if (document.getElementById('ci_mobile')) document.getElementById('ci_mobile').value = inv.mobile || '';
    document.getElementById('ci_date').value = inv.date;
    document.getElementById('ci_jars').value = inv.jars;
    document.getElementById('ci_jar_rate').value = inv.jarRate;
    document.getElementById('ci_bottles').value = inv.bottles;
    document.getElementById('ci_bottle_rate').value = inv.bottleRate;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  deleteCustomInvoice(id) {
    App.confirm('Are you sure you want to delete this custom invoice?', () => {
      let invoices = this.getCustomInvoices();
      invoices = invoices.filter(i => i.id != id);
      localStorage.setItem('aqua_custom_invoices', JSON.stringify(invoices));
      this.renderInvoiceList();
    });
  },

  renderInvoiceList() {
    const list = document.getElementById('customInvoiceList');
    if (!list) return;
    const invoices = this.getCustomInvoices().sort((a,b) => b.id - a.id);
    
    if (invoices.length === 0) {
      list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:12px;">No custom invoices generated yet.</div>';
      return;
    }

    let html = '';
    invoices.forEach(inv => {
      const dStr = new Date(inv.date).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'});
      html += `
        <div style="background:var(--bg-slate); border:1px solid var(--border-slate); border-radius:var(--radius-md); padding:16px; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
            <div>
              <div style="font-size:14px; font-weight:800; color:var(--text-primary);">${inv.name}</div>
              <div style="font-size:11px; font-weight:600; color:var(--text-secondary);">${dStr} ${inv.address ? `• ${inv.address}` : ''}</div>
            </div>
            <div style="font-size:16px; font-weight:800; color:var(--accent-cyan);">₹${Math.round(inv.grandTotal)}</div>
          </div>
          <div style="display:flex; gap:10px; margin-bottom:16px;">
            <span style="font-size:11px; color:var(--text-muted);"><i data-lucide="droplets" style="width:10px; height:10px;"></i> ${inv.jars} jars</span>
            <span style="font-size:11px; color:var(--text-muted);"><i data-lucide="glass-water" style="width:10px; height:10px;"></i> ${inv.bottles} bottles</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <button class="btn btn-outline" onclick="Backup.openCustomPDF(${inv.id})" style="font-size:11px; padding:6px; border-color:var(--border-slate-bright);">
              <i data-lucide="file-text"></i> PDF
            </button>
            <button class="btn btn-outline" onclick="Backup.shareCustomWhatsApp(${inv.id})" style="font-size:11px; padding:6px; border-color:#25D366; color:#25D366;">
              <i data-lucide="message-square"></i> WhatsApp
            </button>
            <button class="btn btn-outline" onclick="Backup.editCustomInvoice(${inv.id})" style="font-size:11px; padding:6px; border-color:var(--border-slate-bright);">
              <i data-lucide="edit-2"></i> Edit
            </button>
            <button class="btn btn-outline" onclick="Backup.deleteCustomInvoice(${inv.id})" style="font-size:11px; padding:6px; border-color:var(--accent-rose); color:var(--accent-rose);">
              <i data-lucide="trash-2"></i> Delete
            </button>
          </div>
        </div>
      `;
    });
    list.innerHTML = html;
    App.refreshIcons();
  },

  async openCustomPDF(id) {
    const inv = this.getCustomInvoices().find(i => i.id == id);
    if (!inv) return;
    const html = this.buildInvoiceHTML(inv);
    try {
      App.toast('Generating PDF...', 'info');
      const blob = await __genPDF(html);
      const url = URL.createObjectURL(blob);
      const f = new File([blob], `Invoice_${inv.name}.pdf`, { type: 'application/pdf' });
      
      if (navigator.canShare && navigator.canShare({ files: [f] })) {
        await navigator.share({ files: [f], title: 'Invoice', text: `Invoice for ${inv.name}` });
      } else if (App.isApp) {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice_${inv.name.replace(/\\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch(e) {
      App.toast('PDF error: ' + e.message, 'error');
    }
  },

  async shareCustomWhatsApp(id) {
    const inv = this.getCustomInvoices().find(i => i.id == id);
    if (!inv) return;
    const t = inv.grandTotal;
    const upiLink = `upi://pay?pa=7030355656-6@ibl&pn=Bhairavnath%20Cool%20Aqua&am=${t}&cu=INR`;
    const dStr = new Date(inv.date).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'});
    const msg = `॥ श्री भैरवनाथ प्रसन्न ॥\n*INVOICE*\n\nHello ${inv.name},\nYour water invoice for *${dStr}* is ready.\n\n*Amount Due: ₹${Math.round(t).toLocaleString('en-IN')}*\n\n✅ *Pay instantly via UPI (Click below):*\n${upiLink}\n\nThank you for your business!\n- Bhairavnath Cool Aqua`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  },

  buildInvoiceHTML(inv) {
    const dStr = new Date(inv.date).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'});
    const upiLink = `upi://pay?pa=7030355656-6@ibl&pn=Bhairavnath%20Cool%20Aqua&am=${inv.grandTotal}&cu=INR`;
    const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(upiLink)}&size=150&margin=1`;
    const w = __invWords(Math.round(inv.grandTotal));
    const invNo = `BCA-CUST-${inv.id.toString().slice(-4)}`;
    
    return `<html><head><style>${__invCSS()}</style></head><body>
      ${__invHeader()}
      <div class="inv-hd"><div class="inv-tt">INVOICE</div><div><strong>No:</strong> ${invNo}</div><div><strong>Date:</strong> ${dStr}</div></div>
      <div class="bg"><div class="bg1"><div class="bg-s">BILL TO</div><div style="font-size:15px;font-weight:bold;">${inv.name}</div>${inv.address ? `<div>${inv.address}</div>` : ''}${inv.mobile ? `<div>Mob: ${inv.mobile}</div>` : ''}</div></div>
      <table><thead><tr><th style="width:8%">#</th><th>Description</th><th style="width:15%">Qty</th><th style="width:15%">Rate</th><th style="width:20%">Amount</th></tr></thead>
      <tbody><tr><td class="tc">1</td><td>20 Ltr Water Jar</td><td class="tc"><strong>${inv.jars}</strong></td><td class="tc">₹${inv.jarRate}</td><td class="tr"><strong>₹${Math.round(inv.jars * inv.jarRate)}</strong></td></tr>
      <tr><td class="tc">2</td><td>20 Ltr Water Bottle</td><td class="tc"><strong>${inv.bottles}</strong></td><td class="tc">₹${inv.bottleRate}</td><td class="tr"><strong>₹${Math.round(inv.bottles * inv.bottleRate)}</strong></td></tr>
      <tr class="trw"><td colspan="3"></td><td class="tr">TOTAL</td><td class="tr">₹${Math.round(inv.grandTotal)}</td></tr></tbody></table>
      <div class="gb"><div><div style="font-size:10px;font-weight:bold;">Amount in Words:</div>${w} Rupees Only</div><div class="tr"><div style="font-size:11px;font-weight:bold;">GRAND TOTAL</div><div class="gv">₹ ${Math.round(inv.grandTotal).toLocaleString('en-IN')}</div></div></div>
      <div class="fg"><div class="fb"><span style="font-weight:bold;display:block;margin-bottom:5px;font-size:10px;">BANK DETAILS</span><div>A/c Name: Bhairavnath Cool Aqua</div><div>Bank: LONAVALA SAHAKARI BANK LTD.</div><div>Branch: Talawade</div><div>A/c No: 004002100000888</div><div>IFSC: HDFC0CLSABL</div></div>
      <div class="fb" style="text-align:center;"><span style="font-weight:bold;display:block;margin-bottom:5px;font-size:10px;">SCAN TO PAY</span><img src="${qrUrl}" class="qr" alt="QR"><div style="font-size:9px;font-weight:bold;">7030355656-6@ibl</div></div>
      <div class="fb" style="border:none;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;text-align:center;"><div style="flex-grow:1; display:flex; align-items:flex-end; justify-content:center; min-height:70px; position:relative;"><img src="icons/stamp.png" crossorigin="anonymous" style="height:75px; width:auto; object-fit:contain; opacity:0.85; position:absolute; bottom:5px; z-index:1;" onerror="this.style.display='none'"></div><div style="border-top:1px solid #666;width:80%;margin-bottom:5px;position:relative;z-index:2;"></div><div style="font-weight:bold;font-size:10px;position:relative;z-index:2;">For Bhairavnath Cool Aqua</div><div style="font-size:9px;position:relative;z-index:2;">Authorized Signatory</div></div></div>
      <div class="fp">This is a custom generated invoice. | Bhairavnath Cool Aqua Management System</div>
    </body></html>`;
  },

  renderBackupTab() {
    const lastBackup = localStorage.getItem('aqua_last_backup_date');
    const lastBackupStr = lastBackup ? new Date(lastBackup).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'Never';
    
    let backupDue = false;
    let daysSince = 0;
    if (!lastBackup) { backupDue = true; } 
    else {
      daysSince = Math.floor((Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24));
      backupDue = daysSince >= this.BACKUP_INTERVAL_DAYS;
    }

    const alertBanner = backupDue ? `
      <div style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); border-radius:var(--radius-md); padding:14px 16px; margin-bottom:20px; display:flex; align-items:center; gap:10px;">
        <i data-lucide="alert-triangle" style="width:20px; height:20px; color:var(--accent-amber); flex-shrink:0;"></i>
        <div>
          <div style="font-size:12px; font-weight:800; color:var(--accent-amber); margin-bottom:2px;">Backup Overdue!</div>
          <div style="font-size:10px; font-weight:600; color:var(--text-secondary);">Please download a backup now.</div>
        </div>
      </div>` : `
      <div style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2); border-radius:var(--radius-md); padding:14px 16px; margin-bottom:20px; display:flex; align-items:center; gap:10px;">
        <i data-lucide="shield-check" style="width:20px; height:20px; color:var(--accent-emerald); flex-shrink:0;"></i>
        <div>
          <div style="font-size:12px; font-weight:800; color:var(--accent-emerald); margin-bottom:2px;">Backup Up to Date</div>
          <div style="font-size:10px; font-weight:600; color:var(--text-secondary);">Next backup recommended in ${this.BACKUP_INTERVAL_DAYS - daysSince} days.</div>
        </div>
      </div>`;

    return `
      ${alertBanner}
      <div style="background:var(--bg-slate); border:1px solid var(--border-slate); border-radius:var(--radius-md); padding:20px; margin-bottom:20px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
          <div style="width:40px; height:40px; border-radius:12px; background:rgba(0,229,255,0.08); display:flex; align-items:center; justify-content:center; color:var(--accent-cyan);">
            <i data-lucide="database" style="width:20px; height:20px;"></i>
          </div>
          <div>
            <div style="font-size:14px; font-weight:800; color:var(--text-primary);">Data Backup</div>
            <div style="font-size:10px; font-weight:600; color:var(--text-secondary);">Last backup: ${lastBackupStr}</div>
          </div>
        </div>
        <p style="font-size:11px; font-weight:500; color:var(--text-secondary); line-height:1.6; margin-bottom:16px;">
          Download a complete backup of all customers, deliveries, and bills data as a JSON file.
        </p>
        <button class="btn btn-primary" onclick="Backup.downloadBackup()" style="width:100%; background:linear-gradient(135deg, #00e5ff, #2563eb); border:none;">
          <i data-lucide="download"></i> Download Full Backup
        </button>
      </div>

      <div style="background:var(--bg-slate); border:1px solid var(--border-slate); border-radius:var(--radius-md); padding:20px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
          <div style="width:40px; height:40px; border-radius:12px; background:rgba(167,139,250,0.08); display:flex; align-items:center; justify-content:center; color:var(--accent-violet);">
            <i data-lucide="upload" style="width:20px; height:20px;"></i>
          </div>
          <div>
            <div style="font-size:14px; font-weight:800; color:var(--text-primary);">Restore from Backup</div>
            <div style="font-size:10px; font-weight:600; color:var(--text-secondary);">Upload a previously saved backup</div>
          </div>
        </div>
        <p style="font-size:11px; font-weight:500; color:var(--text-secondary); line-height:1.6; margin-bottom:16px;">
          <strong style="color:var(--accent-rose);">⚠ Warning:</strong> Requires internet connection.
        </p>
        <button class="btn btn-outline" onclick="document.getElementById('restoreFileInput').click()" style="width:100%; border-color:var(--accent-violet); color:var(--accent-violet);">
          <i data-lucide="folder-open"></i> Select Backup File
        </button>
        <input type="file" id="restoreFileInput" accept=".json" style="display:none;" onchange="Backup.handleRestore(event)">
      </div>
    `;
  },

  renderStatusTab() {
    let qCount = 0;
    try { qCount = JSON.parse(localStorage.getItem('aqua_vault') || '[]').length; } catch (e) {}

    return `
      <div style="background:var(--bg-slate); border:1px solid var(--border-slate); border-radius:var(--radius-md); padding:16px;">
        <div style="font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px;">
          <i data-lucide="wifi-off" style="width:10px; height:10px; display:inline; vertical-align:middle; margin-right:4px;"></i> 
          Offline Vault Queue
        </div>
        <div style="font-size:13px; font-weight:700; color:var(--text-primary);">
          ${qCount} pending items
        </div>
        <div style="font-size:10px; font-weight:500; color:var(--text-secondary); margin-top:4px;">
          These will auto-sync when internet is available.
        </div>
      </div>
    `;
  },


  async exportPaymentReport() {
    App.toast('Generating Payment Report...', 'info');
    // Using select('*') instead of specifically naming 'total_paid' so it won't crash if the column isn't created yet
    const { data: custs } = await supabase.from('customers').select('*');
    const { data: bills } = await supabase.from('bills').select('*');
    
    if (!custs || !bills) return App.toast('Failed to load data', 'error');

    let html = `<table border="1">
      <tr>
        <th>Customer Name</th>
        <th>Total Billed Amount</th>
        <th>Total Paid</th>
        <th>Outstanding Due</th>
        <th>Payment Status</th>
      </tr>`;
      
    let grandBilled = 0, grandPaid = 0, grandDue = 0;

    custs.forEach(c => {
      const cbills = bills.filter(b => b.customer_id === c.id);
      if (cbills.length === 0 && (!c.total_paid || c.total_paid === 0)) return; // Skip if no activity
      
      let totalBilled = 0;
      let totalPaid = c.total_paid || 0; // Include manual payments
      
      cbills.forEach(b => {
        totalBilled += (b.grand_total || 0);
        if (b.status === 'PAID') totalPaid += (b.grand_total || 0);
      });
      
      const due = totalBilled - totalPaid;
      grandBilled += totalBilled;
      grandPaid += totalPaid;
      grandDue += due;
      
      let statusText = 'Unknown';
      let bgColor = '#ffffff';
      let textColor = '#000000';
      
      if (due <= 0) {
        statusText = 'Clear';
        bgColor = '#10b981';
        textColor = '#ffffff';
      } else if (totalPaid === 0) {
        statusText = 'Full Pending';
        bgColor = '#ef4444';
        textColor = '#ffffff';
      } else {
        statusText = 'Partial';
        bgColor = '#f59e0b';
        textColor = '#000000';
      }
      
      html += `<tr>
        <td>${c.name}</td>
        <td>₹${totalBilled}</td>
        <td>₹${totalPaid}</td>
        <td style="font-weight:bold;">₹${due}</td>
        <td style="background-color:${bgColor}; color:${textColor}; font-weight:bold;">${statusText}</td>
      </tr>`;
    });
    
    html += `<tr>
      <th>GRAND TOTAL</th>
      <th>₹${grandBilled}</th>
      <th>₹${grandPaid}</th>
      <th>₹${grandDue}</th>
      <th></th>
    </tr></table>`;
    
    this.downloadXLS(html, 'Payment_Report.xls');
  },

  async downloadBackup() {
    App.toast('Preparing backup...', 'success');
    
    let backupData = {
      version: '1.0',
      app: 'Bhairavnath Cool Aqua',
      created_at: new Date().toISOString(),
      device_time: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      data: {
        customers: [],
        deliveries: [],
        bills: []
      }
    };

    try {
      const [custRes, delRes, billRes] = await Promise.all([
        supabase.from('customers').select('*').order('id'),
        supabase.from('deliveries').select('*').order('id'),
        supabase.from('bills').select('*').order('id')
      ]);

      if (custRes.error) throw custRes.error;

      backupData.data.customers = custRes.data || [];
      backupData.data.deliveries = delRes.data || [];
      backupData.data.bills = billRes.data || [];
      backupData.source = 'cloud';
    } catch (e) {
      console.warn('Online fetch failed, building backup from offline cache...');
      backupData.source = 'offline_cache';

      const cachedCusts = localStorage.getItem('cache_cust_dropdown');
      if (cachedCusts) {
        try { backupData.data.customers = JSON.parse(cachedCusts); } catch(ex) {}
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cache_del_')) {
          try {
            const dels = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(dels)) {
              dels.forEach(d => {
                if (!backupData.data.deliveries.find(x => x.id === d.id)) {
                  backupData.data.deliveries.push(d);
                }
              });
            }
          } catch(ex) {}
        }
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cache_bills_')) {
          try {
            const cached = JSON.parse(localStorage.getItem(key));
            if (cached && Array.isArray(cached.bills)) {
              cached.bills.forEach(b => {
                if (!backupData.data.bills.find(x => x.id === b.id)) {
                  backupData.data.bills.push(b);
                }
              });
            }
          } catch(ex) {}
        }
      }

      try {
        const queue = JSON.parse(localStorage.getItem('aqua_vault') || '[]');
        if (queue.length > 0) backupData.offline_queue = queue;
      } catch(ex) {}
    }

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const dateTag = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).replace(/-/g, '');
    const filename = `AquaBackup_${dateTag}.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    localStorage.setItem('aqua_last_backup_date', new Date().toISOString());

    const summary = `${backupData.data.customers.length} customers, ${backupData.data.deliveries.length} deliveries, ${backupData.data.bills.length} bills`;
    App.toast(`Backup saved! (${summary})`, 'success');
    
    setTimeout(() => this.load(), 500);
  },

  async handleRestore(event) {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = '';

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.data || !backup.data.customers) {
        App.alert('Invalid backup file. Missing required data structure.', 'error');
        return;
      }

      const custCount = (backup.data.customers || []).length;
      const delCount = (backup.data.deliveries || []).length;
      const billCount = (backup.data.bills || []).length;
      const source = backup.source || 'unknown';
      const createdAt = backup.device_time || backup.created_at || 'Unknown';

      App.confirm(
        `Restore backup from <strong>${createdAt}</strong>?<br><br>` +
        `<strong>${custCount}</strong> customers, <strong>${delCount}</strong> deliveries, <strong>${billCount}</strong> bills<br><br>` +
        `Source: ${source === 'cloud' ? 'Cloud Backup ☁️' : 'Offline Cache 📱'}<br><br>` +
        `<small style="color:var(--accent-amber);">Existing duplicate records (same ID) will be skipped.</small>`,
        () => this.executeRestore(backup)
      );
    } catch (e) {
      App.alert('Failed to read backup file: ' + e.message, 'error');
    }
  },

  async executeRestore(backup) {
    App.toast('Restoring data... Please wait.', 'success');

    let restored = { customers: 0, deliveries: 0, bills: 0 };
    let errors = 0;

    for (const cust of (backup.data.customers || [])) {
      try {
        const { error } = await supabase.from('customers').upsert(cust, { onConflict: 'id', ignoreDuplicates: true });
        if (!error) restored.customers++;
        else if (error.code === '23505') restored.customers++; 
        else errors++;
      } catch (e) { errors++; }
    }

    for (const del of (backup.data.deliveries || [])) {
      try {
        const cleanDel = { ...del };
        delete cleanDel.customers;
        const { error } = await supabase.from('deliveries').upsert(cleanDel, { onConflict: 'id', ignoreDuplicates: true });
        if (!error) restored.deliveries++;
        else if (error.code === '23505') restored.deliveries++;
        else errors++;
      } catch (e) { errors++; }
    }

    for (const bill of (backup.data.bills || [])) {
      try {
        const { error } = await supabase.from('bills').upsert(bill, { onConflict: 'id', ignoreDuplicates: true });
        if (!error) restored.bills++;
        else if (error.code === '23505') restored.bills++;
        else errors++;
      } catch (e) { errors++; }
    }

    if (backup.offline_queue && Array.isArray(backup.offline_queue) && backup.offline_queue.length > 0) {
      const existingQueue = OfflineVault.getQueue();
      const combined = [...existingQueue, ...backup.offline_queue];
      OfflineVault.saveQueue(combined);
    }

    const msg = `Restore complete!\n${restored.customers} customers, ${restored.deliveries} deliveries, ${restored.bills} bills restored.${errors > 0 ? ` (${errors} errors)` : ''}`;
    App.alert(msg, errors > 0 ? 'warning' : 'success');
    
    this.load();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const lastBackup = localStorage.getItem('aqua_last_backup_date');
    if (lastBackup) {
      const diff = Date.now() - new Date(lastBackup).getTime();
      const daysSince = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (daysSince >= 5) {
        App.toast('⚠️ Backup is overdue! Go to Vault → Backup.', 'warning');
      }
    } else {
      App.toast('💡 Set up your first backup in Vault → Backup.', 'warning');
    }
  }, 5000);
});
