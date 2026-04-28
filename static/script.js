const API_URL = "http://127.0.0.1:8000/api/listings/";
const accessToken = localStorage.getItem('accessToken');
const currentUserId = localStorage.getItem('userId');
const isAuthenticated = Boolean(accessToken && currentUserId);
const favoritesKey = isAuthenticated ? `favoritesIds_${currentUserId}` : null;
let listings = [];
let categoryMap = {};
let locationMap = {};
let favoritesIds = isAuthenticated
  ? JSON.parse(localStorage.getItem(favoritesKey) || "[]").map(id => Number(id))
  : [];

if (!isAuthenticated) {
  // Cleanup legacy shared guest favorites key if it was created earlier.
  localStorage.removeItem('favoritesIds_null');
}

let selectedCategoryId = null;
let selectedCityIds = new Set();
const minGap = 100;
const VIP_PAGE_SIZE = 6;
const VIP_AUTO_MS = 5000;
let vipItems = [];
let vipPageIndex = 0;
let vipAutoTimer = null;

document.addEventListener('DOMContentLoaded', () => {

  // Кнопка "наверх"
const scrollTopBtn = document.getElementById('scrollTopBtn');

// Показывать кнопку после 30% прокрутки страницы
window.addEventListener('scroll', () => {
  const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
  if (scrollPercent > 30) {
    scrollTopBtn.classList.add('show');
  } else {
    scrollTopBtn.classList.remove('show');
  }
});

// Скролл наверх при клике
scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
});

  // --- Показ/приховування посилання Admin за username === 'admin' ---
  (async function checkAdminLink(){
    const adminLinks = document.querySelectorAll('.admin-link');
    if(!adminLinks || adminLinks.length===0) return;
    // сховаємо за замовчуванням
    adminLinks.forEach(a=> a.style.display='none');

    const token = localStorage.getItem('accessToken');
    if(!token) return; // не залогінений

    try{
      const res = await fetch('/api/auth/me/', { headers: { 'Authorization': `Bearer ${token}` } });
      if(!res.ok) return; // без прав або помилка
      const data = await res.json();
      if(data && data.username && data.username.toLowerCase() === 'admin'){
        adminLinks.forEach(a=> a.style.display='inline-block');
      }
    }catch(err){
      console.error('checkAdminLink error', err);
    }
  })();



  const searchInput = document.getElementById('search');
  const categoryFilter = document.getElementById('category-filter');
  const locationFilter = document.getElementById('location-filter');
  const listingGrid = document.getElementById('listing-grid');
  const priceSlider = document.getElementById('price-slider');
  const priceCurrentText = document.getElementById('price-current-text');
  const applyPriceBtn = document.getElementById('apply-price-filter');
  const resetPriceBtn = document.getElementById('reset-price-filter');
  const sliderTrack = document.getElementById('slider-track');
  const vipPrevBtn = document.getElementById('vip-prev');
  const vipNextBtn = document.getElementById('vip-next');
  const vipDotsTrack = document.getElementById('vip-dots');
  let sliderMax = 100000;

  loadCategories().then(loadLocations).then(loadListings);

  searchInput?.addEventListener('input', applyFilters);
  // On search focus: don't expand input or hide nav buttons.
  // Instead animate disappearance of filters and VIP block by toggling
  // `search-focused` on the <body>.
  const SEARCH_FOCUS_ANIM_MS = 220; // should match CSS transition
  if (searchInput) {
    searchInput.addEventListener('focus', () => {
      document.body.classList.add('search-focused');
    });

    searchInput.addEventListener('blur', () => {
      // keep timing consistent with CSS so the visual collapse completes
      setTimeout(() => {
        document.body.classList.remove('search-focused');
      }, SEARCH_FOCUS_ANIM_MS + 10);
    });
  }
  categoryFilter?.addEventListener('change', applyFilters);
  locationFilter?.addEventListener('change', applyFilters);

  priceSlider.addEventListener('input', onPriceChange);

  if (applyPriceBtn) {
    applyPriceBtn.addEventListener('click', () => {
      applyFilters();
      console.log(`Фільтр застосований: до ${priceSlider.value} грн`);
    });
  }

  if (resetPriceBtn) {
    resetPriceBtn.addEventListener('click', () => {
      // Скидання ціни
      if (priceSlider) priceSlider.value = sliderMax;
      updateLabels();
      updateSliderTrack();

      // Скидання вибору категорій та міст
      selectedCategoryId = null;
      selectedCityIds.clear();

      // Скидання виділення чипів
      document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
      document.querySelectorAll('.city-chip').forEach(c => c.classList.remove('active'));

      applyFilters();
    });
  }

  updateLabels();
  updateSliderTrack();

  vipPrevBtn?.addEventListener('click', () => changeVipPage(-1, 'manual'));
  vipNextBtn?.addEventListener('click', () => changeVipPage(1, 'manual'));

  // New: chips (category / city) handlers — clicking toggles selection
  document.querySelectorAll('.category-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const id = chip.getAttribute('data-id');
      const isActive = chip.classList.contains('active');
      // clear others
      document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
      if (!isActive) {
        chip.classList.add('active');
        selectedCategoryId = id;
      } else {
        selectedCategoryId = null;
      }
      applyFilters();
    });
  });

  // allow multiple city selection: toggle each chip without clearing others
  document.querySelectorAll('.city-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      const id = String(chip.getAttribute('data-id'));
      const isActive = chip.classList.contains('active');
      if (!isActive) {
        chip.classList.add('active');
        selectedCityIds.add(id);
      } else {
        chip.classList.remove('active');
        selectedCityIds.delete(id);
      }
      applyFilters();
    });
  });

    // previous legacy category/city box code removed; chips handle selection now
  function onPriceChange() {
    if (!priceSlider) return;
    let val = parseInt(priceSlider.value);
    if (val < 0) priceSlider.value = 0;
    if (val > sliderMax) priceSlider.value = sliderMax;
    updateLabels();
    updateSliderTrack();
    // Live filter as the user moves the slider
    applyFilters();
  }

  function updateLabels() {
    if (!priceSlider || !priceCurrentText) return;
    const val = parseInt(priceSlider.value);
    if (val === sliderMax) {
      priceCurrentText.textContent = 'Будь-яка ціна';
    } else {
      priceCurrentText.textContent = `До ${val} грн.`;
    }
  }

  function updateSliderTrack() {
    if (!priceSlider || !sliderTrack) return;
    const val = parseInt(priceSlider.value);
    const percent = (val / sliderMax) * 100;
    // draw filled gradient up to percent
    sliderTrack.style.background = `linear-gradient(to right, #6b7985 0%, #6b7985 ${percent}%, #ddd ${percent}%, #ddd 100%)`;
  }

  async function loadListings() {
    try {
      const res = await fetch(API_URL);
      listings = await res.json();
      syncPriceSliderBounds(listings);
      renderListings(listings);
      renderVIP(listings);
    } catch (err) {
      console.error('Помилка завантаження оголошень:', err);
    }
  }

  // Render VIP block: listings that are currently promoted
  function renderVIP(items) {
    const vipContainer = document.querySelector('.vip-list');
    if (!vipContainer) return;
    const promoted = (items || []).filter(it => it.is_promoted || (it.promoted_until && new Date(it.promoted_until) > new Date()));
    vipItems = promoted;
    vipPageIndex = 0;
    if (!vipItems || vipItems.length === 0) {
      vipContainer.innerHTML = '<p>Порожньо</p>';
      updateVipNavState();
      renderVipDots();
      stopVipAutoplay();
      return;
    }
    renderVipPage('none');
    startVipAutoplay();
  }

  function updateVipNavState() {
    const totalPages = Math.ceil(vipItems.length / VIP_PAGE_SIZE) || 1;
    const hasManyPages = totalPages > 1;
    if (vipPrevBtn) {
      vipPrevBtn.disabled = !hasManyPages;
      vipPrevBtn.style.visibility = hasManyPages ? 'visible' : 'hidden';
    }
    if (vipNextBtn) {
      vipNextBtn.disabled = !hasManyPages;
      vipNextBtn.style.visibility = hasManyPages ? 'visible' : 'hidden';
    }
  }

  function renderVipDots() {
    if (!vipDotsTrack) return;
    vipDotsTrack.innerHTML = '';

    const totalPages = Math.ceil(vipItems.length / VIP_PAGE_SIZE) || 1;
    if (totalPages <= 1) return;

    for (let i = 0; i < totalPages; i += 1) {
      const dotBtn = document.createElement('button');
      dotBtn.type = 'button';
      dotBtn.className = `vip-dot${i === vipPageIndex ? ' active' : ''}`;
      dotBtn.setAttribute('aria-label', `VIP блок ${i + 1}`);
      dotBtn.addEventListener('click', () => goToVipPage(i));
      vipDotsTrack.appendChild(dotBtn);
    }
  }

  function startVipAutoplay() {
    stopVipAutoplay();
    const totalPages = Math.ceil(vipItems.length / VIP_PAGE_SIZE);
    if (totalPages <= 1) return;
    vipAutoTimer = setInterval(() => {
      changeVipPage(1, 'auto');
    }, VIP_AUTO_MS);
  }

  function stopVipAutoplay() {
    if (!vipAutoTimer) return;
    clearInterval(vipAutoTimer);
    vipAutoTimer = null;
  }

  function goToVipPage(targetIndex) {
    const totalPages = Math.ceil(vipItems.length / VIP_PAGE_SIZE);
    if (!totalPages || targetIndex === vipPageIndex || targetIndex < 0 || targetIndex >= totalPages) return;
    const direction = targetIndex > vipPageIndex ? 'next' : 'prev';
    vipPageIndex = targetIndex;
    renderVipPage(direction);
    startVipAutoplay();
  }

  function changeVipPage(delta, source = 'manual') {
    if (!vipItems.length) return;
    const totalPages = Math.ceil(vipItems.length / VIP_PAGE_SIZE);
    if (totalPages <= 1) return;
    vipPageIndex = (vipPageIndex + delta + totalPages) % totalPages;
    renderVipPage(delta >= 0 ? 'next' : 'prev');
    if (source !== 'auto') {
      startVipAutoplay();
    }
  }

  function renderVipPage(direction = 'none') {
    const vipContainer = document.querySelector('.vip-list');
    if (!vipContainer) return;

    const start = vipPageIndex * VIP_PAGE_SIZE;
    const pageItems = vipItems.slice(start, start + VIP_PAGE_SIZE);

    const doRender = () => {
      vipContainer.innerHTML = '';
      const placeholderUrl = "http://127.0.0.1:8000/media/listing_photos/placeholder.png";

      pageItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'listing-card vip-listing-card';

        let photoUrl = placeholderUrl;
        let imgClass = 'listing-image';
        if (item.photo) {
          photoUrl = item.photo.startsWith('http') ? item.photo : `http://127.0.0.1:8000${item.photo}`;
        } else {
          imgClass += ' placeholder-image';
        }

        const priceText = item.price ? item.price + ' грн' : '—';
        const isFav = isAuthenticated && Array.isArray(favoritesIds) && favoritesIds.includes(Number(item.id));
        const favBtnHtml = isAuthenticated ? `\
          <button class="favorite-icon ${isFav ? 'active' : ''}" data-id="${item.id}" title="${isFav ? 'Удалити з обраного' : 'Добавити в обране'}">\
            ${isFav ? '<i class="fi fi-sr-heart star-icon"></i>' : '<i class="fi fi-rr-heart star-icon"></i>'}\
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
              ${favBtnHtml}
            </div>
            <div class="meta-row">
              <div class="vip-category">${escapeHtml(categoryMap[item.category] || '—')}</div>
              <div class="vip-city">${escapeHtml(locationMap[item.location] || '—')}</div>
            </div>
          </div>
        `;
        card.addEventListener('click', () => { window.location.href = `listing.html?id=${item.id}`; });
        vipContainer.appendChild(card);

        const favBtn = card.querySelector('.favorite-icon');
        if (favBtn) {
          favBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (!isAuthenticated || !favoritesKey) return;
            const id = parseInt(favBtn.getAttribute('data-id'));
            let currentFavs = JSON.parse(localStorage.getItem(favoritesKey) || "[]").map(Number);
            const idx = currentFavs.indexOf(id);
            if (idx === -1) {
              currentFavs.push(id);
              favBtn.classList.add('active');
              favBtn.title = 'Видалити з обраного';
              favBtn.innerHTML = '<i class="fi fi-sr-heart star-icon"></i>';
            } else {
              currentFavs.splice(idx, 1);
              favBtn.classList.remove('active');
              favBtn.title = 'Добавити в обране';
              favBtn.innerHTML = '<i class="fi fi-rr-heart star-icon"></i>';
            }
            localStorage.setItem(favoritesKey, JSON.stringify(currentFavs));
            favoritesIds = Array.isArray(currentFavs) ? currentFavs.map(Number) : [];
          });
        }
      });

      updateVipNavState();
      renderVipDots();
    };

    if (direction === 'none') {
      doRender();
      return;
    }

    const exitOffset = direction === 'next' ? '-36px' : '36px';
    const enterOffset = direction === 'next' ? '36px' : '-36px';

    vipContainer.animate(
      [
        { transform: 'translateX(0)' },
        { transform: `translateX(${exitOffset})` }
      ],
      { duration: 140, easing: 'ease-in' }
    ).onfinish = () => {
      doRender();
      vipContainer.animate(
        [
          { transform: `translateX(${enterOffset})` },
          { transform: 'translateX(0)' }
        ],
        { duration: 170, easing: 'ease-out' }
      );
    };
  }

  // small helper to avoid inserting raw HTML
  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function syncPriceSliderBounds(items) {
    if (!Array.isArray(items) || items.length === 0) return;

    const prices = items
      .map(item => parseFloat(item.price))
      .filter(price => !Number.isNaN(price));

    if (!prices.length) return;

    const maxDataPrice = Math.max(...prices);
    const roundedMax = Math.ceil(maxDataPrice / 100) * 100;
    sliderMax = Math.max(100000, roundedMax);
    if (priceSlider) {
      priceSlider.max = String(sliderMax);
      priceSlider.value = String(sliderMax);
    }
    updateLabels();
    updateSliderTrack();
  }

  async function loadCategories() {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/listings/categories/");
      const data = await res.json();
      data.forEach(cat => {
        categoryMap[cat.id] = cat.name;
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        option.setAttribute('data-name', cat.name);
        categoryFilter?.appendChild(option);
      });
    } catch (err) {
      console.warn('Помилка завантаження категорій!');
    }
  }

  async function loadLocations() {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/listings/locations/");
      const data = await res.json();
      data.forEach(loc => {
        locationMap[loc.id] = `${loc.city}`;
        const option = document.createElement('option');
        option.value = loc.id;
        option.textContent = `${loc.city}`;
        option.setAttribute('data-city', loc.city);
        locationFilter?.appendChild(option);
      });
    } catch (err) {
      console.warn('Помилка завантажень локацій!');
    }
  }

  function applyFilters() {
      const searchTerm = searchInput?.value.toLowerCase() || '';

      // Беремо ID або з кнопок (плиток), або з випадаючого списку
      const catId = selectedCategoryId || categoryFilter?.value;
      const locFilterValue = locationFilter?.value;
      const hasSelectedCities = selectedCityIds && selectedCityIds.size > 0;

      const minPrice = 0;
      const maxPrice = parseFloat(priceSlider?.value || sliderMax);

      const filtered = listings.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm);

        // Порівнюємо ID категорії (item.category — це зазвичай ID з бази)
        const matchesCategory = !catId || String(item.category) === String(catId);

        // Порівнюємо ID локації — якщо вибрано кілька міст, перевіряємо по набору
        let matchesLocation = true;
        if (hasSelectedCities) {
          matchesLocation = selectedCityIds.has(String(item.location));
        } else if (locFilterValue) {
          matchesLocation = String(item.location) === String(locFilterValue);
        }

        const matchesPrice = !item.price || (
            parseFloat(item.price) >= minPrice &&
            parseFloat(item.price) <= maxPrice
        );

        return matchesSearch && matchesCategory && matchesLocation && matchesPrice;
    });

    renderListings(filtered);
}

    let msnry; // глобальная переменная для Masonry

  function renderListings(items) {
    listingGrid.innerHTML = "";
    const placeholderUrl = "http://127.0.0.1:8000/media/listing_photos/placeholder.png";
    if (!items || items.length === 0) {
      listingGrid.innerHTML = "<p>Оголошень не знайдено.</p>";
      return;
    }

    items.forEach(item => {
      const isFavorite = isAuthenticated && favoritesIds.includes(Number(item.id));
      const card = document.createElement("div");
      card.className = "listing-card vip-listing-card"; // use VIP card styles for regular listings

      let photoUrl = placeholderUrl;
      let imgClass = "listing-image";
      if (item.photo) {
        photoUrl = item.photo.startsWith("http") ? item.photo : `http://127.0.0.1:8000${item.photo}`;
      } else {
        imgClass += " placeholder-image";
      }

      const priceText = item.price ? item.price + ' грн' : '—';

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
            ${isAuthenticated ? `\
            <button class="favorite-icon ${isFavorite ? 'active' : ''}" data-id="${item.id}" title="${isFavorite ? 'Удалити з обраного' : 'Добавити в обране'}">\
              ${isFavorite ? '<i class="fi fi-sr-heart star-icon"></i>' : '<i class="fi fi-rr-heart star-icon"></i>'}\
            </button>` : ''}
          </div>
          <div class="meta-row">
            <div class="vip-category">${escapeHtml(categoryMap[item.category] || '—')}</div>
            <div class="vip-city">${escapeHtml(locationMap[item.location] || '—')}</div>
          </div>
        </div>
      `;

      card.addEventListener("click", () => {
        window.location.href = `listing.html?id=${item.id}`;
      });

      listingGrid.appendChild(card);
    });

      document.querySelectorAll('.favorite-icon').forEach(button => {
          button.addEventListener('click', (event) => {
            event.stopPropagation();
            if (!isAuthenticated || !favoritesKey) return;
            const id = parseInt(button.getAttribute('data-id'));

            // Оновлюємо localStorage і глобальний масив favoritesIds
            const current = JSON.parse(localStorage.getItem(favoritesKey) || "[]").map(Number);
            const idx = current.indexOf(id);
            if (idx === -1) {
              current.push(id);
              button.classList.add('active');
              button.title = 'Удалити з обраного';
              button.innerHTML = '<i class="fi fi-sr-heart star-icon"></i>';
            } else {
              current.splice(idx, 1);
              button.classList.remove('active');
              button.title = 'Добавити в обране';
              button.innerHTML = '<i class="fi fi-rr-heart star-icon"></i>';
            }
            localStorage.setItem(favoritesKey, JSON.stringify(current));
            // sync global variable so future renders reflect change
            favoritesIds = Array.isArray(current) ? current.map(Number) : [];
          });
      });


      // Инициализация Masonry
      if (msnry) {
        msnry.destroy(); // убираем старую инициализацию (если была)
      }
      msnry = new Masonry(listingGrid, {
        itemSelector: '.listing-card',
        columnWidth: 304,
        gutter: 16,
        fitWidth: true,
      });
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

