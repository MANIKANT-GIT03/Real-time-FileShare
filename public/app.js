/* ================= STATE ================= */
const API = ''; // same origin
let token = localStorage.getItem('fs_token') || null;
let user = null;
let socket = null;
let page = 1;
const LIMIT = 20;
let activeShareFileId = null;
let activeShareCode = null;
let countdownTimer = null;

/* ================= INIT ================= */
document.addEventListener('DOMContentLoaded', () => {
    if (token) validateAndBoot();
    else showAuth();

    // Enter-key handlers
    document.getElementById('login-password').addEventListener('keypress', e => {
        if (e.key === 'Enter') login();
    });
    document.getElementById('signup-password').addEventListener('keypress', e => {
        if (e.key === 'Enter') signup();
    });
    document.getElementById('redeem-code').addEventListener('keypress', e => {
        if (e.key === 'Enter') redeemCode();
    });
});

/* ================= AUTH ================= */
function switchAuth(mode) {
    // Clear all inputs when switching between login and signup
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('signup-username').value = '';
    document.getElementById('signup-email').value = '';
    document.getElementById('signup-password').value = '';
    
    document.getElementById('login-panel').classList.toggle('hidden', mode !== 'login');
    document.getElementById('signup-panel').classList.toggle('hidden', mode !== 'signup');
}

function showAuth() {
    document.getElementById('auth-view').classList.remove('hidden');
    document.getElementById('app-view').classList.add('hidden');
}

function showApp() {
    document.getElementById('auth-view').classList.add('hidden');
    document.getElementById('app-view').classList.remove('hidden');
}

async function signup() {
    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    if (!username || !email || !password || password.length < 8) {
        return toast('All fields required. Password must be 8+ characters.', 'error');
    }

    try {
        const res = await fetch(`${API}/api/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        if (res.status === 409) return toast('Email already registered.', 'error');
        if (!res.ok) throw new Error('Signup failed');
        toast('Account created! Please log in.', 'success');
        switchAuth('login');
    } catch (err) {
        toast(err.message, 'error');
    }
}

async function login() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) return toast('Enter email and password.', 'error');

    try {
        const res = await fetch(`${API}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!res.ok) return toast('Invalid credentials.', 'error');
        const data = await res.json();
        token = data.token;
        localStorage.setItem('fs_token', token);
        
        // Clear login fields after successful login
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        
        await validateAndBoot();
    } catch (err) {
        toast(err.message, 'error');
    }
}

function logout() {
    token = null;
    localStorage.removeItem('fs_token');
    if (socket) { socket.disconnect(); socket = null; }
    
    // Clear all auth input fields
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('signup-username').value = '';
    document.getElementById('signup-email').value = '';
    document.getElementById('signup-password').value = '';
    
    showAuth();
    toast('Logged out.', 'info');
}

async function validateAndBoot() {
    try {
        const res = await fetch(`${API}/api/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Bad token');
        user = await res.json();
        document.getElementById('user-name').textContent = user.user.username;
        updateStorage();
        showApp();
        connectSocket();
        loadFiles();
    } catch (err) {
        console.error(err);
        logout();
    }
}

function updateStorage() {
    const el = document.getElementById('storage-info');
    el.textContent = `${fmtBytes(user.user.storage_used)} / ${fmtBytes(user.user.storage_limit)}`;
}

/* ================= SOCKET.IO ================= */
function connectSocket() {
    socket = io({ auth: { token } });

    socket.on('connect', () => console.log('Socket connected:', socket.id));

    socket.on('connect_error', err => console.error('Socket error:', err.message));

    socket.on('file:uploaded', data => {
        toast(`Uploaded: ${data.file.originalName}`, 'success');
        loadFiles();
    });

    socket.on('file:deleted', () => {
        toast('File deleted.', 'info');
        loadFiles();
    });

    socket.on('file:shared', data => {
        toast(`Share code created: ${data.share.code}`, 'success');
    });

    socket.on('share:redeemed', data => {
        toast(`Someone redeemed: ${data.fileName}`, 'info');
    });
}

/* ================= FILES ================= */
async function loadFiles(p = 1) {
    page = p;
    try {
        const res = await fetch(`${API}/api/files?page=${p}&limit=${LIMIT}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load files');
        const data = await res.json();
        renderFiles(data.files || []);
        renderPagination(data.pagination.total, p, LIMIT);
    } catch (err) {
        toast(err.message, 'error');
    }
}

function renderFiles(files) {
    const grid = document.getElementById('file-grid');
    if (!files.length) {
        grid.innerHTML = '<div class="empty-state">No files yet. Drag & drop to upload.</div>';
        return;
    }
    grid.innerHTML = files.map(f => `
        <div class="file-card">
            <div class="file-icon">${iconFor(f.mime_type)}</div>
            <div class="file-info">
                <div class="file-name" title="${esc(f.original_name)}">${esc(f.original_name)}</div>
                <div class="file-meta">${fmtBytes(f.size)} · ${fmtDate(f.uploaded_at)}</div>
            </div>
            <div class="file-actions">
                <button onclick="downloadFile('${f.id}', '${esc(f.original_name)}')" title="Download">⬇</button>
                <button onclick="openShareModal('${f.id}', '${esc(f.original_name)}')" title="Share">🔗</button>
                <button onclick="deleteFile('${f.id}')" class="delete-btn" title="Delete">🗑</button>
            </div>
        </div>
    `).join('');
}

function renderPagination(total, current, limit) {
    const pages = Math.ceil(total / limit);
    const box = document.getElementById('pagination');
    if (pages <= 1) { box.innerHTML = ''; return; }

    let html = '';
    if (current > 1) html += `<button onclick="loadFiles(${current - 1})">← Prev</button>`;
    html += `<span>Page ${current} of ${pages}</span>`;
    if (current < pages) html += `<button onclick="loadFiles(${current + 1})">Next →</button>`;
    box.innerHTML = html;
}

/* ================= UPLOAD ================= */
const zone = document.getElementById('upload-zone');
zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files.length) uploadFile(e.dataTransfer.files[0]);
});

function handleFileSelect(e) {
    if (e.target.files.length) uploadFile(e.target.files[0]);
}

function uploadFile(file) {
    const progressWrap = document.getElementById('upload-progress');
    const fill = document.getElementById('progress-fill');
    const text = document.getElementById('progress-text');
    const input = document.getElementById('file-input');

    progressWrap.classList.remove('hidden');

    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append('file', file);

    xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            fill.style.width = pct + '%';
            text.textContent = pct + '%';
        }
    });

    xhr.addEventListener('load', () => {
        progressWrap.classList.add('hidden');
        fill.style.width = '0%';
        text.textContent = '0%';
        input.value = '';

        if (xhr.status === 201) {
            toast('Upload complete!', 'success');
            loadFiles();
        } else {
            let msg = 'Upload failed.';
            try { msg = JSON.parse(xhr.responseText).message || msg; } catch (_) {}
            toast(msg, 'error');
        }
    });

    xhr.addEventListener('error', () => {
        progressWrap.classList.add('hidden');
        toast('Upload failed.', 'error');
    });

    xhr.open('POST', `${API}/api/files`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(fd);
}

/* ================= DOWNLOAD / DELETE ================= */
async function downloadFile(id, name) {
    try {
        const res = await fetch(`${API}/api/files/${id}/download`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Download failed');
        const blob = await res.blob();
        triggerDownload(blob, name);
    } catch (err) {
        toast(err.message, 'error');
    }
}

async function deleteFile(id) {
    if (!confirm('Permanently delete this file?')) return;
    try {
        const res = await fetch(`${API}/api/files/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Delete failed');
        toast('File deleted.', 'info');
        loadFiles();
    } catch (err) {
        toast(err.message, 'error');
    }
}

/* ================= SHARE ================= */
function openShareModal(fileId, fileName) {
    activeShareFileId = fileId;
    document.getElementById('share-file-name').textContent = fileName;
    document.getElementById('share-expiry').value = 30;
    document.getElementById('share-max-downloads').value = '';
    document.getElementById('share-result').classList.add('hidden');
    document.getElementById('btn-generate').classList.remove('hidden');
    clearInterval(countdownTimer);
    document.getElementById('share-modal').classList.remove('hidden');
}

function closeShareModal() {
    document.getElementById('share-modal').classList.add('hidden');
    clearInterval(countdownTimer);
    activeShareFileId = null;
}

async function createShare() {
    if (!activeShareFileId) return;

    const expiry = Math.min(parseInt(document.getElementById('share-expiry').value) || 30, 60);
    const maxRaw = document.getElementById('share-max-downloads').value;
    const body = { expiryMinutes: expiry };
    if (maxRaw) body.maxDownloads = parseInt(maxRaw);

    try {
        const res = await fetch(`${API}/api/shares/files/${activeShareFileId}/share`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error('Could not create share');
        const data = await res.json();

        document.getElementById('share-code').textContent = data.share.code;
        document.getElementById('share-expiry-display').textContent =
            `Expires at ${new Date(data.share.expiresAt).toLocaleString()}` +
            (data.share.maxDownloads ? ` · Max ${data.share.maxDownloads} downloads` : ' · Unlimited downloads');

        document.getElementById('share-result').classList.remove('hidden');
        document.getElementById('btn-generate').classList.add('hidden');

        // Countdown timer
        const expires = new Date(data.share.expiresAt).getTime();
        const timerEl = document.getElementById('share-countdown');
        clearInterval(countdownTimer);
        countdownTimer = setInterval(() => {
            const now = Date.now();
            const diff = expires - now;
            if (diff <= 0) {
                timerEl.textContent = 'Expired';
                clearInterval(countdownTimer);
                return;
            }
            const m = Math.floor(diff / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            timerEl.textContent = `⏱ ${m}m ${s}s remaining`;
        }, 1000);
        timerEl.textContent = `⏱ ${expiry}m 0s remaining`;
    } catch (err) {
        toast(err.message, 'error');
    }
}

function copyShareCode() {
    const code = document.getElementById('share-code').textContent;
    navigator.clipboard.writeText(code).then(() => toast('Code copied!', 'success'));
}

/* ================= REDEEM ================= */
function openRedeemFromAuth() {
    switchAuth('login');
    openRedeemModal();
}

function openRedeemModal() {
    document.getElementById('redeem-code').value = '';
    document.getElementById('redeem-result').classList.add('hidden');
    document.getElementById('redeem-modal').classList.remove('hidden');
}

function closeRedeemModal() {
    document.getElementById('redeem-modal').classList.add('hidden');
    activeShareCode = null;
}

async function redeemCode() {
    const code = document.getElementById('redeem-code').value.trim();
    if (!/^\d{6}$/.test(code)) return toast('Enter a valid 6-digit code.', 'error');

    try {
        const res = await fetch(`${API}/api/shares/redeem`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        if (!res.ok) {
            toast('Invalid, expired, or fully-used share code.', 'error');
            return;
        }
        const data = await res.json();
        activeShareCode = code;

        document.getElementById('redeem-file-name').textContent =
            `${data.file.name} · ${fmtBytes(data.file.size)}`;
        document.getElementById('redeem-result').classList.remove('hidden');
    } catch (err) {
        toast(err.message, 'error');
    }
}

async function downloadSharedFile() {
    if (!activeShareCode) return;
    try {
        const res = await fetch(`${API}/api/shares/${activeShareCode}/download`);
        if (!res.ok) throw new Error('Download failed');
        const blob = await res.blob();
        const disp = res.headers.get('Content-Disposition') || '';
        const match = disp.match(/filename="?([^"]+)"?/);
        const name = match ? match[1] : 'download';
        triggerDownload(blob, name);
    } catch (err) {
        toast(err.message, 'error');
    }
}

/* ================= UTILS ================= */
function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function toast(msg, type = 'info') {
    const box = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    box.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 350);
    }, 5000);
}

function fmtBytes(b) {
    if (!b) return '0 B';
    const u = ['B','KB','MB','GB'];
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return parseFloat((b / Math.pow(1024, i)).toFixed(2)) + ' ' + u[i];
}

function fmtDate(d) {
    return new Date(d).toLocaleString();
}

function iconFor(mime) {
    if (mime.startsWith('image/')) return '🖼️';
    if (mime === 'application/pdf') return '📄';
    if (mime.includes('word') || mime.includes('document')) return '📝';
    if (mime.startsWith('text/')) return '📃';
    if (mime.includes('zip') || mime.includes('compressed')) return '🗜️';
    return '📁';
}

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}