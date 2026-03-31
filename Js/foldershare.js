import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import JSZip from 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm'

const supabase = createClient(
  'https://rfmcpxzbrtjmzhhlaxom.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmbWNweHpicnRqbXpoaGxheG9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NTU4OTksImV4cCI6MjA5MDEzMTg5OX0.u4ECp9Jr-4jjFNGfMYKXTGMfO16lT0vRZpWX1n8V-yo'
)

const SESSION_KEY = 'folderSession'

const form         = document.querySelector('form')
const uploadBtn    = document.querySelector('button.submituploadbtn')
const downloadBox  = document.querySelector('.download-box')
const fileLink     = downloadBox.querySelector('a')
const copyBtn      = document.getElementById('copyBtn')
const timerEl      = document.getElementById('timer')
const deleteBtn    = downloadBox.querySelector('.delete-btn')
const folderNameEl = document.getElementById('imagename')

downloadBox.style.display = 'none'

let currentFileName   = null
let countdownInterval = null
let currentPublicUrl  = null


// ── Folder Name Display ───────────────────────────────────────────────────────
document.getElementById('folderInput').addEventListener('change', (e) => {
  const files = e.target.files
  if (!files.length) { folderNameEl.textContent = ''; return }
  const folderName = files[0].webkitRelativePath.split('/')[0]
  folderNameEl.textContent = `📁 ${folderName} (${files.length} file${files.length > 1 ? 's' : ''})`
})


// ── Upload ────────────────────────────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault()

  const files = Array.from(document.getElementById('folderInput').files)
  if (!files.length) return

  clearSession()

  uploadBtn.innerHTML = 'Zipping… <i class="fa-solid fa-spinner fa-spin"></i>'
  uploadBtn.disabled  = true

  const zip        = new JSZip()
  const folderName = files[0].webkitRelativePath.split('/')[0]

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer()
    zip.file(file.webkitRelativePath, arrayBuffer)
  }

  let zipBlob
  try {
    zipBlob = await zip.generateAsync({ type: 'blob' })
  } catch (err) {
    alert('Zipping failed: ' + err.message)
    resetUploadBtn()
    return
  }

  uploadBtn.innerHTML = 'Uploading… <i class="fa-solid fa-spinner fa-spin"></i>'

  currentFileName = `${Date.now()}_${folderName}.zip`

  const { error } = await supabase.storage
    .from('files')
    .upload(currentFileName, zipBlob, { contentType: 'application/zip' })

  if (error) {
    alert('Upload failed: ' + error.message)
    resetUploadBtn()
    return
  }

  const { data: urlData } = supabase.storage
    .from('files')
    .getPublicUrl(currentFileName)

  currentPublicUrl = urlData.publicUrl

  fileLink.textContent = `${folderName}.zip`
  fileLink.href        = '#'
  fileLink.onclick     = handleDownload

  downloadBox.style.display = 'flex'
  resetUploadBtn()
  startCountdown(300)
})


// ── Download via blob ─────────────────────────────────────────────────────────
async function handleDownload(e) {
  e.preventDefault()
  if (!currentPublicUrl) return

  const res     = await fetch(currentPublicUrl)
  const blob    = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a       = document.createElement('a')
  a.href        = blobUrl
  a.download    = fileLink.textContent
  a.click()
  URL.revokeObjectURL(blobUrl)
}


// ── Copy Link ─────────────────────────────────────────────────────────────────
copyBtn.addEventListener('click', () => {
  if (!currentPublicUrl) return
  navigator.clipboard.writeText(currentPublicUrl)
  copyBtn.innerHTML = 'Link Copied <i class="fa-solid fa-check"></i>'
  setTimeout(() => {
    copyBtn.innerHTML = 'Copy Link <i class="fa-solid fa-copy"></i>'
  }, 2000)
})


// ── Delete Share ──────────────────────────────────────────────────────────────
deleteBtn.addEventListener('click', async () => {
  if (!currentFileName) return
  await supabase.storage.from('files').remove([currentFileName])
  clearSession()
})


// ── Countdown ─────────────────────────────────────────────────────────────────
function startCountdown(seconds) {
  const expiryTime = Date.now() + seconds * 1000
  persistSession(expiryTime)
  updateTimerDisplay(seconds)

  countdownInterval = setInterval(async () => {
    const secondsLeft = Math.floor((expiryTime - Date.now()) / 1000)
    updateTimerDisplay(secondsLeft)

    if (secondsLeft <= 0) {
      clearInterval(countdownInterval)
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


// ── sessionStorage ────────────────────────────────────────────────────────────
function persistSession(expiryTime) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    currentFileName,
    currentPublicUrl,
    folderName: fileLink.textContent,
    expiryTime
  }))
}

function clearSession() {
  clearInterval(countdownInterval)
  countdownInterval = null
  currentFileName   = null
  currentPublicUrl  = null

  sessionStorage.removeItem(SESSION_KEY)    

  downloadBox.style.display = 'none'
  fileLink.href             = '#'
  fileLink.textContent      = 'folder_name.zip'
  fileLink.onclick          = null
  timerEl.textContent       = '00:00'
  copyBtn.innerHTML         = 'Copy Link <i class="fa-solid fa-copy"></i>'
  folderNameEl.textContent  = ''
  form.reset()
}

function resetUploadBtn() {
  uploadBtn.innerHTML = 'Upload <i class="fa-solid fa-upload"></i>'
  uploadBtn.disabled  = false
}