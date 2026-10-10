document.addEventListener('DOMContentLoaded', () => {
  const currentUser = getCurrentUser();
  const logoutBtn = document.querySelector('.logout-btn');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logoutUser();
    });
  }

  if (currentUser) {
    const dashboardTitle = document.querySelector('.page-header h1');
    if (dashboardTitle) {
      dashboardTitle.textContent = `${currentUser.name || 'Client'} dashboard`;
    }
  }
});
