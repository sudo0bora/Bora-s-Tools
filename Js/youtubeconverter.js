const PROXY = 'https://rfmcpxzbrtjmzhhlaxom.supabase.co/functions/v1/youtube-proxy'

const form         = document.getElementById('convertForm')
const urlInput     = document.getElementById('urlInput')
const convertBtn   = form.querySelector('button[type="submit"]')
const downloadBox  = document.getElementById('downloadBox')
const progressWrap = document.getElementById('progressWrap')
const progressBar  = document.getElementById('progressBar')
const progressText = document.getElementById('progressText')
const downloadLink = document.getElementById('downloadLink')
const mp3filename  = document.getElementById('mp3filename')
const copyBtn      = document.getElementById('copyBtn')
const downloadBtn  = document.getElementById('downloadBtn')
const resetBtn     = document.getElementById('resetBtn')
const copyWrap     = document.querySelector('.copy-download-link')
const downloadWrap = document.querySelector('.download-mp-btn')

let currentDownloadUrl = null
let currentFilename    = null


// ── Extract YouTube video ID ──────────────────────────────────────────────────
function extractVideoId(url) {
  const regex = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  const match = url.match(regex)
  return match ? match[1] : null
}


// ── Wait for file to be ready (poll until not 404) ────────────────────────────
async function waitForFile(fileUrl, onProgress) {
  const start   = Date.now()
  const timeout = 300000 // 5 min
  let   attempt = 0

  while (Date.now() - start < timeout) {
    try {
      // Ask your Supabase proxy to check the URL, bypassing CORS!
      const res = await fetch(PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', fileUrl })
      })
      
      const data = await res.json()
      if (data.ready) return true // File is ready!
      
    } catch (err) {
      console.error('Polling error:', err)
    }

    attempt++
    const pct = Math.min(30 + attempt * 3, 90)
    onProgress(pct)
    await new Promise(r => setTimeout(r, 4000))
  }

  throw new Error('File took too long to be ready. Try again.')
}


// ── Convert ───────────────────────────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault()

  const url     = urlInput.value.trim()
  const videoId = extractVideoId(url)

  if (!videoId) {
    alert('Invalid YouTube URL. Please paste a valid link.')
    return
  }

  resetUI()

  convertBtn.innerHTML = 'Converting… <i class="fa-solid fa-spinner fa-spin"></i>'
  convertBtn.disabled  = true

  downloadBox.style.display  = 'flex'
  progressWrap.style.display = 'block'
  setProgress(10)

  try {
    const res  = await fetch(PROXY, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ videoId })
    })
    const data = await res.json()
    console.log('API response:', data)

    const fileUrl = data.file || data.download_link || data.url

    if (!fileUrl) throw new Error(data.error || 'No download URL returned.')

    setProgress(20)

    // Poll until file is actually ready
    await waitForFile(fileUrl, setProgress)

    setProgress(100)

    currentDownloadUrl         = fileUrl
    currentFilename            = `youtube-${videoId}.mp3`
    mp3filename.textContent    = currentFilename
    progressWrap.style.display = 'none'
    downloadLink.style.display = 'inline'
    copyWrap.style.display     = 'block'
    downloadWrap.style.display = 'block'

  } catch (err) {
    alert('Conversion failed: ' + err.message)
    resetUI()
  }

  convertBtn.innerHTML = 'Convert <i class="fa-solid fa-music"></i>'
  convertBtn.disabled  = false
})


// ── Download directly ─────────────────────────────────────────────────────────
downloadBtn.addEventListener('click', () => {
  if (!currentDownloadUrl) return
  const a    = document.createElement('a')
  a.href     = currentDownloadUrl
  a.download = currentFilename
  a.target   = '_blank'
  a.click()
})


// ── Copy link ─────────────────────────────────────────────────────────────────
copyBtn.addEventListener('click', () => {
  if (!currentDownloadUrl) return
  navigator.clipboard.writeText(currentDownloadUrl)
  copyBtn.innerHTML = 'Link Copied <i class="fa-solid fa-check"></i>'
  setTimeout(() => {
    copyBtn.innerHTML = 'Copy Link <i class="fa-solid fa-copy"></i>'
  }, 2000)
})


// ── Reset ─────────────────────────────────────────────────────────────────────
resetBtn.addEventListener('click', () => {
  resetUI()
  urlInput.value = ''
})


// ── Helpers ───────────────────────────────────────────────────────────────────
function setProgress(pct) {
  progressBar.style.width  = `${pct}%`
  progressText.textContent = `${pct}%`
}

function resetUI() {
  currentDownloadUrl           = null
  currentFilename              = null
  downloadBox.style.display    = 'none'
  progressWrap.style.display   = 'none'
  downloadLink.style.display   = 'none'
  copyWrap.style.display       = 'none'
  downloadWrap.style.display   = 'none'
  downloadLink.href            = '#'
  copyBtn.innerHTML            = 'Copy Link <i class="fa-solid fa-copy"></i>'
  downloadBtn.innerHTML        = 'Download MP3 <i class="fa-solid fa-download"></i>'
  downloadBtn.disabled         = false
  convertBtn.innerHTML         = 'Convert <i class="fa-solid fa-music"></i>'
  convertBtn.disabled          = false
  setProgress(0)
}