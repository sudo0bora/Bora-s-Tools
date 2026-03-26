import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
  'https://rfmcpxzbrtjmzhhlaxom.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmbWNweHpicnRqbXpoaGxheG9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NTU4OTksImV4cCI6MjA5MDEzMTg5OX0.u4ECp9Jr-4jjFNGfMYKXTGMfO16lT0vRZpWX1n8V-yo'
)

const form = document.querySelector('form')
const downloadBox = document.querySelector('.download-box')
const btn = document.querySelector('.submituploadbtn')

downloadBox.style.display = 'none'

form.addEventListener('submit', async (e) => {
  e.preventDefault()

  const file = form.querySelector('input[type="file"]').files[0]
  if (!file) return

  btn.textContent = 'Uploading...'
  btn.disabled = true

  const fileName = `${Date.now()}_${file.name}`

  const { data, error } = await supabase.storage
    .from('files')
    .upload(fileName, file)

  if (error) {
    alert('Upload failed: ' + error.message)
    btn.innerHTML = 'Upload <i class="fa-solid fa-upload"></i>'
    btn.disabled = false
    return
  }

  const { data: urlData } = supabase.storage
    .from('files')
    .getPublicUrl(fileName)

  const publicUrl = urlData.publicUrl

  downloadBox.style.display = 'flex'

  // Remove any previous copy button
  const oldBtn = downloadBox.querySelector('.copy-btn')
  if (oldBtn) oldBtn.remove()

  const link = downloadBox.querySelector('a')
  link.textContent = file.name
  link.href = '#'
  link.onclick = async (e) => {
    e.preventDefault()
    const res = await fetch(publicUrl)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = file.name
    a.click()
    URL.revokeObjectURL(blobUrl)
  }

  // Add copy link button
  const copyBtn = document.createElement('button')
  copyBtn.textContent = '📋 Copy Link'
  copyBtn.className = 'submituploadbtn copy-btn'
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(publicUrl)
    copyBtn.textContent = '✅ Copied!'
    setTimeout(() => copyBtn.textContent = '📋 Copy Link', 2000)
  }
  downloadBox.appendChild(copyBtn)

  btn.innerHTML = 'Upload <i class="fa-solid fa-upload"></i>'
  btn.disabled = false

  // Countdown timer — delete file after 5 minutes
  const timerEl = document.createElement('p')
  timerEl.style.color = 'limegreen'
  timerEl.style.marginTop = '10px'
  timerEl.style.fontSize = '13px'
  downloadBox.appendChild(timerEl)

  let secondsLeft = 300
  const countdown = setInterval(async () => {
    secondsLeft--
    const mins = Math.floor(secondsLeft / 60)
    const secs = secondsLeft % 60
    timerEl.textContent = `⏳ Link expires in ${mins}:${secs.toString().padStart(2, '0')}`

    if (secondsLeft <= 0) {
      clearInterval(countdown)

      // Delete file from Supabase
      await supabase.storage.from('files').remove([fileName])

      // Reset UI
      downloadBox.style.display = 'none'
      link.href = '#'
      link.textContent = 'file_name.zip'
      copyBtn.remove()
      timerEl.remove()
      form.reset()
    }
  }, 1000)
})
