const THEME_MAP = {
    defaulttheme: "",
    whitetheme: "white-theme",
    purpletheme: "purple-theme",
    redtheme: "red-theme",
    bluetheme: "blue-theme",
    orangetheme: "orange-theme",
    pinktheme: "pink-theme",
    yellowtheme: "yellow-theme",
    blacktheme: "black-theme",
    cyantheme: "cyan-theme",
};
const THEME_STORAGE_KEY = "bt_selected_theme";

function applyTheme(themeClass) {
    // strip any existing theme class
    Object.values(THEME_MAP).forEach(cls => {
        if (cls) document.body.classList.remove(cls);
    });
    if (themeClass) document.body.classList.add(themeClass);
    localStorage.setItem(THEME_STORAGE_KEY, themeClass);
}

function initThemeSwatches() {
    Object.entries(THEME_MAP).forEach(([id, cls]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener("click", () => applyTheme(cls));
    });
}

function loadSavedTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) applyTheme(saved);
}

function initThemePanelToggle() {
    const themeBtn = document.querySelector(".change-themes-btn");
    const themesPanel = document.getElementById("themesPanel");
    if (!themeBtn || !themesPanel) return;

    themeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        themesPanel.classList.toggle("open");
    });

    document.addEventListener("click", (e) => {
        if (!themesPanel.contains(e.target) && !themeBtn.contains(e.target)) {
            themesPanel.classList.remove("open");
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    loadSavedTheme();
    initThemeSwatches();
    initThemePanelToggle();
});