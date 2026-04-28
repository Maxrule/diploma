const API_URL = "http://127.0.0.1:8000/api/listings/";
const CATEGORY_API = "http://127.0.0.1:8000/api/listings/categories/";
const LOCATION_API = "http://127.0.0.1:8000/api/listings/locations/";
const PLACEHOLDER_URL = "http://127.0.0.1:8000/media/listing_photos/placeholder.png";

document.addEventListener("DOMContentLoaded", async () => {
  const s = (id) => document.getElementById(id);
  const ls = localStorage;
  const body = document.body;
  const commentStorageKey = (id) => `listingComments:${id}`;
  const ratingStorageKey = (id) => `listingRatings:${id}`;
  const token = ls.getItem("accessToken");
  let currentUser = null;
  const loadCurrentUser = async () => {
    if (!token) return null;
    try {
      const res = await fetch("/api/auth/me/", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return null;
      const me = await res.json();
      if (me?.username) ls.setItem("username", me.username);
      if (me?.full_name) ls.setItem("full_name", me.full_name);
      currentUser = me;
      return me;
    } catch (e) {
      console.error("loadCurrentUser error", e);
      return null;
    }
  };

  await loadCurrentUser();

  // Admin link visibility
  (async function checkAdminLink() {
    const adminLinks = document.querySelectorAll(".admin-link");
    adminLinks.forEach(a => { a.style.display = "none"; });
    if (!token) return;
    try {
      const me = currentUser || await loadCurrentUser();
      if (!me) return;
      if (me?.username?.toLowerCase() === "admin") {
        adminLinks.forEach(a => { a.style.display = "inline-block"; });
      }
    } catch (e) {
      console.error("checkAdminLink error", e);
    }
  })();

  // Theme
  const tBtn = s("theme-toggle");
  const mIcon = s("moon-icon");
  const sIcon = s("sun-icon");
  const updT = (isDark) => {
    body.classList.toggle("dark-mode", isDark);
    mIcon.classList.toggle("hidden", isDark);
    sIcon.classList.toggle("hidden", !isDark);
  };
  updT(ls.getItem("theme") === "dark");
  tBtn.onclick = () => {
    const isDark = body.classList.toggle("dark-mode");
    ls.setItem("theme", isDark ? "dark" : "light");
    updT(isDark);
  };

  // Language
  const lBtn = s("lang-toggle");
  const lUk = s("lang-uk");
  const lEn = s("lang-en");
  const updL = (isEn) => {
    lUk.classList.toggle("active", !isEn);
    lEn.classList.toggle("active", isEn);
  };
  lBtn.onclick = () => {
    if (ls.getItem("google_lang") !== "en") {
      ls.setItem("google_lang", "en");
      updL(true);
      document.cookie = "googtrans=/uk/en; path=/";
      location.reload();
    } else {
      ls.removeItem("google_lang");
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      updL(false);
      location.reload();
    }
  };
  updL(ls.getItem("google_lang") === "en");

  const params = new URLSearchParams(window.location.search);
  const listingId = params.get("id");
  if (!listingId) {
    alert("Оголошення не знайдено.");
    window.location.href = "index.html";
    return;
  }

  let categoryMap = {};
  let locationMap = {};
  try {
    const [catRes, locRes] = await Promise.all([
      fetch(CATEGORY_API),
      fetch(LOCATION_API)
    ]);
    if (catRes.ok) {
      const cats = await catRes.json();
      cats.forEach(c => { categoryMap[c.id] = c.name; });
    }
    if (locRes.ok) {
      const locs = await locRes.json();
      locs.forEach(l => { locationMap[l.id] = l.city; });
    }
  } catch (e) {
    console.warn("metadata fetch error", e);
  }

  let item = null;
  try {
    const res = await fetch(`${API_URL}${listingId}/`);
    if (res.ok) item = await res.json();
  } catch (e) {
    console.error("listing fetch error", e);
  }

  if (!item) {
    alert("Оголошення не знайдено.");
    window.location.href = "index.html";
    return;
  }

  const photoUrl = item.photo
    ? (item.photo.startsWith("http") ? item.photo : `http://127.0.0.1:8000${item.photo}`)
    : PLACEHOLDER_URL;

  const normalizePhotoUrl = (url) => {
    if (!url) return PLACEHOLDER_URL;
    return url.startsWith("http") ? url : `http://127.0.0.1:8000${url}`;
  };

  let photoList = Array.isArray(item.photos) && item.photos.length
    ? item.photos.map(normalizePhotoUrl)
    : [photoUrl];
  let photoIndex = 0;
  const photoEl = s("listing-photo");
  const photoFrame = photoEl.closest(".listing-photo-frame");
  const thumbsEl = s("listing-photo-thumbs");
  const prevBtn = s("listing-prev");
  const nextBtn = s("listing-next");

  const renderPhoto = () => {
    photoEl.src = photoList[photoIndex] || PLACEHOLDER_URL;
  };
  const updateArrows = () => {
    const hasMany = photoList.length > 1;
    prevBtn.style.display = hasMany ? "flex" : "none";
    nextBtn.style.display = hasMany ? "flex" : "none";
  };
  const renderThumbs = () => {
    thumbsEl.innerHTML = "";
    photoList.forEach((url, index) => {
      const thumbBtn = document.createElement("button");
      thumbBtn.type = "button";
      thumbBtn.className = `listing-photo-thumb-btn${index === photoIndex ? " active" : ""}`;
      thumbBtn.setAttribute("aria-label", `Фото ${index + 1}`);
      thumbBtn.style.backgroundImage = `url('${url}')`;
      thumbBtn.onclick = () => {
        photoIndex = index;
        renderPhoto();
        renderThumbs();
      };
      thumbsEl.appendChild(thumbBtn);
    });
  };

  prevBtn.onclick = () => {
    if (photoList.length <= 1) return;
    photoIndex = (photoIndex - 1 + photoList.length) % photoList.length;
    renderPhoto();
    renderThumbs();
  };
  nextBtn.onclick = () => {
    if (photoList.length <= 1) return;
    photoIndex = (photoIndex + 1) % photoList.length;
    renderPhoto();
    renderThumbs();
  };

  renderPhoto();
  updateArrows();
  renderThumbs();

  const updateZoomOrigin = (event) => {
    const rect = photoEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    const y = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1);
    photoEl.style.transformOrigin = `${x * 100}% ${y * 100}%`;
  };

  photoEl.addEventListener("mouseenter", (event) => {
    photoFrame.classList.add("zoom-active");
    updateZoomOrigin(event);
  });
  photoEl.addEventListener("mousemove", updateZoomOrigin);
  photoEl.addEventListener("mouseleave", () => {
    photoFrame.classList.remove("zoom-active");
    photoEl.style.transformOrigin = "50% 50%";
  });
  s("listing-title").textContent = item.title || "—";
  s("listing-price").textContent = item.price ?? "—";
  s("listing-category").textContent = categoryMap[item.category] || "—";
  s("listing-location").textContent = locationMap[item.location] || "—";
  s("listing-description").textContent = item.description || "—";
  const fullTitleEl = s('listing-full-title');
  if (fullTitleEl) fullTitleEl.textContent = item.title || "—";

  const commentsListEl = s("listing-comments-list");
  const commentsCountEl = s("listing-comments-count");
  const commentsBadgeEl = s("listing-comments-badge");
  const commentInputEl = s("listing-comment-input");
  const commentSubmitEl = s("listing-comment-submit");
  const ratingStarsTopEl = s("listing-stars");
  const ratingValueTopEl = document.querySelector(".listing-rating-value");
  const ratingPickerEl = s("listing-rating-picker");
  const ratingStarBtns = ratingPickerEl ? Array.from(ratingPickerEl.querySelectorAll(".rating-star-btn")) : [];
  const currentUserIdRaw = ls.getItem("userId");
  const currentUserName =
    (currentUser?.full_name && currentUser.full_name.trim()) ||
    (currentUser?.username && currentUser.username.trim()) ||
    ls.getItem("full_name") ||
    ls.getItem("username") ||
    ls.getItem("userName") ||
    "";
  const currentRaterKey = String(
    currentUserIdRaw ||
    (currentUser?.id != null ? currentUser.id : "") ||
    (currentUser?.username ? `user:${currentUser.username}` : "") ||
    "guest"
  );

  const getStoredComments = () => {
    try {
      const parsed = JSON.parse(ls.getItem(commentStorageKey(item.id)) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };

  const getStoredRatings = () => {
    try {
      const parsed = JSON.parse(ls.getItem(ratingStorageKey(item.id)) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };

  const saveStoredRatings = (ratings) => {
    ls.setItem(ratingStorageKey(item.id), JSON.stringify(ratings));
  };

  const getAverageRating = (ratings) => {
    if (!ratings.length) return 5;
    const total = ratings.reduce((sum, entry) => sum + Number(entry.value || 0), 0);
    return total / ratings.length;
  };

  const renderTopRating = () => {
    const ratings = getStoredRatings();
    const average = getAverageRating(ratings);
    if (ratingValueTopEl) ratingValueTopEl.textContent = average.toFixed(1);
    if (ratingStarsTopEl) {
      const filled = Math.round(average);
      ratingStarsTopEl.textContent = "★★★★★";
      ratingStarsTopEl.setAttribute("data-filled", String(filled));
      ratingStarsTopEl.style.background = `linear-gradient(90deg, #7d8489 ${(average / 5) * 100}%, #b8c2cc ${(average / 5) * 100}%)`;
      ratingStarsTopEl.style.webkitBackgroundClip = "text";
      ratingStarsTopEl.style.backgroundClip = "text";
      ratingStarsTopEl.style.webkitTextFillColor = "transparent";
    }
  };

  const paintPickerStars = (value, mode = "active") => {
    ratingStarBtns.forEach((btn) => {
      const starValue = Number(btn.dataset.rating);
      btn.classList.toggle("is-active", mode === "active" && starValue <= value);
      btn.classList.toggle("is-preview", mode === "preview" && starValue <= value);
    });
  };

  const getCurrentUserRating = () => {
    const ratings = getStoredRatings();
    return ratings.find((entry) => String(entry.userKey) === currentRaterKey)?.value || 0;
  };

  const formatCommentDate = (isoString) => {
    try {
      return new Date(isoString).toLocaleDateString("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    } catch (e) {
      return "";
    }
  };

  const updateCommentsMeta = (comments) => {
    const count = comments.length;
    const commentsLabel =
      count === 1 ? "1 коментар" :
      count >= 2 && count <= 4 ? `${count} коментарі` :
      `${count} коментарів`;
    if (commentsCountEl) commentsCountEl.textContent = commentsLabel;
    if (commentsBadgeEl) commentsBadgeEl.textContent = String(count);
  };

  const renderComments = () => {
    if (!commentsListEl) return;
    const comments = getStoredComments();
    updateCommentsMeta(comments);
    commentsListEl.innerHTML = "";

    if (!comments.length) {
      const emptyCard = document.createElement("div");
      emptyCard.className = "listing-comment-card empty";
      emptyCard.textContent = "Поки що немає коментарів. Будьте першим.";
      commentsListEl.appendChild(emptyCard);
      return;
    }

    comments.forEach((comment) => {
      const card = document.createElement("article");
      card.className = "listing-comment-card";
      card.innerHTML = `
        <div class="listing-comment-card-head">
          <span class="listing-comment-author">${comment.author}</span>
          <span class="listing-comment-date">${formatCommentDate(comment.createdAt)}</span>
        </div>
        <div class="listing-comment-text"></div>
      `;
      card.querySelector(".listing-comment-text").textContent = comment.text;
      commentsListEl.appendChild(card);
    });
  };

  renderComments();
  renderTopRating();

  if (ratingStarBtns.length) {
    paintPickerStars(getCurrentUserRating(), "active");

    ratingStarBtns.forEach((btn) => {
      btn.addEventListener("mouseenter", () => {
        paintPickerStars(Number(btn.dataset.rating), "preview");
      });

      btn.addEventListener("click", () => {
        const value = Number(btn.dataset.rating);
        const ratings = getStoredRatings();
        const existingIndex = ratings.findIndex((entry) => String(entry.userKey) === currentRaterKey);
        const payload = {
          userKey: currentRaterKey,
          value,
          updatedAt: new Date().toISOString()
        };
        if (existingIndex >= 0) {
          ratings[existingIndex] = payload;
        } else {
          ratings.push(payload);
        }
        saveStoredRatings(ratings);
        paintPickerStars(value, "active");
        renderTopRating();
      });
    });

    ratingPickerEl.addEventListener("mouseleave", () => {
      paintPickerStars(getCurrentUserRating(), "active");
    });
  }

  if (commentSubmitEl && commentInputEl) {
    commentSubmitEl.onclick = () => {
      const text = commentInputEl.value.trim();
      if (!text) {
        commentInputEl.focus();
        return;
      }

      const username =
        (currentUser?.full_name && currentUser.full_name.trim()) ||
        (currentUser?.username && currentUser.username.trim()) ||
        ls.getItem("full_name") ||
        ls.getItem("username") ||
        ls.getItem("userName") ||
        "Гість";
      const comments = getStoredComments();
      comments.unshift({
        author: username,
        text,
        createdAt: new Date().toISOString()
      });
      ls.setItem(commentStorageKey(item.id), JSON.stringify(comments.slice(0, 30)));
      commentInputEl.value = "";
      renderComments();
    };
  }

  const currentUserId = Number(ls.getItem("userId"));
  const sellerId = Number(item.user_id);
  const chatBtn = s("chat-btn");
  const orderBtn = s("order-btn");

  if (currentUserId && sellerId && currentUserId === sellerId) {
    chatBtn.style.display = "none";
    orderBtn.style.display = "none";
  } else {
    chatBtn.onclick = () => {
      window.location.href = `chat.html?listing_id=${item.id}&with_user=${item.user_id}`;
    };
    orderBtn.onclick = () => {
      const orderData = {
        id: item.id,
        title: item.title,
        description: item.description,
        price: item.price,
        photo: photoList[photoIndex] || photoUrl,
        seller: item.name || "—",
        category: item.category,
        location: item.location
      };
      ls.setItem("currentOrder", JSON.stringify(orderData));
      window.location.href = "order.html";
    };
  }
});

function googleTranslateElementInit() {
  new google.translate.TranslateElement(
    { pageLanguage: "uk", includedLanguages: "en", autoDisplay: false },
    "google_translate_element"
  );
}
