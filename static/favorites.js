document.addEventListener('DOMContentLoaded', async () => {
  const favoritesGrid = document.getElementById('favorites-grid');
  const API_URL = "http://127.0.0.1:8000/api/listings/";
  const CATEGORY_API = "http://127.0.0.1:8000/api/listings/categories/";
  const LOCATION_API = "http://127.0.0.1:8000/api/listings/locations/";
  const PLACEHOLDER_URL = "http://127.0.0.1:8000/media/listing_photos/placeholder.png";
  const accessToken = localStorage.getItem('accessToken');
  const currentUserId = localStorage.getItem('userId');
  const isAuthenticated = Boolean(accessToken && currentUserId);
  const favoritesKey = isAuthenticated ? `favoritesIds_${currentUserId}` : null;

  if (!isAuthenticated) {
    localStorage.removeItem('favoritesIds_null');
    favoritesGrid.innerHTML = "<p>Щоб переглянути обране, увійдіть в акаунт.</p>";
  }

  let favoritesIds = isAuthenticated
    ? JSON.parse(localStorage.getItem(favoritesKey) || "[]").map(id => Number(id))
    : [];
  let categoryMap = {};
  let locationMap = {};
  let msnry; // Masonry
  // helper to escape HTML
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  if (!isAuthenticated) return;

  try {
    await loadCategories();
    await loadLocations();
    await loadFavorites();
  } catch (err) {
    favoritesGrid.innerHTML = `<p>Помилка завантаження даних: ${err.message}</p>`;
    console.error(err);
  }

  async function loadCategories() {
    const res = await fetch(CATEGORY_API);
    if (!res.ok) throw new Error('Помилка завантаження категорій!');
    const data = await res.json();
    data.forEach(cat => categoryMap[cat.id] = cat.name);
  }

  async function loadLocations() {
    const res = await fetch(LOCATION_API);
    if (!res.ok) throw new Error('Помилка завантаження місцезнаходжень!');
    const data = await res.json();
    data.forEach(loc => locationMap[loc.id] = `${loc.city}`);
  }

  async function loadFavorites() {
      if (favoritesIds.length === 0) {
        favoritesGrid.innerHTML = "<p>Ви ще не додали обраних оголошень.</p>";
        return;
      }

      try {
        // 1. Створюємо масив промісів, але кожен обробляємо окремо всередині map
        const promises = favoritesIds.map(async (id) => {
          try {
            const res = await fetch(API_URL + id + '/');

            if (res.status === 404) {
              console.warn(`Оголошення ID ${id} видалено з сервера.`);
              return { id, status: 'deleted' };
            }

            if (!res.ok) throw new Error(`Помилка: ${res.status}`);

            const data = await res.json();
            if (data.reported || !data.is_active) {
              return { id, status: 'hidden' };
            }
            return { ...data, status: 'ok' };
          } catch (err) {
            console.error(`Не вдалося завантажити ID ${id}:`, err);
            return { id, status: 'error' };
          }
        });

        // 2. Чекаємо на всі відповіді
        const results = await Promise.all(promises);

        // 3. Фільтруємо дані: залишаємо тільки успішно завантажені
        const favoritesData = results.filter(item => item.status === 'ok');

        // 4. Очищаємо localStorage від видалених оголошень (404)
        const validIds = results
          .filter(item => item.status !== 'deleted')
          .map(item => item.id);

        if (validIds.length !== favoritesIds.length) {
          favoritesIds = validIds;
          localStorage.setItem(favoritesKey, JSON.stringify(validIds));
          console.log("Список обраного синхронізовано (видалено неіснуючі оголошення).");
        }

        // 5. Рендеримо результат
        if (favoritesData.length > 0) {
          renderFavorites(favoritesData);
        } else {
          favoritesGrid.innerHTML = "<p>Обрані оголошення тимчасово недоступні або заблоковані.</p>";
        }

      } catch (err) {
        favoritesGrid.innerHTML = `<p>Критична помилка завантаження: ${err.message}</p>`;
        console.error(err);
      }
  }

  function renderFavorites(items) {
    favoritesGrid.innerHTML = "";

    if (!items.length) {
      favoritesGrid.innerHTML = "<p>Немає обраних оголошень.</p>";
      return;
    }

    const placeholderUrl = PLACEHOLDER_URL;

    items.forEach(item => {
      const card = document.createElement("div");
      card.className = "listing-card vip-listing-card";

      let photoUrl = placeholderUrl;
      let imgClass = "listing-image";
      if (item.photo) {
        photoUrl = item.photo.startsWith('http') ? item.photo : `http://127.0.0.1:8000${item.photo}`;
      } else {
        imgClass += ' placeholder-image';
      }

      const priceText = item.price ? item.price + ' грн' : '—';
      const isFav = Array.isArray(favoritesIds) && favoritesIds.includes(Number(item.id));
      const favBtnHtml = isAuthenticated ? `
        <button class="favorite-icon ${isFav ? 'active' : ''}" data-id="${item.id}" title="${isFav ? 'Удалити з обраного' : 'Добавити в обране'}">
          ${isFav ? '<i class="fi fi-sr-heart star-icon"></i>' : '<i class="fi fi-rr-heart star-icon"></i>'}
        </button>` : '';

      card.innerHTML = `
        <div class="listing-image-wrapper">
          <img src="${photoUrl}" alt="Фото" class="${imgClass}">
        </div>
        <div class="vip-title-row">
          <h3 class="vip-title">${escapeHtml(item.title || '')}</h3>
        </div>
        <div class="card-meta">
          <div class="meta-row">
            <div class="meta-price vip-price-below">${priceText}</div>
            ${isAuthenticated ? favBtnHtml : ''}
          </div>
          <div class="meta-row">
            <div class="vip-category">${escapeHtml(categoryMap[item.category] || '—')}</div>
            <div class="vip-city">${escapeHtml(locationMap[item.location] || '—')}</div>
          </div>
        </div>
      `;

      card.addEventListener("click", () => { window.location.href = `listing.html?id=${item.id}`; });

      favoritesGrid.appendChild(card);

      // favorite button handler
      const favBtn = card.querySelector('.favorite-icon');
      if (favBtn) {
        favBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          const id = parseInt(favBtn.getAttribute('data-id'));
          let currentFavs = JSON.parse(localStorage.getItem(favoritesKey) || "[]").map(Number);
          const idx = currentFavs.indexOf(id);
          if (idx === -1) {
            currentFavs.push(id);
            favBtn.classList.add('active');
            favBtn.title = 'Удалити з обраного';
            favBtn.innerHTML = '<i class="fi fi-sr-heart star-icon"></i>';
          } else {
            currentFavs.splice(idx, 1);
            // remove card since we're on favorites page
            const parent = favBtn.closest('.listing-card');
            if (parent) parent.remove();
            // refresh Masonry
            if (msnry) msnry.destroy();
            msnry = new Masonry(favoritesGrid, {
              itemSelector: '.listing-card',
              columnWidth: 304,
              gutter: 16,
              fitWidth: true,
            });
            // if no cards left, show message
            if (!favoritesGrid.querySelector('.listing-card')) {
              favoritesGrid.innerHTML = "<p>Ви ще не додали обраних оголошень.</p>";
            }
          }
          localStorage.setItem(favoritesKey, JSON.stringify(currentFavs));
          // sync global favoritesIds
          favoritesIds = Array.isArray(currentFavs) ? currentFavs.map(Number) : [];
        });
      }
    });

    if (msnry) msnry.destroy();

    msnry = new Masonry(favoritesGrid, {
      itemSelector: '.listing-card',
      columnWidth: 304,
      gutter: 16,
      fitWidth: true,
    });
  }

  function removeFromFavorites(id) {
    let favoritesIds = JSON.parse(localStorage.getItem(favoritesKey) || "[]").map(Number);
    const index = favoritesIds.indexOf(id);
    if (index > -1) {
      favoritesIds.splice(index, 1);
      localStorage.setItem(favoritesKey, JSON.stringify(favoritesIds));
      loadFavorites();
    }
  }

  //  Функція для додавання/видалення з обраного
  function toggleFavorite(id) {
    // отримуємо актуальні favoritesIds
    favoritesIds = JSON.parse(localStorage.getItem(favoritesKey) || "[]").map(Number);
    const index = favoritesIds.indexOf(id);
    if (index === -1) {
        favoritesIds.push(id);
    } else {
        favoritesIds.splice(index, 1);
    }
    localStorage.setItem(favoritesKey, JSON.stringify(favoritesIds));
    // тепер renderListings бачить актуальний favoritesIds
    renderListings(listings);
  }


  // Details are opened on the dedicated listing page; modal/lightbox removed.
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
            chL('en');
            ls.setItem('google_lang', 'en');
            updL(true);
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
  function googleTranslateElementInit() {
    new google.translate.TranslateElement({pageLanguage: 'uk', includedLanguages: 'en', autoDisplay: false}, 'google_translate_element');
}

