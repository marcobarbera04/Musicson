/* * Gestisce la manipolazione del DOM, la generazione dell'HTML dinamico e la logica di presentazione.
 */

// SETUP GENERALE UI

/**
 * Gestisce lo stato globale dell'interfaccia (Loggato vs Non Loggato).
 * Mostra/Nasconde i container principali e aggiorna l'header con i dati utente.
 * * @param {boolean} isAuthenticated - True se il login è valido.
 * @param {object} userData - Oggetto contenente nickname e ruolo dell'utente.
 */
function updateUI(isAuthenticated, userData = null) {
    const loginBox = document.getElementById('login-container');
    const contentBox = document.getElementById('content-container');
    const statusBox = document.getElementById('user-status');

    if (isAuthenticated) {
        // Stato: UTENTE LOGGATO
        loginBox.style.display = 'none';
        contentBox.style.display = 'block';
        
        // Iniezione HTML per la barra di navigazione utente
        statusBox.innerHTML = `
            <div class="header-controls">
                <span>Ciao <strong>${userData.nickname}</strong></span>
                <button onclick="goHome()" class="btn-nav">Home</button>
                <button onclick="showMyAppointments()" class="btn-nav">Mie Lezioni</button>
                <button onclick="logout()" class="btn-logout">Esci</button>
            </div>
        `;
        
        // Inizializzazione dati
        loadInstruments();
        // goHome da main.js
        goHome(); // Reset della vista alla home page
    } else {
        // Stato: UTENTE NON LOGGATO
        loginBox.style.display = 'block';
        contentBox.style.display = 'none';
        statusBox.innerHTML = "";
    }
}

/**
 * Popola il datalist HTML con l'elenco degli strumenti disponibili.
 * Effettua una chiamata GET /instruments.
 */
async function loadInstruments() {
    const datalist = document.getElementById('instrument-list');
    if (!datalist) return;
    
    // getData da api.js
    const instruments = await getData('instruments');
    
    if (instruments) {
        datalist.innerHTML = '';
        instruments.forEach(ins => {
            const opt = document.createElement('option');
            opt.value = ins.name;
            datalist.appendChild(opt);
        });
    }
}

// LOGICA PROFESSORI (Ricerca e Visualizzazione) 

/**
 * Genera la stringa HTML per una singola card Professore.
 * @param {object} t - Oggetto professore (id, nickname, instruments, profile_picture).
 * @returns {string} - Template HTML della card.
 */
function createTeacherCard(t) {
    const imgPath = `img/profile_pictures/${t.profile_picture || 'default.png'}`;
    return `
        <div class="teacher-card">
            <img src="${imgPath}" class="teacher-img" alt="${t.nickname}">
            <h3>${t.nickname}</h3>
            <p>Strumenti: <strong>${t.instruments}</strong></p>
            <button onclick="bookLesson(${t.id})" class="btn-book">Prenota Lezione</button>
        </div>`;
}

/**
 * Recupera la lista dei professori filtrata per strumento e aggiorna la griglia nel DOM.
 * @param {string} strumento - La stringa di ricerca.
 */
async function showTeachers(strumento) {
    const listContainer = document.getElementById('teachers-list');
    listContainer.innerHTML = '<p>Ricerca in corso...</p>';

    // getData da api.js
    const teachers = await getData('teachers', { strumento: strumento });

    if (!teachers || teachers.length === 0) {
        listContainer.innerHTML = '<p>Nessun professore trovato.</p>';
        return;
    }

    // Costruzione dinamica della griglia
    let html = '<div class="teachers-grid">';
    teachers.forEach(t => html += createTeacherCard(t)); 
    listContainer.innerHTML = html + '</div>';
}

// LOGICA PRENOTAZIONI LEZIONI (Popup/Modale Prenotazione)

/**
 * Calcola la data esatta (Oggetto Date) del prossimo giorno della settimana richiesto.
 * @param {number} targetDayIndex - Indice del giorno (0=Domenica, 1=Lunedì...).
 * @returns {Date} - Oggetto Date calcolato.
 */
function getNextDate(targetDayIndex) {
    const date = new Date();
    const currentDay = date.getDay(); 
    
    // Calcolo differenziale giorni
    let daysToAdd = targetDayIndex - currentDay;
    
    // Se il giorno è oggi o passato, si sposta alla settimana successiva
    if (daysToAdd <= 0) {
        daysToAdd += 7;
    }
    
    date.setDate(date.getDate() + daysToAdd);
    return date;
}

/**
 * Apre la modale di prenotazione, scarica gli orari disponibili del professore
 * e genera i bottoni per gli slot temporali.
 * @param {number} teacherId - ID del professore selezionato.
 */
async function openBookingModal(teacherId) {
    const modal = document.getElementById('booking-modal');
    const container = document.getElementById('slots-container');
    
    modal.style.display = 'flex'; // Renderizza la modale flexbox
    container.innerHTML = 'Caricamento orari...';

    // getData da api.js
    const availability = await getData('availability', { teacher_id: teacherId });

    if (!availability || availability.length === 0) {
        container.innerHTML = '<p>Questo professore non ha orari disponibili inseriti.</p>';
        return;
    }

    container.innerHTML = ''; 

    // Iterazione sulle disponibilità per creare gli slot orari
    availability.forEach(slot => {
        const dateObj = getNextDate(parseInt(slot.weekday)); 
        
        // Formattazione data per UI e per DB
        const dateStr = dateObj.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
        const dateForDb = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD

        let startHour = parseInt(slot.start_time.split(':')[0]);
        let endHour = parseInt(slot.end_time.split(':')[0]);

        // Ciclo per creare bottoni di 1 ora
        for (let h = startHour; h < endHour; h++) {
            const timeLabel = `${h}:00`;
            const fullDateTime = `${dateForDb} ${h}:00:00`;
            
            const btn = document.createElement('button');
            btn.className = 'slot-btn';
            btn.innerHTML = `${dateStr} - ${timeLabel}`;
            
            // Binding evento click per conferma
            btn.onclick = () => confirmBooking(teacherId, fullDateTime);
            
            container.appendChild(btn);
        }
    });
}

/**
 * Invia la richiesta POST al server per salvare la prenotazione.
 * Gestisce i messaggi di successo o errore (es. slot occupato).
 */
async function confirmBooking(teacherId, datetime) {
    const dateReadable = new Date(datetime).toLocaleString('it-IT');
    if(!confirm("Confermi la prenotazione per: " + dateReadable + "?")) return;

    // postData da api.js
    const result = await postData('appointments', {
        teacher_id: teacherId,
        datetime: datetime
    });

    if (result && result.message) {
        // Successo: Chiude modale e notifica
        alert("Prenotazione riuscita! Vai su 'Mie Lezioni'.");
        document.getElementById('booking-modal').style.display = 'none';
    } else if (result && result.error) {
        // Errore Logico (es. Concorrenza): Notifica e ricarica slot
        alert("Errore: " + result.error);
        openBookingModal(teacherId); 
    } else {
        // Errore Generico
        alert("Errore durante la prenotazione. Riprova.");
    }
}

// LOGICA PRENOTAZIONE LEZIONI (Lista e Cancellazione)

/**
 * Genera la stringa HTML per una singola card Appuntamento.
 * @param {object} app - Dati appuntamento (inclusi partner_name e partner_image dal JOIN).
 * @returns {string} - Template HTML.
 */
function createAppointmentCard(app) {
    const dateObj = new Date(app.datetime);
    const dateStr = dateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    
    const imgPath = `img/profile_pictures/${app.partner_image || 'default.png'}`;
    
    // Generazione condizionale del link al meeting
    const linkHtml = app.meeting_link 
        ? `<a href="${app.meeting_link}" target="_blank" class="appointment-link">Accedi al Meeting</a>` 
        : `<span class="appointment-no-link">Link non ancora disponibile</span>`;

    return `
        <div class="appointment-card">
            <img src="${imgPath}" class="appointment-img" alt="${app.partner_name}">
            <div class="appointment-info">
                <h4 class="appointment-title">Lezione con ${app.partner_name}</h4>
                <p class="appointment-date">
                    Data: ${dateStr} <br> 
                    Ore: <strong>${timeStr}</strong>
                </p>
                <button onclick="cancelLesson(${app.id})" style="margin-top: 10px;">
                    Cancella Lezione
                </button>
            </div>
            <div class="appointment-link-container">
                ${linkHtml}
            </div>
        </div>`;
}

/**
 * Recupera gli appuntamenti dell'utente e aggiorna la vista principale.
 * Nasconde la sezione di ricerca per mostrare la lista lezioni.
 */
async function showMyAppointments() {
    const container = document.getElementById('teachers-list');
    const searchSection = document.querySelector('.search-section');
    
    // Nascondiamo l'input di ricerca strumenti
    if(searchSection) searchSection.style.display = 'none';
    
    container.innerHTML = '<p>Caricamento lezioni...</p>';
    
    // getData da api.js
    const appointments = await getData('appointments');

    if (!appointments || appointments.length === 0) {
        container.innerHTML = '<h3>Le mie Prenotazioni</h3><p>Non hai ancora lezioni.</p>';
        return;
    }

    let html = '<h3>Le mie Prenotazioni</h3><div class="appointments-list">';
    appointments.forEach(app => html += createAppointmentCard(app));
    container.innerHTML = html + '</div>';
}

/**
 * Invia richiesta DELETE per rimuovere un appuntamento.
 * Richiede conferma utente e aggiorna la lista in caso di successo.
 */
async function deleteBooking(appointmentId) {
    if(!confirm("Sei sicuro di voler cancellare questa lezione? L'operazione è irreversibile.")) return;

    // deleteData da api.js
    const result = await deleteData('appointments', { id: appointmentId });

    if (result && result.message) {
        alert("Lezione cancellata.");
        // Ricaricamento della lista per riflettere le modifiche
        showMyAppointments();
    } else {
        alert("Errore: " + (result.error || "Impossibile cancellare"));
    }
}