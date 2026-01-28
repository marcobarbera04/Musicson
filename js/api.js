/**
 * Funzione wrap per la fetch nativa aggiungendo le credenziali se presenti
 * serve per evitare di scrivere l'header Authorization in ogni chiamata.
 */
async function fetchAuth(url, options = {}) {
    const auth = sessionStorage.getItem('user_auth'); // recupera credenziali da session storage
    
    if (auth) {
        // Mantiene gli header esistenti e aggiunge quello di autorizzazione Basic
        options.headers = { ...options.headers, 'Authorization': `Basic ${auth}` };
    }
    return fetch(url, options); // esegue la richiesta standard
}

// Effettua il logout pulendo i dati e ricaricando la pagina
function logout() {
    sessionStorage.removeItem('user_auth');     // rimuove le credenziali
    sessionStorage.removeItem('user_role');     // rimuove il ruolo
    location.reload();                          // ricarica la pagina per tornare alla schermata di login
}

/**
 * Esegue una richiesta GET al server
 * gestisce i parametri nell'URL e il logout automatico in caso di errore 401
 */
async function getData(resource, params = null) {
    let url = `php/api/${resource}.php`;

    // Se ci sono parametri, li converte in stringa per l'URL (es. ?strumento=Piano)
    if (params) {
        const queryString = new URLSearchParams(params).toString();
        url += `?${queryString}`;
    }

    const response = await fetchAuth(url); // esegue la chiamata autenticata
    
    // Se la sessione è scaduta o non valida (errore 401)
    if (response.status === 401) {
        sessionStorage.removeItem('user_auth'); // pulisce la sessione corrotta
        location.reload();                      // ricarica la pagina per forzare il login
        return null;
    }
    
    return await response.json(); // ritorna i dati in formato JSON
}

/**
 * Esegue una richiesta POST per inserire nuovi dati nel database
 */
async function postData(resource, data) {
    const response = await fetchAuth(`php/api/${resource}.php`, {
        method: 'POST',                                     // imposta il metodo POST
        headers: { 'Content-Type': 'application/json' },    // imposta il tipo di contenuto come JSON
        body: JSON.stringify(data)                          // converte i dati JavaScript in stringa JSON
    });
    return await response.json();
}

/**
 * Esegue una richiesta DELETE per eliminare dati dal database
 */
async function deleteData(resource, data) {
    const response = await fetchAuth(`php/api/${resource}.php`, {
        method: 'DELETE',                                   // imposta il metodo DELETE
        headers: { 'Content-Type': 'application/json' },    // imposta il tipo di contenuto come JSON
        body: JSON.stringify(data)                          // invia l'ID da cancellare nel corpo della richiesta
    });
    return await response.json();
}