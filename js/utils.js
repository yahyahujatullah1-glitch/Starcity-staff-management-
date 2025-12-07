// HELPER: Show a popup modal
export function showModal(title, html) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').style.display = 'flex';
}

export function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
}

// HELPER: Date formatter
export function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// SETUP: Close button listener
document.getElementById('modal-close').onclick = closeModal;
