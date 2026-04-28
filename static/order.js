const API_URL = "http://127.0.0.1:8000/api/listings/";
const ORDER_API = "http://127.0.0.1:8000/api/orders/";
const CATEGORY_API = "http://127.0.0.1:8000/api/listings/categories/";
const LOCATION_API = "http://127.0.0.1:8000/api/listings/locations/";
const PLACEHOLDER_URL = "http://127.0.0.1:8000/media/listing_photos/placeholder.png";

// Delivery prices and city coordinates are provided by the backend via
// `CATEGORY_API` and `LOCATION_API` endpoints — no hardcoded constants here.

// Глобальні змінні карти
let map, routingControl, productMarker;
let globalProductCity = "Київ";

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    alert("Ви не авторизовані.");
    window.location.href = "login.html";
    return;
  }

  // Елементи DOM
  const titleEl = document.getElementById("order-title");
  const descEl = document.getElementById("order-description");
  const priceEl = document.getElementById("order-price");
  const categoryEl = document.getElementById("order-category");
  const locationEl = document.getElementById("order-location");
  const photoEl = document.getElementById("order-photo");
  const selectedCityEl = document.getElementById("selected-city-or");

  let categoryMap = {};
  let locationMap = {};
  let selectedCityForOrder = null;

  // Helper: find coordinates by city name (case-insensitive, partial match)
  function getCoordsByCityName(cityName) {
    if (!cityName) return null;
    const name = cityName.trim().toLowerCase();
    for (const id in locationMap) {
      const loc = locationMap[id];
      if (!loc || !loc.city) continue;
      const c = loc.city.toLowerCase();
      if (c === name || name.includes(c) || c.includes(name)) {
        if (loc.latitude != null && loc.longitude != null) return [loc.latitude, loc.longitude];
      }
    }
    return null;
  }

    // 1. Ініціалізація карти
    function initMap() {
      // Встановлюємо початковий вигляд на всю Україну (зум 6 — оптимально)
      map = L.map('ukraine-map').setView([49.0, 32.0], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

      const startPos = getCoordsByCityName(globalProductCity) || [50.45, 30.52];
      // Створюємо маркер товару (без автоматичного .openPopup())
      productMarker = L.marker(startPos).addTo(map).bindPopup(`Товар тут: ${globalProductCity}`);
    }

    function drawRoute(destinationCity) {
      // find matching city name from locationMap (allow partial/case-insensitive)
      const cityKey = (function findCityKey(name) {
        if (!name) return null;
        const n = name.trim().toLowerCase();
        for (const id in locationMap) {
          const loc = locationMap[id];
          if (!loc || !loc.city) continue;
          const c = loc.city.toLowerCase();
          if (c === n || n.includes(c) || c.includes(n)) return loc.city;
        }
        return name;
      })(destinationCity);

      const startCoords = getCoordsByCityName(globalProductCity);
      const endCoords = getCoordsByCityName(cityKey);
      if (!startCoords || !endCoords) return;

      const startLatLng = L.latLng(...startCoords);
      const endLatLng = L.latLng(...endCoords);

      if (routingControl) map.removeControl(routingControl);

      routingControl = L.Routing.control({
        waypoints: [startLatLng, endLatLng],
        routeWhileDragging: false,
        show: false,
        addWaypoints: false,
        // Ми НЕ видаляємо мітки (createMarker залишаємо стандартним),
        // але налаштовуємо їх так, щоб вони не перекривали одна одну
        createMarker: function(i, waypoint, n) {
          const marker = L.marker(waypoint.latLng);
          if (i === 0) marker.bindPopup("Місто відправки");
          if (i === n - 1) marker.bindPopup("Ваше місто (доставка)");
          return marker;
        }
      }).addTo(map);

      // --- Корекція масштабу ---
      const bounds = L.latLngBounds([startLatLng, endLatLng]);

      // Якщо початкове і кінцеве місто — одне і те саме
      if (startLatLng.equals(endLatLng)) {
        map.setView(startLatLng, 9); // Помірне наближення, не на максимум
      } else {
        // Віддаляємо карту, щоб бачити обидва міста
        map.fitBounds(bounds, {
          padding: [70, 70],
          maxZoom: 9 // ОБМЕЖЕННЯ: не дає карті "влетіти" занадто близько до вулиць
        });
      }
    }

    // Ініціалізація
    initMap();

    // 2. Завантаження довідників
    async function loadMetadata() {
      try {
        const [catRes, locRes] = await Promise.all([fetch(CATEGORY_API), fetch(LOCATION_API)]);
        const cats = await catRes.json();
        const locs = await locRes.json();
        // store full objects so we can access delivery_price and coords
        cats.forEach(c => categoryMap[c.id] = c);
        locs.forEach(l => locationMap[l.id] = l);
      } catch (e) { console.error("Metadata error", e); }
    }

    await loadMetadata();

    // 3. Завантаження даних оголошення
    const urlParams = new URLSearchParams(window.location.search);
    let listingId = urlParams.get("id");
    let order = null;

    if (listingId) {
      const res = await fetch(`${API_URL}${listingId}/`, {
        headers: { Authorization: "Bearer " + token }
      });
      if (res.ok) order = await res.json();
    }

    if (!order) {
      const stored = localStorage.getItem("currentOrder");
      if (stored) order = JSON.parse(stored);
    }

    if (!order) {
      alert("Дані відсутні");
      window.location.href = "index.html";
      return;
    }

    // 4. Заповнення інтерфейсу
    const catId = order.category?.id ?? order.category;
    const locId = order.location?.id ?? order.location;
    const categoryObj = categoryMap[catId];
    const categoryName = categoryObj ? categoryObj.name : "Інше";
    const locationObj = locationMap[locId];
    const cityName = locationObj ? locationObj.city : "Київ";

    titleEl.textContent = order.title || "";
    descEl.textContent = order.description || "";
    priceEl.textContent = order.price || 0;
    categoryEl.textContent = categoryName;
    locationEl.textContent = cityName;

    photoEl.src = order.photo
      ? (order.photo.startsWith("http") ? order.photo : `http://127.0.0.1:8000${order.photo}`)
      : PLACEHOLDER_URL;

    // Оновлення карти
    globalProductCity = cityName;
    selectedCityForOrder = cityName;
    selectedCityEl.textContent = cityName;

    const prodCoords = getCoordsByCityName(globalProductCity);
    if (prodCoords) {
      // Видалили .openPopup(), щоб підпис з'являвся тільки при кліку, а не заважав огляду
      productMarker.setLatLng(prodCoords);
      drawRoute(globalProductCity);
    }
  // 5. Ціна та доставка
  const pPrice = Number(order.price) || 0;
  const dPrice = (categoryObj && (categoryObj.delivery_price != null)) ? Number(categoryObj.delivery_price) : 200;
  const fPrice = pPrice + dPrice;

  const summary = document.createElement("div");
  summary.className = "form-section";
  summary.innerHTML = `
    <h2>Остаточна ціна</h2>
    <p>Товар: <strong>${pPrice} грн</strong></p>
    <p>Доставка: <strong>${dPrice} грн</strong></p>
    <hr>
    <p><strong>Разом: <span id="final-price-val">${fPrice}</span> грн</strong></p>
  `;
  document.querySelector(".submit-button").before(summary);

  // 6. Вибір міста
  const cityButtons = document.querySelectorAll('.city-btn-or');
  const extraList = document.querySelector('.extra-city-list-or');

  cityButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const displayTxt = btn.textContent.trim();
      const originalCity = btn.getAttribute('data-city') || displayTxt;

      if (displayTxt === "Всі міста" || displayTxt === "All cities") {
        extraList.classList.toggle('show');
      } else {
        selectedCityForOrder = originalCity;
        selectedCityEl.textContent = displayTxt;
        extraList.classList.remove('show');
        drawRoute(originalCity);
      }
    });
  });

  // 7. Оплата
  document.querySelector(".submit-button").addEventListener("click", async () => {
    const payload = {
      listing: order.id,
      city: selectedCityForOrder,
      delivery_price: dPrice,
      final_price: fPrice,
      card_number: document.getElementById("card-number").value.trim(),
      card_expiry: document.getElementById("card-expiry").value.trim(),
      card_cvc: document.getElementById("card-cvc").value.trim()
    };

    try {
      const res = await fetch(ORDER_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Помилка сервера");
      localStorage.removeItem("currentOrder");
      window.location.href = "index.html";
    } catch (err) { alert(err.message); }
  });

  // 8. Тема та Мова
  initThemeAndLang();
});

function initThemeAndLang() {
  const ls = localStorage, body = document.body;
  const tBtn = document.getElementById('theme-toggle');
  const lBtn = document.getElementById('lang-toggle');
  const lUk = document.getElementById('lang-uk');
  const lEn = document.getElementById('lang-en');

  const updateTheme = (isDark) => {
    body.classList.toggle('dark-mode', isDark);
    document.getElementById('moon-icon')?.classList.toggle('hidden', isDark);
    document.getElementById('sun-icon')?.classList.toggle('hidden', !isDark);
  };

  updateTheme(ls.getItem('theme') === 'dark');

  if(tBtn) tBtn.onclick = () => {
    const isD = body.classList.toggle('dark-mode');
    ls.setItem('theme', isD ? 'dark' : 'light');
    updateTheme(isD);
  };

  const setLang = (lang) => {
    const combo = document.querySelector('.goog-te-combo');
    if (combo) { combo.value = lang; combo.dispatchEvent(new Event('change')); }
  };
  const updateLang = (isEn) => {
    lUk.classList.toggle('active', !isEn);
    lEn.classList.toggle('active', isEn);
  };

  if(lBtn) lBtn.onclick = () => {
    if (ls.getItem('google_lang') !== 'en') {
      setLang('en');
      ls.setItem('google_lang', 'en');
      updateLang(true);
    } else {
      ls.removeItem('google_lang');
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      updateLang(false);
      location.reload();
    }
  };

  if (ls.getItem('google_lang') === 'en') {
    updateLang(true);
  } else {
    updateLang(false);
  }
}

function googleTranslateElementInit() {
  new google.translate.TranslateElement({pageLanguage: 'uk', includedLanguages: 'en', autoDisplay: false}, 'google_translate_element');
}
