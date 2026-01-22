import { fetchAuth, saveSession, clearSession, getSession } from './api.js';
import { updateUI, showTeachers, showMyAppointments, openBookingModal, deleteBooking } from './ui.js';

window.logout = function() {
    clearSession();
    location.reload();
}

window.goHome = function() {
    const searchSection = document.querySelector('.search-section');
    if(searchSection) searchSection.style.display = 'block';
    const container = document.getElementById('teachers-list');
    container.innerHTML = '<p>Seleziona uno strumento e clicca Cerca Maestri.</p>';
    document.getElementById('instrument-input').value = '';
}

window.handleSearch = function() {
    const input = document.getElementById('instrument-input');
    const strumentoScelto = input.value.trim();
    if (!strumentoScelto) {
        alert("Scrivi o seleziona uno strumento.");
        return;
    }
    showTeachers(strumentoScelto);
}

window.showMyAppointments = showMyAppointments;

window.bookLesson = function(id) {
    openBookingModal(id);
}

window.cancelLesson = function(id) {
    deleteBooking(id);
}

// --- MAIN ---

// Gestione Login Button
document.getElementById('login-button').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    const credentials = btoa(`${email}:${pass}`);
    
    const response = await fetch('php/api/login.php', {
        headers: { 'Authorization': `Basic ${credentials}` }
    });

    if (response.ok) {
        const data = await response.json();
        saveSession(credentials);
        updateUI(true, data);
    } else {
        document.getElementById('login-error').innerText = "Credenziali errate.";
    }
});

// Controllo Login all'avvio
window.onload = async () => {
    if (getSession()) {
        const response = await fetchAuth('php/api/login.php');
        if (response.ok) {
            updateUI(true, await response.json());
        } else {
            updateUI(false);
        }
    } else {
        updateUI(false);
    }
};