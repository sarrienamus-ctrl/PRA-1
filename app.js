// Configuracion de Supabase
const supabaseUrl = 'https://livxwcmjhbcdcckfmdaz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpdnh3Y21qaGJjZGNja2ZtZGF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5OTAzOTQsImV4cCI6MjA5NDU2NjM5NH0._eZpwItalNClrjaspQYMR2RWjeAreNRGG9OdldZkYKc';
const supabase = window.supabase?.createClient
    ? window.supabase.createClient(supabaseUrl, supabaseKey)
    : null;

let players = [];
const localPlayersKey = 'athletic-manager-players';
const fallbackPlayers = [
    { id: 1, name: 'Unai Simon', position: 'POR', number: 1, rating: 9 },
    { id: 2, name: 'Julen Agirrezabala', position: 'POR', number: 13, rating: 8 },
    { id: 3, name: 'Dani Vivian', position: 'DEF', number: 3, rating: 8 },
    { id: 4, name: 'Yeray Alvarez', position: 'DEF', number: 5, rating: 8 },
    { id: 5, name: 'Aitor Paredes', position: 'DEF', number: 4, rating: 7 },
    { id: 6, name: 'Oscar de Marcos', position: 'DEF', number: 18, rating: 7 },
    { id: 7, name: 'Yuri Berchiche', position: 'DEF', number: 17, rating: 7 },
    { id: 8, name: 'Inigo Lekue', position: 'DEF', number: 15, rating: 7 },
    { id: 9, name: 'Mikel Vesga', position: 'MED', number: 6, rating: 7 },
    { id: 10, name: 'Benat Prados', position: 'MED', number: 24, rating: 7 },
    { id: 11, name: 'Ruiz de Galarreta', position: 'MED', number: 16, rating: 8 },
    { id: 12, name: 'Oihan Sancet', position: 'MED', number: 8, rating: 9 },
    { id: 13, name: 'Inaki Williams', position: 'DEL', number: 9, rating: 9 },
    { id: 14, name: 'Nico Williams', position: 'DEL', number: 11, rating: 9 },
    { id: 15, name: 'Gorka Guruzeta', position: 'DEL', number: 12, rating: 8 },
    { id: 16, name: 'Alex Berenguer', position: 'DEL', number: 7, rating: 8 },
    { id: 17, name: 'Asier Villalibre', position: 'DEL', number: 20, rating: 7 },
    { id: 18, name: 'Unai Gomez', position: 'MED', number: 30, rating: 7 },
    { id: 19, name: 'Ander Herrera', position: 'MED', number: 21, rating: 7 },
    { id: 20, name: 'Adama Boiro', position: 'DEF', number: 32, rating: 6 }
];

const posMap = {
    POR: 'Portero',
    DEF: 'Defensa',
    MED: 'Centrocampista',
    DEL: 'Delantero'
};

let currentSearch = '';
let currentFilter = 'all';
let rosterNotice = '';

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

async function init() {
    setupEventListeners();
    players = loadLocalPlayers();
    rosterNotice = 'Cargando plantilla...';
    renderAll();
    await fetchPlayers();
}

async function fetchPlayers() {
    if (!supabase) {
        console.warn('La libreria de Supabase no esta disponible. Se cargara la plantilla local.');
        players = loadLocalPlayers();
        rosterNotice = 'No se ha cargado Supabase en el navegador, asi que se muestra una plantilla local.';
        savePlayersLocally();
        renderAll();
        return;
    }

    try {
        const { data, error } = await supabase
            .from('players')
            .select('*')
            .order('name');

        if (error) {
            throw error;
        }

        players = Array.isArray(data) && data.length > 0 ? data : loadLocalPlayers();

        if (!Array.isArray(data) || data.length === 0) {
            console.warn("Supabase no devolvio jugadores. Se cargara una plantilla local.");
            rosterNotice = "No llegaban jugadores desde Supabase, asi que se ha cargado una plantilla local de respaldo.";
            savePlayersLocally();
            renderAll();
            return;
        }

        rosterNotice = '';
        savePlayersLocally();
        renderAll();
    } catch (err) {
        console.error('Error al obtener jugadores:', err);
        players = loadLocalPlayers();
        rosterNotice = "No se pudo conectar con Supabase y se esta mostrando una plantilla local.";
        savePlayersLocally();
        renderAll();
    }
}

function cloneFallbackPlayers() {
    return fallbackPlayers.map((player) => ({ ...player }));
}

function loadLocalPlayers() {
    try {
        const rawPlayers = window.localStorage.getItem(localPlayersKey);

        if (!rawPlayers) {
            return cloneFallbackPlayers();
        }

        const parsedPlayers = JSON.parse(rawPlayers);
        return Array.isArray(parsedPlayers) && parsedPlayers.length > 0
            ? parsedPlayers
            : cloneFallbackPlayers();
    } catch (error) {
        console.error('No se pudieron leer los jugadores guardados en local:', error);
        return cloneFallbackPlayers();
    }
}

function savePlayersLocally() {
    try {
        window.localStorage.setItem(localPlayersKey, JSON.stringify(players));
    } catch (error) {
        console.error('No se pudieron guardar los jugadores en local:', error);
    }
}

function getInitials(name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function openPlayerModal() {
    playerModalTitle.textContent = 'Añadir jugador';
    playerModalSubtitle.textContent = 'Completa los datos del jugador';
    playerForm.reset();
    playerIdInput.value = '';
    playerRatingInput.value = '7';
    playerModal.classList.remove('hidden');
    playerNameInput.focus();
}

function closePlayerModal() {
    playerModal.classList.add('hidden');
}

function getNextPlayerId() {
    if (players.length === 0) {
        return 1;
    }

    return Math.max(...players.map((player) => Number(player.id) || 0)) + 1;
}

async function handlePlayerSubmit(event) {
    event.preventDefault();

    const newPlayer = {
        id: getNextPlayerId(),
        name: playerNameInput.value.trim(),
        number: parseInt(playerNumberInput.value, 10),
        position: playerPositionInput.value,
        rating: parseInt(playerRatingInput.value, 10)
    };

    if (!newPlayer.name || Number.isNaN(newPlayer.number) || Number.isNaN(newPlayer.rating)) {
        return;
    }

    const duplicatedNumber = players.some((player) => Number(player.number) === newPlayer.number);
    if (duplicatedNumber) {
        rosterNotice = `Ya existe un jugador con el numero ${newPlayer.number}.`;
        renderAll();
        playerNumberInput.focus();
        return;
    }

    players = [...players, newPlayer].sort((a, b) => a.name.localeCompare(b.name));
    rosterNotice = `${newPlayer.name} se ha anadido correctamente.`;
    savePlayersLocally();
    renderAll();
    closePlayerModal();

    if (!supabase) {
        return;
    }

    try {
        const { data, error } = await supabase
            .from('players')
            .insert({
                name: newPlayer.name,
                number: newPlayer.number,
                position: newPlayer.position,
                rating: newPlayer.rating
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        if (data) {
            players = players.map((player) => (player.id === newPlayer.id ? data : player));
            rosterNotice = `${newPlayer.name} se ha guardado en Supabase.`;
            savePlayersLocally();
            renderAll();
        }
    } catch (error) {
        console.error('Error al guardar el jugador:', error);
        renderRoster('El jugador se ha añadido solo en local porque no se pudo guardar en Supabase.');
        renderEvaluations();
        updateDashboardStats();
    }
}

function renderAll(rosterMessage = '') {
    renderRoster(rosterMessage);
    renderEvaluations();
    updateDashboardStats();
}

function renderRoster(message = '') {
    const filteredPlayers = players.filter((player) => {
        const matchesSearch = player.name.toLowerCase().includes(currentSearch.toLowerCase());
        const matchesPos = currentFilter === 'all' || player.position === currentFilter;
        return matchesSearch && matchesPos;
    });

    if (filteredPlayers.length === 0) {
        playersGrid.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:3rem; color:var(--text-muted);">
                <i class="fa-solid fa-users-slash" style="font-size:2.5rem; margin-bottom:1rem; display:block;"></i>
                <p style="font-size:1.1rem;">No hay jugadores que coincidan con la busqueda.</p>
                <p style="font-size:0.85rem; margin-top:0.5rem;">Prueba con otro nombre o cambia el filtro de posicion.</p>
            </div>
        `;
        return;
    }

    const notice = message
        ? `
            <div style="grid-column:1/-1; padding:1rem 1.25rem; border:1px solid rgba(255, 209, 102, 0.25); border-radius:12px; background:rgba(255, 209, 102, 0.08); color:#ffd166;">
                <i class="fa-solid fa-circle-info" style="margin-right:0.5rem;"></i>${message}
            </div>
        `
        : '';

    playersGrid.innerHTML = `
        ${notice}
        ${filteredPlayers.map((player) => `
            <div class="player-card">
                <div class="player-number">${player.number}</div>
                <div class="player-avatar">${getInitials(player.name)}</div>
                <div class="player-info">
                    <h3 class="player-name">${player.name}</h3>
                    <span class="player-pos">${posMap[player.position] || player.position}</span>
                    <div class="player-rating-badge">
                        <i class="fa-solid fa-star"></i>
                        <span id="card-rating-${player.id}">${player.rating}</span>/10
                    </div>
                </div>
            </div>
        `).join('')}
    `;
}

function renderEvaluations() {
    const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name));

    evaluationList.innerHTML = sortedPlayers.map((player) => `
        <div class="evaluation-row">
            <div class="eval-player">
                <div class="eval-avatar">${getInitials(player.name)}</div>
                <div class="eval-name">${player.name} <span style="color:var(--text-muted); font-size:0.8rem; margin-left:8px;">#${player.number}</span></div>
            </div>
            <div class="eval-pos">${posMap[player.position] || player.position}</div>
            <div class="rating-control">
                <input type="range" class="rating-slider" min="1" max="10" value="${player.rating}" data-id="${player.id}">
                <div class="rating-value" id="val-${player.id}">${player.rating}</div>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.rating-slider').forEach((slider) => {
        slider.addEventListener('input', (event) => {
            const { value, dataset } = event.target;
            document.getElementById(`val-${dataset.id}`).textContent = value;
        });

        slider.addEventListener('change', async (event) => {
            const val = parseInt(event.target.value, 10);
            const id = parseInt(event.target.dataset.id, 10);
            const player = players.find((item) => item.id === id);

            if (!player) {
                return;
            }

            player.rating = val;

            const cardRating = document.getElementById(`card-rating-${id}`);
            if (cardRating) {
                cardRating.textContent = val;
            }

            updateDashboardStats();

            if (!supabase) {
                return;
            }

            try {
                const { error } = await supabase
                    .from('players')
                    .update({ rating: val })
                    .eq('id', id);

                if (error) {
                    throw error;
                }

                console.log(`Valoracion de ${player.name} guardada en Supabase.`);
            } catch (error) {
                console.error('Error al actualizar valoracion:', error);
            }
        });
    });
}

function updateDashboardStats() {
    if (players.length === 0) {
        globalAverageEl.textContent = '0.0';
        topRatedEl.textContent = '-';
        return;
    }

    const total = players.reduce((sum, player) => sum + Number(player.rating || 0), 0);
    const avg = (total / players.length).toFixed(1);
    globalAverageEl.textContent = avg;

    const topPlayer = [...players].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))[0];
    topRatedEl.textContent = `${topPlayer.name} (${topPlayer.rating})`;
}

function setupEventListeners() {
    searchInput.addEventListener('input', (event) => {
        currentSearch = event.target.value;
        renderRoster();
    });

    filterSelect.addEventListener('change', (event) => {
        currentFilter = event.target.value;
        renderRoster();
    });

    addPlayerBtn.addEventListener('click', openPlayerModal);
    closePlayerModalBtn.addEventListener('click', closePlayerModal);
    cancelPlayerModalBtn.addEventListener('click', closePlayerModal);
    playerModal.addEventListener('click', (event) => {
        if (event.target === playerModal) {
            closePlayerModal();
        }
    });
    playerForm.addEventListener('submit', handlePlayerSubmit);

    navItems.forEach((item) => {
        item.addEventListener('click', () => {
            navItems.forEach((nav) => nav.classList.remove('active'));
            item.classList.add('active');

            const viewId = item.dataset.view;
            views.forEach((view) => view.classList.remove('active'));
            document.getElementById(`view-${viewId}`).classList.add('active');

            if (viewId === 'roster') {
                pageTitle.textContent = 'Plantilla del Equipo';
                pageSubtitle.textContent = 'Gestiona a los 20 jugadores de tu plantilla';
            } else {
                pageTitle.textContent = 'Evaluacion de Jugadores';
                pageSubtitle.textContent = 'Valora el rendimiento del 1 al 10';
            }
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !playerModal.classList.contains('hidden')) {
            closePlayerModal();
        }
    });
}

document.addEventListener('DOMContentLoaded', init);
