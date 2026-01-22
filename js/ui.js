/* Questo file si occupa di generare l'HTML e aggiornare la pagina. Importa getData dal file api per avere i dati da disegnare */
import { getData } from './api.js';

// Funzione per creare l'HTML di una card professore
function createTeacherCard(t) {
    const imgPath = `img/profile_pictures/${t.profile_picture || 'default.png'}?v=${new Date().getTime()}`;
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
    
    // NOTA: Ora usiamo 'partner_image' e 'partner_name' che arrivano dal backend aggiornato
    const imgPath = `img/profile_pictures/${app.partner_image || 'default.png'}?v=${new Date().getTime()}`;
    
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