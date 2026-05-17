// Configuración de Supabase
const supabaseUrl = 'https://livxwcmjhbcdcckfmdaz.supabase.co'; // <-- REEMPLAZA CON TU URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpdnh3Y21qaGJjZGNja2ZtZGF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5OTAzOTQsImV4cCI6MjA5NDU2NjM5NH0._eZpwItalNClrjaspQYMR2RWjeAreNRGG9OdldZkYKc'; // <-- REEMPLAZA CON TU ANON KEY
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let players = [];

const posMap = {
    "POR": "Portero",
    "DEF": "Defensa",
    "MED": "Centrocampista",
    "DEL": "Delantero"
};

// State
let currentSearch = "";
let currentFilter = "all";
let isSavingPlayer = false;

// Elements
const playersGrid = document.getElementById('players-grid');
const evaluationList = document.getElementById('evaluation-list');
const searchInput = document.getElementById('search-player');
const filterSelect = document.getElementById('filter-position');
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view-section');
const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');
const globalAverageEl = document.getElementById('global-average');
const topRatedEl = document.getElementById('top-rated-player');
const addPlayerBtn = document.getElementById('add-player-btn');
const playerModal = document.getElementById('player-modal');
const closePlayerModalBtn = document.getElementById('close-player-modal');
const cancelPlayerModalBtn = document.getElementById('cancel-player-modal');
const playerForm = document.getElementById('player-form');
const playerModalTitle = document.getElementById('player-modal-title');
const playerModalSubtitle = document.getElementById('player-modal-subtitle');
const playerIdInput = document.getElementById('player-id');
const playerNameInput = document.getElementById('player-name');
const playerNumberInput = document.getElementById('player-number');
const playerPositionInput = document.getElementById('player-position');
const playerRatingInput = document.getElementById('player-rating');
const savePlayerBtn = document.getElementById('save-player-btn');

// Init
async function init() {
    await fetchPlayers();
    setupEventListeners();
}

async function fetchPlayers() {
    try {
        const { data, error } = await supabase
            .from('players')
            .select('*')
            .order('name');
            
        if (error) throw error;
        
        // Siempre asignar (aunque sea array vacío)
        players = data || [];

        if (players.length === 0) {
            console.warn("Supabase devolvió 0 jugadores. Verifica que la tabla 'players' tenga datos y que RLS permita lectura anónima.");
            playersGrid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:3rem; color:var(--text-muted);">
                    <i class="fa-solid fa-users-slash" style="font-size:2.5rem; margin-bottom:1rem; display:block;"></i>
                    <p style="font-size:1.1rem;">No hay jugadores en la base de datos.</p>
                    <p style="font-size:0.85rem; margin-top:0.5rem;">Comprueba la tabla <strong>players</strong> en Supabase y las políticas de Row Level Security.</p>
                </div>`;
        }
        
        renderRoster();
        renderEvaluations();
        updateDashboardStats();
    } catch (err) {
        console.error('Error al obtener jugadores:', err);
        playersGrid.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:3rem; color:#ff6b6b;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size:2.5rem; margin-bottom:1rem; display:block;"></i>
                <p style="font-size:1.1rem;">Error al conectar con Supabase.</p>
                <p style="font-size:0.85rem; margin-top:0.5rem; color:var(--text-muted);">${err.message}</p>
            </div>`;
    }
}

function renderEmptyRoster(message, detail = "") {
    playersGrid.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:3rem; color:var(--text-muted);">
            <i class="fa-solid fa-users-slash" style="font-size:2.5rem; margin-bottom:1rem; display:block;"></i>
            <p style="font-size:1.1rem;">${message}</p>
            ${detail ? `<p style="font-size:0.85rem; margin-top:0.5rem;">${detail}</p>` : ""}
        </div>`;
}

function getInitials(name) {
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return parts[0][0] + parts[1][0];
    }
    return name.substring(0, 2).toUpperCase();
}

function renderRoster() {
    const filteredPlayers = players.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(currentSearch.toLowerCase());
        const matchesPos = currentFilter === 'all' || p.position === currentFilter;
        return matchesSearch && matchesPos;
    });

    if (players.length === 0) {
        renderEmptyRoster(
            "No hay jugadores en la base de datos.",
            "Pulsa en \"Añadir jugador\" para crear el primero."
        );
        return;
    }

    if (filteredPlayers.length === 0) {
        renderEmptyRoster(
            "No hay jugadores que coincidan con la búsqueda.",
            "Prueba a cambiar el texto o el filtro de posición."
        );
        return;
    }

    playersGrid.innerHTML = filteredPlayers.map(p => `
        <div class="player-card">
            <div class="player-number">${p.number}</div>
            <div class="player-avatar">${getInitials(p.name)}</div>
            <div class="player-info">
                <h3 class="player-name">${p.name}</h3>
                <span class="player-pos">${posMap[p.position]}</span>
                <div class="player-rating-badge">
                    <i class="fa-solid fa-star"></i>
                    <span id="card-rating-${p.id}">${p.rating}</span>/10
                </div>
            </div>
            <div class="player-card-actions">
                <button class="card-action-btn edit" type="button" data-action="edit" data-id="${p.id}">
                    <i class="fa-solid fa-pen"></i>
                    <span>Editar</span>
                </button>
                <button class="card-action-btn delete" type="button" data-action="delete" data-id="${p.id}">
                    <i class="fa-solid fa-trash"></i>
                    <span>Borrar</span>
                </button>
            </div>
        </div>
    `).join('');
}

function renderEvaluations() {
    // Sort players by name for the evaluation list
    const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name));
    
    evaluationList.innerHTML = sortedPlayers.map(p => `
        <div class="evaluation-row">
            <div class="eval-player">
                <div class="eval-avatar">${getInitials(p.name)}</div>
                <div class="eval-name">${p.name} <span style="color:var(--text-muted); font-size: 0.8rem; margin-left:8px;">#${p.number}</span></div>
            </div>
            <div class="eval-pos">${posMap[p.position]}</div>
            <div class="rating-control">
                <input type="range" class="rating-slider" min="1" max="10" value="${p.rating}" data-id="${p.id}">
                <div class="rating-value" id="val-${p.id}">${p.rating}</div>
            </div>
        </div>
    `).join('');

    // Add listeners to sliders
    document.querySelectorAll('.rating-slider').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const val = e.target.value;
            const id = parseInt(e.target.dataset.id);
            document.getElementById(`val-${id}`).textContent = val;
        });

        slider.addEventListener('change', async (e) => {
            const val = parseInt(e.target.value);
            const id = parseInt(e.target.dataset.id);
            
            // Update data
            const player = players.find(p => p.id === id);
            if (player) {
                player.rating = val;
                // Update roster card if rendered
                const cardRating = document.getElementById(`card-rating-${id}`);
                if (cardRating) {
                    cardRating.textContent = val;
                }
                updateDashboardStats();
                
                // Guardar en Supabase
                try {
                    const { error } = await supabase
                        .from('players')
                        .update({ rating: val })
                        .eq('id', id);
                        
                    if (error) throw error;
                    console.log(`Valoración de ${player.name} guardada en Supabase.`);
                } catch (error) {
                    console.error('Error al actualizar valoración:', error);
                    alert("Error al guardar en Supabase. Revisa la consola.");
                }
            }
        });
    });
}

function updateDashboardStats() {
    if (players.length === 0) {
        globalAverageEl.textContent = "0.0";
        topRatedEl.textContent = "-";
        return;
    }
    
    const total = players.reduce((sum, p) => sum + p.rating, 0);
    const avg = (total / players.length).toFixed(1);
    globalAverageEl.textContent = avg;

    const topPlayer = [...players].sort((a, b) => b.rating - a.rating)[0];
    topRatedEl.textContent = `${topPlayer.name} (${topPlayer.rating})`;
}

function openPlayerModal(player = null) {
    const isEditing = Boolean(player);
    playerModalTitle.textContent = isEditing ? "Editar jugador" : "Añadir jugador";
    playerModalSubtitle.textContent = isEditing
        ? "Actualiza los datos del jugador seleccionado"
        : "Completa los datos del nuevo jugador";

    playerIdInput.value = player?.id ?? "";
    playerNameInput.value = player?.name ?? "";
    playerNumberInput.value = player?.number ?? "";
    playerPositionInput.value = player?.position ?? "POR";
    playerRatingInput.value = player?.rating ?? 5;
    savePlayerBtn.textContent = isEditing ? "Guardar cambios" : "Guardar jugador";

    playerModal.classList.remove('hidden');
    playerNameInput.focus();
}

function closePlayerModal() {
    playerModal.classList.add('hidden');
    playerForm.reset();
    playerIdInput.value = "";
    playerPositionInput.value = "POR";
    playerRatingInput.value = 5;
}

async function handlePlayerSubmit(event) {
    event.preventDefault();

    if (isSavingPlayer) return;
    isSavingPlayer = true;
    savePlayerBtn.disabled = true;

    const id = playerIdInput.value ? parseInt(playerIdInput.value, 10) : null;
    const payload = {
        name: playerNameInput.value.trim(),
        number: parseInt(playerNumberInput.value, 10),
        position: playerPositionInput.value,
        rating: parseInt(playerRatingInput.value, 10)
    };

    try {
        if (!payload.name) {
            throw new Error("El nombre es obligatorio.");
        }

        if (id) {
            const { error } = await supabase
                .from('players')
                .update(payload)
                .eq('id', id);

            if (error) throw error;

            players = players.map(player => player.id === id ? { ...player, ...payload, id } : player);
        } else {
            const { data, error } = await supabase
                .from('players')
                .insert(payload)
                .select()
                .single();

            if (error) throw error;

            players = [...players, data];
        }

        players.sort((a, b) => a.name.localeCompare(b.name));
        closePlayerModal();
        renderRoster();
        renderEvaluations();
        updateDashboardStats();
    } catch (error) {
        console.error('Error al guardar jugador:', error);
        alert(`No se pudo guardar el jugador. ${error.message}`);
    } finally {
        isSavingPlayer = false;
        savePlayerBtn.disabled = false;
    }
}

async function deletePlayer(playerId) {
    const id = parseInt(playerId, 10);
    const player = players.find(item => item.id === id);
    if (!player) return;

    const confirmed = window.confirm(`¿Seguro que quieres borrar a ${player.name}?`);
    if (!confirmed) return;

    try {
        const { error } = await supabase
            .from('players')
            .delete()
            .eq('id', id);

        if (error) throw error;

        players = players.filter(item => item.id !== id);
        renderRoster();
        renderEvaluations();
        updateDashboardStats();
    } catch (error) {
        console.error('Error al borrar jugador:', error);
        alert(`No se pudo borrar el jugador. ${error.message}`);
    }
}

function setupEventListeners() {
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        renderRoster();
    });

    filterSelect.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        renderRoster();
    });

    addPlayerBtn.addEventListener('click', () => openPlayerModal());
    closePlayerModalBtn.addEventListener('click', closePlayerModal);
    cancelPlayerModalBtn.addEventListener('click', closePlayerModal);
    playerForm.addEventListener('submit', handlePlayerSubmit);
    playerModal.addEventListener('click', (event) => {
        if (event.target === playerModal) {
            closePlayerModal();
        }
    });

    playersGrid.addEventListener('click', (event) => {
        const button = event.target.closest('[data-action]');
        if (!button) return;

        const { action, id } = button.dataset;
        if (action === 'edit') {
            const player = players.find(item => item.id === parseInt(id, 10));
            if (player) {
                openPlayerModal(player);
            }
        }

        if (action === 'delete') {
            deletePlayer(id);
        }
    });

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Update Active Nav
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Update View
            const viewId = item.dataset.view;
            views.forEach(v => v.classList.remove('active'));
            document.getElementById(`view-${viewId}`).classList.add('active');

            // Update Header
            if (viewId === 'roster') {
                pageTitle.textContent = "Plantilla del Equipo";
                pageSubtitle.textContent = "Gestiona a los 20 jugadores de tu plantilla";
            } else {
                pageTitle.textContent = "Evaluación de Jugadores";
                pageSubtitle.textContent = "Valora el rendimiento del 1 al 10";
            }
        });
    });
}

// Boot
document.addEventListener('DOMContentLoaded', init);
