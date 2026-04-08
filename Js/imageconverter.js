const imageInput = document.getElementById('imageInput');
const imageFormats = document.getElementById('imageFormats');
const imageName = document.getElementById('imagename');
const downloadImageLink = document.getElementById('downloadImageLink');
const downloadBtn = document.getElementById('downloadconvertedimagebtn');
const form = document.querySelector('form');
const copyBtn = document.querySelector('.copy-btn');
const downloadBox = document.querySelector('.download-box');
const timer = document.getElementById('timer');

let convertedDataURL = null;
let countdown = null;

function startTimer() {
    // Clear any existing timer if user converts again
    clearInterval(countdown);

    let seconds = 300; // 5 minutes

    timer.textContent = '05:00';

    countdown = setInterval(() => {
        seconds--;

        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        timer.textContent = `${m}:${s}`;

        if (seconds <= 0) {
            clearInterval(countdown);
            downloadBox.remove();
            convertedDataURL = null;
        }
    }, 1000);
}

imageInput.addEventListener('change', function () {
    if (this.files && this.files[0]) {
        imageName.textContent = this.files[0].name;
    }
});

form.addEventListener('submit', function (e) {
    e.preventDefault();

    const file = imageInput.files[0];
    if (!file) return;

    const format = imageFormats.value;
    const reader = new FileReader();

    reader.onload = function (event) {
        const img = new Image();

        img.onload = function () {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');

            if (format === 'jpg') {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            ctx.drawImage(img, 0, 0);

            const mimeMap = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
            const mime = mimeMap[format];

            convertedDataURL = canvas.toDataURL(mime, 0.95);

            const originalName = file.name.replace(/\.[^.]+$/, '');
            const newFileName = `${originalName}_converted.${format}`;

            downloadImageLink.href = convertedDataURL;
            downloadImageLink.download = newFileName;
            downloadImageLink.textContent = newFileName;

            downloadBox.style.display = 'flex';
            startTimer();
        };

        img.src = event.target.result;
    };

    reader.readAsDataURL(file);
});

downloadBtn.addEventListener('click', function () {
    if (!convertedDataURL) return;
    downloadImageLink.click();
});

copyBtn.addEventListener('click', function () {
    if (!convertedDataURL) return;
    navigator.clipboard.writeText(convertedDataURL).then(() => {
        copyBtn.innerHTML = 'Copied! <i class="fa-solid fa-check"></i>';
        setTimeout(() => {
            copyBtn.innerHTML = 'Copy Link <i class="fa-solid fa-copy"></i>';
        }, 2000);
    });
});