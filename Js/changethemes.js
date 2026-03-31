const themeButtons = document.querySelectorAll('.change-themes div');
const changethemesbtn = document.querySelector('.change-themes-btn');
const themeDivs = document.querySelector('.change-themes');

// Apply saved theme on every page load
const savedTheme = localStorage.getItem('selectedTheme');
if (savedTheme) {
    document.body.className = '';
    document.body.classList.add(savedTheme);
}

themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        document.body.className = '';
        if (btn.id.includes('theme')) {
            const themeClass = btn.id.replace('theme', '-theme');
            document.body.classList.add(themeClass);
            // Save the selected theme to localStorage
            localStorage.setItem('selectedTheme', themeClass);
        }
    });
});

changethemesbtn.addEventListener('click', () => {
    themeDivs.classList.toggle('open');
});