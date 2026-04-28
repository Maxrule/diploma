document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const listingId = urlParams.get("id");
  const token = localStorage.getItem("accessToken");

  const form = document.getElementById("edit-form");
  const photosInput = document.getElementById("photos");
  const newPreviewContainer = document.getElementById("preview-container");
  const existingPhotoContainer = document.getElementById("existing-photo-container");
  const deletePhotoBtn = document.getElementById("delete-photo-btn");

  let selectedPhotos = [];
  let existingPhotos = [];
  let removeExistingPhotos = false;

  if (!listingId || !token) {
    alert("Помилка: бракує ID чи авторизації.");
    return;
  }

  await loadCategories();
  await loadLocations();
  await loadListingData(listingId);

  photosInput.addEventListener("change", () => {
    const files = Array.from(photosInput.files || []);
    if (!files.length) return;
    selectedPhotos = selectedPhotos.concat(files);
    photosInput.value = "";
    renderNewPhotoPreviews();
    updateDeleteButtonState();
  });

  deletePhotoBtn.addEventListener("click", () => {
    if (selectedPhotos.length > 0) {
      selectedPhotos = [];
      renderNewPhotoPreviews();
      updateDeleteButtonState();
      return;
    }

    if (existingPhotos.length > 0) {
      removeExistingPhotos = true;
      existingPhotos = [];
      renderExistingPhotos();
      updateDeleteButtonState();
      return;
    }

    alert("Немає фото для видалення.");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("title", document.getElementById("title").value);
    formData.append("category", document.getElementById("category").value);
    formData.append("price", document.getElementById("price").value);
    formData.append("description", document.getElementById("description").value);
    formData.append("location", document.getElementById("location").value);
    formData.append("name", document.getElementById("name").value);
    formData.append("email", document.getElementById("email").value);
    formData.append("phone", document.getElementById("phone").value);

    if (selectedPhotos.length > 0) {
      selectedPhotos.forEach((file) => formData.append("photos", file));
    }

    if (removeExistingPhotos) {
      formData.append("remove_photo", "true");
    }

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/listings/${listingId}/`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Помилка: ${res.status} — ${errorText}`);
      }

      window.location.href = "profile.html";
    } catch (err) {
      alert("Помилка оновлення оголошення: " + err.message);
    }
  });

  function renderNewPhotoPreviews() {
    newPreviewContainer.innerHTML = "";
    selectedPhotos.forEach((file) => {
      const img = document.createElement("img");
      img.className = "create-photo-thumb";
      img.alt = "Нове фото оголошення";
      const reader = new FileReader();
      reader.onload = (event) => {
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
      newPreviewContainer.appendChild(img);
    });
  }

  function renderExistingPhotos() {
    existingPhotoContainer.innerHTML = "";
    existingPhotos.forEach((url) => {
      const img = document.createElement("img");
      img.className = "create-photo-thumb";
      img.alt = "Поточне фото оголошення";
      img.src = url;
      existingPhotoContainer.appendChild(img);
    });
  }

  function updateDeleteButtonState() {
    deletePhotoBtn.style.display = (selectedPhotos.length || existingPhotos.length) ? "inline-block" : "none";
  }

  async function loadListingData(id) {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/listings/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Помилка завантаження даних оголошення!");

      const data = await res.json();

      document.getElementById("title").value = data.title || "";
      document.getElementById("price").value = data.price ?? "";
      document.getElementById("description").value = data.description || "";
      document.getElementById("name").value = data.name || "";
      document.getElementById("email").value = data.email || "";
      document.getElementById("phone").value = data.phone || "";
      document.getElementById("category").value = data.category;
      document.getElementById("location").value = data.location;

      const photos = Array.isArray(data.photos) && data.photos.length ? data.photos : (data.photo ? [data.photo] : []);
      existingPhotos = photos.map((url) => normalizePhotoUrl(url));
      removeExistingPhotos = false;

      renderExistingPhotos();
      updateDeleteButtonState();
    } catch (err) {
      console.error(err);
    }
  }

  function normalizePhotoUrl(url) {
    if (!url) return "";
    return url.startsWith("http") ? url : `http://127.0.0.1:8000${url}`;
  }

  const s = (id) => document.getElementById(id),
    ls = localStorage,
    body = document.body;

  // --- ТЕМА ---
  const tBtn = s("theme-toggle"),
    mIcon = s("moon-icon"),
    sIcon = s("sun-icon");
  const updT = (isD) => {
    body.classList.toggle("dark-mode", isD);
    mIcon.classList.toggle("hidden", isD);
    sIcon.classList.toggle("hidden", !isD);
  };
  updT(ls.getItem("theme") === "dark");

  tBtn.onclick = () => {
    const isD = body.classList.toggle("dark-mode");
    ls.setItem("theme", isD ? "dark" : "light");
    updT(isD);
  };

  // --- МОВА ---
  const lBtn = s("lang-toggle"),
    lUk = s("lang-uk"),
    lEn = s("lang-en");
  const chL = (c) => {
    const el = document.querySelector(".goog-te-combo");
    if (el) {
      el.value = c;
      el.dispatchEvent(new Event("change"));
    }
  };
  const updL = (isEn) => {
    lUk.classList.toggle("active", !isEn);
    lEn.classList.toggle("active", isEn);
  };

  lBtn.onclick = () => {
    if (ls.getItem("google_lang") !== "en") {
      chL("en");
      ls.setItem("google_lang", "en");
      updL(true);
    } else {
      ls.removeItem("google_lang");
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      updL(false);
      location.reload();
    }
  };

  if (ls.getItem("google_lang") === "en") {
    updL(true);
  } else {
    updL(false);
  }
});

function googleTranslateElementInit() {
  new google.translate.TranslateElement(
    { pageLanguage: "uk", includedLanguages: "en", autoDisplay: false },
    "google_translate_element"
  );
}

async function loadCategories() {
  const res = await fetch("http://127.0.0.1:8000/api/listings/categories/");
  const categories = await res.json();
  const select = document.getElementById("category");

  categories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat.id;
    option.textContent = cat.name;
    select.appendChild(option);
  });
}

async function loadLocations() {
  const res = await fetch("http://127.0.0.1:8000/api/listings/locations/");
  const locations = await res.json();
  const select = document.getElementById("location");

  locations.forEach((loc) => {
    const option = document.createElement("option");
    option.value = loc.id;
    option.textContent = `${loc.city}`;
    select.appendChild(option);
  });
}
