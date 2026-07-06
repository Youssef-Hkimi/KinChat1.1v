const state = {
    token: localStorage.getItem('dev_token') || '',
    playlist: []
};

// Elements
const loginOverlay = document.getElementById('loginOverlay');
const dashboard = document.getElementById('dashboard');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

// Nav
const navItems = document.querySelectorAll('.nav-item');
const viewSections = document.querySelectorAll('.view-section');

// Utils
const headers = () => ({ 'Authorization': `Bearer ${state.token}`, 'Content-Type': 'application/json' });

// Init
if (state.token) {
    checkAuth();
}

// Login
loginBtn.addEventListener('click', async () => {
    const password = passwordInput.value;
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await res.json();
        if (data.success) {
            state.token = data.token;
            localStorage.setItem('dev_token', state.token);
            startDashboard();
        } else {
            loginError.innerText = data.error || 'Login failed';
        }
    } catch (e) {
        loginError.innerText = 'Network error';
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('dev_token');
    location.reload();
});

async function checkAuth() {
    try {
        const res = await fetch('/api/dev/overview', { headers: headers() });
        if (res.ok) {
            startDashboard();
        } else {
            localStorage.removeItem('dev_token');
        }
    } catch {
        // Network error, stay on login
    }
}

function startDashboard() {
    loginOverlay.classList.remove('active');
    loginOverlay.classList.add('hidden');
    dashboard.classList.remove('hidden');
    
    // Load initial data
    fetchOverview();
    fetchServers();
    fetchPresence();
    loadNpcs();
    loadGlobalSettings();
    loadPartners();
    loadPartnerStats();
    
    // Connect SSE
    connectSSE();
    
    // Set intervals
    setInterval(fetchOverview, 10000);
    setInterval(fetchServers, 30000);
}

// Navigation
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        navItems.forEach(n => n.classList.remove('active'));
        viewSections.forEach(v => v.classList.add('hidden'));
        
        item.classList.add('active');
        document.getElementById(item.dataset.target).classList.remove('hidden');
    });
});

// APIs
async function fetchOverview() {
    try {
        const res = await fetch('/api/dev/overview', { headers: headers() });
        const data = await res.json();
        
        document.getElementById('kpi-status').innerText = data.status;
        document.getElementById('kpi-servers').innerText = data.totalServers.toLocaleString();
        document.getElementById('kpi-users').innerText = data.totalUsers.toLocaleString();
        document.getElementById('kpi-messages').innerText = data.msgsToday.toLocaleString();
        document.getElementById('kpi-replies').innerText = data.repliesToday.toLocaleString();
        document.getElementById('kpi-memories').innerText = data.totalMemories.toLocaleString();
        document.getElementById('kpi-memory').innerText = data.memoryMb + ' MB';
        document.getElementById('kpi-cpu').innerText = data.cpuLoad;
        
    } catch (e) { console.error('Overview fetch error', e); }
}

async function fetchServers() {
    try {
        const res = await fetch('/api/dev/servers', { headers: headers() });
        const data = await res.json();
        
        const tbody = document.getElementById('serverTableBody');
        tbody.innerHTML = '';
        
        data.forEach(s => {
            const tr = document.createElement('tr');
            const iconUrl = s.icon || 'https://cdn.discordapp.com/embed/avatars/0.png';
            const date = s.joinedAt ? new Date(s.joinedAt).toLocaleDateString() : 'Unknown';
            tr.innerHTML = `
                <td><img src="${iconUrl}" class="server-icon" alt="icon"></td>
                <td><strong>${s.name}</strong></td>
                <td>${s.memberCount.toLocaleString()}</td>
                <td>${date}</td>
                <td style="color:var(--text-muted);font-size:0.8rem;">${s.id}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error('Servers fetch error', e); }
}

// SSE Connection
function connectSSE() {
    // Note: EventSource doesn't support custom headers easily natively in the browser API for GET requests.
    // However, we set authenticate to allow if password is not set, or we can use a query param.
    // For simplicity, we bypass auth on SSE for now in this snippet (or it uses cookies).
    // Actually, EventSource passes cookies. If we use Bearer token, we need a polyfill or fetch-based streams.
    // To keep it simple, we use native EventSource and append token in URL:
    const source = new EventSource('/api/stream?token=' + encodeURIComponent(state.token));
    const feed = document.getElementById('activityFeed');
    
    source.addEventListener('activity', (e) => {
        const data = JSON.parse(e.data);
        const div = document.createElement('div');
        div.className = `log-entry ${data.type}`;
        const time = new Date().toLocaleTimeString();
        div.innerHTML = `<span class="time">[${time}]</span> <span class="message">${data.message}</span>`;
        feed.appendChild(div);
        
        // Auto scroll to bottom
        const terminal = document.querySelector('.terminal');
        terminal.scrollTop = terminal.scrollHeight;
        
        // Pulse animation on the overview
        const kpi = document.getElementById('kpi-messages');
        if (data.type === 'message') {
            kpi.style.transform = 'scale(1.1)';
            setTimeout(() => kpi.style.transform = 'scale(1)', 200);
            
            // Increment local counters so UI feels instantly alive
            const curr = parseInt(kpi.innerText.replace(/,/g, '')) || 0;
            kpi.innerText = (curr + 1).toLocaleString();
        } else if (data.type === 'llm') {
            const kpiR = document.getElementById('kpi-replies');
            const curr = parseInt(kpiR.innerText.replace(/,/g, '')) || 0;
            kpiR.innerText = (curr + 1).toLocaleString();
        }
    });
    
    source.onerror = () => {
        document.getElementById('nav-system-status').innerText = "Disconnected";
        document.getElementById('nav-system-status').previousElementSibling.classList.remove('pulse-green');
        document.getElementById('nav-system-status').previousElementSibling.style.background = 'red';
    };
}

document.getElementById('clearActivityBtn').addEventListener('click', () => {
    document.getElementById('activityFeed').innerHTML = '';
});

// Presence Editor
async function fetchPresence() {
    try {
        const res = await fetch('/api/dev/presence', { headers: headers() });
        state.playlist = await res.json();
        renderPlaylist();
    } catch (e) { console.error(e); }
}

function renderPlaylist() {
    const container = document.getElementById('presencePlaylist');
    container.innerHTML = '';
    
    if (state.playlist.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted)">Playlist is empty.</p>';
        return;
    }
    
    state.playlist.forEach((p, idx) => {
        const div = document.createElement('div');
        div.className = 'playlist-item';
        
        const activityTypes = { 0: 'Playing', 2: 'Listening', 3: 'Watching', 5: 'Competing' };
        
        div.innerHTML = `
            <div class="playlist-item-info">
                <span>[${p.status.toUpperCase()}]</span> 
                ${activityTypes[p.type]} ${p.text} (${p.durationMs/1000}s)
            </div>
            <button class="btn-danger sm" onclick="removePresence(${idx})">Delete</button>
        `;
        container.appendChild(div);
    });
}

window.removePresence = (idx) => {
    state.playlist.splice(idx, 1);
    renderPlaylist();
};

document.getElementById('addPresenceBtn').addEventListener('click', () => {
    const status = document.getElementById('presStatus').value;
    const type = parseInt(document.getElementById('presType').value);
    const text = document.getElementById('presText').value;
    const duration = parseInt(document.getElementById('presDuration').value) * 1000;
    
    if (!text) return alert("Text required");
    
    state.playlist.push({ status, type, text, durationMs: duration });
    renderPlaylist();
    document.getElementById('presText').value = '';
});

document.getElementById('savePresenceBtn').addEventListener('click', async () => {
    try {
        await fetch('/api/dev/presence', {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify(state.playlist)
        });
        alert("Playlist saved and active!");
    } catch (e) { alert("Failed to save"); }
});

// Developer Tools
document.getElementById('restartBotBtn').addEventListener('click', async () => {
    if (confirm("Are you sure you want to kill the bot process?")) {
        await fetch('/api/dev/actions/restart', { method: 'POST', headers: headers() });
        alert("Restarting...");
        location.reload();
    }
});

document.getElementById('broadcastBtn').addEventListener('click', async () => {
    const title = document.getElementById('broadcastTitle').value;
    const message = document.getElementById('broadcastMessage').value;
    if (!message) return alert("Message required");
    
    if (confirm("Send broadcast to ALL servers?")) {
        const res = await fetch('/api/dev/actions/broadcast', {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify({ title, message })
        });
        const data = await res.json();
        alert(`Broadcast sent to ${data.serversReached} servers!`);
    }
});

// ==========================================
// NPC EDITOR & GLOBAL SETTINGS RESTORATION
// ==========================================
let currentNpcs = [];
let selectedNpcIndex = -1;

async function loadNpcs() {
    try {
        const res = await fetch('/api/npcs', { headers: headers() });
        currentNpcs = await res.json();
        renderNpcList();
    } catch (e) { console.error('Failed to load NPCs', e); }
}

function renderNpcList() {
    const list = document.getElementById('npcList');
    list.innerHTML = '';
    currentNpcs.forEach((npc, index) => {
        const li = document.createElement('li');
        li.className = `npc-list-item ${index === selectedNpcIndex ? 'active' : ''}`;
        li.innerText = npc.name;
        li.onclick = () => selectNpc(index);
        list.appendChild(li);
    });
}

function selectNpc(index) {
    selectedNpcIndex = index;
    renderNpcList();
    
    const npc = currentNpcs[index];
    document.getElementById('editorContent').style.display = 'block';
    
    document.getElementById('editId').value = npc.id || '';
    document.getElementById('editId').disabled = true; // Cannot change ID
    document.getElementById('editName').value = npc.name || '';
    document.getElementById('editAvatar').value = npc.avatarUrl || '';
    document.getElementById('editBanner').value = npc.bannerUrl || '';
    document.getElementById('editOccupation').value = npc.occupation || '';
    document.getElementById('editPersonality').value = npc.personalitySummary || '';
    document.getElementById('editAge').value = npc.age || '';
    document.getElementById('editMood').value = npc.defaultMood || '';
    document.getElementById('editLikes').value = (npc.likes || []).join(', ');
    document.getElementById('editDislikes').value = (npc.dislikes || []).join(', ');
    document.getElementById('editQuote').value = npc.favoriteQuote || '';
    document.getElementById('editPrompt').value = npc.basePrompt || '';

    updatePreview();
}

document.getElementById('createNpcBtn').addEventListener('click', () => {
    selectedNpcIndex = -1;
    renderNpcList();
    document.getElementById('editorContent').style.display = 'block';
    
    document.getElementById('editId').value = '';
    document.getElementById('editId').disabled = false;
    document.getElementById('editName').value = '';
    document.getElementById('editAvatar').value = '';
    document.getElementById('editBanner').value = '';
    document.getElementById('editOccupation').value = '';
    document.getElementById('editPersonality').value = '';
    document.getElementById('editAge').value = '';
    document.getElementById('editMood').value = '';
    document.getElementById('editLikes').value = '';
    document.getElementById('editDislikes').value = '';
    document.getElementById('editQuote').value = '';
    document.getElementById('editPrompt').value = '';

    updatePreview();
});

const inputs = ['editName', 'editAvatar', 'editBanner', 'editPersonality'];
inputs.forEach(id => {
    document.getElementById(id).addEventListener('input', updatePreview);
});

function updatePreview() {
    const name = document.getElementById('editName').value || 'NPC Name';
    const desc = document.getElementById('editPersonality').value || 'Description goes here...';
    const avatar = document.getElementById('editAvatar').value;
    const banner = document.getElementById('editBanner').value;

    document.getElementById('previewName').innerText = name;
    document.getElementById('previewDesc').innerText = desc;
    
    const avatarImg = document.getElementById('previewAvatar');
    if (avatar) { avatarImg.src = avatar; avatarImg.style.display = 'block'; }
    else { avatarImg.style.display = 'none'; }

    const bannerImg = document.getElementById('previewBanner');
    if (banner) { bannerImg.src = banner; bannerImg.style.display = 'block'; }
    else { bannerImg.style.display = 'none'; }
}

document.getElementById('saveNpcBtn').addEventListener('click', async () => {
    const id = document.getElementById('editId').value.trim();
    if (!id) return alert("NPC ID is required");

    const newNpc = {
        id,
        name: document.getElementById('editName').value,
        avatarUrl: document.getElementById('editAvatar').value,
        bannerUrl: document.getElementById('editBanner').value,
        occupation: document.getElementById('editOccupation').value,
        personalitySummary: document.getElementById('editPersonality').value,
        age: document.getElementById('editAge').value,
        defaultMood: document.getElementById('editMood').value,
        likes: document.getElementById('editLikes').value.split(',').map(s => s.trim()).filter(s => s),
        dislikes: document.getElementById('editDislikes').value.split(',').map(s => s.trim()).filter(s => s),
        favoriteQuote: document.getElementById('editQuote').value,
        basePrompt: document.getElementById('editPrompt').value
    };

    try {
        const res = await fetch('/api/npcs', {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify(newNpc)
        });
        const data = await res.json();
        if (data.success) {
            alert("Saved successfully!");
            await loadNpcs();
        }
    } catch (e) { alert("Failed to save"); }
});

// GLOBAL SETTINGS
async function loadGlobalSettings() {
    try {
        const res = await fetch('/api/settings', { headers: headers() });
        const data = await res.json();
        document.getElementById('globalEmbedColor').value = data.embedColor || '';
        document.getElementById('globalFooterText').value = data.footerText || '';
        document.getElementById('globalShowBanners').checked = !!data.showBanners;
        document.getElementById('globalShowThumbnails').checked = !!data.showThumbnails;
    } catch (e) { console.error('Failed to load global settings', e); }
}

document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
    const payload = {
        embedColor: document.getElementById('globalEmbedColor').value,
        footerText: document.getElementById('globalFooterText').value,
        showBanners: document.getElementById('globalShowBanners').checked,
        showThumbnails: document.getElementById('globalShowThumbnails').checked
    };
    try {
        await fetch('/api/settings', {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify(payload)
        });
        alert("Global Settings Saved!");
    } catch (e) { alert("Failed to save settings"); }
});

// ==========================================
// PARTNER NETWORK CRM
// ==========================================
let currentPartners = [];
let partnerStats = [];

async function loadPartners() {
    try {
        const res = await fetch('/api/dev/partners', { headers: headers() });
        currentPartners = await res.json();
        renderPartners();
        updatePartnerCategories();
    } catch (e) { console.error('Failed to load partners', e); }
}

async function loadPartnerStats() {
    try {
        const res = await fetch('/api/dev/partner-stats', { headers: headers() });
        partnerStats = await res.json();
        renderPartnerStats();
    } catch (e) { console.error('Failed to load partner stats', e); }
}

function renderPartnerStats() {
    document.getElementById('kpi-partner-total').innerText = currentPartners.length.toLocaleString();
    document.getElementById('kpi-partner-active').innerText = currentPartners.filter(p => p.status === 'active').length.toLocaleString();
    
    let totalRecs = 0;
    let totalClicks = 0;
    partnerStats.forEach(s => {
        totalRecs += s.timesRecommended;
        totalClicks += s.timesClicked;
    });
    
    document.getElementById('kpi-partner-recs').innerText = totalRecs.toLocaleString();
    document.getElementById('kpi-partner-clicks').innerText = totalClicks.toLocaleString();
}

function updatePartnerCategories() {
    const select = document.getElementById('partnerFilter');
    const categories = [...new Set(currentPartners.map(p => p.category))];
    select.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c; opt.innerText = c;
        select.appendChild(opt);
    });
}

function renderPartners() {
    const grid = document.getElementById('partnerGrid');
    grid.innerHTML = '';
    
    const query = document.getElementById('partnerSearch').value.toLowerCase();
    const cat = document.getElementById('partnerFilter').value;

    let filtered = currentPartners.filter(p => {
        const matchesQuery = p.name.toLowerCase().includes(query) || p.desc.toLowerCase().includes(query);
        const matchesCat = cat === 'all' || p.category === cat;
        return matchesQuery && matchesCat;
    });

    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = 'partner-card';
        
        let badgesHtml = '';
        if (p.featured) badgesHtml += '<span class="badge featured">Featured</span>';
        badgesHtml += `<span class="badge status-${p.status}">${p.status.toUpperCase()}</span>`;

        card.innerHTML = `
            <div class="partner-banner" style="background-image: url('${p.banner || ''}');">
                <div class="partner-badges">${badgesHtml}</div>
            </div>
            <div class="partner-content">
                <img src="${p.icon || 'https://cdn.discordapp.com/embed/avatars/0.png'}" class="partner-icon">
                <div class="partner-name">${p.name}</div>
                <div class="partner-category">${p.category}</div>
                <div class="partner-desc">${p.desc}</div>
                <div class="partner-actions">
                    <button class="btn-secondary sm" onclick="editPartner('${p.id}')">Edit</button>
                    <button class="btn-danger sm" onclick="deletePartner('${p.id}')">Delete</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
    
    renderPartnerStats();
}

document.getElementById('partnerSearch').addEventListener('input', renderPartners);
document.getElementById('partnerFilter').addEventListener('change', renderPartners);

document.getElementById('addPartnerBtn').addEventListener('click', () => {
    document.getElementById('partnerModalTitle').innerText = 'Add Partner';
    document.getElementById('partId').value = '';
    document.getElementById('partId').disabled = false;
    document.getElementById('partName').value = '';
    document.getElementById('partIcon').value = '';
    document.getElementById('partInvite').value = '';
    document.getElementById('partDesc').value = '';
    document.getElementById('partCategory').value = '';
    document.getElementById('partStatus').value = 'active';
    document.getElementById('partFeatured').checked = false;
    document.getElementById('partNotes').value = '';
    
    document.getElementById('partnerModal').classList.remove('hidden');
});

document.getElementById('cancelPartnerBtn').addEventListener('click', () => {
    document.getElementById('partnerModal').classList.add('hidden');
});

window.editPartner = (id) => {
    const p = currentPartners.find(x => x.id === id);
    if (!p) return;
    document.getElementById('partnerModalTitle').innerText = 'Edit Partner';
    document.getElementById('partId').value = p.id;
    document.getElementById('partId').disabled = true;
    document.getElementById('partName').value = p.name;
    document.getElementById('partIcon').value = p.icon;
    document.getElementById('partInvite').value = p.invite;
    document.getElementById('partDesc').value = p.desc;
    document.getElementById('partCategory').value = p.category;
    document.getElementById('partStatus').value = p.status;
    document.getElementById('partFeatured').checked = p.featured;
    document.getElementById('partNotes').value = p.notes;
    
    document.getElementById('partnerModal').classList.remove('hidden');
};

document.getElementById('savePartnerBtn').addEventListener('click', async () => {
    const id = document.getElementById('partId').value;
    if (!id) return alert("ID is required");
    
    const payload = {
        id,
        name: document.getElementById('partName').value,
        icon: document.getElementById('partIcon').value,
        invite: document.getElementById('partInvite').value,
        desc: document.getElementById('partDesc').value,
        category: document.getElementById('partCategory').value,
        banner: '', // Banners can be added to HTML later or left empty for now
        status: document.getElementById('partStatus').value,
        featured: document.getElementById('partFeatured').checked,
        notes: document.getElementById('partNotes').value,
        memberCount: 0 // Fetch dynamically via API if needed
    };

    const isEdit = document.getElementById('partId').disabled;
    const url = isEdit ? `/api/dev/partners/${id}` : '/api/dev/partners';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        await fetch(url, { method, headers: headers(), body: JSON.stringify(payload) });
        document.getElementById('partnerModal').classList.add('hidden');
        await loadPartners();
    } catch (e) { alert("Failed to save partner"); }
});

window.deletePartner = async (id) => {
    if (confirm("Delete this partner permanently?")) {
        try {
            await fetch(`/api/dev/partners/${id}`, { method: 'DELETE', headers: headers() });
            await loadPartners();
        } catch (e) { alert("Delete failed"); }
    }
};