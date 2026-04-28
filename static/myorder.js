const ORDER_API = "http://127.0.0.1:8000/api/orders/myorders/";
const DELETE_API = "http://127.0.0.1:8000/api/orders/";
const PLACEHOLDER_URL = "http://127.0.0.1:8000/media/listing_photos/placeholder.png";

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("orders-container");
  const token = localStorage.getItem("accessToken");
  if (!token) {
    container.innerHTML = "Щоб переглянути замовлення, увійдіть в акаунт.";
    return;
  }

  try {
    const res = await fetch(ORDER_API, {
      headers: { Authorization: "Bearer " + token }
    });
    if (!res.ok) throw new Error("Не вдалося завантажити замовлення");

    const orders = await res.json();
    if (!orders.length) {
      container.innerHTML = "<p>У вас ще немає замовлень.</p>";
      return;
    }

    orders.forEach(order => {
      const card = document.createElement("div");
      card.className = "order-card";

      const listing = order.listing_detail || {};

      const img = document.createElement("img");
      img.className = "order-photo";
      img.src = listing.photo
        ? (listing.photo.startsWith("http") ? listing.photo : `http://127.0.0.1:8000${listing.photo}`)
        : PLACEHOLDER_URL;
      img.alt = listing.title || "Фото";

      const info = document.createElement("div");
      info.className = "order-info";
      info.innerHTML = `
        <p><strong>Назва:</strong> ${listing.title || "—"}</p>
        <p><strong>Опис:</strong> ${listing.description || "—"}</p>
        <p><strong>Ціна:</strong> ${listing.price} грн</p>
        <p><strong>Доставка:</strong> ${order.delivery_price} грн</p>
        <p><strong>Місто доставки:</strong> ${order.city || "—"}</p>
        <p><strong>Дата замовлення:</strong> ${new Date(order.created_at).toLocaleString()}</p>
      `;

      const statusRow = document.createElement("div");
      statusRow.className = "status-row-or";

      // --- КНОПКА ЧАТ ---
      const chatBtn = document.createElement("button");
      chatBtn.className = "chat-btn-or"; // Додайте стилі для цього класу в CSS
      chatBtn.textContent = "Чат";

      chatBtn.addEventListener("click", () => {
          const sellerId = listing.user_id; // Цифровий ID продавця
          const listingId = listing.id;

          if (!sellerId) {
              alert("Помилка: не вдалося знайти ID продавця.");
              return;
          }

          // Перевірка на "сам із собою"
          const currentUserId = localStorage.getItem('userId');
          if (currentUserId == sellerId) {
              alert("Це ваше оголошення!");
              return;
          }

          window.location.href = `chat.html?listing_id=${listingId}&with_user=${sellerId}`;
      });
      statusRow.appendChild(chatBtn);

      // --- СТАТУС ---
      const status = document.createElement("div");
      status.className = "status-toggle-or " + (order.paid ? "status-delivered-or" : "status-pending-or");
      status.textContent = order.paid ? "Доставлено" : "Очікування";
      statusRow.appendChild(status);

      // Додаємо кнопку Відмінити якщо Очікування
      if (!order.paid) {
        statusRow.appendChild(createCancelButton(order, card, token));
      }

      // Клик по статусу
      status.addEventListener("click", () => {
        order.paid = !order.paid;

        if (order.paid) {
          status.textContent = "Доставлено";
          status.classList.remove("status-pending-or");
          status.classList.add("status-delivered-or");

          const cancelBtn = statusRow.querySelector(".cancel-btn-or");
          if (cancelBtn) cancelBtn.remove();
        } else {
          status.textContent = "Очікування";
          status.classList.remove("status-delivered-or");
          status.classList.add("status-pending-or");

          if (!statusRow.querySelector(".cancel-btn-or")) {
            statusRow.appendChild(createCancelButton(order, card, token));
          }
        }
      });

      info.appendChild(statusRow);
      card.appendChild(img);
      card.appendChild(info);
      container.appendChild(card);
    });

  } catch (err) {
    container.innerHTML = `<p>Помилка: ${err.message}</p>`;
    console.error(err);
  }
});

// Функція створення кнопки Відмінити
function createCancelButton(order, card, token) {
  const btn = document.createElement("button");
  btn.className = "cancel-btn-or";
  btn.textContent = "Відмінити";

  btn.addEventListener("click", async () => {
    if (!confirm("Ви впевнені, що хочете скасувати замовлення?")) return;

    try {
      const res = await fetch(`${DELETE_API}${order.id}/`, {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + token
        }
      });

      if (!res.ok) throw new Error("Не вдалося скасувати замовлення");
      card.remove();
    } catch (err) {
      alert(err.message);
    }
  });

  return btn;
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



  function googleTranslateElementInit() {
    new google.translate.TranslateElement({pageLanguage: 'uk', includedLanguages: 'en', autoDisplay: false}, 'google_translate_element');
}
