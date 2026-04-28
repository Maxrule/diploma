// admin.js — логіка для адмін-панелі: фільтр періодів, завантаження статистики та побудова графіків

const ctxVisits = document.getElementById('visitsChart');
const ctxRegs = document.getElementById('registrationsChart');
const ctxLists = document.getElementById('listingsChart');

let visitsChart, regsChart, listsChart;

// Показати/приховати кастомний період
const periodBtns = document.querySelectorAll('.period-btn');
const customRange = document.getElementById('custom-range');
const fromDateEl = document.getElementById('from-date');
const toDateEl = document.getElementById('to-date');
const applyCustomBtn = document.getElementById('apply-custom');
const moderationTableBody = document.querySelector('#moderation-table tbody');
const reloadModerationBtn = document.getElementById('reload-moderation');

periodBtns.forEach(btn=>btn.addEventListener('click',()=>{
  periodBtns.forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const period = btn.dataset.period;
  if(period==='custom') customRange.style.display='flex'; else customRange.style.display='none';
  loadAndRender(period);
}));

applyCustomBtn?.addEventListener('click',()=>{
  const from = fromDateEl.value; const to = toDateEl.value;
  if(!from||!to) return alert('Вкажіть обидві дати');
  loadAndRender('custom',{from,to});
});

// Функція отримання статистики з API (або фейкові дані, якщо API недоступний)
async function fetchStats(period='7', opts={}){
  try{
    // Припускаємо, що на сервері є endpoint /api/admin/stats?period=...
    const params = new URLSearchParams();
    if(period!=='custom') params.set('period', period);
    if(opts.from) params.set('from', opts.from);
    if(opts.to) params.set('to', opts.to);
    const token = localStorage.getItem('accessToken');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(`/api/admin/stats?${params.toString()}`, { headers });
    if(!res.ok) {
      const txt = await res.text().catch(()=>null);
      if(res.status === 401){
        console.error('Admin stats API error 401 — не аутентифікований', txt);
        // Явно повертаємо null, фронт покажете повідомлення про логін
        return null;
      }
      if(res.status === 403){
        console.error('Admin stats API error 403 — немає прав', txt);
        return null;
      }
      if(res.status === 404){
        console.error('Admin stats API error 404 — endpoint не знайдено', txt);
        return null;
      }
      console.error('Admin stats API error', res.status, txt);
      return null;
    }

    const data = await res.json();
    // Очікуємо структуру: { total_users, new_users, total_listings, active_listings, inactive_listings, visits_day, visits_week, visits_month, labels, visits, registrations, listings }
    if(!data || !Array.isArray(data.labels) || !Array.isArray(data.visits)){
      console.error('Unexpected stats shape', data);
      throw new Error('Invalid data');
    }
    return data;
  }catch(e){
    // Якщо API непрацює — повертаємо null і залишаємо можливість показати повідомлення помилки
    console.error('fetchStats failed', e);
    return null;
  }
}

function generateFakeStats(period, opts){
  // Кількість точок даних
  let days=7;
  if(period==='1') days=1; else if(period==='7') days=7; else if(period==='30') days=30; else if(period==='90') days=90; else if(period==='365') days=365; else if(period==='custom' && opts.from&&opts.to){
    const from=new Date(opts.from); const to=new Date(opts.to);
    days = Math.max(1, Math.round((to-from)/(1000*60*60*24)));
  }

  const labels = [];
  const visits=[]; const regs=[]; const lists=[];
  for(let i=days-1;i>=0;i--){
    const d = new Date(); d.setDate(d.getDate()-i);
    labels.push(d.toISOString().slice(0,10));
    visits.push(Math.round(200+Math.random()*800));
    regs.push(Math.round(1+Math.random()*20));
    lists.push(Math.round(5+Math.random()*40));
  }

  return {
    total_users: Math.round(5000+Math.random()*5000),
    new_users: regs.reduce((a,b)=>a+b,0),
    total_listings: Math.round(12000+Math.random()*2000),
    active_listings: Math.round(8000+Math.random()*2000),
    inactive_listings: Math.round(2000+Math.random()*1000),
    visits_day: Math.round(500+Math.random()*500),
    visits_week: visits.slice(-7).reduce((a,b)=>a+b,0),
    visits_month: visits.slice(-30).reduce((a,b)=>a+b,0),
    orders_total_count: Math.round(50 + Math.random() * 200),
    orders_canceled_count: Math.round(Math.random() * 30),
    labels: labels,
    visits: visits,
    registrations: regs,
    listings: lists
  };
}

async function loadAndRender(period='7', opts={}){
  // показати loading state
  renderLoading();
  await loadModerationListings();
  const stats = await fetchStats(period, opts);
  if(!stats){
    renderErrorState();
    return;
  }
  renderStatsCards(stats, period);
  renderCharts(stats, period);
  renderOrdersTable(stats);
}

function getAuthHeaders(){
  const token = localStorage.getItem('accessToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function toInputDateTimeValue(value){
  if(!value) return '';
  const dt = new Date(value);
  if(Number.isNaN(dt.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = dt.getFullYear();
  const mm = pad(dt.getMonth() + 1);
  const dd = pad(dt.getDate());
  const hh = pad(dt.getHours());
  const mi = pad(dt.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function toDisplayDateTime(value){
  if(!value) return '—';
  const dt = new Date(value);
  if(Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString();
}

function toApiDateTime(value){
  if(!value) return null;
  const dt = new Date(value);
  if(Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

function escapeHtml(value){
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function loadModerationListings(){
  if(!moderationTableBody) return;
  moderationTableBody.innerHTML = '<tr><td colspan="9">Завантаження...</td></tr>';
  try{
    const res = await fetch('/api/listings/admin/moderation/', { headers: getAuthHeaders() });
    if(!res.ok){
      moderationTableBody.innerHTML = '<tr><td colspan="9">Не вдалося завантажити оголошення для модерації.</td></tr>';
      return;
    }

    const items = await res.json();
    if(!Array.isArray(items) || items.length === 0){
      moderationTableBody.innerHTML = '<tr><td colspan="9">Оголошень для модерації немає.</td></tr>';
      return;
    }

    moderationTableBody.innerHTML = '';
    items.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.id}</td>
        <td>${escapeHtml(item.title || '—')}</td>
        <td>${escapeHtml(item.user_name || '—')}</td>
        <td>
          <label style="display:flex;justify-content:center;">
            <input type="checkbox" class="moderation-reported" ${item.reported ? 'checked' : ''}>
          </label>
        </td>
        <td><textarea class="moderation-reason" rows="2" style="width:100%;min-width:180px;"></textarea></td>
        <td>
          <span class="moderation-message-preview" title="${escapeHtml(item.report_message || '')}">
            ${item.report_message ? 'Наведіть для перегляду' : '—'}
          </span>
        </td>
        <td>
          <input class="moderation-reported-at" type="datetime-local" value="${toInputDateTimeValue(item.reported_at)}">
          <div style="font-size:12px;color:#777;margin-top:4px;">${toDisplayDateTime(item.reported_at)}</div>
        </td>
        <td>
          <input class="moderation-promoted-until" type="datetime-local" value="${toInputDateTimeValue(item.promoted_until)}">
          <div style="font-size:12px;color:#777;margin-top:4px;">${toDisplayDateTime(item.promoted_until)}</div>
        </td>
        <td>
          <button class="period-btn moderation-save-btn">Зберегти</button>
        </td>
      `;

      const reportedCheckbox = tr.querySelector('.moderation-reported');
      const reasonEl = tr.querySelector('.moderation-reason');
      const reportedAtEl = tr.querySelector('.moderation-reported-at');
      const promotedUntilEl = tr.querySelector('.moderation-promoted-until');
      const saveBtn = tr.querySelector('.moderation-save-btn');
      reasonEl.value = item.report_reason || '';

      saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Збереження...';
        const payload = {
          reported: !!reportedCheckbox.checked,
          report_reason: reasonEl.value.trim(),
          reported_at: toApiDateTime(reportedAtEl.value),
          promoted_until: toApiDateTime(promotedUntilEl.value),
        };

        try{
          const patchRes = await fetch(`/api/listings/admin/moderation/${item.id}/`, {
            method: 'PATCH',
            headers: {
              ...getAuthHeaders(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if(!patchRes.ok){
            const msg = await patchRes.text().catch(() => '');
            alert(`Не вдалося зберегти зміни. ${msg}`);
            saveBtn.disabled = false;
            saveBtn.textContent = 'Зберегти';
            return;
          }

          saveBtn.textContent = 'Збережено';
          setTimeout(() => {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Зберегти';
          }, 1000);
          await loadModerationListings();
        }catch(e){
          alert('Помилка збереження модерації.');
          saveBtn.disabled = false;
          saveBtn.textContent = 'Зберегти';
        }
      });

      moderationTableBody.appendChild(tr);
    });
  }catch(e){
    moderationTableBody.innerHTML = '<tr><td colspan="9">Помилка завантаження модерації.</td></tr>';
  }
}

function renderLoading(){
  // Покажемо лоадер у кожній картці графіка
  document.querySelectorAll('.chart-card').forEach(card=>{
    card.querySelector('canvas')?.classList.add('hidden');
    if(!card.querySelector('.chart-loading')){
      const ph = document.createElement('div'); ph.className='chart-loading'; ph.textContent='Завантаження...';
      card.appendChild(ph);
    }
  });
}

function renderErrorState(){
  // Очистити статистичні картки
  ['total-users','new-users','total-listings','active-listings','inactive-listings','visits-count','orders-count','orders-current-count','orders-with-canceled-count','orders-canceled-count'].forEach(id=>{
    const el = document.getElementById(id); if(el) el.textContent = '—';
  });
  // Показати повідомлення в місці графіків
  document.querySelectorAll('.chart-card').forEach(card=>{
    card.querySelector('canvas')?.classList.add('hidden');
    let ph = card.querySelector('.chart-loading');
    if(!ph){ ph = document.createElement('div'); ph.className='chart-loading'; }
    ph.textContent = 'Не вдалося завантажити дані.';
    card.appendChild(ph);
  });
  // Також знищити існуючі чарти
  destroyIfExists(visitsChart); destroyIfExists(regsChart); destroyIfExists(listsChart);
}

function sumLast(values, n){
  if(!Array.isArray(values) || values.length===0) return 0;
  if(n<=0) return 0;
  return values.slice(-n).reduce((a,b)=>a+(Number(b)||0),0);
}

function renderStatsCards(stats, period='7'){
  document.getElementById('total-users').textContent = stats.total_users.toLocaleString();
  document.getElementById('new-users').textContent = stats.new_users.toLocaleString();
  document.getElementById('total-listings').textContent = stats.total_listings.toLocaleString();
  document.getElementById('active-listings').textContent = stats.active_listings.toLocaleString();
  document.getElementById('inactive-listings').textContent = stats.inactive_listings.toLocaleString();
  // Show single visits value depending on selected period
  let visitsVal = 0;
  if(period === '1'){
    visitsVal = stats.visits_day || sumLast(stats.visits, 1);
  } else if(period === '7'){
    visitsVal = stats.visits_week || sumLast(stats.visits, 7);
  } else if(period === '30'){
    visitsVal = stats.visits_month || sumLast(stats.visits, 30);
  } else if(period === '90'){
    visitsVal = sumLast(stats.visits, 90);
  } else if(period === '365'){
    visitsVal = sumLast(stats.visits, 365);
  } else if(period === 'custom'){
    visitsVal = (Array.isArray(stats.visits) ? stats.visits.reduce((a,b)=>a+(Number(b)||0),0) : (stats.visits_total || 0));
  } else {
    visitsVal = sumLast(stats.visits, Number(period)||7);
  }
  document.getElementById('visits-count').textContent = (Number(visitsVal)||0).toLocaleString();
  // Orders counters
  const currentOrdersCount = Number(stats.orders_total_count || 0);
  const canceledOrdersCount = Number(stats.orders_canceled_count || 0);
  const totalWithCanceled = typeof stats.orders_with_canceled_count !== 'undefined'
    ? Number(stats.orders_with_canceled_count || 0)
    : currentOrdersCount + canceledOrdersCount;

  const ordersCountEl = document.getElementById('orders-count');
  const ordersCurrentEl = document.getElementById('orders-current-count');
  const ordersWithCanceledEl = document.getElementById('orders-with-canceled-count');
  const ordersCanceledEl = document.getElementById('orders-canceled-count');

  if (ordersCountEl) ordersCountEl.textContent = currentOrdersCount.toLocaleString();
  if (ordersCurrentEl) ordersCurrentEl.textContent = currentOrdersCount.toLocaleString();
  if (ordersWithCanceledEl) ordersWithCanceledEl.textContent = totalWithCanceled.toLocaleString();
  if (ordersCanceledEl) ordersCanceledEl.textContent = canceledOrdersCount.toLocaleString();
}

function renderOrdersTable(stats){
  const tbody = document.querySelector('#orders-table tbody');
  tbody.innerHTML = '';
  const orders = stats.orders || [];
  if(orders.length === 0){
    const tr = document.createElement('tr');
    const td = document.createElement('td'); td.colSpan = 5; td.textContent = 'Немає замовлень за обраний період.'; tr.appendChild(td); tbody.appendChild(tr);
  } else {
    orders.forEach(o=>{
      const tr = document.createElement('tr');
      const title = document.createElement('td'); title.textContent = o.title || `#${o.listing_id}`;
      const qtyVal = Number(o.quantity || 0) || 0;
      const unitVal = Number(o.unit_price || 0) || 0;
      const delVal = Number(o.delivery_sum || 0) || 0;
      const totVal = Number(o.total_sum || 0) || 0;

      const qty = document.createElement('td'); qty.textContent = qtyVal.toLocaleString();
      const unit = document.createElement('td'); unit.textContent = unitVal.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2});
      const del = document.createElement('td'); del.textContent = delVal.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2});
      const tot = document.createElement('td'); tot.textContent = totVal.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2});
      tr.appendChild(title); tr.appendChild(qty); tr.appendChild(unit); tr.appendChild(del); tr.appendChild(tot);
      tbody.appendChild(tr);
    });
  }

  // footer totals
  document.getElementById('orders-total-qty').textContent = (Number(stats.orders_total_count)||0).toLocaleString();
  document.getElementById('orders-total-delivery').textContent = (Number(stats.orders_total_delivery)||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2});
  document.getElementById('orders-total-revenue').textContent = (Number(stats.orders_total_revenue)||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2});
  // Ensure unit-price footer cell is empty
  const unitFooter = document.getElementById('orders-total-unit');
  if(unitFooter) unitFooter.textContent = (Number(stats.orders_total_unit_sum)||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2});
}

function makeGradient(ctx, color){
  const gradient = ctx.createLinearGradient(0,0,0,200);
  gradient.addColorStop(0, color + '55');
  gradient.addColorStop(1, color + '05');
  return gradient;
}

function destroyIfExists(chart){
  try{ if(chart) chart.destroy(); }catch(e){}
}

function renderCharts(stats){
  const labels = stats.labels || [];
  // charts will render the time-series; if period is custom the labels and stats.visits should reflect that
  // Ensure loading placeholders removed and canvases shown
  document.querySelectorAll('.chart-card').forEach(card=>{
    const ph = card.querySelector('.chart-loading'); if(ph) ph.remove();
    const canvas = card.querySelector('canvas'); if(canvas) canvas.classList.remove('hidden');
  });

  // Visits
  destroyIfExists(visitsChart);
  visitsChart = new Chart(ctxVisits.getContext('2d'),{
    type:'line',
    data:{labels:labels, datasets:[{label:'Відвідування',data:stats.visits,fill:true,backgroundColor:makeGradient(ctxVisits.getContext('2d'), '#2c7be5'),borderColor:'#2c7be5',tension:0.25,pointRadius:2}]},
    options:{responsive:true,maintainAspectRatio:true,aspectRatio:2,animation:{duration:700},scales:{y:{beginAtZero:true}}}
  });

  // Registrations
  destroyIfExists(regsChart);
  regsChart = new Chart(ctxRegs.getContext('2d'),{
    type:'bar',
    data:{labels:labels,datasets:[{label:'Реєстрації',data:stats.registrations,backgroundColor:'#7bd389'}]},
    options:{responsive:true,maintainAspectRatio:true,aspectRatio:2,animation:{duration:700},scales:{y:{beginAtZero:true}}}
  });

  // Listings
  destroyIfExists(listsChart);
  listsChart = new Chart(ctxLists.getContext('2d'),{
    type:'line',
    data:{labels:labels,datasets:[{label:'Оголошення',data:stats.listings,fill:false,borderColor:'#f6a623',tension:0.25,pointRadius:2}]},
    options:{responsive:true,maintainAspectRatio:true,aspectRatio:2,animation:{duration:700},scales:{y:{beginAtZero:true}}}
  });

  // Remove any loading placeholders if still present
  document.querySelectorAll('.chart-card').forEach(card=>{
    const ph = card.querySelector('.chart-loading'); if(ph) ph.remove();
    const canvas = card.querySelector('canvas'); if(canvas) canvas.classList.remove('hidden');
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



  function googleTranslateElementInit() {
    new google.translate.TranslateElement({pageLanguage: 'uk', includedLanguages: 'en', autoDisplay: false}, 'google_translate_element');
}
// Початкове завантаження — 7 днів
loadAndRender('7');

reloadModerationBtn?.addEventListener('click', loadModerationListings);

