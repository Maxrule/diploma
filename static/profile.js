const API_URL = "http://127.0.0.1:8000/api/listings/";
const CATEGORY_API = "http://127.0.0.1:8000/api/listings/categories/";
const LOCATION_API = "http://127.0.0.1:8000/api/listings/locations/";
const PLACEHOLDER_URL = "http://127.0.0.1:8000/media/listing_photos/placeholder.png";

let categoryMap = {};
let locationMap = {};
let msnry; // Masonry instance

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('accessToken');
  const profileForm = document.getElementById('profile-form');
  const logoutBtn = document.getElementById('logout-btn');
  const unauthBlock = document.getElementById('unauthenticated-block');
  const authenticatedLayout = document.getElementById('authenticated-layout');
  const profileDisplayName = document.getElementById('profile-display-name');
  const profileAvatarCircle = document.getElementById('profile-avatar-circle');
  const statusMsg = document.getElementById('status-message');
  const showListingsBtn = document.getElementById('show-my-listings-btn');
  const myListingsModal = document.getElementById('my-listings-modal');
  const closeMyListingsBtn = document.getElementById('close-my-listings');
  const myListingGrid = document.getElementById('my-listing-grid');
  const blockedModal = document.getElementById('blocked-modal');
  const closeBlockedModalBtn = document.getElementById('close-blocked-modal');
  const blockedReasonText = document.getElementById('blocked-reason-text');
  const blockedMessageInput = document.getElementById('blocked-message-input');
  const blockedSendBtn = document.getElementById('blocked-send-btn');
  let blockedTargetId = null;

  if (!token) {
    unauthBlock.style.display = 'block';
    return;
  }

  try {
    await loadCategories();
    await loadLocations();
  } catch (err) {
    console.error('Помилка завантаження категорій/локацій:', err);
  }

  async function loadProfile() {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/auth/me/', {
        headers: { Authorization: 'Bearer ' + token }
      });

      if (!res.ok) throw new Error('Не вдалося увійти в профіль');
      const user = await res.json();

      profileForm.username.value = user.username;
      profileForm.email.value = user.email;
      profileForm.full_name.value = user.full_name || '';
      profileForm.phone.value = user.phone || '';
      const displayName = (user.full_name && user.full_name.trim()) || user.username || 'Користувач';
      profileDisplayName.textContent = displayName;
      profileAvatarCircle.textContent = displayName.charAt(0).toUpperCase();

      authenticatedLayout.style.display = 'grid';
      profileForm.style.display = 'block';
      logoutBtn.style.display = 'inline-block';
      showListingsBtn.style.display = 'block';
    } catch (err) {
      statusMsg.textContent = err.message;
      unauthBlock.style.display = 'block';
    }
  }

  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusMsg.textContent = '';

    try {
      const payload = {
        email: profileForm.email.value,
        full_name: profileForm.full_name.value,
        phone: profileForm.phone.value
      };

      const res = await fetch('http://127.0.0.1:8000/api/auth/me/', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Помилка оновлення профілю');
      statusMsg.textContent = 'Дані збереженні!';
    } catch (err) {
      statusMsg.textContent = err.message;
    }
  });

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userId');
    window.location.reload();
  });

  showListingsBtn.addEventListener('click', () => {
    myListingsModal.style.display = 'block';
    loadMyListings();
  });

  closeMyListingsBtn.addEventListener('click', () => {
    myListingsModal.style.display = 'none';
  });

  function openBlockedModal(listing) {
    blockedTargetId = listing.id;
    const reason = (listing.report_reason || '').trim();
    blockedReasonText.textContent = `Причина: ${reason || 'Порушення правил платформи'}`;
    blockedMessageInput.value = listing.report_message || '';
    blockedModal.style.display = 'grid';
  }

  closeBlockedModalBtn?.addEventListener('click', () => {
    blockedModal.style.display = 'none';
  });

  blockedSendBtn?.addEventListener('click', async () => {
    if (!blockedTargetId) return;
    const reportMessage = blockedMessageInput.value.trim();
    if (!reportMessage) {
      alert('Введіть повідомлення для адміністратора.');
      return;
    }

    try {
      blockedSendBtn.disabled = true;
      blockedSendBtn.textContent = 'Надсилання...';
      const res = await fetch(`${API_URL}report-message/${blockedTargetId}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({ report_message: reportMessage })
      });
      if (!res.ok) throw new Error('Не вдалося надіслати повідомлення');
      blockedSendBtn.textContent = 'Надіслано';
      setTimeout(() => {
        blockedSendBtn.disabled = false;
        blockedSendBtn.textContent = 'Надіслати';
      }, 700);
      await loadMyListings();
    } catch (err) {
      alert('Помилка: ' + err.message);
      blockedSendBtn.disabled = false;
      blockedSendBtn.textContent = 'Надіслати';
    }
  });

  async function loadCategories() {
    const res = await fetch(CATEGORY_API);
    if (!res.ok) throw new Error('Помилка завантаження категорій');
    const data = await res.json();
    data.forEach(cat => {
      categoryMap[cat.id] = cat.name;
    });
  }

  async function loadLocations() {
    const res = await fetch(LOCATION_API);
    if (!res.ok) throw new Error('Помилка завантаження місцезнаходження');
    const data = await res.json();
    data.forEach(loc => {
      locationMap[loc.id] = `${loc.city}`;
    });
  }

  async function loadMyListings() {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/listings/mine/', {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!res.ok) throw new Error('Помилка завантаження оголошень');
      const data = await res.json();

      myListingGrid.innerHTML = '';

      if (!data.length) {
        myListingGrid.innerHTML = '<p>У вас немає оголошень.</p>';
        return;
      }

      data.forEach(listing => {
        let photoUrl = PLACEHOLDER_URL;
        let imgClass = "listing-image";
        if (listing.photo) {
          photoUrl = listing.photo.startsWith("http") ? listing.photo : `http://127.0.0.1:8000${listing.photo}`;
        } else {
          imgClass += " placeholder-image";
        }

        const item = document.createElement('div');
        item.className = 'listing-card vip-listing-card';
        // Use the same card layout as on the main page (image, title, price, meta)
        // but keep action buttons (status/promote/edit/delete). Description is omitted.
        const priceText = listing.price ? listing.price + ' грн' : '—';
        item.innerHTML = `
          <div class="listing-image-wrapper">
            <img src="${photoUrl}" alt="Фото" class="${imgClass}">
          </div>
          <div class="vip-title-row">
            <h3 class="vip-title">${listing.title}</h3>
          </div>
          <div class="vip-price-below">${priceText}</div>
          <div class="vip-cat-row">
            <div class="vip-category">${categoryMap[listing.category] || '—'}</div>
            <div class="vip-city">${locationMap[listing.location] || '—'}</div>
          </div>
          <div class="listing-actions">
            <button class="status-btn" data-id="${listing.id}" data-active="${listing.is_active}">${listing.is_active ? 'Активне' : 'Неактивне'}</button>
            <button class="promote-btn" data-id="${listing.id}" data-title="${listing.title}">Підняти в ТОП</button>
            <button class="edit-btn" data-id="${listing.id}">Редагувати</button>
            <button class="delete-btn" data-id="${listing.id}">Видалити</button>
          </div>
        `;

        myListingGrid.appendChild(item);
        // apply visual state for inactive
        if (!listing.is_active) item.classList.add('inactive');
        if (listing.reported) {
          item.classList.add('blocked');
          const overlay = document.createElement('div');
          overlay.className = 'blocked-overlay';
          overlay.textContent = 'Заблоковано';
          item.appendChild(overlay);
          item.addEventListener('click', () => openBlockedModal(listing));
        } else {
          // only navigate for non-blocked listings
          item.addEventListener('click', () => {
            window.location.href = `listing.html?id=${listing.id}`;
          });
        }
      });

      myListingGrid.querySelectorAll('.listing-card.blocked .listing-actions button').forEach(btn => {
        btn.disabled = true;
      });

      myListingGrid.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          const card = button.closest('.listing-card');
          if (card?.classList.contains('blocked')) return;
          const listingId = button.getAttribute('data-id');
          window.location.href = `edit-listing.html?id=${listingId}`;
        });
      });

      myListingGrid.querySelectorAll('.delete-btn').forEach(button => {
          button.addEventListener('click', async (event) => {
            event.stopPropagation();
            const card = button.closest('.listing-card');
            if (card?.classList.contains('blocked')) return;
            const listingId = button.getAttribute('data-id');
            const confirmDelete = confirm("Ви впевнені, що хочете видалити це оголошення?");
            if (!confirmDelete) return;

            try {
              const deleteRes = await fetch(`${API_URL}${listingId}/`, {
                method: 'DELETE',
                headers: {
                  Authorization: 'Bearer ' + token
                }
              });

              if (!deleteRes.ok) throw new Error('Помилка при видаленні оголошення');


              loadMyListings(); // перезавантажити список
            } catch (err) {
              alert('Не вдалося видалити оголошення: ' + err.message);
            }
          });
      });

      myListingGrid.querySelectorAll('.status-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
          event.stopPropagation();
          const card = button.closest('.listing-card');
          if (card?.classList.contains('blocked')) return;
          const listingId = button.getAttribute('data-id');
          try {
            const res = await fetch(`${API_URL}toggle_active/${listingId}/`, {
              method: 'POST',
              headers: {
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json'
              }
            });
            if (!res.ok) throw new Error('Не вдалося змінити статус');
            const updated = await res.json();
            // update button text and visual state
            button.textContent = updated.is_active ? 'Активне' : 'Неактивне';
            button.setAttribute('data-active', updated.is_active);
            const card = button.closest('.listing-card');
            if (updated.is_active) {
              card.classList.remove('inactive');
            } else {
              card.classList.add('inactive');
            }
            // main page will automatically hide inactive items because API now filters is_active
          } catch (err) {
            alert('Помилка: ' + err.message);
          }
        });
      });

      // promote button handling
      myListingGrid.querySelectorAll('.promote-btn').forEach(button => {
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          const card = button.closest('.listing-card');
          if (card?.classList.contains('blocked')) return;
          const listingId = button.getAttribute('data-id');
          const listingTitle = button.getAttribute('data-title');
          openPromoteModal(listingId, listingTitle);
        });
      });


      if (msnry) {
        msnry.destroy();
      }
      msnry = new Masonry(myListingGrid, {
        itemSelector: '.listing-card',
        columnWidth: 304,
        gutter: 16,
        fitWidth: true,
      });

    } catch (err) {
      alert('Не вдалося завантажити оголошення.');
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
        if (el) {
            el.value = c;
            el.dispatchEvent(new Event('change'));
            return true;
        }
        return false;
    };
    const updL = (isEn) => {
        lUk.classList.toggle('active', !isEn);
        lEn.classList.toggle('active', isEn);
    };

    lBtn.onclick = () => {
        if (ls.getItem('google_lang') !== 'en') {
            const changed = chL('en');
            ls.setItem('google_lang', 'en');
            updL(true);
            if (!changed) {
                document.cookie = 'googtrans=/uk/en; path=/';
                location.reload();
            }
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


  // Запускаем загрузку профиля при загрузке страницы
  loadProfile();
  // Promote modal logic
  const promoteModal = document.getElementById('promote-modal');
  const closePromoteBtn = document.getElementById('close-promote');
  const promoteTitle = document.getElementById('promote-listing-title');
  const promoteSubmit = document.getElementById('promote-submit');
  let promoteTargetId = null;

  function openPromoteModal(listingId, title) {
    promoteTargetId = listingId;
    promoteTitle.textContent = title;
    promoteModal.style.display = 'grid';
  }

  closePromoteBtn.addEventListener('click', () => {
    promoteModal.style.display = 'none';
  });

  promoteSubmit.addEventListener('click', async () => {
    if (!promoteTargetId) return;
    const period = document.querySelector('input[name="promote-period"]:checked').value;
    const cardNumber = document.getElementById('prom-card-number').value.trim();
    const cardExpiry = document.getElementById('prom-card-expiry').value.trim();
    const cardCvc = document.getElementById('prom-card-cvc').value.trim();

    // basic validation
    if (!cardNumber || !cardExpiry || !cardCvc) {
      alert('Будь ласка, введіть дані картки');
      return;
    }

    try {
      const res = await fetch(`${API_URL}promote/${promoteTargetId}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({ period, card_number: cardNumber, card_expiry: cardExpiry, card_cvc: cardCvc })
      });
      if (!res.ok) throw new Error('Оплата не пройшла');
      promoteModal.style.display = 'none';
      loadMyListings();
    } catch (err) {
      alert('Помилка: ' + err.message);
    }
  });
});
  function googleTranslateElementInit() {
    new google.translate.TranslateElement({pageLanguage: 'uk', includedLanguages: 'en', autoDisplay: false}, 'google_translate_element');
}

