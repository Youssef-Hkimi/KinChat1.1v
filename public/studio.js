let npcs = [];
let selectedId = null;
let authToken = localStorage.getItem('disbot_token');

const els = {
    list: document.getElementById('npcList'),
    saveBtn: document.getElementById('btnSave'),
    saveStatus: document.getElementById('saveStatus'),
    createBtn: document.getElementById('btnCreateNpc'),
    
    // Inputs
    f_id: document.getElementById('f_id'),
    f_name: document.getElementById('f_name'),
    f_nickname: document.getElementById('f_nickname'),
    f_pronouns: document.getElementById('f_pronouns'),
    f_tagline: document.getElementById('f_tagline'),
    f_occupation: document.getElementById('f_occupation'),
    f_mood: document.getElementById('f_mood'),
    f_age: document.getElementById('f_age'),
    f_personalitySummary: document.getElementById('f_personalitySummary'),
    f_favoriteQuote: document.getElementById('f_favoriteQuote'),
    
    f_avatarUrl: document.getElementById('f_avatarUrl'),
    f_bannerUrl: document.getElementById('f_bannerUrl'),
    
    f_embedColor: document.getElementById('f_embedColor'),
    
    f_likes: document.getElementById('f_likes'),
    f_dislikes: document.getElementById('f_dislikes'),
    f_favoriteFood: document.getElementById('f_favoriteFood'),
    
    f_lore_backstory: document.getElementById('f_lore_backstory'),
    f_lore_secrets: document.getElementById('f_lore_secrets'),
    f_lore_rumors: document.getElementById('f_lore_rumors'),
    
    f_conv_verbosity: document.getElementById('f_conv_verbosity'),
    f_conv_humor: document.getElementById('f_conv_humor'),
    f_conv_sarcasm: document.getElementById('f_conv_sarcasm'),
    
    f_basePrompt: document.getElementById('f_basePrompt'),
    f_compiledPrompt: document.getElementById('f_compiledPrompt'),
    
    // Preview
    pv_container: document.getElementById('pv_embedContainer'),
    pv_banner: document.getElementById('pv_banner'),
    pv_thumbnail: document.getElementById('pv_thumbnail'),
    pv_title: document.getElementById('pv_title'),
    pv_desc: document.getElementById('pv_desc'),
    pv_fields: document.getElementById('pv_fields')
};

// Check Auth
if (!authToken) {
    const pwd = prompt("Enter Master Password for NPC Studio:");
    if (pwd) {
        authToken = pwd;
        localStorage.setItem('disbot_token', pwd);
    }
}

// Initialization
async function init() {
    setupAccordions();
    setupLiveListeners();
    await fetchNPCs();
}

// Fetch Data
async function fetchNPCs() {
    try {
        const res = await fetch('/api/npcs', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) {
            npcs = await res.json();
            renderList();
            if (npcs.length > 0) selectNPC(npcs[0].id);
        } else {
            alert("Unauthorized. Clear localStorage and reload.");
        }
    } catch (e) {
        console.error("Failed to load NPCs", e);
    }
}

// Render Library
function renderList() {
    els.list.innerHTML = '';
    npcs.forEach(npc => {
        const div = document.createElement('div');
        div.className = `npc-card ${npc.id === selectedId ? 'active' : ''}`;
        div.onclick = () => selectNPC(npc.id);
        
        div.innerHTML = `
            <img src="${npc.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png'}">
            <div class="npc-card-info">
                <span class="npc-card-name">${npc.name}</span>
                <span class="npc-card-mood">${npc.defaultMood || 'Neutral'}</span>
            </div>
        `;
        els.list.appendChild(div);
    });
}

// Select NPC
function selectNPC(id) {
    selectedId = id;
    renderList();
    
    const npc = npcs.find(n => n.id === id);
    if (!npc) return;
    
    // Bind data to inputs
    els.f_id.value = npc.id || '';
    els.f_id.disabled = true; // Can't edit ID after creation
    
    els.f_name.value = npc.name || '';
    els.f_nickname.value = npc.nickname || '';
    els.f_pronouns.value = npc.pronouns || '';
    els.f_tagline.value = npc.tagline || '';
    els.f_occupation.value = npc.occupation || '';
    els.f_mood.value = npc.defaultMood || '';
    els.f_age.value = npc.age || '';
    els.f_personalitySummary.value = npc.personalitySummary || '';
    els.f_favoriteQuote.value = npc.favoriteQuote || '';
    
    els.f_avatarUrl.value = npc.avatarUrl || '';
    els.f_bannerUrl.value = npc.bannerUrl || '';
    
    els.f_embedColor.value = npc.embedColor || '';
    
    els.f_likes.value = npc.likes ? npc.likes.join(', ') : '';
    els.f_dislikes.value = npc.dislikes ? npc.dislikes.join(', ') : '';
    els.f_favoriteFood.value = npc.favoriteFood || '';
    
    if (npc.lore) {
        els.f_lore_backstory.value = npc.lore.backstory || '';
        els.f_lore_secrets.value = npc.lore.secrets || '';
        els.f_lore_rumors.value = npc.lore.rumors || '';
    } else {
        els.f_lore_backstory.value = '';
        els.f_lore_secrets.value = '';
        els.f_lore_rumors.value = '';
    }
    
    if (npc.promptConfig) {
        els.f_conv_verbosity.value = npc.promptConfig.verbosity || 50;
        els.f_conv_humor.value = npc.promptConfig.humorLevel || 50;
        els.f_conv_sarcasm.value = npc.promptConfig.sarcasm || 50;
    } else {
        els.f_conv_verbosity.value = 50;
        els.f_conv_humor.value = 50;
        els.f_conv_sarcasm.value = 50;
    }
    
    document.getElementById('v_verbosity').innerText = els.f_conv_verbosity.value;
    document.getElementById('v_humor').innerText = els.f_conv_humor.value;
    document.getElementById('v_sarcasm').innerText = els.f_conv_sarcasm.value;
    
    els.f_basePrompt.value = npc.basePrompt || '';
    
    updatePreview();
}

// Update Live Preview & Compiled Prompt
function updatePreview() {
    // 1. Update Preview Render
    const color = els.f_embedColor.value || '#7289da';
    els.pv_container.style.borderLeftColor = color;
    
    els.pv_title.innerText = `📖 NPC Directory: ${els.f_name.value}`;
    els.pv_desc.innerText = els.f_personalitySummary.value || 'No description provided.';
    
    if (els.f_bannerUrl.value) {
        els.pv_banner.src = els.f_bannerUrl.value;
        els.pv_banner.style.display = 'block';
    } else {
        els.pv_banner.style.display = 'none';
    }
    
    if (els.f_avatarUrl.value) {
        els.pv_thumbnail.src = els.f_avatarUrl.value;
        els.pv_thumbnail.style.display = 'block';
    } else {
        els.pv_thumbnail.style.display = 'none';
    }
    
    // Dynamic Fields
    els.pv_fields.innerHTML = '';
    const addField = (name, val) => {
        if (!val) return;
        els.pv_fields.innerHTML += `
            <div class="discord-embed-field">
                <div class="discord-embed-field-name">${name}</div>
                <div class="discord-embed-field-value">${val}</div>
            </div>
        `;
    };
    
    addField('Occupation', els.f_occupation.value);
    addField('Age', els.f_age.value);
    addField('Mood', els.f_mood.value);
    addField('Likes', els.f_likes.value);
    addField('Dislikes', els.f_dislikes.value);
    
    if (els.f_favoriteQuote.value) {
        els.pv_fields.innerHTML += `
            <div class="discord-embed-field" style="width:100%;">
                <div class="discord-embed-field-name">Quote</div>
                <div class="discord-embed-field-value">*${els.f_favoriteQuote.value}*</div>
            </div>
        `;
    }
    
    // 2. Compile Prompt
    let prompt = els.f_basePrompt.value ? els.f_basePrompt.value + "\n\n" : "";
    prompt += `[Behavior Instructions]\n`;
    prompt += `- Verbosity: ${els.f_conv_verbosity.value}% (0=One word, 100=Paragraphs)\n`;
    prompt += `- Humor: ${els.f_conv_humor.value}%\n`;
    prompt += `- Sarcasm: ${els.f_conv_sarcasm.value}%\n`;
    if (els.f_lore_backstory.value) prompt += `\n[Backstory]\n${els.f_lore_backstory.value}\n`;
    if (els.f_lore_secrets.value) prompt += `\n[Hidden Secrets (DO NOT REVEAL DIRECTLY)]\n${els.f_lore_secrets.value}\n`;
    
    els.f_compiledPrompt.value = prompt.trim();
    
    els.saveStatus.innerText = "Unsaved changes*";
    els.saveStatus.style.color = "var(--primary-color)";
}

// Setup Event Listeners
function setupLiveListeners() {
    const inputs = document.querySelectorAll('.form-control, input[type=range]');
    inputs.forEach(input => {
        input.addEventListener('input', (e) => {
            if (e.target.type === 'range') {
                const valDisplay = document.getElementById(`v_${e.target.id.replace('f_conv_', '')}`);
                if (valDisplay) valDisplay.innerText = e.target.value;
            }
            updatePreview();
        });
    });
    
    els.createBtn.addEventListener('click', () => {
        selectedId = null;
        document.querySelectorAll('.form-control').forEach(el => el.value = '');
        els.f_id.disabled = false;
        els.f_name.value = 'New NPC';
        updatePreview();
        renderList();
    });
    
    els.saveBtn.addEventListener('click', saveNPC);
    
    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveNPC();
        }
    });
}

// Accordion Logic
function setupAccordions() {
    document.querySelectorAll('.section-header').forEach(header => {
        header.addEventListener('click', () => {
            const card = header.parentElement;
            const icon = header.querySelector('.toggle-icon');
            if (card.classList.contains('expanded')) {
                card.classList.remove('expanded');
                icon.innerText = '▶';
            } else {
                card.classList.add('expanded');
                icon.innerText = '▼';
            }
        });
    });
}

// Save to API
async function saveNPC() {
    els.saveBtn.innerText = "Saving...";
    
    const id = els.f_id.value || els.f_name.value.toLowerCase().replace(/\\s+/g, '_');
    if (!id || !els.f_name.value) {
        alert("ID and Display Name are required!");
        els.saveBtn.innerText = "Save Changes";
        return;
    }
    
    const payload = {
        id,
        name: els.f_name.value,
        nickname: els.f_nickname.value,
        pronouns: els.f_pronouns.value,
        tagline: els.f_tagline.value,
        occupation: els.f_occupation.value,
        defaultMood: els.f_mood.value,
        age: els.f_age.value,
        personalitySummary: els.f_personalitySummary.value,
        favoriteQuote: els.f_favoriteQuote.value,
        avatarUrl: els.f_avatarUrl.value,
        bannerUrl: els.f_bannerUrl.value,
        embedColor: els.f_embedColor.value,
        likes: els.f_likes.value.split(',').map(s => s.trim()).filter(s => s),
        dislikes: els.f_dislikes.value.split(',').map(s => s.trim()).filter(s => s),
        favoriteFood: els.f_favoriteFood.value,
        basePrompt: els.f_basePrompt.value,
        lore: {
            backstory: els.f_lore_backstory.value,
            secrets: els.f_lore_secrets.value,
            rumors: els.f_lore_rumors.value
        },
        promptConfig: {
            verbosity: parseInt(els.f_conv_verbosity.value),
            humorLevel: parseInt(els.f_conv_humor.value),
            sarcasm: parseInt(els.f_conv_sarcasm.value),
            curiosity: 50,
            randomness: 50
        }
    };
    
    try {
        const res = await fetch('/api/npcs', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            const data = await res.json();
            
            // Update local array
            if (!selectedId) {
                npcs.push(data.npc);
                selectedId = data.npc.id;
            } else {
                const index = npcs.findIndex(n => n.id === data.npc.id);
                if(index !== -1) npcs[index] = data.npc;
            }
            
            els.saveBtn.innerText = "Saved!";
            els.saveStatus.innerText = "All changes saved";
            els.saveStatus.style.color = "var(--text-secondary)";
            
            renderList();
            setTimeout(() => { els.saveBtn.innerText = "Save Changes (Ctrl+S)"; }, 2000);
        } else {
            alert("Failed to save.");
            els.saveBtn.innerText = "Save Changes";
        }
    } catch(e) {
        alert("Error saving.");
        els.saveBtn.innerText = "Save Changes";
    }
}

// Start
init();
