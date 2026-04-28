document.addEventListener("DOMContentLoaded", () => {
  loadCategories();
  loadLocations();

  const createForm = document.getElementById("create-form");
  const photoInput = document.getElementById("photos");
  const previewContainer = document.getElementById("photo-preview-container");
  const removeBtn = document.getElementById("remove-photo-btn");
  let selectedPhotos = [];

  if (createForm) {
    createForm.addEventListener("submit", handleSubmit);
  }

  // Предпросмотр фото (можно добавлять несколько раз)
  photoInput.addEventListener("change", () => {
    const files = Array.from(photoInput.files || []);
    if (!files.length) return;
    selectedPhotos = selectedPhotos.concat(files);
    photoInput.value = "";
    renderPhotoPreviews();
  });

  // Очистка выбранных фото до отправки
  removeBtn.addEventListener("click", () => {
    selectedPhotos = [];
    renderPhotoPreviews();
  });

  function renderPhotoPreviews() {
    previewContainer.innerHTML = "";
    selectedPhotos.forEach((file) => {
      const img = document.createElement("img");
      img.className = "create-photo-thumb";
      img.alt = "Фото оголошення";
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
      previewContainer.appendChild(img);
    });
    removeBtn.style.display = selectedPhotos.length ? "inline-block" : "none";
  }

  async function handleSubmit(e) {
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
      const token = localStorage.getItem("accessToken");

      selectedPhotos.forEach((file) => {
        formData.append("photos", file);
      });

      // Сумісність зі старим API: дублюємо перше фото в поле `photo`
      if (selectedPhotos.length > 0) {
        formData.append("photo", selectedPhotos[0]);
      }

      try {
        const response = await fetch("http://127.0.0.1:8000/api/listings/", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Ошибка: ${response.status} — ${errorText}`);
        }

        window.location.href = "index.html";

      } catch (err) {
        console.error("Помилка відправки оголошення:", err);
        alert("Не вдалося створити оголошення. Перевірте поля чи авторизацію.");
      }
  }

    const s = (id) => document.getElementById(id),
          ls = localStorage,
          body = document.body;

    // --- ТЕМА ---
    const tBtn = s('theme-toggle'), mIcon = s('moon-icon'), sIcon = s('sun-icon');
    const updT = (isD) => {
        body.classList.toggle('dark-mode', isD);
        mIcon.classList.toggle('hidden', isD);
        sIcon.classList.toggle('hidden', !isD);
    };
    updT(ls.getItem('theme') === 'dark');

    tBtn.onclick = () => {
        const isD = body.classList.toggle('dark-mode');
        ls.setItem('theme', isD ? 'dark' : 'light');
        updT(isD);
    };

    // --- МОВА ---
    const lBtn = s('lang-toggle'),
          lUk = s('lang-uk'),
          lEn = s('lang-en');
    const chL = (c) => {
        const el = document.querySelector('.goog-te-combo');
        if (el) { el.value = c; el.dispatchEvent(new Event('change')); }
    };
    const updL = (isEn) => {
        lUk.classList.toggle('active', !isEn);
        lEn.classList.toggle('active', isEn);
    };

    lBtn.onclick = () => {
        if (ls.getItem('google_lang') !== 'en') {
            ls.setItem('google_lang', 'en');
            updL(true);
            document.cookie = 'googtrans=/uk/en; path=/';
            location.reload();
        } else {
            ls.removeItem('google_lang');
            document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            updL(false);
            location.reload();
        }
    };

    if (ls.getItem('google_lang') === 'en') {
        updL(true);
    } else {
        updL(false);
    }

});

async function loadCategories() {
  try {
    const response = await fetch("http://127.0.0.1:8000/api/listings/categories/");
    const categories = await response.json();
    const select = document.getElementById("category");

    categories.forEach(category => {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = category.name;
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Помилка завантаження категорій!:", err);
  }
}

async function loadLocations() {
  try {
    const response = await fetch("http://127.0.0.1:8000/api/listings/locations/");
    const locations = await response.json();
    const select = document.getElementById("location");

    locations.forEach(location => {
      const option = document.createElement("option");
      option.value = location.id;
      option.textContent = `${location.city}`;
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Помилка завантаження локацій!:", err);
  }
}
  function googleTranslateElementInit() {
    new google.translate.TranslateElement({pageLanguage: 'uk', includedLanguages: 'en', autoDisplay: false}, 'google_translate_element');
}
