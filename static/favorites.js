document.addEventListener('DOMContentLoaded', async () => {
  const favoritesGrid = document.getElementById('favorites-grid');
  const CATEGORY_API = '/api/listings/categories/';
  const LOCATION_API = '/api/listings/locations/';
  const FAVORITES_API = '/api/listings/favorites/';
  const PLACEHOLDER_URL = '/media/listing_photos/placeholder.png';
  const accessToken = localStorage.getItem('accessToken');
  const currentUserId = localStorage.getItem('userId');
  const authHeaders = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

  let categoryMap = {};
  let locationMap = {};
  let msnry;

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function fetchJson(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`Помилка ${res.status}`);
    return res.json();
  }

  async function loadMetadata() {
    const [categories, locations] = await Promise.all([
      fetchJson(CATEGORY_API),
      fetchJson(LOCATION_API),
    ]);
    categories.forEach(cat => categoryMap[cat.id] = cat.name);
    locations.forEach(loc => locationMap[loc.id] = loc.city);
  }

  async function loadFavorites() {
    const data = await fetchJson(FAVORITES_API, {
      headers: authHeaders,
      credentials: 'same-origin',
    });
    renderFavorites(Array.isArray(data.results) ? data.results : data);
  }

  async function toggleFavorite(id, card) {
    await fetchJson(`/api/listings/favorites/${id}/toggle/`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
    });

    card.remove();
    if (msnry) msnry.layout();
    if (!favoritesGrid.querySelector('.listing-card')) {
      favoritesGrid.innerHTML = '<p>Ви ще не додали обраних оголошень.</p>';
    }
  }

  function renderFavorites(items) {
    favoritesGrid.innerHTML = '';

    if (!items.length) {
      favoritesGrid.innerHTML = '<p>Ви ще не додали обраних оголошень.</p>';
      return;
    }

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'listing-card vip-listing-card';
      const photoUrl = item.photo || PLACEHOLDER_URL;
      const priceText = item.price ? `${item.price} грн` : '-';

      card.innerHTML = `
        <div class="listing-image-wrapper">
          <img src="${photoUrl}" alt="Фото" class="listing-image ${item.photo ? '' : 'placeholder-image'}">
        </div>
        <div class="vip-title-row">
          <h3 class="vip-title">${escapeHtml(item.title || '')}</h3>
        </div>
        <div class="card-meta">
          <div class="meta-row">
            <div class="meta-price vip-price-below">${escapeHtml(priceText)}</div>
            <button class="favorite-icon active" data-id="${item.id}" title="Видалити з обраного">
              <i class="fi fi-sr-heart star-icon"></i>
            </button>
          </div>
          <div class="meta-row">
            <div class="vip-category">${escapeHtml(categoryMap[item.category] || '-')}</div>
            <div class="vip-city">${escapeHtml(locationMap[item.location] || '-')}</div>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        window.location.href = `listing.html?id=${item.id}`;
      });

      const favBtn = card.querySelector('.favorite-icon');
      favBtn.addEventListener('click', async (event) => {
        event.stopPropagation();
        try {
          await toggleFavorite(item.id, card);
        } catch (err) {
          alert(err.message);
        }
      });

      favoritesGrid.appendChild(card);
    });

    if (msnry) msnry.destroy();
    if (typeof Masonry !== 'undefined') {
      msnry = new Masonry(favoritesGrid, {
        itemSelector: '.listing-card',
        columnWidth: 304,
        gutter: 16,
        fitWidth: true,
      });
    }
  }

  function initThemeAndLang() {
    const s = id => document.getElementById(id);
    const ls = localStorage;
    const body = document.body;
    const tBtn = s('theme-toggle');
    const mIcon = s('moon-icon');
    const sIcon = s('sun-icon');
    const lBtn = s('lang-toggle');
    const lUk = s('lang-uk');
    const lEn = s('lang-en');

    const updT = isDark => {
      body.classList.toggle('dark-mode', isDark);
      mIcon?.classList.toggle('hidden', isDark);
      sIcon?.classList.toggle('hidden', !isDark);
    };

    const updL = isEn => {
      lUk?.classList.toggle('active', !isEn);
      lEn?.classList.toggle('active', isEn);
    };

    updT(ls.getItem('theme') === 'dark');
    updL(ls.getItem('google_lang') === 'en');

    if (tBtn) {
      tBtn.onclick = () => {
        const isDark = body.classList.toggle('dark-mode');
        ls.setItem('theme', isDark ? 'dark' : 'light');
        updT(isDark);
      };
    }

    if (lBtn) {
      lBtn.onclick = () => {
        if (ls.getItem('google_lang') !== 'en') {
          ls.setItem('google_lang', 'en');
          document.cookie = 'googtrans=/uk/en; path=/';
          updL(true);
        } else {
          ls.removeItem('google_lang');
          document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          updL(false);
        }
        location.reload();
      };
    }
  }

  initThemeAndLang();

  try {
    if (!currentUserId && !accessToken) {
      favoritesGrid.innerHTML = '<p>Щоб переглянути обране, увійдіть в акаунт.</p>';
      return;
    }
    await loadMetadata();
    await loadFavorites();
  } catch (err) {
    favoritesGrid.innerHTML = `<p>Помилка завантаження даних: ${escapeHtml(err.message)}</p>`;
  }
});

function googleTranslateElementInit() {
  new google.translate.TranslateElement({ pageLanguage: 'uk', includedLanguages: 'en', autoDisplay: false }, 'google_translate_element');
}
