/* File contenente tutte le funzione che si occupano di interfacciarsi con l'api php */

export async function fetchAuth(url, options = {}) {
    const auth = sessionStorage.getItem('user_auth');
    if (auth) {
        options.headers = { ...options.headers, 'Authorization': `Basic ${auth}` };
    }
    return fetch(url, options);
}

export async function getData(resource, params = null) {
    // Costruiamo l'URL base
    let url = `php/api/${resource}.php`;

    // Se ci sono parametri li aggiungiamo alla query string
    if (params) {
        // URLSearchParams trasforma un oggetto {a:1, b:2} in "a=1&b=2" automaticamente per gestire la codifica
        const queryString = new URLSearchParams(params).toString();
        url += `?${queryString}`;
    }

    // Facciamo la chiamata
    const response = await fetchAuth(url);
    
    // Gestione scadenza sessione
    if (response.status === 401) {
        // Qui potresti chiamare una funzione di logout o ritornare null
        sessionStorage.removeItem('user_auth');
        location.reload(); 
        return null;
    }
    
    return await response.json();
}

export function saveSession(credentials) {
    sessionStorage.setItem('user_auth', credentials);
}

export function clearSession() {
    sessionStorage.removeItem('user_auth');
}

export function getSession() {
    return sessionStorage.getItem('user_auth');
}