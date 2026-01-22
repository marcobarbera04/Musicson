/* * Entry Point dell'applicazione JavaScript.
 * Collega i moduli api/ui agli eventi del DOM e gestisce l'inizializzazione.
 */

// Navigazione verso la Home (Ricerca)
function goHome() {
    const searchSection = document.querySelector('.search-section');
    if(searchSection) searchSection.style.display = 'block';
    
    const container = document.getElementById('teachers-list');
    container.innerHTML = '<p>Seleziona uno strumento e clicca Cerca Maestri.</p>';
    document.getElementById('instrument-input').value = '';
}

// Procedura di Logout
function logout() {
    // clearSession da api.js
    clearSession();
    location.reload(); // Ricarica la pagina per resettare lo stato applicativo
}

// Gestione click bottone "Cerca"
function handleSearch() {
    const input = document.getElementById('instrument-input');
    const strumentoScelto = input.value.trim();
    if (!strumentoScelto) {
        alert("Scrivi o seleziona uno strumento.");
        return;
    }
    // showTeachers da ui.js
    showTeachers(strumentoScelto);
}

// Wrapper per aprire modale prenotazione (chiamato dalle Card Professore)
function bookLesson(id) {
    // openBookingModal da ui.js
    openBookingModal(id);
}

// Wrapper per cancellare lezione (chiamato dalle Card Appuntamento)
function cancelLesson(id) {
    // deleteBooking da ui.js
    deleteBooking(id);
}


// EVENT LISTENERS STATICI

// Listener per il form di Login
document.getElementById('login-button').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    
    // Codifica credenziali in Base64 per Basic Auth standard
    const credentials = btoa(`${email}:${pass}`);
    
    // Tentativo di login verso API
    const response = await fetch('php/api/login.php', {
        headers: { 'Authorization': `Basic ${credentials}` }
    });

    if (response.ok) {
        const data = await response.json();
        // saveSession da api.js
        saveSession(credentials); // Persistenza token
        // updateUI da ui.js
        updateUI(true, data);     // Aggiornamento interfaccia
    } else {
        document.getElementById('login-error').innerText = "Credenziali errate.";
    }
});

// INIZIALIZZAZIONE PAGINA (ON LOAD)

// Al caricamento pagina, controlliamo se esiste una sessione attiva
window.onload = async () => {
    // getSession da api.js
    if (getSession()) {
        // Verifica validità token chiamando un endpoint protetto (o login stesso)
        // fetchAuth da api.js
        const response = await fetchAuth('php/api/login.php');
        if (response.ok) {
            // updateUI da ui.js
            updateUI(true, await response.json());
        } else {
            // Se il token è scaduto o invalido lato server
            // updateUI da ui.js
            updateUI(false);
        }
    } else {
        // updateUI da ui.js
        updateUI(false);
    }
};