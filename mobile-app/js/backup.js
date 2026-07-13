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
      const container = document.getElementById('ci_items_container');
      if (container && container.children.length === 0) {
        this.addInvoiceItem();
      }
    } else if (this.currentTab === 'backup') {
      this.initExcelExportUI();
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

        <div style="margin-bottom:15px;">
          <label style="font-size:12px; font-weight:800; color:var(--text-primary); margin-bottom:8px; display:block;">Invoice Items</label>
          <div id="ci_items_container"></div>
          <button class="btn btn-outline" onclick="Backup.addInvoiceItem()" style="width:100%; font-size:11px; padding:8px; border-style:dashed;">
            <i data-lucide="plus"></i> Add Item
          </button>
        </div>

        <button class="btn btn-primary" onclick="Backup.saveCustomInvoice()" style="width:100%;">
          <i data-lucide="save"></i> Save & Generate Invoice
        </button>
      </div>

      <div style="margin-top:30px; padding-bottom:120px;">
        <h3 style="font-size:14px; font-weight:800; color:var(--text-primary); margin-bottom:16px; border-bottom:1px solid var(--border-slate); padding-bottom:8px;">Past Custom Invoices</h3>
        <div id="customInvoiceList"></div>
      </div>
    `;
  },

  addInvoiceItem(data = null) {
    const container = document.getElementById('ci_items_container');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = 'ci-item-row';
    div.style.cssText = 'background:rgba(0,0,0,0.2); border:1px solid var(--border-slate); border-radius:8px; padding:10px; margin-bottom:10px; position:relative;';
    
    div.innerHTML = `
      <button onclick="Backup.removeInvoiceItem(this)" style="position:absolute; top:5px; right:5px; background:transparent; border:none; color:var(--accent-rose); width:24px; height:24px; display:flex; align-items:center; justify-content:center; cursor:pointer; padding:0;">
        <i data-lucide="x" style="width:16px; height:16px;"></i>
      </button>
      <div style="margin-bottom:12px; padding-right:24px;">
        <label style="font-size:10px; font-weight:700; color:var(--text-secondary); margin-bottom:4px; display:block;">Description (e.g. May 2026)</label>
        <input type="text" class="form-input ci-item-desc" placeholder="Month or Item Name" value="${data && data.desc ? data.desc : ''}">
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
        <div>
          <label style="font-size:10px; font-weight:700; color:var(--accent-cyan); display:block; margin-bottom:4px;">Jars Qty</label>
          <input type="number" class="form-input ci-item-jars" placeholder="0" value="${data && data.jars ? data.jars : ''}">
        </div>
        <div>
          <label style="font-size:10px; font-weight:700; color:var(--text-muted); display:block; margin-bottom:4px;">Jar Rate (₹)</label>
          <input type="number" class="form-input ci-item-jrate" placeholder="0" value="${data && data.jrate ? data.jrate : ''}">
        </div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <div>
          <label style="font-size:10px; font-weight:700; color:var(--accent-violet); display:block; margin-bottom:4px;">Bottles Qty</label>
          <input type="number" class="form-input ci-item-bottles" placeholder="0" value="${data && data.bottles ? data.bottles : ''}">
        </div>
        <div>
          <label style="font-size:10px; font-weight:700; color:var(--text-muted); display:block; margin-bottom:4px;">Bottle Rate (₹)</label>
          <input type="number" class="form-input ci-item-brate" placeholder="0" value="${data && data.brate ? data.brate : ''}">
        </div>
      </div>
    `;
    container.appendChild(div);
    if(typeof lucide !== 'undefined') lucide.createIcons();
  },

  removeInvoiceItem(btn) {
    btn.closest('.ci-item-row').remove();
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
    
    const itemRows = document.querySelectorAll('.ci-item-row');
    const items = [];
    let grandTotal = 0;
    
    itemRows.forEach(row => {
      const desc = row.querySelector('.ci-item-desc').value.trim() || 'Item';
      const jars = parseInt(row.querySelector('.ci-item-jars').value) || 0;
      const jrate = parseFloat(row.querySelector('.ci-item-jrate').value) || 0;
      const bottles = parseInt(row.querySelector('.ci-item-bottles').value) || 0;
      const brate = parseFloat(row.querySelector('.ci-item-brate').value) || 0;
      if (jars > 0 || bottles > 0 || row.querySelector('.ci-item-desc').value.trim()) {
        const rowTotal = (jars * jrate) + (bottles * brate);
        grandTotal += rowTotal;
        items.push({ desc, jars, jrate, bottles, brate, rowTotal });
      }
    });

    if (!name) return App.toast('Name is required.', 'warning');
    if (items.length === 0) return App.toast('Enter at least one item.', 'warning');

    let invoices = this.getCustomInvoices();
    
    if (idField) {
      const idx = invoices.findIndex(i => i.id == idField);
      if (idx !== -1) {
        invoices[idx] = { ...invoices[idx], name, address, mobile, date, items, grandTotal };
      }
    } else {
      invoices.push({
        id: Date.now(),
        name, address, mobile, date, items, grandTotal
      });
    }

    localStorage.setItem('aqua_custom_invoices', JSON.stringify(invoices));
    App.toast('Invoice saved successfully!', 'success');
    
    // Clear form
    document.getElementById('ci_id').value = '';
    document.getElementById('ci_name').value = '';
    document.getElementById('ci_address').value = '';
    if (document.getElementById('ci_mobile')) document.getElementById('ci_mobile').value = '';
    
    const container = document.getElementById('ci_items_container');
    if (container) {
      container.innerHTML = '';
      this.addInvoiceItem(); // add one empty row back
    }
    
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
    
    const container = document.getElementById('ci_items_container');
    if (container) {
      container.innerHTML = ''; // clear existing rows
      let items = inv.items || [];
      // Backward compatibility for old invoices
      if (items.length === 0 && (inv.jars > 0 || inv.bottles > 0)) {
        items.push({
          desc: 'Water Supply',
          jars: inv.jars,
          jrate: inv.jarRate,
          bottles: inv.bottles,
          brate: inv.bottleRate
        });
      }
      if (items.length === 0) items.push({}); // empty row
      
      items.forEach(item => this.addInvoiceItem(item));
    }
    
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
      
      let totalJars = inv.jars || 0;
      let totalBottles = inv.bottles || 0;
      if (inv.items && inv.items.length > 0) {
        totalJars = inv.items.reduce((sum, item) => sum + (item.jars || 0), 0);
        totalBottles = inv.items.reduce((sum, item) => sum + (item.bottles || 0), 0);
      }

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
            <span style="font-size:11px; color:var(--text-muted);"><i data-lucide="droplets" style="width:10px; height:10px;"></i> ${totalJars} jars</span>
            <span style="font-size:11px; color:var(--text-muted);"><i data-lucide="glass-water" style="width:10px; height:10px;"></i> ${totalBottles} bottles</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:6px;">
            <button class="btn btn-outline" onclick="Backup.openCustomPDF(${inv.id})" style="font-size:10px; padding:4px; border-color:var(--border-slate-bright);">
              <i data-lucide="share-2" style="width:14px; height:14px;"></i> Share
            </button>
            <button class="btn btn-outline" onclick="Backup.shareCustomWhatsApp(${inv.id})" style="font-size:10px; padding:4px; border-color:#25D366; color:#25D366;">
              <i data-lucide="message-square" style="width:14px; height:14px;"></i> WA
            </button>
            <button class="btn btn-outline" onclick="Backup.editCustomInvoice(${inv.id})" style="font-size:10px; padding:4px; border-color:var(--border-slate-bright);">
              <i data-lucide="edit-2" style="width:14px; height:14px;"></i> Edit
            </button>
            <button class="btn btn-outline" onclick="Backup.deleteCustomInvoice(${inv.id})" style="font-size:10px; padding:4px; border-color:var(--accent-rose); color:var(--accent-rose);">
              <i data-lucide="trash-2" style="width:14px; height:14px;"></i> Del
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
      
      const downloadFallback = () => {
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice_${inv.name.replace(/\\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };

      if (navigator.canShare && navigator.canShare({ files: [f] })) {
        try {
          await navigator.share({ files: [f], title: 'Invoice', text: `Invoice for ${inv.name}` });
        } catch (err) {
          console.warn('Share failed, falling back to download', err);
          downloadFallback();
        }
      } else if (App.isApp) {
        window.open(url, '_blank');
      } else {
        downloadFallback();
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
    
    // Normalize items for backward compatibility
    let items = inv.items || [];
    if (items.length === 0 && (inv.jars > 0 || inv.bottles > 0)) {
      items.push({ desc: 'Water Supply', jars: inv.jars, jrate: inv.jarRate, bottles: inv.bottles, brate: inv.bottleRate, rowTotal: inv.grandTotal });
    }

    let rowsHTML = '';
    let rowCount = 1;
    items.forEach(item => {
      const monthDesc = item.desc || 'Water Supply';
      const jTotal = (item.jars || 0) * (item.jrate || 0);
      const bTotal = (item.bottles || 0) * (item.brate || 0);
      rowsHTML += `<tr>
        <td class="tc">${rowCount++}</td>
        <td>${monthDesc}</td>
        <td class="tc"><strong>${item.jars || '-'}</strong></td>
        <td class="tc">₹${item.jrate || 0}</td>
        <td class="tc"><strong>${item.bottles || '-'}</strong></td>
        <td class="tc">₹${item.brate || 0}</td>
        <td class="tr"><strong>₹${Math.round(jTotal + bTotal)}</strong></td>
      </tr>`;
    });

    return `<html><head><style>${__invCSS()}</style></head><body>
      ${__invHeader()}
      <div class="inv-hd"><div class="inv-tt">INVOICE</div><div><strong>No:</strong> ${invNo}</div><div><strong>Date:</strong> ${dStr}</div></div>
      <div class="bg"><div class="bg1"><div class="bg-s">BILL TO</div><div style="font-size:15px;font-weight:bold;">${inv.name}</div>${inv.address ? `<div>${inv.address}</div>` : ''}${inv.mobile ? `<div>Mob: ${inv.mobile}</div>` : ''}</div></div>
      <table>
        <thead>
          <tr>
            <th style="width:5%">#</th>
            <th style="width:25%">Description</th>
            <th style="width:12%">Jars</th>
            <th style="width:12%">Rate</th>
            <th style="width:12%">Bottles</th>
            <th style="width:12%">Rate</th>
            <th style="width:15%">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
          <tr class="trw"><td colspan="6" class="tr">TOTAL</td><td class="tr">₹${Math.round(inv.grandTotal)}</td></tr>
        </tbody>
      </table>
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

      <div style="background:var(--bg-slate); border:1px solid var(--border-slate); border-radius:var(--radius-md); padding:20px; margin-bottom:20px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
          <div style="width:40px; height:40px; border-radius:12px; background:rgba(16,185,129,0.08); display:flex; align-items:center; justify-content:center; color:var(--accent-emerald);">
            <i data-lucide="file-spreadsheet" style="width:20px; height:20px;"></i>
          </div>
          <div>
            <div style="font-size:14px; font-weight:800; color:var(--text-primary);">Customer Monthly Report</div>
            <div style="font-size:10px; font-weight:600; color:var(--text-secondary);">Export to professional Excel</div>
          </div>
        </div>
        
        <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px;">
          <div>
            <label style="font-size:10px; font-weight:700; color:var(--text-secondary); margin-bottom:4px; display:block;">Select Customer</label>
            <input type="text" id="excelCustSearch" placeholder="Search customer..." class="form-input" style="margin-bottom:8px;" oninput="Backup.filterExcelCustomers()">
            <select id="excelCustId" class="form-input"></select>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div>
              <label style="font-size:10px; font-weight:700; color:var(--text-secondary); margin-bottom:4px; display:block;">Month</label>
              <select id="excelMonth" class="form-input">
                ${['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => `<option value="${i+1}" ${i===new Date().getMonth()?'selected':''}>${m}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:10px; font-weight:700; color:var(--text-secondary); margin-bottom:4px; display:block;">Year</label>
              <select id="excelYear" class="form-input">
                ${[new Date().getFullYear()-1, new Date().getFullYear(), new Date().getFullYear()+1].map(y => `<option value="${y}" ${y===new Date().getFullYear()?'selected':''}>${y}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <button class="btn btn-primary" onclick="Backup.handleCustomerMonthlyReport('download')" style="background:linear-gradient(135deg, #10b981, #059669); border:none; width:100%;">
            <i data-lucide="download"></i> Download
          </button>
          <button class="btn btn-outline" onclick="Backup.handleCustomerMonthlyReport('share')" style="border-color:var(--border-slate-bright); color:var(--text-primary); width:100%;">
            <i data-lucide="share-2"></i> Share
          </button>
        </div>
      </div>

      <div style="background:var(--bg-slate); border:1px solid var(--border-slate); border-radius:var(--radius-md); padding:20px; margin-bottom:20px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
          <div style="width:40px; height:40px; border-radius:12px; background:rgba(245,158,11,0.08); display:flex; align-items:center; justify-content:center; color:var(--accent-amber);">
            <i data-lucide="file-text" style="width:20px; height:20px;"></i>
          </div>
          <div>
            <div style="font-size:14px; font-weight:800; color:var(--text-primary);">Monthly Payments Report</div>
            <div style="font-size:10px; font-weight:600; color:var(--text-secondary);">Master list of all payments</div>
          </div>
        </div>
        
        <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div>
              <label style="font-size:10px; font-weight:700; color:var(--text-secondary); margin-bottom:4px; display:block;">Month</label>
              <select id="excelPayMonth" class="form-input">
                ${['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => `<option value="${i+1}" ${i===new Date().getMonth()?'selected':''}>${m}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:10px; font-weight:700; color:var(--text-secondary); margin-bottom:4px; display:block;">Year</label>
              <select id="excelPayYear" class="form-input">
                ${[new Date().getFullYear()-1, new Date().getFullYear(), new Date().getFullYear()+1].map(y => `<option value="${y}" ${y===new Date().getFullYear()?'selected':''}>${y}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <button class="btn btn-primary" onclick="Backup.handleMonthlyPaymentsReport('download')" style="background:linear-gradient(135deg, #f59e0b, #d97706); border:none; width:100%;">
            <i data-lucide="download"></i> Download
          </button>
          <button class="btn btn-outline" onclick="Backup.handleMonthlyPaymentsReport('share')" style="border-color:var(--border-slate-bright); color:var(--text-primary); width:100%;">
            <i data-lucide="share-2"></i> Share
          </button>
        </div>
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
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `AquaApp_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    localStorage.setItem('aqua_last_backup_date', new Date().toISOString());
    const summary = `${backupData.data.customers.length} customers, ${backupData.data.deliveries.length} deliveries, ${backupData.data.bills.length} bills`;
    App.toast(`Backup Downloaded! (${summary})`, 'success');
    this.load();
  },

  excelCustData: [],

  async initExcelExportUI() {
    const sel = document.getElementById('excelCustId');
    if (!sel) return;
    
    // Some pages might not have App.customers globally, so fetch manually
    const { data } = await supabase.from('customers').select('*').order('name');
    if (data) {
      this.excelCustData = data;
      this.renderExcelCustDropdown(data);
    }
  },

  renderExcelCustDropdown(list) {
    const sel = document.getElementById('excelCustId');
    if (!sel) return;
    sel.innerHTML = list.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  },

  filterExcelCustomers() {
    const q = document.getElementById('excelCustSearch').value.toLowerCase();
    const filtered = this.excelCustData.filter(c => c.name.toLowerCase().includes(q));
    this.renderExcelCustDropdown(filtered);
  },

  async handleCustomerMonthlyReport(action = 'download') {
    const custId = document.getElementById('excelCustId').value;
    const m = parseInt(document.getElementById('excelMonth').value);
    const y = parseInt(document.getElementById('excelYear').value);
    const custEl = document.getElementById('excelCustId');
    const custName = custEl.options[custEl.selectedIndex]?.text || 'Customer';
    const monthEl = document.getElementById('excelMonth');
    const monthName = monthEl.options[monthEl.selectedIndex]?.text || '';
    
    if (!custId) return App.toast('Please select a customer', 'warning');

    App.toast(action === 'share' ? 'Preparing to share...' : 'Generating Report...', 'info');

    try {
      const start = `${y}-${String(m).padStart(2,'0')}-01`;
      const nextM = m === 12 ? 1 : m + 1;
      const nextY = m === 12 ? y + 1 : y;
      const end = `${nextY}-${String(nextM).padStart(2,'0')}-01`;

      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('customer_id', custId)
        .gte('delivery_date', start)
        .lt('delivery_date', end)
        .order('delivery_date', { ascending: true });

      if (error) throw error;
      
      const { data: latestBill } = await supabase.from('bills')
        .select('jar_rate, bottle_rate')
        .eq('customer_id', custId)
        .order('id', { ascending: false })
        .limit(1)
        .single();
        
      const defJarRate = latestBill ? (latestBill.jar_rate || 40) : 40;
      const defBottleRate = latestBill ? (latestBill.bottle_rate || 30) : 30;

      let totalJars = 0;
      let totalBottles = 0;
      let grandTotal = 0;

      if (!window.ExcelJS) return App.toast('Excel library not loaded.', 'error');

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Delivery Report');

      // Title
      worksheet.mergeCells('A1:G1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'BHAIRAVNATH COOL AQUA';
      titleCell.font = { name: 'Arial Black', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Subtitle
      worksheet.mergeCells('A2:G2');
      const subCell = worksheet.getCell('A2');
      subCell.value = `Monthly Delivery Report - ${custName} (${monthName} ${y})`;
      subCell.font = { name: 'Arial', size: 12, italic: true };
      subCell.alignment = { horizontal: 'center', vertical: 'middle' };
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF8FF' } };

      worksheet.addRow([]); // Row 3 empty

      // Header Row
      const headerRow = worksheet.addRow(['#', 'Date', 'Jars', 'Jar Rate', 'Bottles', 'Bottle Rate', 'Total Amount']);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
        cell.alignment = { horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        };
      });

      if (!data || data.length === 0) {
        worksheet.mergeCells('A5:G5');
        worksheet.getCell('A5').value = 'No deliveries found for this month.';
        worksheet.getCell('A5').alignment = { horizontal: 'center' };
      } else {
        data.forEach((d, idx) => {
          const dStr = new Date(d.delivery_date).toLocaleDateString('en-IN');
          const jrate = typeof d.jar_rate === 'number' ? d.jar_rate : defJarRate;
          const brate = typeof d.bottle_rate === 'number' ? d.bottle_rate : defBottleRate;
          
          const jAmt = (d.jar_qty || 0) * jrate;
          const bAmt = (d.bottle_qty || 0) * brate;
          const rTotal = jAmt + bAmt;

          totalJars += (d.jar_qty || 0);
          totalBottles += (d.bottle_qty || 0);
          grandTotal += rTotal;

          const row = worksheet.addRow([idx + 1, dStr, d.jar_qty || 0, `Rs ${jrate}`, d.bottle_qty || 0, `Rs ${brate}`, `Rs ${rTotal}`]);
          row.eachCell((cell, colNum) => {
            cell.alignment = { horizontal: colNum === 2 ? 'left' : 'center' };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
              bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
              left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
              right: { style: 'thin', color: { argb: 'FFDDDDDD' } }
            };
          });
        });
      }

      // Grand Total Row
      const totalRow = worksheet.addRow(['', 'GRAND TOTAL', totalJars, '', totalBottles, '', `Rs ${grandTotal}`]);
      totalRow.font = { bold: true };
      totalRow.eachCell((cell, colNum) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
        if (colNum === 2) cell.alignment = { horizontal: 'right' };
        else if (colNum === 7) {
          cell.alignment = { horizontal: 'center' };
          cell.font = { bold: true, color: { argb: 'FF2563EB' } };
        }
        else cell.alignment = { horizontal: 'center' };
      });

      // Columns width
      worksheet.columns.forEach((c, i) => {
        const widths = [5, 15, 10, 12, 10, 12, 15];
        c.width = widths[i];
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const blob = new Blob([buffer], { type: mime });
      const filename = `Report_${custName.replace(/\s+/g, '_')}_${monthName}_${y}.xlsx`;

      if (action === 'share') {
        if (navigator.share) {
          const file = new File([blob], filename, { type: mime });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                title: `Monthly Report - ${custName}`,
                files: [file]
              });
              App.toast('Shared successfully!', 'success');
            } catch(e) {
              console.log('Share canceled or failed', e.name, e.message);
              if (e.name === 'NotAllowedError') {
                App.toast('Browser blocked sharing. Downloading instead...', 'info');
                this.downloadBlob(blob, filename);
              } else if (e.name !== 'AbortError') {
                App.toast('Error sharing file', 'error');
              }
            }
          } else {
            App.toast('Browser restricts direct sharing of Excel files. Downloading instead...', 'info');
            this.downloadBlob(blob, filename);
          }
        } else {
          App.toast('Sharing not supported on this browser. Downloading instead.', 'warning');
          this.downloadBlob(blob, filename);
        }
      } else {
        this.downloadBlob(blob, filename);
      }
    } catch(err) {
      console.error(err);
      App.toast('Error generating Report', 'error');
    }
  },

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    App.toast('Report Exported Successfully!', 'success');
  },

  async handleMonthlyPaymentsReport(action = 'download') {
    const m = parseInt(document.getElementById('excelPayMonth').value);
    const y = parseInt(document.getElementById('excelPayYear').value);
    const monthEl = document.getElementById('excelPayMonth');
    const monthName = monthEl.options[monthEl.selectedIndex]?.text || '';

    App.toast(action === 'share' ? 'Preparing to share...' : 'Generating Report...', 'info');

    try {
      const { data: bills, error } = await supabase
        .from('bills')
        .select('*')
        .eq('bill_month', m)
        .eq('bill_year', y);

      if (error) throw error;

      const { data: custData } = await supabase.from('customers').select('id, name');
      const custMap = {};
      (custData || []).forEach(c => custMap[c.id] = c.name);

      if (!window.ExcelJS) return App.toast('Excel library not loaded.', 'error');

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Payments Report');

      // Title
      worksheet.mergeCells('A1:H1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'BHAIRAVNATH COOL AQUA';
      titleCell.font = { name: 'Arial Black', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Subtitle
      worksheet.mergeCells('A2:H2');
      const subCell = worksheet.getCell('A2');
      subCell.value = `Monthly Payments Report - ${monthName} ${y}`;
      subCell.font = { name: 'Arial', size: 12, italic: true };
      subCell.alignment = { horizontal: 'center', vertical: 'middle' };
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF8FF' } };

      worksheet.addRow([]); // Row 3 empty

      // Header Row
      const headerRow = worksheet.addRow(['#', 'Customer Name', 'Total Jars', 'Total Bottles', 'Total Payable', 'Total Received', 'Total Pending', 'Status']);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } }; // Amber Header
        cell.alignment = { horizontal: 'center' };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });

      let grandPayable = 0, grandReceived = 0, grandPending = 0;

      if (!bills || bills.length === 0) {
        worksheet.mergeCells('A5:H5');
        worksheet.getCell('A5').value = 'No payments found for this month.';
        worksheet.getCell('A5').alignment = { horizontal: 'center' };
      } else {
        bills.forEach((b, idx) => {
          const cName = custMap[b.customer_id] || 'Unknown';
          const payable = Math.round(b.grand_total || 0);
          
          let received = 0;
          let pending = payable;
          let statusColor = 'FFEF4444'; // Red for pending
          let statusText = 'PENDING';

          if (b.status === 'PAID') {
            received = payable;
            pending = 0;
            statusColor = 'FF10B981'; // Green for paid
            statusText = 'PAID';
          }

          grandPayable += payable;
          grandReceived += received;
          grandPending += pending;

          const row = worksheet.addRow([idx + 1, cName, b.total_jars || 0, b.total_bottles || 0, `Rs ${payable}`, `Rs ${received}`, `Rs ${pending}`, statusText]);
          row.eachCell((cell, colNum) => {
            cell.alignment = { horizontal: (colNum === 2) ? 'left' : 'center' };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
              bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
              left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
              right: { style: 'thin', color: { argb: 'FFDDDDDD' } }
            };
            if (colNum === 8) {
              cell.font = { bold: true, color: { argb: statusColor } };
            }
          });
        });
      }

      // Grand Total Row
      const totalRow = worksheet.addRow(['', 'GRAND TOTAL', '', '', `Rs ${grandPayable}`, `Rs ${grandReceived}`, `Rs ${grandPending}`, '']);
      totalRow.font = { bold: true };
      totalRow.eachCell((cell, colNum) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
        if (colNum === 2) cell.alignment = { horizontal: 'right' };
        else cell.alignment = { horizontal: 'center' };
        
        if (colNum === 5) cell.font = { bold: true, color: { argb: 'FF2563EB' } }; // Blue
        if (colNum === 6) cell.font = { bold: true, color: { argb: 'FF10B981' } }; // Green
        if (colNum === 7) cell.font = { bold: true, color: { argb: 'FFEF4444' } }; // Red
      });

      // Columns width
      worksheet.columns.forEach((c, i) => {
        const widths = [5, 25, 10, 10, 15, 15, 15, 15];
        c.width = widths[i];
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const blob = new Blob([buffer], { type: mime });
      const filename = `Payments_Report_${monthName}_${y}.xlsx`;

      if (action === 'share') {
        if (navigator.share) {
          const file = new File([blob], filename, { type: mime });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                title: `Payments Report - ${monthName} ${y}`,
                files: [file]
              });
              App.toast('Shared successfully!', 'success');
            } catch(e) {
              console.log('Share canceled or failed', e.name, e.message);
              if (e.name === 'NotAllowedError') {
                App.toast('Browser blocked sharing. Downloading instead...', 'info');
                this.downloadBlob(blob, filename);
              } else if (e.name !== 'AbortError') {
                App.toast('Error sharing file', 'error');
              }
            }
          } else {
            App.toast('Browser restricts direct sharing of Excel files. Downloading instead...', 'info');
            this.downloadBlob(blob, filename);
          }
        } else {
          App.toast('Sharing not supported on this browser. Downloading instead.', 'warning');
          this.downloadBlob(blob, filename);
        }
      } else {
        this.downloadBlob(blob, filename);
      }
    } catch(err) {
      console.error(err);
      App.toast('Error generating Report', 'error');
    }
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
