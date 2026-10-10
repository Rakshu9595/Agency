document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.info-card');
  cards.forEach((card, index) => {
    card.style.animationDelay = `${index * 120}ms`;
    card.style.opacity = '0';
    card.style.transform = 'translateY(16px)';
    card.style.transition = 'all 0.35s ease';

    requestAnimationFrame(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    });
  });
});
