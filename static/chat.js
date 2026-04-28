const $ = id => document.getElementById(id);
const chatWindow = $('chat-window');
const chatForm = $('chat-form');
const chatInput = $('chat-input');
const interlocutorNameElem = $('interlocutor-name');
const productTitleElem = $('product-title');
const chatsListElem = $('chats-list');
const buyerBtn = $('buyer-btn');
const sellerBtn = $('seller-btn');

// Параметри з URL
const urlParams = new URLSearchParams(window.location.search);
const listingId = urlParams.get('listing_id');
const withUserId = urlParams.get('with_user');

// Стан додатку
let chatSocket = null;
let currentUserId = null;
let currentMode = urlParams.get('mode') || 'buyer';


// Безпечна функція для вставки текстового повідомлення у вікно чату
function appendMessage(text, isMine = false) {
    if (!chatWindow) return;
    const msg = document.createElement('div');
    msg.className = `chat-message ${isMine ? 'buyer' : 'seller'}`;
    const content = document.createElement('div');
    content.className = 'message-text';
    content.textContent = text;
    msg.appendChild(content);
    chatWindow.appendChild(msg);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Формує та відкриває WebSocket-з'єднання
function connectWebSocket(realId) {
    const token = localStorage.getItem('accessToken');
    if (!token || !listingId || !realId) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${protocol}//${window.location.host}/ws/chat/${listingId}/${realId}/?token=${token}`;

    // Закриваємо попередній сокет, якщо існує
    if (chatSocket && chatSocket.readyState === WebSocket.OPEN) chatSocket.close();

    chatSocket = new WebSocket(socketUrl);

    chatSocket.addEventListener('open', () => {
        console.info('WebSocket: підключено');
    });

    chatSocket.addEventListener('message', (e) => {
        try {
            const data = JSON.parse(e.data);
            // Очікуємо { message, sender_id, timestamp }
            appendMessage(data.message || '', String(data.sender_id) === String(currentUserId));
        } catch (err) {
            console.error('WS parse error:', err);
        }
    });

    chatSocket.addEventListener('close', () => {
        console.warn('WebSocket закритий');

    });

    chatSocket.addEventListener('error', (err) => console.error('WebSocket error:', err));
}

// Завантажуємо список чатів для sidebar
async function loadChatsList() {
    if (!chatsListElem) return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
        const res = await fetch(`/api/my-chats/?mode=${currentMode}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Не вдалося отримати чати');
        const chats = await res.json();

        chatsListElem.innerHTML = '';
        if (!Array.isArray(chats) || chats.length === 0) {
            const p = document.createElement('p');
            p.className = 'sidebar-placeholder';
            p.textContent = `Чати (${currentMode === 'buyer' ? 'покупки' : 'продажі'}) відсутні`;
            chatsListElem.appendChild(p);
            return;
        }

        chats.forEach(chat => {
            const item = document.createElement('div');
            const isActive = String(listingId) === String(chat.listing_id) && String(withUserId) === String(chat.other_user_id);
            item.className = `chat-item ${isActive ? 'active' : ''}`;

            item.innerHTML = `
                <div class="chat-item-info">
                    <div class="chat-item-header"><strong>${chat.other_user_name}</strong><span class="chat-time">${chat.timestamp || ''}</span></div>
                    <div class="chat-item-listing">${chat.listing_title || ''}</div>
                </div>`;

            item.addEventListener('click', () => {
                window.location.href = `chat.html?listing_id=${chat.listing_id}&with_user=${chat.other_user_id}&mode=${currentMode}`;
            });
            chatsListElem.appendChild(item);
        });
    } catch (err) {
        console.error('loadChatsList error:', err);
    }
}

// Ініціалізація конкретного чату: завантаження історії та підключення сокета
async function initChatIfNeeded() {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    if (!listingId || !withUserId) return;
    if (!chatForm || !chatWindow) return;

    chatForm.style.display = 'flex';
    chatWindow.innerHTML = '';

    try {
        const res = await fetch(`/api/chat-info/${listingId}/${withUserId}/`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (!res.ok) throw new Error('Помилка при завантаженні чату');
        const data = await res.json();

        currentUserId = data.current_user_id;
        if (interlocutorNameElem) interlocutorNameElem.textContent = data.user_name || '';
        if (productTitleElem) productTitleElem.textContent = data.listing_title || '';

        if (!Array.isArray(data.history) || data.history.length === 0) {
            chatWindow.innerHTML = '<p class="chat-placeholder">Повідомлень ще немає. Напишіть першим!</p>';
        } else {
            data.history.forEach(m => appendMessage(m.text || '', String(m.sender_id) === String(currentUserId)));
        }

        // Підключення до WS з реальним id користувача 
        if (data.other_user_real_id) connectWebSocket(data.other_user_real_id);
    } catch (err) {
        console.error('initChatIfNeeded error:', err);
        chatWindow.innerHTML = `<p class="chat-placeholder" style="color:red;">Помилка: ${err.message}</p>`;
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return window.location.href = 'login.html';

    // Кнопки режиму (купую/продаю)
    if (buyerBtn && sellerBtn) {
        buyerBtn.addEventListener('click', () => { currentMode = 'buyer'; updateModeButtons(); loadChatsList(); });
        sellerBtn.addEventListener('click', () => { currentMode = 'seller'; updateModeButtons(); loadChatsList(); });
        updateModeButtons();
    }

    // Завантаження списку чатів та ініціалізація чату, якщо вказано
    await loadChatsList();
    await initChatIfNeeded();

    // Тема та мова: мінімальні захисні обробники 
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



    // Відправка повідомлення
    if (chatForm && chatInput) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (!text) return;
            if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
                chatSocket.send(JSON.stringify({ message: text }));
                chatInput.value = '';
            }
        });
    }
});

// Функція для ініціалізації Google Translate 
function googleTranslateElementInit() {
    if (typeof google !== 'undefined' && google.translate) {
        new google.translate.TranslateElement({ pageLanguage: 'uk', includedLanguages: 'en', autoDisplay: false }, 'google_translate_element');
    }
}

// Оновлює стан кнопок режиму
function updateModeButtons() {
    if (buyerBtn) buyerBtn.classList.toggle('active', currentMode === 'buyer');
    if (sellerBtn) sellerBtn.classList.toggle('active', currentMode === 'seller');
}

