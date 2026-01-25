// Gestione click sul tasto Login (se login avviene con successo la ui viene aggiornata da utente autenticato altrimenti viene scritto un errore)
document.getElementById('login-button').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    
    // Codifica le credenziali in Base64
    const credentials = btoa(`${email}:${pass}`);
    
    // Esegue la chiamata di login
    const response = await fetch('php/api/login.php', {
        headers: { 'Authorization': `Basic ${credentials}` }
    });

    if (response.ok) {
        const data = await response.json();
        sessionStorage.setItem('user_auth', credentials);
        sessionStorage.setItem('user_role', data.role);
        updateUI(true, data);
    } else {
        document.getElementById('login-error').innerText = "Credenziali errate.";
    }
});

// Gestione click sul tasto Registrazione
document.getElementById('register-button').addEventListener('click', async () => {
    // Recupera i valori rimuovendo gli spazi vuoti
    const nickname = document.getElementById('reg-nickname').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    
    const errorBox = document.getElementById('reg-error');

    // Verifica che tutti i campi siano compilati
    if (!nickname || !email || !password) {
        errorBox.innerText = "Tutti i campi sono obbligatori!";
        return; 
    }

    // Esegue la chiamata di registrazione
    const response = await fetch('php/api/register.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, email, password })
    });

    const result = await response.json();

    if (response.ok) {
        alert("Registrazione avvenuta con successo! Ora fai il login.");
        toggleAuth('login'); // funzione per rimuovere la ui della registrazione
    } else {
        errorBox.innerText = result.error;
    }
});

// Controlla lo stato della sessione al caricamento della pagina 
window.onload = async () => {
    let isAuthenticated = false;
    let userData = null;

    if (sessionStorage.getItem('user_auth')) {
        const response = await fetchAuth('php/api/login.php'); 
        
        if (response.ok) {
            isAuthenticated = true;
            userData = await response.json();
        } 
    }

    // Se l'utente non è autenticato, mostra il form di login
    if (!isAuthenticated) {
        toggleAuth('login');
    }

    updateUI(isAuthenticated, userData);
};