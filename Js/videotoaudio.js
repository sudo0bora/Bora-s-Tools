const fileInput         = document.getElementById('fileInput');
const imageName         = document.getElementById('imagename');
const downloadAudioLink = document.getElementById('downloadAudioLink');
const downloadBtn       = document.getElementById('downloadconvertedaudiobtn');
const form              = document.querySelector('form');
const copyBtn           = document.querySelector('.copy-btn');
const downloadBox       = document.querySelector('.download-box');
const timer             = document.getElementById('timer');
const submitBtn         = form.querySelector('button[type="submit"]');
const chooseLabel       = form.querySelector('label[for="fileInput"]');

let audioObjectURL = null;
let countdown      = null;

// ── Timer ─────────────────────────────────────────────────────────────────────
function startTimer() {
    clearInterval(countdown);
    let seconds = 300;
    timer.textContent = '05:00';
    countdown = setInterval(() => {
        seconds--;
        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        timer.textContent = `${m}:${s}`;
        if (seconds <= 0) {
            clearInterval(countdown);
            if (audioObjectURL) { URL.revokeObjectURL(audioObjectURL); audioObjectURL = null; }
            downloadBox.style.display = 'none';
        }
    }, 1000);
}

// ── Filename display ──────────────────────────────────────────────────────────
fileInput.addEventListener('change', function () {
    if (this.files && this.files[0]) {
        imageName.textContent = this.files[0].name;
    }
});

// ── Worker code as a string (runs in Blob URL, no file needed) ────────────────
function makeWorkerBlob(lameJsText) {
    const code = `
        ${lameJsText}

        self.onmessage = function(e) {
            try {
                let { left, right, numChannels, sampleRate } = e.data;
                if (!right) right = left;

                const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, 128);
                const mp3Data    = [];
                const blockSize  = 1152;

                function floatToInt16(floatArr) {
                    const int16 = new Int16Array(floatArr.length);
                    for (let i = 0; i < floatArr.length; i++) {
                        const clamped = Math.max(-1, Math.min(1, floatArr[i]));
                        int16[i] = clamped < 0 ? clamped * 32768 : clamped * 32767;
                    }
                    return int16;
                }

                const leftInt16  = floatToInt16(left);
                const rightInt16 = floatToInt16(right);

                for (let i = 0; i < leftInt16.length; i += blockSize) {
                    const leftChunk  = leftInt16.subarray(i, i + blockSize);
                    const rightChunk = rightInt16.subarray(i, i + blockSize);

                    const encoded = numChannels === 2
                        ? mp3encoder.encodeBuffer(leftChunk, rightChunk)
                        : mp3encoder.encodeBuffer(leftChunk);

                    if (encoded.length > 0) mp3Data.push(new Uint8Array(encoded));

                    if ((i / blockSize) % 100 === 0) {
                        self.postMessage({ type: 'progress', value: i / leftInt16.length });
                    }
                }

                const flushed = mp3encoder.flush();
                if (flushed.length > 0) mp3Data.push(new Uint8Array(flushed));

                const totalLength = mp3Data.reduce((acc, c) => acc + c.length, 0);
                const merged      = new Uint8Array(totalLength);
                let offset = 0;
                for (const chunk of mp3Data) {
                    merged.set(chunk, offset);
                    offset += chunk.length;
                }

                self.postMessage({ type: 'done', buffer: merged.buffer }, [merged.buffer]);

            } catch(err) {
                self.postMessage({ type: 'error', message: err.message });
            }
        };
    `;
    return new Blob([code], { type: 'application/javascript' });
}

// ── Convert ───────────────────────────────────────────────────────────────────
form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const file = fileInput.files[0];
    if (!file) return;

    submitBtn.disabled = true;
    chooseLabel.style.pointerEvents = 'none';
    submitBtn.innerHTML = 'Loading… <i class="fa-solid fa-spinner fa-spin"></i>';

    try {
        // Fetch lamejs source text so we can inline it into the worker blob
        const lameResp = await fetch('https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js');
        if (!lameResp.ok) throw new Error('Failed to load lamejs');
        const lameText = await lameResp.text();

        submitBtn.innerHTML = 'Decoding… <i class="fa-solid fa-spinner fa-spin"></i>';

        const arrayBuffer = await file.arrayBuffer();
        const audioCtx    = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        if (audioCtx.state !== 'closed') await audioCtx.close();

        const numChannels = Math.min(audioBuffer.numberOfChannels, 2);
        const sampleRate  = audioBuffer.sampleRate;
        const left        = audioBuffer.getChannelData(0).slice();
        const right       = numChannels === 2 ? audioBuffer.getChannelData(1).slice() : null;

        submitBtn.innerHTML = 'Converting 0% <i class="fa-solid fa-spinner fa-spin"></i>';

        // Build worker from blob — no external file, no importScripts
        const workerBlob = makeWorkerBlob(lameText);
        const workerURL  = URL.createObjectURL(workerBlob);
        const worker     = new Worker(workerURL);
        URL.revokeObjectURL(workerURL);

        const transferList = [left.buffer];
        if (right) transferList.push(right.buffer);
        worker.postMessage({ left, right, numChannels, sampleRate }, transferList);

        worker.onmessage = function (ev) {
            if (ev.data.type === 'progress') {
                const pct = Math.round(ev.data.value * 100);
                submitBtn.innerHTML = `Converting ${pct}% <i class="fa-solid fa-spinner fa-spin"></i>`;
                return;
            }

            if (ev.data.type === 'error') {
                alert('Conversion failed: ' + ev.data.message);
                worker.terminate();
                submitBtn.disabled = false;
                chooseLabel.style.pointerEvents = '';
                submitBtn.innerHTML = 'Convert <i class="fa-solid fa-upload"></i>';
                return;
            }

            // type === 'done'
            worker.terminate();

            const blob = new Blob([ev.data.buffer], { type: 'audio/mpeg' });
            if (audioObjectURL) URL.revokeObjectURL(audioObjectURL);
            audioObjectURL = URL.createObjectURL(blob);

            const baseName    = file.name.replace(/\.[^.]+$/, '');
            const newFileName = `${baseName}_converted.mp3`;

            downloadAudioLink.href        = audioObjectURL;
            downloadAudioLink.download    = newFileName;
            downloadAudioLink.textContent = newFileName;

            downloadBox.style.display = 'flex';
            startTimer();

            submitBtn.disabled = false;
            chooseLabel.style.pointerEvents = '';
            submitBtn.innerHTML = 'Convert <i class="fa-solid fa-upload"></i>';
        };

        worker.onerror = function (err) {
            console.error('Worker crashed:', err);
            alert('Conversion failed: ' + (err.message || 'Unknown error'));
            worker.terminate();
            submitBtn.disabled = false;
            chooseLabel.style.pointerEvents = '';
            submitBtn.innerHTML = 'Convert <i class="fa-solid fa-upload"></i>';
        };

    } catch (err) {
        console.error('Failed:', err);
        alert('Failed: ' + err.message);
        submitBtn.disabled = false;
        chooseLabel.style.pointerEvents = '';
        submitBtn.innerHTML = 'Convert <i class="fa-solid fa-upload"></i>';
    }
});

// ── Download ──────────────────────────────────────────────────────────────────
downloadBtn.addEventListener('click', function () {
    if (!audioObjectURL) return;
    downloadAudioLink.click();
});

// ── Copy link ─────────────────────────────────────────────────────────────────
copyBtn.addEventListener('click', function () {
    if (!audioObjectURL) return;
    navigator.clipboard.writeText(audioObjectURL).then(() => {
        copyBtn.innerHTML = 'Copied! <i class="fa-solid fa-check"></i>';
        setTimeout(() => {
            copyBtn.innerHTML = 'Copy Link <i class="fa-solid fa-copy"></i>';
        }, 2000);
    });
});