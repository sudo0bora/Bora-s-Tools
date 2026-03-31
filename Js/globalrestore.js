document.addEventListener('DOMContentLoaded', () => {
  function updateTimerDisplay(el, seconds) {
    const safeSeconds = Math.max(0, seconds)
    const m = Math.floor(safeSeconds / 60).toString().padStart(2, '0')
    const s = (safeSeconds % 60).toString().padStart(2, '0')
    el.textContent = `${m}:${s}`
  }

  function startRestoredCountdown(timerEl, expiryTime, sessionKey, onExpire) {
    const tick = () => {
      const secondsLeft = Math.floor((expiryTime - Date.now()) / 1000)

      if (secondsLeft <= 0) {
        clearInterval(interval)
        sessionStorage.removeItem(sessionKey)
        updateTimerDisplay(timerEl, 0)
        onExpire()
        return
      }

      updateTimerDisplay(timerEl, secondsLeft)
    }

    tick()
    const interval = setInterval(tick, 1000)
  }

  function restoreClipboardButton(copyBtn, publicUrl) {
    if (!copyBtn || !publicUrl) return

    copyBtn.onclick = async (e) => {
      e.preventDefault()

      try {
        await navigator.clipboard.writeText(publicUrl)
        copyBtn.innerHTML = 'Link Copied <i class="fa-solid fa-check"></i>'
        setTimeout(() => {
          copyBtn.innerHTML = 'Copy Link <i class="fa-solid fa-copy"></i>'
        }, 2000)
      } catch (err) {
        alert('Copy failed: ' + err.message)
      }
    }
  }

  function restoreDeleteButton(deleteBtn, publicUrl, fileName, sessionKey, boxEl, timerEl, copyBtn) {
    if (!deleteBtn) return

    deleteBtn.onclick = async (e) => {
      e.preventDefault()

      if (publicUrl && fileName && typeof supabase !== 'undefined') {
        try {
          const { error } = await supabase.storage.from('files').remove([fileName])
          if (error) {
            alert('Delete failed: ' + error.message)
            return
          }
        } catch (err) {
          alert('Delete failed: ' + err.message)
          return
        }
      }

      sessionStorage.removeItem(sessionKey)

      if (boxEl) boxEl.style.display = 'none'
      if (timerEl) timerEl.textContent = '00:00'
      if (copyBtn) {
        copyBtn.innerHTML = 'Copy Link <i class="fa-solid fa-copy"></i>'
      }
    }
  }

  const downloadBox = document.querySelector('.download-box')
  const timerEl = document.getElementById('timer')
  const copyBtn = document.getElementById('copyBtn')

  // ── filesharing.html ────────────────────────────────────────────────────────
  if (downloadBox && document.getElementById('fileInput') && !document.getElementById('folderInput')) {
    const saved = sessionStorage.getItem('fileSession')

    if (saved) {
      const session = JSON.parse(saved)
      const fileLink = downloadBox.querySelector('a')
      const deleteBtn = downloadBox.querySelector('.delete-btn')
      const publicUrl = session.currentPublicUrl
      const fileName = session.currentFileName

      if (fileLink) {
        fileLink.textContent = session.fileName || 'file_name'
        fileLink.href = '#'
        fileLink.onclick = async (e) => {
          e.preventDefault()
          if (!publicUrl) return

          const res = await fetch(publicUrl)
          const blob = await res.blob()
          const blobUrl = URL.createObjectURL(blob)

          const a = document.createElement('a')
          a.href = blobUrl
          a.download = session.fileName || 'file_name'
          a.click()

          URL.revokeObjectURL(blobUrl)
        }
      }

      restoreClipboardButton(copyBtn, publicUrl)
      restoreDeleteButton(deleteBtn, publicUrl, fileName, 'fileSession', downloadBox, timerEl, copyBtn)

      downloadBox.style.display = 'flex'

      if (session.expiryTime) {
        startRestoredCountdown(timerEl, session.expiryTime, 'fileSession', () => {
          downloadBox.style.display = 'none'
          if (timerEl) timerEl.textContent = '00:00'
          if (copyBtn) {
            copyBtn.innerHTML = 'Copy Link <i class="fa-solid fa-copy"></i>'
          }
        })
      }
    }
  }

  // ── foldersharing.html ──────────────────────────────────────────────────────
  if (downloadBox && document.getElementById('folderInput')) {
    const saved = sessionStorage.getItem('folderSession')

    if (saved) {
      const session = JSON.parse(saved)
      const fileLink = downloadBox.querySelector('a')
      const deleteBtn = downloadBox.querySelector('.delete-btn')
      const publicUrl = session.currentPublicUrl
      const fileName = session.currentFileName

      if (fileLink) {
        fileLink.textContent = session.folderName || 'folder_name.zip'
        fileLink.href = '#'
        fileLink.onclick = async (e) => {
          e.preventDefault()
          if (!publicUrl) return

          const res = await fetch(publicUrl)
          const blob = await res.blob()
          const blobUrl = URL.createObjectURL(blob)

          const a = document.createElement('a')
          a.href = blobUrl
          a.download = session.folderName || 'folder_name.zip'
          a.click()

          URL.revokeObjectURL(blobUrl)
        }
      }

      restoreClipboardButton(copyBtn, publicUrl)
      restoreDeleteButton(deleteBtn, publicUrl, fileName, 'folderSession', downloadBox, timerEl, copyBtn)

      downloadBox.style.display = 'flex'

      if (session.expiryTime) {
        startRestoredCountdown(timerEl, session.expiryTime, 'folderSession', () => {
          downloadBox.style.display = 'none'
          if (timerEl) timerEl.textContent = '00:00'
          if (copyBtn) {
            copyBtn.innerHTML = 'Copy Link <i class="fa-solid fa-copy"></i>'
          }
        })
      }
    }
  }

  // ── qrcodegenerator.html ────────────────────────────────────────────────────
  if (document.getElementById('qrCodeContainer')) {
    const saved = sessionStorage.getItem('qrSession')

    if (saved) {
      const session = JSON.parse(saved)
      const generatedQr = document.querySelector('.generated-qr')
      const linkGeneratedQr = document.querySelector('.link-generated-qr')
      const qrCodeContainer = document.getElementById('qrCodeContainer')
      const linkQrContainer = document.getElementById('LinkqrCodeContainer')

      if (generatedQr) generatedQr.style.display = 'none'
      if (linkGeneratedQr) linkGeneratedQr.style.display = 'none'

      if (session.qrType === 'file' && session.publicUrl && qrCodeContainer) {
        qrCodeContainer.innerHTML = ''
        new QRCode(qrCodeContainer, {
          text: session.publicUrl,
          width: 256,
          height: 256,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H,
        })
        if (generatedQr) generatedQr.style.display = 'flex'
      } else if (session.qrType === 'url' && session.urlValue && linkQrContainer) {
        linkQrContainer.innerHTML = ''
        new QRCode(linkQrContainer, {
          text: session.urlValue,
          width: 256,
          height: 256,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H,
        })
        if (linkGeneratedQr) linkGeneratedQr.style.display = 'flex'
      }
    }
  }
})