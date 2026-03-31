import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
  'https://rfmcpxzbrtjmzhhlaxom.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmbWNweHpicnRqbXpoaGxheG9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NTU4OTksImV4cCI6MjA5MDEzMTg5OX0.u4ECp9Jr-4jjFNGfMYKXTGMfO16lT0vRZpWX1n8V-yo'
)

const SESSION_KEY = 'qrSession'

document.addEventListener('DOMContentLoaded', () => {

  const fileInput         = document.getElementById('fileInput')
  const fileForm          = document.getElementById('fileForm')
  const imageName         = document.getElementById('imagename')
  const qrCodeContainer   = document.getElementById('qrCodeContainer')
  const downloadQrBtn     = document.getElementById('downloadqrbtn')
  const generatedQr       = document.querySelector('.generated-qr')
  const deleteFileBtn     = generatedQr.querySelector('.delete-btn')

  const urlInput          = document.getElementById('urlInput')
  const urlForm           = document.getElementById('urlForm')
  const linkQrContainer   = document.getElementById('LinkqrCodeContainer')
  const downloadQrLinkBtn = document.getElementById('downloadqrlinkbtn')
  const linkGeneratedQr   = document.querySelector('.link-generated-qr')
  const deleteUrlBtn      = linkGeneratedQr.querySelector('.delete-btn')

  const generateFileBtn   = fileForm.querySelector("button[type='submit']")

  let currentFileName = null

  generatedQr.style.display     = 'none'
  linkGeneratedQr.style.display = 'none'


  // ── Helper: generate QR ──────────────────────────────────────────────────
  function generateQR(container, text) {
    container.innerHTML = ''
    return new QRCode(container, {
      text,
      width:        256,
      height:       256,
      colorDark:    '#000000',
      colorLight:   '#ffffff',
      correctLevel: QRCode.CorrectLevel.H,
    })
  }


  // ── Helper: download QR ──────────────────────────────────────────────────
  function downloadQR(container, filename) {
    const canvas = container.querySelector('canvas')
    const img    = container.querySelector('img')
    const link   = document.createElement('a')
    link.download = filename + '.png'
    link.href     = canvas ? canvas.toDataURL('image/png') : img.src
    link.click()
  }


  // ── File name display ────────────────────────────────────────────────────
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0]
    imageName.textContent = file ? 'Selected: ' + file.name : ''
  })


  // ── File form ────────────────────────────────────────────────────────────
  fileForm.addEventListener('submit', async (e) => {
    e.preventDefault()

    const file = fileInput.files[0]
    if (!file) { alert('Please select a file first.'); return }

    generateFileBtn.innerHTML = 'Generating... <i class="fa-solid fa-spinner fa-spin"></i>'
    generateFileBtn.disabled  = true

    if (currentFileName) {
      await supabase.storage.from('files').remove([currentFileName])
    }

    currentFileName = `${Date.now()}_${file.name}`

    const { error } = await supabase.storage
      .from('files')
      .upload(currentFileName, file)

    if (error) {
      alert('Upload failed: ' + error.message)
      generateFileBtn.innerHTML = 'Generate QR Code <i class="fa-solid fa-qrcode"></i>'
      generateFileBtn.disabled  = false
      return
    }

    const { data: urlData } = supabase.storage
      .from('files')
      .getPublicUrl(currentFileName)

    const publicUrl = urlData.publicUrl

    generateQR(qrCodeContainer, publicUrl)

    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      qrType: 'file',
      currentFileName,
      publicUrl
    }))

    generatedQr.style.display     = 'flex'
    linkGeneratedQr.style.display = 'none'
    generatedQr.scrollIntoView({ behavior: 'smooth' })

    generateFileBtn.innerHTML = 'Generate QR Code <i class="fa-solid fa-qrcode"></i>'
    generateFileBtn.disabled  = false
  })


  // ── URL form ─────────────────────────────────────────────────────────────
  urlForm.addEventListener('submit', (e) => {
    e.preventDefault()

    const url = urlInput.value.trim()
    if (!url) { alert('Please enter a URL.'); return }

    const fullUrl = url.startsWith('http://') || url.startsWith('https://')
      ? url
      : 'https://' + url

    generateQR(linkQrContainer, fullUrl)

    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      qrType:   'url',
      urlValue: fullUrl
    }))

    linkGeneratedQr.style.display = 'flex'
    generatedQr.style.display     = 'none'
    linkGeneratedQr.scrollIntoView({ behavior: 'smooth' })
  })


  // ── Download QR buttons ──────────────────────────────────────────────────
  downloadQrBtn.addEventListener('click', () => {
    const file = fileInput.files[0]
    const name = file ? file.name.replace(/\.[^/.]+$/, '') : 'qrcode'
    downloadQR(qrCodeContainer, name + '-qr')
  })

  downloadQrLinkBtn.addEventListener('click', () => {
    const name = urlInput.value.trim().replace(/[^a-z0-9]/gi, '-').slice(0, 30) || 'link'
    downloadQR(linkQrContainer, name + '-qr')
  })


  // ── Delete buttons ───────────────────────────────────────────────────────
  deleteFileBtn.addEventListener('click', async () => {
    if (currentFileName) {
      await supabase.storage.from('files').remove([currentFileName])
      currentFileName = null
    }
    sessionStorage.removeItem(SESSION_KEY)
    qrCodeContainer.innerHTML = ''
    fileForm.reset()
    imageName.textContent     = ''
    generatedQr.style.display = 'none'
  })

  deleteUrlBtn.addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_KEY)
    linkQrContainer.innerHTML     = ''
    urlForm.reset()
    linkGeneratedQr.style.display = 'none'
  })

})