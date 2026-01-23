/* * Entry Point dell'applicazione JavaScript.
 * Collega i moduli api/ui agli eventi del DOM e gestisce l'inizializzazione.
 */

// EVENT LISTENERS STATICI

// Listener per il form di Login (primo login dell'utente per salvare le credenziali in sessionStorage)
document.getElementById('login-button').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    
    // Codifica credenziali in Base64 per Basic Auth standard (btoa codifica in Base64)
    const credentials = btoa(`${email}:${pass}`);
    
    // Tentativo di login verso API tramite le credenziali del form login
    const response = await fetch('php/api/login.php', {
        headers: { 'Authorization': `Basic ${credentials}` }
    });

    if (response.ok) {
        const data = await response.json();
        sessionStorage.setItem('user_auth', credentials)    // salvare credenziali in sessionStorage 
        sessionStorage.setItem('user_role', data.role);     // salvare ruolo utente in sessionStorage (servira' per mostrare bottone prenota lezione solo agli studenti)
        updateUI(true, data);                               // aggiornamento interfaccia da loggato 
    } else {
        document.getElementById('login-error').innerText = "Credenziali errate.";
    }
});

// INIZIALIZZAZIONE PAGINA (ON LOAD)

// Al caricamento pagina, controlliamo se esiste una sessione attiva
window.onload = async () => {
    // Utente non loggato per assunzione
    let isAuthenticated = false;
    let userData = null;

    // Controllo se presente sessione valida
    if (sessionStorage.getItem('user_auth')) {
        const response = await fetchAuth('php/api/login.php');  // chiamata al login con le credenziali presenti in sessionStorage
        
        if (response.ok) {
            isAuthenticated = true;
            userData = await response.json();
        } 
    }
    // Se getSession() è false, non entra nell'if e isAuthenticated rimane false

    updateUI(isAuthenticated, userData);
};