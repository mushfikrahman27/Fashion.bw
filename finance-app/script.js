document.addEventListener('DOMContentLoaded', () => {
    // Dynamic greeting based on time
    const updateGreeting = () => {
        const hour = new Date().getHours();
        const greetingElement = document.getElementById('timeContext');

        if (hour >= 5 && hour < 12) greetingElement.textContent = 'Good morning,';
        else if (hour >= 12 && hour < 18) greetingElement.textContent = 'Good afternoon,';
        else greetingElement.textContent = 'Good evening,';
    };

    updateGreeting();

    // Subtle entrance animations for cards
    const cards = document.querySelectorAll('.clarity-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        setTimeout(() => {
            card.style.opacity = '1';
        }, 300 + (index * 150));
    });

    // Navigation interaction
    const navItems = document.querySelectorAll('.nav-item:not(#navAdd)');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Haptic feedack simulation
            item.style.transform = 'scale(0.95)';
            setTimeout(() => item.style.transform = '', 100);
        });
    });

    // Add button interaction
    const addBtn = document.querySelector('.add-button');
    addBtn.addEventListener('click', () => {
        // Future transaction entry flow
        console.log('Opening silent flow for awareness...');
    });
});
