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
        
        if (data && data.length > 0) {
            players = data;
        } else {
            console.log("No hay jugadores en la base de datos.");
        }
        
        renderRoster();
        renderEvaluations();
        updateDashboardStats();
    } catch (error) {
        console.error('Error al obtener jugadores:', error);
    }
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
    if (players.length === 0) return;
    
    const total = players.reduce((sum, p) => sum + p.rating, 0);
    const avg = (total / players.length).toFixed(1);
    globalAverageEl.textContent = avg;

    const topPlayer = [...players].sort((a, b) => b.rating - a.rating)[0];
    topRatedEl.textContent = `${topPlayer.name} (${topPlayer.rating})`;
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
