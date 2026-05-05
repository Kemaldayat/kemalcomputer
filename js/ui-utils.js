// Unified UI Modal Utility (SweetAlert style)
(() => {
    // Inject CSS
    const style = document.createElement('style');
    style.innerHTML = `
        .kc-swal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            animation: fadeIn 0.3s ease;
        }
        .kc-swal-modal {
            background: #fff;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            animation: slideUp 0.3s ease;
        }
        body.dark-mode .kc-swal-modal {
            background: #1e293b;
            color: #f8fafc;
        }
        .kc-swal-icon {
            font-size: 50px;
            margin-bottom: 15px;
        }
        .kc-swal-icon.success { color: #10b981; }
        .kc-swal-icon.error { color: #ef4444; }
        .kc-swal-icon.info { color: #3b82f6; }
        .kc-swal-icon.confirm { color: #f59e0b; }
        .kc-swal-text {
            font-size: 16px;
            margin-bottom: 25px;
            line-height: 1.5;
        }
        .kc-swal-buttons {
            display: flex;
            gap: 10px;
            justify-content: center;
        }
        .kc-swal-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            font-family: inherit;
            transition: all 0.2s;
        }
        .kc-swal-btn-primary { background: #0d9488; color: white; }
        .kc-swal-btn-primary:hover { background: #0f766e; }
        .kc-swal-btn-danger { background: #ef4444; color: white; }
        .kc-swal-btn-danger:hover { background: #dc2626; }
        .kc-swal-btn-cancel { background: #e2e8f0; color: #334155; }
        body.dark-mode .kc-swal-btn-cancel { background: #334155; color: #f8fafc; }
        
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    `;
    document.head.appendChild(style);

    // Inject HTML
    const overlay = document.createElement('div');
    overlay.className = 'kc-swal-overlay';
    overlay.innerHTML = `
        <div class="kc-swal-modal">
            <div id="kc-swal-icon" class="kc-swal-icon"></div>
            <div id="kc-swal-text" class="kc-swal-text"></div>
            <div id="kc-swal-buttons" class="kc-swal-buttons"></div>
        </div>
    `;
    document.body.appendChild(overlay);

    const closeSwal = () => { overlay.style.display = 'none'; };

    // Global Function
    window.showSweetAlert = (msg, type = 'info', callback = null) => {
        const iconDiv = document.getElementById('kc-swal-icon');
        const textDiv = document.getElementById('kc-swal-text');
        const btnsDiv = document.getElementById('kc-swal-buttons');
        
        textDiv.innerHTML = window.escapeHTML ? window.escapeHTML(msg) : msg;
        btnsDiv.innerHTML = '';
        iconDiv.className = 'kc-swal-icon ' + type;

        let iconHtml = '';
        if (type === 'success') iconHtml = '<i class="fas fa-check-circle"></i>';
        else if (type === 'error') iconHtml = '<i class="fas fa-times-circle"></i>';
        else if (type === 'confirm') iconHtml = '<i class="fas fa-exclamation-triangle"></i>';
        else iconHtml = '<i class="fas fa-info-circle"></i>';
        iconDiv.innerHTML = iconHtml;

        if (type === 'confirm') {
            const btnY = document.createElement('button');
            btnY.className = 'kc-swal-btn kc-swal-btn-danger';
            btnY.innerText = 'Ya, Lanjutkan';
            btnY.onclick = () => { closeSwal(); if(callback) callback(); };
            
            const btnN = document.createElement('button');
            btnN.className = 'kc-swal-btn kc-swal-btn-cancel';
            btnN.innerText = 'Batal';
            btnN.onclick = closeSwal;
            
            btnsDiv.appendChild(btnY);
            btnsDiv.appendChild(btnN);
        } else {
            const btnO = document.createElement('button');
            btnO.className = 'kc-swal-btn kc-swal-btn-primary';
            btnO.innerText = 'OK';
            btnO.onclick = () => { closeSwal(); if(callback) callback(); };
            btnsDiv.appendChild(btnO);
        }

        overlay.style.display = 'flex';
    };
})();
