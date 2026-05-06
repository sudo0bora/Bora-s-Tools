const PROXY = 'https://rfmcpxzbrtjmzhhlaxom.supabase.co/functions/v1/spotify-proxy'

// ── DOM refs ───────────────────────────────────────────────────────────────────
const form          = document.getElementById('convertForm')
const urlInput      = document.getElementById('urlInput')
const submitBtn     = form.querySelector('button[type="submit"]')
const playlistTitle = document.getElementById('playlistTitle')
const downloadBox   = document.getElementById('downloadBox')

const trackSection  = document.getElementById('trackDownloadSection')
const progressWrap  = document.getElementById('progressWrap')
const progressBar   = document.getElementById('progressBar')
const progressText  = document.getElementById('progressText')
const downloadLink  = document.getElementById('downloadLink')
const mp3filename   = document.getElementById('mp3filename')
const copyBtn       = document.getElementById('copyBtn')
const downloadBtn   = document.getElementById('downloadBtn')
const copyWrap      = document.querySelector('.copy-download-link')
const downloadWrap  = document.querySelector('.download-mp-btn')

const playlistSection = document.getElementById('playlistDownloadSection')
const zipProgressWrap = document.getElementById('zipProgressWrap')
const zipProgressBar  = document.getElementById('zipProgressBar')
const zipProgressText = document.getElementById('zipProgressText')
const trackStatus     = document.getElementById('trackStatus')
const zipDownloadWrap = document.getElementById('zipDownloadWrap')
const zipDownloadBtn  = document.getElementById('zipDownloadBtn')
const resetBtn        = document.getElementById('resetBtn')

let currentDownloadUrl = null
let currentFilename    = null
let currentZipBlob     = null


// ── Detect Spotify URL type ────────────────────────────────────────────────────
function detectType(url) {
  if (url.includes('/track/'))    return 'track'
  if (url.includes('/playlist/')) return 'playlist'
  if (url.includes('/album/'))    return 'album'
  return null
}

// ── Check if a URL is an actual audio file (not a Spotify page) ───────────────
function isAudioUrl(url) {
  if (!url || typeof url !== 'string') return false
  if (url.includes('open.spotify.com')) return false
  if (url.includes('spotify.com')) return false
  // Must look like a downloadable file or CDN audio link
  return url.startsWith('http')
}

// ── Recursively search an object for the first audio URL ─────────────────────
function findAudioUrl(obj, depth = 0) {
  if (depth > 4 || !obj || typeof obj !== 'object') return null

  // Fields most likely to hold the MP3 URL — checked in priority order
  const priorityKeys = [
    'download_url', 'downloadUrl', 'download', 'mp3', 'mp3_url',
    'audio', 'audio_url', 'stream', 'stream_url', 'media_url',
    'file', 'file_url', 'href', 'src'
  ]

  for (const key of priorityKeys) {
    if (obj[key] && isAudioUrl(obj[key])) return obj[key]
  }

  // Then check 'url' and 'link' — but only if they're not Spotify page URLs
  for (const key of ['url', 'link']) {
    if (obj[key] && isAudioUrl(obj[key])) return obj[key]
  }

  // Recurse into nested objects
  for (const key of Object.keys(obj)) {
    if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      const found = findAudioUrl(obj[key], depth + 1)
      if (found) return found
    }
  }

  return null
}

function extractDownloadUrl(data) {
  console.log('[extractDownloadUrl] full API data:', JSON.stringify(data, null, 2))

  // Check data.medias[] or data.data.medias[] — this API nests the real MP3 there
  const medias = data?.data?.medias || data?.medias || []
  for (const m of medias) {
    if (m?.url && isAudioUrl(m.url)) {
      console.log('[extractDownloadUrl] found in medias[]:', m.url)
      return m.url
    }
  }

  const found = findAudioUrl(data)
  console.log('[extractDownloadUrl] found audio URL:', found)
  return found
}

function extractTrackTitle(data) {
  return data?.data?.title || data?.data?.name ||
         data.title || data.name || data.track_name ||
         data?.metadata?.title || 'Unknown Track'
}

function extractArtist(data) {
  return data?.data?.author || data?.data?.artist ||
         data.artist || data.artist_name ||
         data?.artists?.[0]?.name || data?.metadata?.artist || ''
}

function extractPlaylistName(data) {
  return (data.name || data.title || data.playlist_name || data?.data?.name || 'spotify-playlist')
    .replace(/[/\\?%*:|"<>]/g, '-')
}

function extractTracklist(data) {
  let raw = []
  const container = data.tracks || data.items || data.songs ||
                    data?.data?.tracks || data?.data?.items
  if (Array.isArray(container)) {
    raw = container
  } else if (container && Array.isArray(container.items)) {
    raw = container.items
  }
  return raw
    .map(item => {
      const t = item?.track || item
      if (!t || !t.uri) return null
      return {
        spotifyUrl:  t.uri,
        downloadUrl: t.download_url || t.mp3_url || null,
        title:       t.name  || t.title || 'Track',
        artist:      t?.artists?.[0]?.name || t.artist || '',
      }
    })
    .filter(Boolean)
}

function safeFilename(str) {
  return str.replace(/[/\\?%*:|"<>]/g, '-').trim()
}

function setProgress(bar, text, pct) {
  bar.style.width  = `${pct}%`
  text.textContent = `${pct}%`
}


// ── Submit ─────────────────────────────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault()
  const url  = urlInput.value.trim()
  const type = detectType(url)
  if (!type) { alert('Invalid Spotify URL.\nPaste a track, playlist, or album link.'); return }

  resetUI()
  submitBtn.innerHTML = 'Processing… <i class="fa-solid fa-spinner fa-spin"></i>'
  submitBtn.disabled  = true
  downloadBox.style.display = 'flex'

  try {
    if (type === 'track') await handleTrack(url)
    else                  await handlePlaylistOrAlbum(url, type)
  } catch (err) {
    console.error('Download error:', err)
    alert('Download failed: ' + err.message)
    resetUI()
  }

  submitBtn.innerHTML = 'Download <i class="fa-solid fa-music"></i>'
  submitBtn.disabled  = false
})


// ── Single track ───────────────────────────────────────────────────────────────
async function handleTrack(url) {
  trackSection.style.display    = 'flex'
  playlistSection.style.display = 'none'
  progressWrap.style.display    = 'block'
  setProgress(progressBar, progressText, 20)

  const res  = await fetch(PROXY, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ action: 'download_track', url })
  })
  const data = await res.json()
  console.log('[Track] full API response:', data)

  if (data.error) throw new Error(data.error)

  const downloadUrl = extractDownloadUrl(data)
  if (!downloadUrl) {
    throw new Error(
      'No MP3 download URL found in API response.\n' +
      'Check the console for "[extractDownloadUrl] full API data:" to see all available fields.'
    )
  }

  setProgress(progressBar, progressText, 50)
  await waitForFile(downloadUrl, (pct) => setProgress(progressBar, progressText, pct))
  setProgress(progressBar, progressText, 100)

  const title  = extractTrackTitle(data)
  const artist = extractArtist(data)
  const label  = safeFilename(artist ? `${artist} - ${title}` : title)

  currentDownloadUrl         = downloadUrl
  currentFilename            = `${label}.mp3`
  mp3filename.textContent    = currentFilename
  progressWrap.style.display = 'none'
  downloadLink.href          = downloadUrl
  downloadLink.style.display = 'inline'
  copyWrap.style.display     = 'block'
  downloadWrap.style.display = 'block'
  playlistTitle.textContent  = `🎵 ${artist ? artist + ' — ' : ''}${title}`
}


// ── Playlist / album ───────────────────────────────────────────────────────────
async function handlePlaylistOrAlbum(url, type) {
  trackSection.style.display    = 'none'
  playlistSection.style.display = 'flex'
  zipProgressWrap.style.display = 'block'
  zipDownloadWrap.style.display = 'none'
  trackStatus.textContent       = 'Fetching track list…'
  setProgress(zipProgressBar, zipProgressText, 5)

  const infoRes = await fetch(PROXY, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ action: 'get_info', url })
  })
  const info = await infoRes.json()
  console.log('[get_info] Top-level keys:', Object.keys(info))
  console.log('[get_info] Full response:', info)

  if (info.error) throw new Error(info.error)
  if (info.message?.includes('quota')) {
    throw new Error('Monthly API quota exhausted. Try again next month or upgrade your RapidAPI plan.')
  }

  const playlistName = extractPlaylistName(info)
  const tracks       = extractTracklist(info)

  if (!tracks.length) {
    console.error('[get_info] Full JSON:', JSON.stringify(info, null, 2))
    throw new Error('No tracks found in response. Check console for full API response.')
  }

  playlistTitle.textContent = `📀 ${playlistName} — ${tracks.length} track${tracks.length !== 1 ? 's' : ''}`
  setProgress(zipProgressBar, zipProgressText, 10)

  const zip    = new JSZip()
  const folder = zip.folder(playlistName)
  let   done   = 0
  let   failed = 0

  for (const track of tracks) {
    const label = safeFilename(track.artist ? `${track.artist} - ${track.title}` : track.title)
    trackStatus.textContent = `Downloading (${done + 1}/${tracks.length}): ${label}`

    try {
      let mp3Url = track.downloadUrl
      if (!mp3Url && track.spotifyUrl) {
        const dlRes  = await fetch(PROXY, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ action: 'download_track', url: track.spotifyUrl })
        })
        const dlData = await dlRes.json()
        mp3Url = extractDownloadUrl(dlData)
      }
      if (!mp3Url) throw new Error('No download URL')

      const audioRes = await fetch(mp3Url)
      if (!audioRes.ok) throw new Error(`Audio fetch failed: ${audioRes.status}`)
      folder.file(`${label}.mp3`, await audioRes.blob())
    } catch (err) {
      console.warn(`Skipped "${label}":`, err.message)
      failed++
    }

    done++
    setProgress(zipProgressBar, zipProgressText, Math.round(10 + (done / tracks.length) * 85))
    if (done < tracks.length) await new Promise(r => setTimeout(r, 800))
  }

  const successCount = done - failed
  trackStatus.textContent = `Creating ZIP (${successCount} tracks)…`
  setProgress(zipProgressBar, zipProgressText, 97)

  currentZipBlob  = await zip.generateAsync({ type: 'blob' })
  currentFilename = `${playlistName}.zip`

  setProgress(zipProgressBar, zipProgressText, 100)
  trackStatus.textContent = `✅ ${successCount} track${successCount !== 1 ? 's' : ''} ready!${failed ? ` (${failed} skipped)` : ''}`
  zipDownloadWrap.style.display = 'block'
}


// ── Poll until CDN file is ready ───────────────────────────────────────────────
async function waitForFile(fileUrl, onProgress) {
  const start = Date.now()
  let attempt = 0
  while (Date.now() - start < 300_000) {
    try {
      const res  = await fetch(PROXY, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'check', fileUrl })
      })
      if ((await res.json()).ready) return true
    } catch {}
    attempt++
    onProgress(Math.min(50 + attempt * 5, 90))
    await new Promise(r => setTimeout(r, 4000))
  }
  throw new Error('File took too long to be ready. Try again.')
}


// ── Event listeners ────────────────────────────────────────────────────────────
zipDownloadBtn.addEventListener('click', () => {
  if (!currentZipBlob) return
  const a = document.createElement('a')
  a.href  = URL.createObjectURL(currentZipBlob)
  a.download = currentFilename
  a.click()
  URL.revokeObjectURL(a.href)
})

downloadBtn.addEventListener('click', () => {
  if (!currentDownloadUrl) return
  const a = document.createElement('a')
  a.href  = currentDownloadUrl
  a.download = currentFilename
  a.target = '_blank'
  a.click()
})

copyBtn.addEventListener('click', () => {
  if (!currentDownloadUrl) return
  navigator.clipboard.writeText(currentDownloadUrl)
  copyBtn.innerHTML = 'Copied! <i class="fa-solid fa-check"></i>'
  setTimeout(() => { copyBtn.innerHTML = 'Copy Link <i class="fa-solid fa-copy"></i>' }, 2000)
})

resetBtn.addEventListener('click', () => { resetUI(); urlInput.value = '' })

function resetUI() {
  currentDownloadUrl = null
  currentFilename    = null
  currentZipBlob     = null
  downloadBox.style.display     = 'none'
  trackSection.style.display    = 'none'
  playlistSection.style.display = 'none'
  progressWrap.style.display    = 'none'
  zipProgressWrap.style.display = 'none'
  downloadLink.style.display    = 'none'
  copyWrap.style.display        = 'none'
  downloadWrap.style.display    = 'none'
  zipDownloadWrap.style.display = 'none'
  downloadLink.href         = '#'
  playlistTitle.textContent = ''
  trackStatus.textContent   = ''
  copyBtn.innerHTML     = 'Copy Link <i class="fa-solid fa-copy"></i>'
  downloadBtn.innerHTML = 'Download MP3 <i class="fa-solid fa-download"></i>'
  submitBtn.innerHTML   = 'Download <i class="fa-solid fa-music"></i>'
  submitBtn.disabled    = false
  setProgress(progressBar,    progressText,    0)
  setProgress(zipProgressBar, zipProgressText, 0)
}