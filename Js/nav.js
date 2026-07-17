const TOOLS = [
    { id: "filesharing",            name: "File Sharing",       href: "filesharing.html",           icon: "fa-file" },
    { id: "foldersharing",          name: "Folder Sharing",     href: "foldersharing.html",          icon: "fa-folder" },
    { id: "qrcodegenerator",        name: "QR Code Generator",  href: "qrcodegenerator.html",        icon: "fa-qrcode" },
    { id: "youtubeconverter",       name: "YouTube Converter",  href: "youtubeconverter.html",       icon: "fa-music" },
    { id: "imageconverter",         name: "Image Converter",    href: "imageconverter.html",         icon: "fa-image" },
    { id: "videotoaudio",           name: "Video To Audio",     href: "videotoaudio.html",           icon: "fa-film" },
    { id: "spotifymusicdownloader", name: "Spotify Downloader", href: "spotifymusicdownloader.html", icon: "fa-music" },
    { id: "urlshortener",           name: "Url Shortener",      href: "urlshortener.html",           icon: "fa-link" },
    { id: "imagecompressor",        name: "Image Compressor",   href: "imagecompressor.html",        icon: "fa-image" },
    { id: "videocompressor",        name: "Video Compressor",   href: "videocompressor.html",        icon: "fa-film" },
];

// Shown until the user has built up real history
const DEFAULT_RECENT = [
    "filesharing",
    "foldersharing",
    "youtubeconverter",
    "imageconverter",
    "videotoaudio",
    "spotifymusicdownloader",
];

const RECENT_KEY = "bt_recent_tools";
const MAX_RECENT = 5;

function getStoredRecent() {
    try {
        return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
    } catch (e) {
        return [];
    }
}

//Track current page as recently used
function trackCurrentTool() {
    const currentId = document.body.dataset.tool;
    if (!currentId || currentId === "home") return;

    let recent = getStoredRecent();
    recent = recent.filter(id => id !== currentId);
    recent.unshift(currentId);
    recent = recent.slice(0, MAX_RECENT);

    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
}

// Render recent tools next to Home
function renderRecentTools() {
    const nav = document.getElementById("mainNav");
    if (!nav) return;

    let recent = getStoredRecent();

    // pad with defaults (skipping dupes) until we hit MAX_RECENT,
    // so the header never looks empty on a fresh browser
    if (recent.length < MAX_RECENT) {
        for (const id of DEFAULT_RECENT) {
            if (recent.length >= MAX_RECENT) break;
            if (!recent.includes(id)) recent.push(id);
        }
    }

    nav.querySelectorAll(".navlink.recent").forEach(el => el.remove());

    recent.slice(0, MAX_RECENT).forEach(id => {
        const tool = TOOLS.find(t => t.id === id);
        if (!tool) return;
        const a = document.createElement("a");
        a.href = tool.href;
        a.className = "navlink recent";
        a.textContent = tool.name;
        nav.appendChild(a);
    });
}

// All Tools dropdown
function renderToolsDropdown() {
    const menu = document.getElementById("toolsMenu");
    if (!menu) return;
    menu.innerHTML = "";
    TOOLS.forEach(tool => {
        const a = document.createElement("a");
        a.href = tool.href;
        a.innerHTML = `<i class="fa-solid ${tool.icon}"></i>${tool.name}`;
        menu.appendChild(a);
    });
}

//Dropdown toggle behavior
function initDropdownToggle() {
    const toolsBtn = document.getElementById("toolsBtn");
    const toolsMenu = document.getElementById("toolsMenu");
    if (!toolsBtn || !toolsMenu) return;

    toolsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toolsMenu.classList.toggle("open");
        toolsBtn.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
        if (!toolsMenu.contains(e.target) && !toolsBtn.contains(e.target)) {
            toolsMenu.classList.remove("open");
            toolsBtn.classList.remove("active");
        }
    });
}

// Set the single active nav link based on current page
function setActiveNavLink() {
    const currentTool = document.body.dataset.tool || "home";

    document.querySelectorAll(".navlink").forEach(link => {
        link.classList.remove("active");
    });

    if (currentTool === "home") {
        const homeLink = document.querySelector('[data-tool-link="home"]');
        if (homeLink) homeLink.classList.add("active");
        return;
    }

    const tool = TOOLS.find(t => t.id === currentTool);
    if (!tool) return;

    // match any nav link (recent row or elsewhere) pointing to this page
    document.querySelectorAll(".navlink").forEach(link => {
        if (link.getAttribute("href") === tool.href) {
            link.classList.add("active");
        }
    });
}
document.addEventListener("DOMContentLoaded", () => {
    trackCurrentTool();
    renderRecentTools();
    renderToolsDropdown();
    initDropdownToggle();
    setActiveNavLink();
});