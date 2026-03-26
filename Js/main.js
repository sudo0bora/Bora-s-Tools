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

  btn.innerHTML = 'Upload <i class="fa-solid fa-upload"></i>'
  btn.disabled = false
})