/* Questo file si occupa di generare l'HTML e aggiornare la pagina. Importa getData dal file api per avere i dati da disegnare */
import { getData, postData, deleteData } from './api.js';

// Funzione per creare l'HTML di una card professore
function createTeacherCard(t) {
    const imgPath = `img/profile_pictures/${t.profile_picture || 'default.png'}`;
    return `
        <div class="teacher-card">
            <img src="${imgPath}" class="teacher-img" alt="${t.nickname}">
            <h3>${t.nickname}</h3>
            <p>Strumenti: <strong>${t.instruments}</strong></p>
            <button onclick="window.bookLesson(${t.id})" class="btn-book">Prenota Lezione</button>
        </div>`;
}

// Funzione per creare l'HTML di una card appuntamento
function createAppointmentCard(app) {
    const dateObj = new Date(app.datetime);
    const dateStr = dateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    
    // Usiamo 'partner_image' e 'partner_name' che arrivano dal backend
    const imgPath = `img/profile_pictures/${app.partner_image || 'default.png'}`;
    
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
                
                <button onclick="window.cancelLesson(${app.id})" style="margin-top: 10px;">
                    Cancella Lezione
                </button>
            </div>
            <div class="appointment-link-container">
                ${linkHtml}
            </div>
        </div>`;
}

export function updateUI(isAuthenticated, userData = null) {
    const loginBox = document.getElementById('login-container');
    const contentBox = document.getElementById('content-container');
    const statusBox = document.getElementById('user-status');

    if (isAuthenticated) {
        loginBox.style.display = 'none';
        contentBox.style.display = 'block';
        statusBox.innerHTML = `
            <div class="header-controls">
                <span>Ciao <strong>${userData.nickname}</strong></span>
                <button onclick="window.goHome()" class="btn-nav">Home</button>
                <button onclick="window.showMyAppointments()" class="btn-nav">Mie Lezioni</button>
                <button onclick="window.logout()" class="btn-logout">Esci</button>
            </div>
        `;
        loadInstruments();
        window.goHome(); // Usiamo window.goHome perché definita globalmente nel main
    } else {
        loginBox.style.display = 'block';
        contentBox.style.display = 'none';
        statusBox.innerHTML = "";
    }
}

export async function loadInstruments() {
    const datalist = document.getElementById('instrument-list');
    if (!datalist) return;
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

export async function showTeachers(strumento) {
    const listContainer = document.getElementById('teachers-list');
    listContainer.innerHTML = '<p>Ricerca in corso...</p>';

    // Chiediamo i dati passando l'oggetto dei parametri
    const teachers = await getData('teachers', { strumento: strumento });

    if (!teachers || teachers.length === 0) {
        listContainer.innerHTML = '<p>Nessun professore trovato.</p>';
        return;
    }

    let html = '<div class="teachers-grid">';
    teachers.forEach(t => html += createTeacherCard(t)); 
    listContainer.innerHTML = html + '</div>';
}

export async function showMyAppointments() {
    const container = document.getElementById('teachers-list');
    const searchSection = document.querySelector('.search-section');
    if(searchSection) searchSection.style.display = 'none';
    
    container.innerHTML = '<p>Caricamento lezioni...</p>';
    const appointments = await getData('appointments');

    if (!appointments || appointments.length === 0) {
        container.innerHTML = '<h3>Le mie Prenotazioni</h3><p>Non hai ancora lezioni.</p>';
        return;
    }

    let html = '<h3>Le mie Prenotazioni</h3><div class="appointments-list">';
    appointments.forEach(app => html += createAppointmentCard(app));
    container.innerHTML = html + '</div>';
}

// Funzione per calcolare la data del prossimo giorno della settimana specificato
function getNextDate(targetDayIndex) {
    const date = new Date();
    const currentDay = date.getDay(); // 0=Domenica, 1=Lunedì...
    
    // Calcoliamo quanti giorni mancano
    // Esempio: Se oggi è Martedì (2) e cerco Venerdì (5) -> 5 - 2 = 3 giorni dopo
    let daysToAdd = targetDayIndex - currentDay;
    
    // Se il giorno è già passato in questa settimana (o è oggi), andiamo alla prossima
    if (daysToAdd <= 0) {
        daysToAdd += 7;
    }
    
    date.setDate(date.getDate() + daysToAdd);
    return date;
}

// Funzione che apre la modale e calcola gli slot
export async function openBookingModal(teacherId) {
    const modal = document.getElementById('booking-modal');
    const container = document.getElementById('slots-container');
    
    modal.style.display = 'flex'; // Mostra la modale
    container.innerHTML = 'Caricamento orari...';

    // Scarichiamo la disponibilità del prof
    const availability = await getData('availability', { teacher_id: teacherId });

    if (!availability || availability.length === 0) {
        container.innerHTML = '<p>Questo professore non ha orari disponibili inseriti.</p>';
        return;
    }

    container.innerHTML = ''; // Pulisce

    // Generiamo gli slot orari per la prossima settimana
    availability.forEach(slot => {
        // Il db utilizza lunedi = 1 cosi' come js
        const dateObj = getNextDate(parseInt(slot.weekday)); 
        
        // Formattiamo la data per l'utente (es. "Lun 25 Gen")
        const dateStr = dateObj.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
        
        // Formattiamo la data per il DB (YYYY-MM-DD)
        const dateForDb = dateObj.toISOString().split('T')[0];

        // Creiamo slot di 1 ora nell'intervallo start-end
        let startHour = parseInt(slot.start_time.split(':')[0]);
        let endHour = parseInt(slot.end_time.split(':')[0]);

        for (let h = startHour; h < endHour; h++) {
            const timeLabel = `${h}:00`;
            const fullDateTime = `${dateForDb} ${h}:00:00`; // Formato SQL
            
            const btn = document.createElement('button');
            btn.className = 'slot-btn';
            btn.innerHTML = `${dateStr} - ${timeLabel}`;
            
            // Al click, confermiamo la prenotazione
            btn.onclick = () => confirmBooking(teacherId, fullDateTime);
            
            container.appendChild(btn);
        }
    });
}

// Funzione per inviare la prenotazione
async function confirmBooking(teacherId, datetime) {
    // Formattiamo la data per renderla leggibile nel confirm
    const dateReadable = new Date(datetime).toLocaleString('it-IT');
    if(!confirm("Confermi la prenotazione per: " + dateReadable + "?")) return;

    // Nel file api.js postData restituisce response.json()
    // Se il server manda { "error": "..." }, lo troveremo qui
    const result = await postData('appointments', {
        teacher_id: teacherId,
        datetime: datetime
    });

    if (result && result.message) {
        // SUCCESSO
        alert("Prenotazione riuscita! Vai su 'Mie Lezioni'.");
        document.getElementById('booking-modal').style.display = 'none';
        
        // Ricarichiamo gli slot per nascondere quello appena preso
        openBookingModal(teacherId); 

    } else if (result && result.error) {
        // ERRORE SPECIFICO (es. Slot occupato)
        alert("Errore: " + result.error);
        
        // Ricaricare la modale per mostrare la situazione aggiornata
        document.getElementById('slots-container').innerHTML = ''; // Pulisce per sicurezza
        openBookingModal(teacherId); // Ricarica gli slot
    } else {
        // ERRORE GENERICO
        alert("Errore durante la prenotazione. Riprova.");
    }
}

export async function deleteBooking(appointmentId) {
    if(!confirm("Sei sicuro di voler cancellare questa lezione? L'operazione è irreversibile.")) return;

    const result = await deleteData('appointments', { id: appointmentId });

    if (result && result.message) {
        alert("Lezione cancellata.");
        // Ricarichiamo la lista per far sparire la card
        window.showMyAppointments();
    } else {
        alert("Errore: " + (result.error || "Impossibile cancellare"));
    }
}