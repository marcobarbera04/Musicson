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
        // UTENTE LOGGATO
        loginBox.style.display = 'none';
        contentBox.style.display = 'block';
        
        // Bottoni Home, Mie Lezioni, Profilo, Esci
        statusBox.innerHTML = `
            <div class="header-controls">
                <span>Ciao <strong>${userData.nickname}</strong></span>
                <button onclick="goHome()" class="btn-nav">Home</button>
                <button onclick="showMyAppointments()" class="btn-nav">Mie Lezioni</button>
                <button onclick="openProfileModal()" class="btn-nav">Profilo</button> 
                <button onclick="logout()" class="btn-logout">Esci</button>
            </div>
        `;
        
        loadInstruments();
        goHome(); 
    } else {
        // UTENTE NON LOGGATO
        loginBox.style.display = 'block';
        contentBox.style.display = 'none';
        statusBox.innerHTML = "";
    }
}

// Navigazione verso la Home (pagina con ricerca)
function goHome() {
    const searchSection = document.querySelector('.search-section');
    if(searchSection) searchSection.style.display = 'block';
    
    const container = document.getElementById('teachers-list');
    container.innerHTML = '<p>Seleziona uno strumento e clicca Cerca Maestri.</p>';
    document.getElementById('instrument-input').value = '';
}

/**
 * Popola il datalist HTML con l'elenco degli strumenti disponibili.
 * Effettua una chiamata GET /instruments.
 */
async function loadInstruments() {
    const datalist = document.getElementById('instrument-list');
    if (!datalist) return;
    
    const instruments = await getData('instruments');   // prendere gli strumenti con GET
    
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

// Gestione click bottone Cerca per cercare professori in base allo strumento 
function handleSearch() {
    const input = document.getElementById('instrument-input');
    const strumentoScelto = input.value.trim();
    if (!strumentoScelto) {
        alert("Scrivi o seleziona uno strumento.");
        return;
    }
    showTeachers(strumentoScelto);  // mostrare gli insegnanti in base allo strumento scelto (showTeachers da ui.js)
}

/**
 * Recupera la lista dei professori filtrata per strumento e aggiorna la griglia nel DOM.
 * @param {string} strumento - La stringa di ricerca.
 */
async function showTeachers(strumento) {
    const listContainer = document.getElementById('teachers-list');
    listContainer.innerHTML = '<p>Ricerca in corso...</p>';

    const teachers = await getData('teachers', { strumento: strumento });   // prendere gli insegnianti con lo strumento scritto nella barra di ricerca/datalist

    if (!teachers || teachers.length === 0) {
        listContainer.innerHTML = '<p>Nessun professore trovato.</p>';
        return;
    }

    // Costruzione dinamica della griglia
    let html = '<div class="teachers-grid">';
    teachers.forEach(t => html += createTeacherCard(t)); 
    listContainer.innerHTML = html + '</div>';
}

/**
 * Genera la stringa HTML per una singola card Professore.
 * @param {object} t - Oggetto professore (id, nickname, instruments, profile_picture).
 * @returns {string} - Template HTML della card.
 */
function createTeacherCard(t) {
    const userRole = sessionStorage.getItem('user_role');                           // prendere il ruolo utente da sessionStorage ("1" o "2")
    const imgPath = `img/profile_pictures/${t.profile_picture || 'default.png'}`;   // forziamo il fallback a default.png se il campo è vuoto o null
    let bookingButton = '';                                                         // bottone prenotazione (nessun bottone di base)

    // se l'utente e' studente il bottone prenota lezione esistera'
    if(userRole == '1'){
        bookingButton = `<button onclick="openBookingModal(${t.id})" class="btn-book">Prenota Lezione</button>`
    }

    return `
        <div class="teacher-card">
            <img src="${imgPath}" class="teacher-img" alt="${t.nickname}"> 
            <h3>${t.nickname}</h3>
            <p>Strumenti: <strong>${t.instruments}</strong></p>
            ${bookingButton}
        </div>`;
}

// LOGICA PRENOTAZIONI LEZIONI (Popup/Modale Prenotazione)

/**
 * Apre la modale di prenotazione, scarica gli orari disponibili del professore
 * e genera i bottoni per gli slot temporali.
 * @param {number} teacherId - ID del professore selezionato.
 */
async function openBookingModal(teacherId) {
    const modal = document.getElementById('booking-modal');
    const container = document.getElementById('slots-container');
    
    modal.style.display = 'flex';
    container.innerHTML = 'Caricamento orari...';

    const availability = await getData('availability', { teacher_id: teacherId });  // prender le disponibilità del prof con get

    if (!availability || !Array.isArray(availability)) {
        container.innerHTML = '<p>Errore nel caricamento dati.</p>';
        return;
    }

    if (availability.length === 0) {
        container.innerHTML = '<p>Questo professore non ha orari disponibili.</p>';
        return;
    }

    container.innerHTML = ''; 

    availability.forEach(slot => {
        // calcolare la data del prossimo giorno richiesto (es. prossimo Lunedì)
        const dateObj = getNextDate(parseInt(slot.weekday)); 
        
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Mesi partono da 0 in JS
        const day = String(dateObj.getDate()).padStart(2, '0');
        const dateForDb = `${year}-${month}-${day}`;

        const timeLabel = slot.start_time.slice(0, 5);  // formattare l'orario (es. 15:00:00 in 15:00)
        
        // creare la stringa completa per il db (es: 2023-01-25 15:00:00)
        const fullDateTime = `${dateForDb} ${slot.start_time}`; // slot.start_time ha già i secondi nel db
        
        // se slot.start_time e' "15:00" aggiungere ":00"
        const finalDateTime = fullDateTime.length === 16 ? fullDateTime + ":00" : fullDateTime;

        // creazione bottone dello slot da prenotare
        const btn = document.createElement('button');
        btn.className = 'slot-btn';
        // testo in formato Lun 23 Gen - 15:00
        const dateReadable = dateObj.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
        btn.innerHTML = `${dateReadable} - ${timeLabel}`;
        
        btn.onclick = () => confirmBooking(teacherId, finalDateTime);
        
        container.appendChild(btn);
    });
}

/**
 * Invia la richiesta POST al server per salvare la prenotazione.
 * Gestisce i messaggi di successo o errore (es. slot occupato).
 */
async function confirmBooking(teacherId, datetime) {
    const dateReadable = new Date(datetime).toLocaleString('it-IT');
    if(!confirm("Confermi la prenotazione per: " + dateReadable + "?")) return;

    // creare prenotazione/appuntamento con POST
    const result = await postData('appointments', {
        teacher_id: teacherId,
        datetime: datetime
    });

    if (result && result.message) {
        // successo notifica con alert e chiudere modale/popup  
        alert("Prenotazione riuscita! Vai su 'Mie Lezioni'.");
        document.getElementById('booking-modal').style.display = 'none';
    } else if (result && result.error) {
        // errore (es. slot occupato) notifica e ricarica slot
        alert("Errore: " + result.error);
        openBookingModal(teacherId); 
    } else {
        // Errore Generico
        alert("Errore durante la prenotazione. Riprova.");
    }
}

/**
 * Calcola la data esatta (Oggetto Date) del prossimo giorno della settimana richiesto.
 * @param {number} targetDayIndex - Indice del giorno (0=Domenica, 1=Lunedì...).
 * @returns {Date} - Oggetto Date calcolato.
 */
function getNextDate(targetDayIndex) {
    const date = new Date();
    const currentDay = date.getDay(); 
    
    let daysToAdd = targetDayIndex - currentDay;    // calcolare differenziale giorni
    
    // Se il giorno è oggi o passato, si sposta alla settimana successiva
    if (daysToAdd <= 0) {
        daysToAdd += 7;
    }
    
    date.setDate(date.getDate() + daysToAdd);
    return date;
}

// LOGICA PRENOTAZIONE LEZIONI (Lista e Cancellazione)

/**
 * Recupera gli appuntamenti dell'utente e aggiorna la vista principale.
 * Nasconde la sezione di ricerca per mostrare la lista lezioni.
 */
async function showMyAppointments() {
    const container = document.getElementById('teachers-list');
    const searchSection = document.querySelector('.search-section');
    
    if(searchSection) searchSection.style.display = 'none'; // nascondere la barra di ricerca per fare spazio alle prenotazioni
    container.innerHTML = '<p>Caricamento lezioni...</p>';
    
    const appointments = await getData('appointments');     // prendere gli appuntamenti con GET

    if (!appointments || appointments.length === 0) {
        container.innerHTML = '<h3>Le mie Prenotazioni</h3><p>Non hai ancora lezioni.</p>';
        return;
    }

    let html = '<h3>Le mie Prenotazioni</h3><div class="appointments-list">';
    appointments.forEach(app => html += createAppointmentCard(app));
    container.innerHTML = html + '</div>';
}

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
    
    // generazione condizionale del link al meeting (se app.meeting_link esiste mostro quello senno' dico ancora non disponibile)
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
                <button onclick="deleteBooking(${app.id})" class="btn-cancel">
                    Cancella Lezione
                </button>
            </div>
            <div class="appointment-link-container">
                ${linkHtml}
            </div>
        </div>`;
}

/**
 * Invia richiesta DELETE per rimuovere un appuntamento.
 * Richiede conferma utente e aggiorna la lista in caso di successo.
 */
async function deleteBooking(appointmentId) {
    if(!confirm("Sei sicuro di voler cancellare questa lezione? L'operazione è irreversibile.")) return;

    const result = await deleteData('appointments', { id: appointmentId });     // rimuovere la prenotazione con DELETE

    if (result && result.message) {
        alert("Lezione cancellata.");   // notifica della cancellazione con successo
        showMyAppointments();           // ricaricamento della lista per mostrare le modifiche
    } else {
        alert("Errore: " + (result.error || "Impossibile cancellare"));
    }
}

// LOGICA PROFILO E GESTIONE ORARI

/**
 * Apre la modale profilo e popola i dati.
 * Recupera i dati dal server (GET profile.php).
 */
async function openProfileModal() {
    const modal = document.getElementById('profile-modal');
    const teacherSection = document.getElementById('teacher-availability-section');

    modal.style.display = 'flex';
    
    const user = await getData('profile');  // recuperare i dati utente perche' serve id e ruolo (ruolo e' presente anche in sessionStorage)
    
    if (user) {
        if (user.role == 2) { 
            teacherSection.style.display = 'block'; // se e' un insegnante mostrare il pannello di gestione orari
            loadMySlots(user.id);
        } else {
            teacherSection.style.display = 'none';  // se e' studente nascondiamo la sezione orari
        }
    }
}

/**
 * Carica e renderizza la lista degli slot orari del docente loggato.
 * @param {number} teacherId 
 */
async function loadMySlots(teacherId) {
    const container = document.getElementById('my-slots-list');
    container.innerHTML = 'Caricamento...';
     
    const slots = await getData('availability', { teacher_id: teacherId }); // prendere le disponibilita' insegnante con GET
    
    if (!slots || slots.length === 0) {
        container.innerHTML = '<p>Nessun orario inserito.</p>';
        return;
    }
    
    container.innerHTML = '';
    const days = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];    // standard JS Domenica = 0, Lunedi = 1 ecc...
    
    slots.forEach(slot => {
        const startTime = slot.start_time.slice(0, 5);  // tagliare i secondi dall'orario (15:00:00 diventa 15:00)
        
        // calcolare l'orario di fine (tutte le lezioni devono durare 1 ora)
        // prendere le prime due cifre e convertirle in intero aggiungendo 1
        let startHour = parseInt(startTime.split(':')[0]);  
        let endHour = startHour + 1;
        let endTime = endHour + ":00";

        const div = document.createElement('div');
        div.className = 'slot-manage-item';
        div.innerHTML = `
            <span>${days[slot.weekday]} | ${startTime} - ${endTime}</span>
            <button onclick="handleDeleteSlot(${slot.id})" class="btn-delete">Elimina</button>
        `;
        container.appendChild(div);
    });
}

// Gestione Aggiunta Slot (POST solo per professori)
async function handleAddSlot() {
    const day = document.getElementById('new-slot-day').value;
    const start = document.getElementById('new-slot-start').value;
    
    if(!start) { alert("Inserisci orario."); return; }
    
    // aggiungere disponibilita' tramite POST 
    const result = await postData('availability', {
        weekday: parseInt(day),
        start_time: start + ":00" 
    });
    
    if (result && result.message) {
        const user = await getData('profile');  // prendere dati utente perche' serve l'id per caricare i suoi slot
        loadMySlots(user.id);
    } else {
        alert("Errore: " + (result.error || "Impossibile aggiungere"));
    }
}

// Gestione Rimozione Slot (DELETE solo per professori)
async function handleDeleteSlot(slotId) {
    if(!confirm("Eliminare questo orario?")) return;
    
    const result = await deleteData('availability', { id: slotId });
    
    if (result && result.message) {
        const user = await getData('profile');
        loadMySlots(user.id);
    } else {
        alert("Errore durante l'eliminazione.");
    }
}