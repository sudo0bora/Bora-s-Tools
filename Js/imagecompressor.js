(() => {
  const imageInput = document.getElementById("imageInput");
  const mbInput = document.getElementById("mbinput");
  const imageName = document.getElementById("imagename");
  const downloadBox = document.querySelector(".download-box");
  const downloadLink = document.getElementById("downloadImageLink");
  const downloadBtn = document.getElementById("downloadconvertedimagebtn");
  const form = document.querySelector("form");

  // Hide download box until ready
  downloadBox.style.display = "none";

  // Show selected filename
  imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (file) {
      imageName.textContent = `Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const file = imageInput.files[0];
    if (!file) {
      alert("Please choose an image first.");
      return;
    }

    const targetMB = parseFloat(mbInput.value);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        compressImage(img, file, targetMB);
      };
      img.src = event.target.result;
    };

    reader.readAsDataURL(file);
  });

  function compressImage(img, originalFile, targetMB) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    let width = img.naturalWidth;
    let height = img.naturalHeight;

    // If a target size was given, scale dimensions down proportionally
    if (targetMB && targetMB > 0) {
      const originalMB = originalFile.size / 1024 / 1024;
      if (targetMB < originalMB) {
        const ratio = Math.sqrt(targetMB / originalMB);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);

    // Determine quality — iterate to get close to target size
    const targetBytes = targetMB ? targetMB * 1024 * 1024 : null;
    let quality = 0.92;

    const tryExport = (q) => {
      canvas.toBlob(
        (blob) => {
          if (targetBytes && blob.size > targetBytes && q > 0.1) {
            // Reduce quality further and retry
            tryExport(Math.max(q - 0.08, 0.05));
            return;
          }

          const baseName = originalFile.name.replace(/\.[^.]+$/, "");
          const outputName = `${baseName} compressed.jpg`;
          const url = URL.createObjectURL(blob);

          downloadLink.href = url;
          downloadLink.download = outputName;
          downloadLink.textContent = outputName;

          downloadBtn.onclick = () => {
            downloadLink.click();
          };

          const finalMB = (blob.size / 1024 / 1024).toFixed(2);
          imageName.textContent = `Done! Output: ${outputName} — ${finalMB} MB (${width}×${height}px)`;

          downloadBox.style.display = "flex";
          downloadBox.scrollIntoView({ behavior: "smooth" });
        },
        "image/jpeg",
        q
      );
    };

    tryExport(quality);
  }
})();