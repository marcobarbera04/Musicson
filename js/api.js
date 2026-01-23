/* * Modulo responsabile della comunicazione HTTP col server e della gestione della sessione locale.
 */

// FUNZIONALITA' NETWORKING 

/**
 * Wrapper per la funzione nativa fetch.
 * Inietta automaticamente l'header 'Authorization' se sono presenti credenziali in sessione.
 * * @param {string} url - L'endpoint da chiamare.
 * @param {object} options - Opzioni standard della fetch (method, headers, body).
 * @returns {Promise<Response>} - Oggetto Response nativo.
 */
async function fetchAuth(url, options = {}) {
    const auth = sessionStorage.getItem('user_auth');
    if (auth) {
        // Spread operator (...) per mantenere header esistenti e aggiungere Authorization
        options.headers = { ...options.headers, 'Authorization': `Basic ${auth}` };
    }
    return fetch(url, options);
}

// Procedura di Logout
function logout() {
    sessionStorage.removeItem('user_auth');     // pulizia credenziali sessionStorage
    sessionStorage.removeItem('user_role');     // pulizia ruolo sessionStorage
    location.reload();                          // ricarica pagina per resettare lo stato dell'applicazione
}

// METODI HTTP (CRUD)

/**
 * Esegue una richiesta GET autenticata.
 * Gestisce la costruzione della Query String e il controllo della scadenza sessione (401).
 * * @param {string} resource - Il nome della risorsa (es. 'teachers', 'appointments').
 * @param {object|null} params - Oggetto chiave-valore per i parametri GET (es. {strumento: 'Piano'}).
 * @returns {Promise<object|null>} - Il JSON di risposta o null in caso di errore auth.
 */
async function getData(resource, params = null) {
    let url = `php/api/${resource}.php`;

    // Conversione parametri oggetto -> Query String (es. ?strumento=Piano&min=1)
    if (params) {
        const queryString = new URLSearchParams(params).toString();
        url += `?${queryString}`;
    }

    const response = await fetchAuth(url);
    
    // Gestione errore 401 (Unauthorized): Sessione scaduta o invalida
    if (response.status === 401) {
        sessionStorage.removeItem('user_auth');
        location.reload(); // Ricarica forzata per tornare al login
        return null;
    }
    
    return await response.json();
}

/**
 * Esegue una richiesta POST autenticata per creare nuove risorse.
 * Invia i dati in formato JSON.
 * * @param {string} resource - Il nome della risorsa.
 * @param {object} data - Il payload dei dati da inviare.
 * @returns {Promise<object>} - Il JSON di risposta del server.
 */
async function postData(resource, data) {
    const response = await fetchAuth(`php/api/${resource}.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return await response.json();
}

/**
 * Esegue una richiesta DELETE autenticata per rimuovere risorse.
 * * @param {string} resource - Il nome della risorsa.
 * @param {object} data - Il payload contenente l'ID da eliminare.
 * @returns {Promise<object>} - Il JSON di risposta.
 */
async function deleteData(resource, data) {
    const response = await fetchAuth(`php/api/${resource}.php`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return await response.json();
}