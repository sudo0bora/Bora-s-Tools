import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
  'https://rfmcpxzbrtjmzhhlaxom.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmbWNweHpicnRqbXpoaGxheG9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NTU4OTksImV4cCI6MjA5MDEzMTg5OX0.u4ECp9Jr-4jjFNGfMYKXTGMfO16lT0vRZpWX1n8V-yo'
)

const form          = document.querySelector('form')
const uploadBtn = document.querySelector('button.submituploadbtn')
const downloadBox   = document.querySelector('.download-box')
const fileLink      = downloadBox.querySelector('a')
const copyBtn       = document.getElementById('copyBtn')
const timerEl       = document.getElementById('timer')
const deleteBtn     = downloadBox.querySelector('.delete-btn')
const imageNameEl = document.getElementById('imagename')

downloadBox.style.display = 'none'

let currentFileName = null
let countdownInterval = null
let currentPublicUrl = null


//── Image Name ─────────────────────────────────────────────────────────────────
document.getElementById('fileInput').addEventListener('change', (e) => {
  const file = e.target.files[0]
  imageNameEl.textContent = file ? file.name : 'image.jpg'
})



// ── Upload ────────────────────────────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault()

  const file = document.getElementById('fileInput').files[0]
  if (!file) return

  // Clear any previous session
  clearSession()

  uploadBtn.innerHTML = 'Uploading… <i class="fa-solid fa-spinner fa-spin"></i>'
  uploadBtn.disabled = true

  currentFileName = `${Date.now()}_${file.name}`

  const { error } = await supabase.storage
    .from('files')
    .upload(currentFileName, file)

  if (error) {
    alert('Upload failed: ' + error.message)
    resetUploadBtn()
    return
  }

  const { data: urlData } = supabase.storage
    .from('files')
    .getPublicUrl(currentFileName)

  currentPublicUrl = urlData.publicUrl

  // Update link
  fileLink.textContent = file.name
  fileLink.href = '#'
  fileLink.onclick = handleDownload

  downloadBox.style.display = 'flex'
  resetUploadBtn()
  startCountdown()
})

// ── Download via blob (forces save dialog) ───────────────────────────────────
async function handleDownload(e) {
  e.preventDefault()
  if (!currentPublicUrl) return
  const res  = await fetch(currentPublicUrl)
  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = fileLink.textContent
  a.click()
  URL.revokeObjectURL(blobUrl)
}

// ── Copy link ─────────────────────────────────────────────────────────────────
copyBtn.addEventListener('click', () => {
  if (!currentPublicUrl) return
  navigator.clipboard.writeText(currentPublicUrl)
  copyBtn.innerHTML = 'Link Copied <i class="fa-solid fa-check"></i>'
  setTimeout(() => {
    copyBtn.innerHTML = 'Copy Link <i class="fa-solid fa-copy"></i>'
  }, 2000)
})

// ── Delete share ──────────────────────────────────────────────────────────────
deleteBtn.addEventListener('click', async () => {
  if (!currentFileName) return
  await supabase.storage.from('files').remove([currentFileName])
  clearSession()
})

// ── Countdown (5 min) ────────────────────────────────────────────────────────
function startCountdown() {
  let secondsLeft = 300
  updateTimerDisplay(secondsLeft)

  countdownInterval = setInterval(async () => {
    secondsLeft--
    updateTimerDisplay(secondsLeft)

    if (secondsLeft <= 0) {
      await supabase.storage.from('files').remove([currentFileName])
      clearSession()
    }
  }, 1000)
}

function updateTimerDisplay(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  timerEl.textContent = `${m}:${s}`
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function clearSession() {
  clearInterval(countdownInterval)
  countdownInterval  = null
  currentFileName    = null
  currentPublicUrl   = null

  downloadBox.style.display = 'none'
  fileLink.href        = '#'
  fileLink.textContent = 'file_name.zip'
  fileLink.onclick     = null
  timerEl.textContent  = '00:00'
  copyBtn.innerHTML    = 'Copy Link <i class="fa-solid fa-copy"></i>'
  form.reset()
}

function resetUploadBtn() {
  uploadBtn.innerHTML = 'Upload <i class="fa-solid fa-upload"></i>'
  uploadBtn.disabled  = false
}
