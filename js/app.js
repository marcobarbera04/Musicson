/**
 * Funzione Wrapper per fetch() che aggiunge automaticamente l'autenticazione.
 * Questo mantiene il client "Stateless": inviamo le credenziali a ogni singola richiesta.
 */
async function fetchAuth(url, options = {}) {
    const auth = sessionStorage.getItem('user_auth'); // Recupera token 'email:password'
    if (auth) {
        // Aggiunge l'header Authorization: Basic ...
        options.headers = { ...options.headers, 'Authorization': `Basic ${auth}` };
    }
    return fetch(url, options);
}

/**
 * Funzione generica per scaricare dati JSON dalle API.
 * Gestisce anche il logout automatico se la sessione è scaduta (401).
 */
async function getData(resource) {
    // Chiama la risorsa (es. 'instruments' o 'teachers')
    const response = await fetchAuth(`php/api/${resource}.php`);
    
    // Se il server risponde 401, le credenziali non sono più valide
    if (response.status === 401) {
        logout(); 
        return null;
    }
    return await response.json();
}

/**
 * Gestisce la visualizzazione della pagina (SPA - Single Page Application).
 * Nasconde/Mostra i div in base allo stato di login.
 */
function updateUI(isAuthenticated, userData = null) {
    const loginBox = document.getElementById('login-container');
    const contentBox = document.getElementById('content-container');
    const statusBox = document.getElementById('user-status');

    if (isAuthenticated) {
        loginBox.style.display = 'none';
        contentBox.style.display = 'block';

        statusBox.innerHTML = `
            <div class="header-controls">
                <span>Ciao <strong>${userData.nickname}</strong></span>
                <button onclick="goHome()">Home</button>
                <button onclick="showMyAppointments()">Le Mie Lezioni</button>
                <button onclick="logout()" class="btn-logout">Esci</button>
            </div>
        `;
        
        loadInstruments();
        goHome();
    } else {
        loginBox.style.display = 'block';
        contentBox.style.display = 'none';
        statusBox.innerHTML = "";
    }
}

/**
 * Scarica l'elenco strumenti e popola il tag <datalist> HTML5.
 * Questo permette l'autocomplete nativo nel campo di ricerca.
 */
async function loadInstruments() {
    const datalist = document.getElementById('instrument-list');
    if (!datalist) return;

    const instruments = await getData('instruments');
    
    if (instruments) {
        datalist.innerHTML = ''; // Pulisce eventuali dati precedenti
        instruments.forEach(ins => {
            // Crea un'opzione per ogni strumento nel DB
            const opt = document.createElement('option');
            opt.value = ins.name;
            datalist.appendChild(opt);
        });
    }
}

/**
 * Scarica e visualizza i professori, eventualmente filtrati per strumento.
 */
async function showTeachers(strumento) {
    const listContainer = document.getElementById('teachers-list');
    listContainer.innerHTML = '<p>Ricerca in corso...</p>';

    const url = `teachers.php?strumento=${encodeURIComponent(strumento)}`;
    const response = await fetchAuth(`php/api/${url}`);
    const teachers = await response.json();

    if (!teachers || teachers.length === 0) {
        listContainer.innerHTML = '<p>Nessun professore trovato per questo strumento.</p>';
        return;
    }

    let html = '<div class="teachers-grid">';
    teachers.forEach(t => {
        const imgPath = `img/profile_pictures/${t.profile_picture || 'default.png'}?v=${new Date().getTime()}`;
        
        html += `
            <div class="teacher-card">
                <img src="${imgPath}" class="teacher-img" alt="${t.nickname}">
                <h3>${t.nickname}</h3>
                <p>Strumenti: <strong>${t.instruments}</strong></p>
                <button onclick="bookLesson(${t.id})" class="btn-book">Prenota Lezione</button>
            </div>`;
    });
    listContainer.innerHTML = html + '</div>';
}

/**
 * Scarica e visualizza le prenotazioni dell'utente loggato.
 */
async function showMyAppointments() {
    const container = document.getElementById('teachers-list');
    
    // Nascondiamo l'input di ricerca
    const searchSection = document.querySelector('.search-section');
    if(searchSection) searchSection.style.display = 'none';

    container.innerHTML = '<p>Caricamento lezioni...</p>';

    const appointments = await getData('appointments');

    if (!appointments || appointments.length === 0) {
        container.innerHTML = '<h3>Le mie Prenotazioni</h3><p>Non hai ancora lezioni in programma.</p>';
        return;
    }

    let html = '<h3>Le mie Prenotazioni</h3><div class="appointments-list">';
    
    appointments.forEach(app => {
        const dateObj = new Date(app.datetime);
        const dateStr = dateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        
        const imgPath = `img/profile_pictures/${app.teacher_image || 'default.png'}?v=${new Date().getTime()}`;
        
        const linkHtml = app.meeting_link 
            ? `<a href="${app.meeting_link}" target="_blank" class="appointment-link">Accedi al Meeting</a>` 
            : `<span class="appointment-no-link">Link non ancora disponibile</span>`;

        html += `
            <div class="appointment-card">
                <img src="${imgPath}" class="appointment-img" alt="${app.teacher_name}">
                <div class="appointment-info">
                    <h4 class="appointment-title">Lezione con ${app.teacher_name}</h4>
                    <p class="appointment-date">
                        Data: ${dateStr} <br> 
                        Ore: <strong>${timeStr}</strong>
                    </p>
                </div>
                <div class="appointment-link-container">
                    ${linkHtml}
                </div>
            </div>`;
    });

    container.innerHTML = html + '</div>';
}

// --- GESTORI EVENTI (HANDLERS) ---

/**
 * Legge l'input utente e avvia la ricerca.
 */
function handleSearch() {
    const input = document.getElementById('instrument-input');
    const strumentoScelto = input.value.trim(); // .trim() rimuove spazi vuoti accidentali
    
    if (!strumentoScelto) {
        alert("Scrivi o seleziona uno strumento.");
        return;
    }
    showTeachers(strumentoScelto);
}

// Gestione Login
document.getElementById('login-button').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    // Codifichiamo le credenziali in Base64 per l'header HTTP Basic Auth
    const credentials = btoa(`${email}:${pass}`);
    
    const response = await fetch('php/api/login.php', {
        headers: { 'Authorization': `Basic ${credentials}` }
    });

    if (response.ok) {
        const data = await response.json();
        // Salviamo il token in SessionStorage (si cancella alla chiusura del browser)
        sessionStorage.setItem('user_auth', credentials);
        updateUI(true, data);
    } else {
        document.getElementById('login-error').innerText = "Credenziali errate.";
    }
});

function logout() {
    sessionStorage.removeItem('user_auth');
    location.reload(); // Ricarica la pagina per resettare tutto
}

function bookLesson(id) {
    alert("Funzionalità prenotazione per il prof " + id + " in arrivo!");
}

function goHome() {
    // Ri-mostra la barra di ricerca
    const searchSection = document.querySelector('.search-section');
    if(searchSection) searchSection.style.display = 'block';
    
    // Pulisce la lista (che conteneva le prenotazioni o i vecchi risultati)
    const container = document.getElementById('teachers-list');
    container.innerHTML = '<p>Seleziona uno strumento e clicca Cerca Maestri.</p>';
    
    // Pulisce l'input
    document.getElementById('instrument-input').value = '';
}

// All'avvio della pagina, controlliamo se l'utente è già loggato
window.onload = async () => {
    if (sessionStorage.getItem('user_auth')) {
        // Verifichiamo se il token salvato è ancora valido chiamando il backend
        const response = await fetchAuth('php/api/login.php');
        if (response.ok) {
            updateUI(true, await response.json());
        } else {
            updateUI(false);
        }
    } else {
        updateUI(false);
    }
};