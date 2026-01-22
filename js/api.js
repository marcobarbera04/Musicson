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
    // getSession from api.js (internal use)
    const auth = sessionStorage.getItem('user_auth');
    if (auth) {
        // Spread operator (...) per mantenere header esistenti e aggiungere Authorization
        options.headers = { ...options.headers, 'Authorization': `Basic ${auth}` };
    }
    return fetch(url, options);
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

    // fetchAuth da api.js
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
    // fetchAuth da api.js
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
    // fetchAuth da api.js
    const response = await fetchAuth(`php/api/${resource}.php`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return await response.json();
}

// GESTIONE SESSION (lato client) 

/** Salva la stringa base64 delle credenziali nel Session Storage del browser. */
function saveSession(credentials) {
    sessionStorage.setItem('user_auth', credentials);
}

/** Rimuove le credenziali effettuando il logout locale. */
function clearSession() {
    sessionStorage.removeItem('user_auth');
}

/** Recupera le credenziali correnti e ritorna null se l'utente non è loggato. */
function getSession() {
    return sessionStorage.getItem('user_auth');
}