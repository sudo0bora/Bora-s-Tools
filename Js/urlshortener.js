const form = document.getElementById("convertForm");
const urlInput = document.getElementById("urlInput");
const shortenedUrl = document.getElementById("shortenedUrl");
const copyBtn = document.getElementById("copyBtn");
const resultsSection = document.querySelector(".copy-results");

// Hide results on load
resultsSection.style.display = "none";

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const rawUrl = urlInput.value.trim();

  if (!isValidUrl(rawUrl)) {
    showError("Please enter a valid URL (e.g. https://example.com)");
    return;
  }

  const submitBtn = form.querySelector(".submituploadbtn");
  submitBtn.disabled = true;
  submitBtn.innerHTML = `Shortening... <i class="fa-solid fa-spinner fa-spin"></i>`;

  try {
    const apiUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(rawUrl)}`;
    const response = await fetch(apiUrl);

    if (!response.ok) throw new Error("API request failed");

    const result = await response.text();

    if (result.startsWith("https://tinyurl.com/") || result.startsWith("http://tinyurl.com/")) {
      shortenedUrl.value = result.trim();
      resultsSection.style.display = "flex";
      resultsSection.scrollIntoView({ behavior: "smooth" });
      copyBtn.innerHTML = `Copy <i class="fa-solid fa-copy"></i>`;
      copyBtn.disabled = false;
    } else {
      throw new Error("Unexpected response from API");
    }
  } catch (err) {
    showError("Failed to shorten URL. Please try again.");
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `Shorten <i class="fa-solid fa-link"></i>`;
  }
});

copyBtn.addEventListener("click", () => {
  if (!shortenedUrl.value) return;

  navigator.clipboard.writeText(shortenedUrl.value).then(() => {
    copyBtn.innerHTML = `Copied! <i class="fa-solid fa-check"></i>`;
    copyBtn.disabled = true;

    setTimeout(() => {
      copyBtn.innerHTML = `Copy <i class="fa-solid fa-copy"></i>`;
      copyBtn.disabled = false;
    }, 2000);
  }).catch(() => {
    shortenedUrl.select();
    document.execCommand("copy");
    copyBtn.innerHTML = `Copied! <i class="fa-solid fa-check"></i>`;
    setTimeout(() => {
      copyBtn.innerHTML = `Copy <i class="fa-solid fa-copy"></i>`;
    }, 2000);
  });
});

function isValidUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function showError(message) {
  const existing = document.querySelector(".url-error");
  if (existing) existing.remove();

  const error = document.createElement("p");
  error.className = "url-error";
  error.textContent = message;
  error.style.cssText = "color: #ff4d4d; margin-top: 8px; font-size: 0.9rem;";

  form.appendChild(error);
  setTimeout(() => error.remove(), 4000);
}