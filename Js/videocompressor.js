(() => {
  const videoInput = document.getElementById("videoInput");
  const mbInput = document.getElementById("mbinput");
  const videoName = document.getElementById("videoname");
  const downloadBox = document.querySelector(".download-box");
  const downloadLink = document.getElementById("downloadvideoLink");
  const downloadBtn = document.getElementById("downloadconvertedvideobtn");
  const form = document.querySelector("form");

  downloadBox.style.display = "none";

  let ffmpeg = null;
  let fetchFile = null;
  let ffmpegLoaded = false;

  videoInput.addEventListener("change", () => {
    const file = videoInput.files[0];
    if (file) {
      videoName.textContent =
        "Selected: " +
        file.name +
        " (" +
        (file.size / 1024 / 1024).toFixed(2) +
        " MB)";
    }
  });

  async function loadFFmpeg() {
    videoName.textContent = "Loading FFmpeg...";

    const { FFmpeg } =
      await import("https://unpkg.com/@ffmpeg/ffmpeg@0.12.6/dist/esm/index.js");
    const util =
      await import("https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js");
    fetchFile = util.fetchFile;
    const toBlobURL = util.toBlobURL;

    ffmpeg = new FFmpeg();

    ffmpeg.on("progress", ({ progress }) => {
      videoName.textContent =
        "Compressing... " + Math.min(100, Math.round(progress * 100)) + "%";
    });

    // All three files come from the same core package and get converted
    // to same-origin blob URLs, which is required for the Worker to load
    // without a cross-origin error on GitHub Pages.
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        "application/wasm",
      ),
      workerURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.worker.js`,
        "text/javascript",
      ),
    });

    ffmpegLoaded = true;
  }

  function getVideoDuration(file) {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        resolve(video.duration);
        URL.revokeObjectURL(video.src);
      };
      video.src = URL.createObjectURL(file);
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const file = videoInput.files[0];
    if (!file) {
      alert("Please choose a video first.");
      return;
    }

    downloadBox.style.display = "none";

    try {
      if (!ffmpegLoaded) await loadFFmpeg();

      const ext = (file.name.match(/\.[^.]+$/) || [".mp4"])[0].toLowerCase();
      const inputName = "input" + ext;
      const outputName = "output.mp4";

      videoName.textContent = "Reading file...";
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      const args = ["-i", inputName];

      const targetMB = parseFloat(mbInput.value);
      if (targetMB && targetMB > 0) {
        const duration = await getVideoDuration(file);
        if (duration > 0) {
          const targetBits = targetMB * 1024 * 1024 * 8;
          const videoBitrate = Math.max(
            100000,
            Math.floor(targetBits / duration) - 128000,
          );
          args.push("-b:v", String(videoBitrate), "-b:a", "128k");
        } else {
          args.push("-crf", "28");
        }
      } else {
        args.push("-crf", "28");
      }

      args.push(
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-preset",
        "fast",
        "-movflags",
        "+faststart",
        outputName,
      );

      await ffmpeg.exec(args);

      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data.buffer], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);

      const baseName = file.name.replace(/\.[^.]+$/, "");
      const finalName = baseName + "_compressed.mp4";

      downloadLink.href = url;
      downloadLink.download = finalName;
      downloadLink.textContent = finalName;
      downloadBtn.onclick = () => downloadLink.click();

      const finalMB = (blob.size / 1024 / 1024).toFixed(2);
      const origMB = (file.size / 1024 / 1024).toFixed(2);
      videoName.textContent =
        "Done! " + finalName + " — " + finalMB + " MB (was " + origMB + " MB)";

      downloadBox.style.display = "flex";
      downloadBox.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      console.error(err);
      videoName.textContent = "Error: " + err.message;
    }
  });
})();
