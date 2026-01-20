// js/app.js

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

// --- LOGICA INTERFACCIA UTENTE (UI) ---

/**
 * Gestisce la visualizzazione della pagina (SPA - Single Page Application).
 * Nasconde/Mostra i div in base allo stato di login.
 */
function updateUI(isAuthenticated, userData = null) {
    const loginBox = document.getElementById('login-container');
    const contentBox = document.getElementById('content-container');
    const statusBox = document.getElementById('user-status');

    if (isAuthenticated) {
        // UTENTE LOGGATO: Mostra Dashboard
        loginBox.style.display = 'none';
        contentBox.style.display = 'block';
        statusBox.innerHTML = `Ciao <strong>${userData.nickname}</strong> | <button onclick="logout()">Esci</button>`;
        
        // 1. Popola la lista per l'autocomplete
        loadInstruments(); 
        
        // 2. Resetta la vista dei risultati
        document.getElementById('teachers-list').innerHTML = '<p>Seleziona uno strumento e clicca Cerca.</p>';
    } else {
        // UTENTE OSPITE: Mostra Login
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

    // Costruzione URL RESTful con Query Parameter
    // encodeURIComponent serve a gestire spazi o caratteri speciali (es. "Viola da gamba")
    const url = `teachers.php?strumento=${encodeURIComponent(strumento)}`;
    
    const response = await fetchAuth(`php/api/${url}`);
    const teachers = await response.json();

    // Controllo se l'array è vuoto
    if (!teachers || teachers.length === 0) {
        listContainer.innerHTML = '<p>Nessun professore trovato per questo strumento.</p>';
        return;
    }

    // Costruzione dinamica dell'HTML (Template String)
    let html = '<div class="teachers-grid" style="display: flex; gap: 20px; flex-wrap: wrap;">';
    teachers.forEach(t => {
        // Cache Busting: aggiungiamo ?v=timestamp per forzare il browser a scaricare l'immagine nuova
        const imgPath = `img/profile_pictures/${t.profile_picture || 'default.png'}?v=${new Date().getTime()}`;
        
        html += `
            <div class="teacher-card" style="border: 1px solid #ccc; padding: 15px; border-radius: 8px; width: 250px; text-align:center;">
                <img src="${imgPath}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover;">
                <h3>${t.nickname}</h3>
                <p>Strumenti: <strong>${t.instruments}</strong></p>
                <button onclick="bookLesson(${t.id})" style="padding:5px 10px; cursor:pointer;">Prenota Lezione</button>
            </div>`;
    });
    listContainer.innerHTML = html + '</div>';
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