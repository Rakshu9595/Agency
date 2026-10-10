document.addEventListener('DOMContentLoaded', () => {
  const statusNote = document.querySelector('.status-note');
  if (statusNote) {
    statusNote.setAttribute('role', 'status');
  }
});
