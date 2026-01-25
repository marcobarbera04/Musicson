/**
 * Aggiorna l'interfaccia in base allo stato di autenticazione.
 * Mostra la dashboard se l'utente è loggato, altrimenti mostra il login.
 */
function updateUI(isAuthenticated, userData = null) {
    const loginBox = document.getElementById('login-container');
    const contentBox = document.getElementById('content-container');
    const statusBox = document.getElementById('user-status');

    if (isAuthenticated) {
        // Utente Loggato
        loginBox.style.display = 'none';    // nasconde il box di login
        contentBox.style.display = 'block'; // mostra il container del contenuto
        
        // Inserisce i bottoni di controllo nell'header
        statusBox.innerHTML = `
            <div class="header-controls">
                <span>Ciao <strong>${userData.nickname}</strong></span>
                <button onclick="goHome()">Home</button>
                <button onclick="showMyAppointments()">Mie Lezioni</button>
                <button onclick="openProfileModal()">Profilo</button> 
                <button onclick="logout()" class="btn-logout">Esci</button>
            </div>
        `;
        
        loadInstruments();  // caricare gli strumenti nella datalist
        goHome();           // mostra gli elementi della schermata principale
    } else {
        // Utente Non Loggato
        loginBox.style.display = 'block';   // mostrare il box login
        contentBox.style.display = 'none';  // nascondere contenuti
        statusBox.innerHTML = "";           // nascondere status utente 
    }
}

/**
 * Alterna la visualizzazione tra Login e Registrazione.
 * Pulisce i messaggi di errore al cambio vista.
 */
function toggleAuth(view) {
    const loginContainer = document.getElementById('login-container');
    const registerContainer = document.getElementById('register-container');
    
    const loginError = document.getElementById('login-error');  // scritta di errore login
    const regError = document.getElementById('reg-error');      // scritta di errore registrazione

    if(loginError) loginError.innerText = "";   // renderla non esistente
    if(regError) regError.innerText = "";       // renderla non esistente

    if (view === 'register') {  
        // Se l'utente deve registrarsi
        if(loginContainer) loginContainer.style.display = 'none';           // nasconde il container login
        if(registerContainer) registerContainer.style.display = 'block';    // mostra il container register
    } else {
        // Se l'utente deve loggarsi
        if(loginContainer) loginContainer.style.display = 'block';          // mostra il container login
        if(registerContainer) registerContainer.style.display = 'none';     // nasconde il container register
    }
}

// Resetta la vista principale per la ricerca
function goHome() {
    const searchSection = document.querySelector('.search-section');
    if(searchSection) searchSection.style.display = 'block';        // mostrare la sezione di ricerca
    
    const container = document.getElementById('teachers-list');
    container.innerHTML = '<p>Seleziona uno strumento e clicca Cerca Maestri.</p>'; 
    document.getElementById('instrument-input').value = ''; // svuotare eventuali valori della barra di ricerca
}

/**
 * Carica la lista degli strumenti dal server e popola il datalist degli strumenti
 */
async function loadInstruments() {
    const datalist = document.getElementById('instrument-list');
    if (!datalist) return;  // se non trovata ritornare
    
    const instruments = await getData('instruments');   // prendere gli strumenti tramite chiamata GET
    
    if (instruments) {
        datalist.innerHTML = '';
        instruments.forEach(ins => {
            const opt = document.createElement('option');   // creare opzione per ogni strumento (ins)
            opt.value = ins.name;                           // assegnare il nome strumento all'opzione
            datalist.appendChild(opt);                      // appendere l'opzione alla datalist
        });
    }
}

// Gestisce l'avvio della ricerca dei professori in base allo strumento
function handleSearch() {
    const input = document.getElementById('instrument-input');
    const strumentoScelto = input.value.trim();
    if (!strumentoScelto) {
        alert("Scrivi o seleziona uno strumento."); // alert nel caso si provi a cercare senza uno strumento
        return;
    }
    showTeachers(strumentoScelto);  // funzione che mostra gli insegnanti in base allo strumento scelto
}

/**
 * Recupera i professori che insegnano lo strumento scelto e aggiorna la lista creando le card dei professori con la funzione apposita
 */
async function showTeachers(strumento) {
    const listContainer = document.getElementById('teachers-list');
    listContainer.innerHTML = '<p>Ricerca in corso...</p>'; // scritta momentanea

    const teachers = await getData('teachers', { strumento: strumento });   // prende tutti i professori tramite chiamata GET con opzione lo strumento

    if (!teachers || teachers.length === 0) {
        listContainer.innerHTML = '<p>Nessun professore trovato.</p>';
        return;
    }
    // Crea un div per la griglia contenente le card dei professori
    let html = '<div class="teachers-grid">';
    teachers.forEach(t => html += createTeacherCard(t)); 
    listContainer.innerHTML = html + '</div>';
}

/**
 * Crea il codice HTML per la card di un professore (t)
 */
function createTeacherCard(t) {
    const userRole = sessionStorage.getItem('user_role');   // prendere il ruolo dell'utente loggato dal session storage
    const imgPath = `img/profile_pictures/${t.profile_picture || 'default.png'}`;
    let bookingButton = ''; // bottone prenotazione non esistente inizialmente

    // Mostra il bottone prenota solo se l'utente è uno studente (ruolo 1)
    if(userRole == '1'){
        bookingButton = `<button onclick="openBookingModal(${t.id})">Prenota Lezione</button>`
    }

    // Ritorna l'html con il div teacher card
    return `
        <div class="teacher-card">
            <img src="${imgPath}" class="teacher-img" alt="${t.nickname}"> 
            <h3>${t.nickname}</h3>
            <p>Strumenti: <strong>${t.instruments}</strong></p>
            ${bookingButton}
        </div>`;
}

/**
 * Apre la finestra modale e carica gli orari disponibili del professore.
 */
async function openBookingModal(teacherId) {
    const modal = document.getElementById('booking-modal');
    const container = document.getElementById('slots-container');
    
    modal.style.display = 'flex';                   // mostra la modale
    container.innerHTML = 'Caricamento orari...';   // testo momentaneo

    const availability = await getData('availability', { teacher_id: teacherId });  // prendere le disponibilita' del professore con chiamata GET

    // Se le disponibilita' non sono un array o non esistono errore
    if (!availability || !Array.isArray(availability)) {
        container.innerHTML = '<p>Errore nel caricamento dati.</p>';
        return;
    }

    // Se il professore ha zero disponibilita' 
    if (availability.length === 0) {
        container.innerHTML = '<p>Questo professore non ha orari disponibili.</p>';
        return;
    }

    container.innerHTML = '';   // rimozione testo momentaneo

    // Itera su ogni slot di disponibilità per creare il bottone di prenotazione
    availability.forEach(slot => {
        const dateObj = getNextDate(parseInt(slot.weekday)); // calcola la data del prossimo giorno della settimana (es. Lunedi)
        
        // Formattazione data per il database (YYYY-MM-DD)
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // i mesi partono da 0
        const day = String(dateObj.getDate()).padStart(2, '0');
        const dateForDb = `${year}-${month}-${day}`;

        const timeLabel = slot.start_time.slice(0, 5); // taglia i secondi dall'orario per la visualizzazione
        
        const fullDateTime = `${dateForDb} ${slot.start_time}`;
        // Aggiunge i secondi se mancano per conformità col formato SQL
        const finalDateTime = fullDateTime.length === 16 ? fullDateTime + ":00" : fullDateTime;

        const btn = document.createElement('button'); // crea il bottone dello slot
        // Formatta la data leggibile per l'utente (es. Lun 25 Gen)
        const dateReadable = dateObj.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
        
        btn.innerHTML = `${dateReadable} - ${timeLabel}`;
        btn.onclick = () => confirmBooking(teacherId, finalDateTime); // assegna la funzione di conferma al click
        
        container.appendChild(btn); // aggiunge il bottone al container
    });
}

/**
 * Conferma la prenotazione e invia i dati al server.
 */
async function confirmBooking(teacherId, datetime) {
    const dateReadable = new Date(datetime).toLocaleString('it-IT');            // formatta la data in formato italiano
    if(!confirm("Confermi la prenotazione per: " + dateReadable + "?")) return; // se viene rifiutato il confirm ritorna

    // inserire l'appuntamento con il professore tramite chiamata POST
    const result = await postData('appointments', {
        teacher_id: teacherId,
        datetime: datetime
    });

    if (result && result.message) {
        alert("Prenotazione riuscita! Vai su 'Mie Lezioni'.");              // alert con successo di prenotazione
        document.getElementById('booking-modal').style.display = 'none';    // nasconde il modale appena si chiude il modale e la prenotazione riesce 
    } else if (result && result.error) {
        alert("Errore: " + result.error);   // mostra errore specifico ricevuto dal backend
        openBookingModal(teacherId);        // si riapre il modale per la prenotazione in caso di errore fino a quando non lo si chiude o si prenota
    } else {
        alert("Errore durante la prenotazione. Riprova.");  // errore non gestito
    }
}

/**
 * Calcola la data del prossimo giorno della settimana richiesto.
 */
function getNextDate(targetDayIndex) {
    const date = new Date();
    const currentDay = date.getDay(); // ottiene l'indice del giorno corrente (0-6)
    
    let daysToAdd = targetDayIndex - currentDay; // calcola la differenza di giorni
    
    // Se il giorno target è oggi o passato, sposta alla settimana successiva
    if (daysToAdd <= 0) {
        daysToAdd += 7;
    }
    
    date.setDate(date.getDate() + daysToAdd); // imposta la nuova data aggiungendo i giorni
    return date;
}

/**
 * Recupera e mostra la lista delle prenotazioni dell'utente.
 */
async function showMyAppointments() {
    const container = document.getElementById('teachers-list');
    const searchSection = document.querySelector('.search-section');
    
    if(searchSection) searchSection.style.display = 'none'; // nasconde la barra di ricerca
    container.innerHTML = '<p>Caricamento lezioni...</p>';  // testo di caricamento
    
    const appointments = await getData('appointments');     // prendere gli appuntamenti con chiamata GET

    // Se la lista è vuota o nulla mostra messaggio
    if (!appointments || appointments.length === 0) {
        container.innerHTML = '<h3>Le mie Prenotazioni</h3><p>Non hai ancora lezioni.</p>';
        return;
    }

    let html = '<h3>Le mie Prenotazioni</h3><div class="appointments-list">';   // lista appuntamenti incompleta inizialmente
    appointments.forEach(app => html += createAppointmentCard(app));            // aggiungere alla lista le card degli appuntamenti create con la funzione apposita
    container.innerHTML = html + '</div>';                                      // inserisce l'html finale nel container
}

/**
 * Crea il codice HTML per la card di un appuntamento.
 */
function createAppointmentCard(app) {
    const dateObj = new Date(app.datetime); // converte la stringa data in oggetto Date
    // formattazione data e ora in formato italiano
    const dateStr = dateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    
    const imgPath = `img/profile_pictures/${app.partner_image || 'default.png'}`; // imposta il percorso immagine o default se mancante
    
    // genera il link al meeting se presente, altrimenti mostra un testo di attesa
    const linkHtml = app.meeting_link 
        ? `<a href="${app.meeting_link}" target="_blank">Accedi al Meeting</a>` 
        : `<span>Link non ancora disponibile</span>`;

    // ritorna la stringa HTML completa per la card
    return `
        <div class="appointment-card">
            <img src="${imgPath}" class="appointment-img" alt="${app.partner_name}">
            <div class="appointment-info">
                <h4 class="appointment-title">Lezione con ${app.partner_name}</h4>
                <p class="appointment-date">
                    Data: ${dateStr} <br> 
                    Ore: <strong>${timeStr}</strong>
                </p>
                <button onclick="deleteBooking(${app.id})">
                    Cancella Lezione
                </button>
            </div>
            <div class="appointment-link-container">
                ${linkHtml}
            </div>
        </div>`;
}

/**
 * Cancella una prenotazione esistente.
 */
async function deleteBooking(appointmentId) {
    if(!confirm("Sei sicuro di voler cancellare questa lezione? L'operazione è irreversibile.")) return;    // se viene rifiutato il confirm ritorna

    const result = await deleteData('appointments', { id: appointmentId }); // viene cancellato l'appuntamento tramite chiamata DELETE

    if (result && result.message) {
        alert("Lezione cancellata.");
        showMyAppointments();   // si mostra di nuovo i propri appuntamenti per ricaricare i dati
    } else {
        alert("Errore: " + (result.error || "Impossibile cancellare"));
    }
}

/**
 * Apre la modale del profilo e mostra la gestione orari se l'utente è un docente.
 */
async function openProfileModal() {
    const modal = document.getElementById('profile-modal');
    const teacherSection = document.getElementById('teacher-availability-section');

    modal.style.display = 'flex';   // mostrare la modale del profilo
    
    const user = await getData('profile');  // prendere i dati del profilo tramite chiamata GET
    
    if (user) {
        if (user.role == 2) { 
            teacherSection.style.display = 'block'; // mostrare la sezione degli slot orari se il ruolo e' professore
            loadMySlots(user.id);                   // caricare gli slot orari del utente loggato
        } else {
            teacherSection.style.display = 'none';  // se l'utente non e' professore non mostrare la sezione degli slot orari
        }
    }
}

/**
 * Carica gli slot orari configurati dal docente.
 */
async function loadMySlots(teacherId) {
    const container = document.getElementById('my-slots-list');
    container.innerHTML = 'Caricamento...'; // testo momentaneo
     
    const slots = await getData('availability', { teacher_id: teacherId }); // prendere gli slot orari del professore tramite chiamata GET
    
    // Se la lista è nulla o vuota mostra messaggio
    if (!slots || slots.length === 0) {
        container.innerHTML = '<p>Nessun orario inserito.</p>';
        return;
    }
    
    container.innerHTML = '';   // rimozione testo momentaneo
    const days = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"]; // array per convertire indice numerico in giorno testuale
    
    slots.forEach(slot => {
        const startTime = slot.start_time.slice(0, 5); // formatta l'orario rimuovendo i secondi
        
        let startHour = parseInt(startTime.split(':')[0]);  
        let endHour = startHour + 1; // calcola l'orario di fine aggiungendo un'ora
        let endTime = endHour + ":00";

        const div = document.createElement('div');
        div.className = 'slot-manage-item';
        // inserisce il testo con giorno e orari e il bottone per eliminare
        div.innerHTML = `
            <span>${days[slot.weekday]} | ${startTime} - ${endTime}</span>
            <button onclick="handleDeleteSlot(${slot.id})">Elimina</button>
        `;
        container.appendChild(div); // aggiunge l'elemento alla lista
    });
}

// Gestisce l'aggiunta di un nuovo slot orario
async function handleAddSlot() {
    const day = document.getElementById('new-slot-day').value;      // valore del giorno selezionato
    const start = document.getElementById('new-slot-start').value;  // orario inserito
    
    if(!start) { alert("Inserisci orario."); return; } // controllo presenza orario
    
    // Controlla che vengano inseriti solo orari interi (es. 15:00) verificando i minuti
    const minutes = start.split(':')[1];
    
    if (minutes !== "00") {
        alert("Per favore, inserisci solo orari pieni (es. 16:00, 17:00). Non sono ammessi minuti.");
        return; 
    }

    // invia la nuova disponibilità al server con chiamata POST
    const result = await postData('availability', {
        weekday: parseInt(day),
        start_time: start + ":00" 
    });
    
    if (result && result.message) {
        const user = await getData('profile');  // recupera dati utente per avere l'id
        loadMySlots(user.id);                   // ricarica la lista degli slot aggiornata
    } else {
        alert("Errore: " + (result.error || "Impossibile aggiungere"));
    }
}

// Gestisce l'eliminazione di uno slot orario
async function handleDeleteSlot(slotId) {
    if(!confirm("Eliminare questo orario?")) return; // chiede conferma prima di procedere
    
    const result = await deleteData('availability', { id: slotId }); // elimina lo slot tramite chiamata DELETE
    
    if (result && result.message) {
        const user = await getData('profile');  // recupera dati utente per avere l'id
        loadMySlots(user.id);                   // ricarica la lista degli slot aggiornata
    } else {
        alert("Errore durante l'eliminazione.");
    }
}