// Поиск (ui/search): форма [data-search] + панель подсказок [data-search-panel] внутри общего [data-search-root].
// Подробно, как подключить к серверу, — README.md, раздел «Поиск».
//
//   [data-search-clear]  — крестик: виден, когда в поле есть текст; клик очищает поле
//   Подсказки — с 2 символов, через 200 мс после ввода. Всегда срабатывает событие ap:search-query
//   (detail: { query, form, panel }). Откуда берутся подсказки — по атрибутам панели:
//     data-search-url="/ajax/search.php"  — JS сам запрашивает GET <url>?q=<запрос> и вставляет ответ (HTML списков
//                                           подсказок — та же разметка, что в ui/search/search-panel.html) в
//                                           [data-search-lists]; устаревшие запросы отменяются. Ошибка — панель закрыта.
//     без data-search-url                 — подсказки выводит интегратор по ap:search-query (в [data-search-list]),
//                                           затем panel.dispatchEvent(new CustomEvent('ap:search-update')).
//                                           До этого события панель не открывается и не перерисовывается.
//     data-search-demo                    — статичная вёрстка: подсказки из разметки фильтруются по тексту.
//   После ответа панель показывает подсказки или «Ничего не найдено» (пустые списки скрываются),
//   «Показать все результаты» — ссылка на /search?q=<запрос>.
//   Отправка формы — страница /search?q=<запрос>; пустой запрос не отправляется. Панель закрывается кликом мимо и по Esc.

const MIN_LENGTH = 2;
const DELAY = 200;

const normalize = (text) => text.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();

function render(panel, query) {
  const q = normalize(query);
  if (panel.hasAttribute('data-search-demo')) {
    panel.querySelectorAll('[data-search-item]').forEach((item) => {
      item.hidden = !normalize(item.textContent).includes(q);
    });
  }

  let found = false;
  panel.querySelectorAll('[data-search-list]').forEach((list) => {
    const visible = [...list.querySelectorAll('[data-search-item]')].some((item) => !item.hidden);
    list.hidden = !visible;
    found = found || visible;
  });

  const foundBlock = panel.querySelector('[data-search-found]');
  const empty = panel.querySelector('[data-search-empty]');
  if (foundBlock) foundBlock.hidden = !found;
  if (empty) empty.hidden = found;

  const all = panel.querySelector('[data-search-all]');
  if (all) all.href = `/search?q=${encodeURIComponent(query)}`;
}

function initForm(form) {
  const input = form.querySelector('[data-search-input]');
  if (!input) return;
  const clear = form.querySelector('[data-search-clear]');
  const root = form.closest('[data-search-root]');
  const panel = root?.querySelector('[data-search-panel]');

  let rendered = ''; // запрос, для которого в панели сейчас подсказки
  let controller = null;

  const setOpen = (open) => {
    if (!panel) return;
    panel.hidden = !open;
    input.setAttribute('aria-expanded', String(open));
  };

  const show = (query) => {
    render(panel, query);
    rendered = query;
    setOpen(true);
  };

  // Подсказки с сервера: GET <data-search-url>?q=<запрос>, ответ — HTML списков подсказок
  const load = async (query) => {
    controller?.abort();
    controller = new AbortController();
    const url = new URL(panel.dataset.searchUrl, window.location.href);
    url.searchParams.set('q', query);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        credentials: 'same-origin',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      if (input.value.trim() !== query) return; // пока ждали ответ, запрос изменился
      const lists = panel.querySelector('[data-search-lists]');
      if (lists) lists.innerHTML = html;
      show(query);
    } catch (error) {
      if (error.name !== 'AbortError') setOpen(false);
    }
  };

  const run = () => {
    const query = input.value.trim();
    if (!panel || query.length < MIN_LENGTH) {
      controller?.abort();
      setOpen(false);
      return;
    }
    if (query === rendered) {
      setOpen(true); // подсказки для этого запроса уже есть (вернулись в поле)
      return;
    }
    form.dispatchEvent(new CustomEvent('ap:search-query', { bubbles: true, detail: { query, form, panel } }));
    if (panel.hasAttribute('data-search-demo')) show(query);
    else if (panel.dataset.searchUrl) load(query);
    // иначе — ждём ap:search-update от интегратора
  };

  let timer;
  input.addEventListener('input', () => {
    if (clear) clear.hidden = input.value.length === 0;
    clearTimeout(timer);
    timer = setTimeout(run, DELAY);
  });
  input.addEventListener('focus', run); // вернулись в поле с запросом — подсказки снова видны
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel && !panel.hidden) {
      event.stopPropagation(); // Esc закрывает подсказки, а не лист поиска на мобилке
      setOpen(false);
    }
  });

  clear?.addEventListener('click', () => {
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  });

  form.addEventListener('submit', (event) => {
    if (!input.value.trim()) event.preventDefault();
  });

  // Интегратор вывел подсказки сам — показать их для текущего запроса
  panel?.addEventListener('ap:search-update', () => {
    const query = input.value.trim();
    if (query.length >= MIN_LENGTH) show(query);
  });

  document.addEventListener('click', (event) => {
    if (root && !root.contains(event.target)) setOpen(false);
  });

  if (clear) clear.hidden = input.value.length === 0; // браузер мог восстановить текст при возврате на страницу
}

// Страница результатов (pages/search.html, [data-search-page]): запрос из ?q= — в заголовок ([data-search-query])
// и в поля поиска. data-search-demo (статичная вёрстка): найдено, если запрос встречается в названиях карточек,
// иначе вместо результатов [data-search-results] — «Пока ничего не нашлось» [data-search-nothing].
// На сайте блок выбирает сервер, интегратор убирает data-search-demo.
function initSearchPage() {
  const page = document.querySelector('[data-search-page]');
  if (!page) return;
  const query = (new URLSearchParams(window.location.search).get('q') || '').trim();

  if (query) {
    page.querySelectorAll('[data-search-query]').forEach((el) => {
      el.textContent = query;
    });
    document.querySelectorAll('[data-search-input]').forEach((input) => {
      input.value = query;
      const clear = input.closest('[data-search]')?.querySelector('[data-search-clear]');
      if (clear) clear.hidden = false; // без события input — подсказки не открываются сами
    });
  }

  if (!page.hasAttribute('data-search-demo')) return;
  const results = page.querySelector('[data-search-results]');
  const nothing = page.querySelector('[data-search-nothing]');
  const titles = [...page.querySelectorAll('[data-search-results] .ap-product-card__title')];
  const found = !query || titles.some((title) => normalize(title.textContent).includes(normalize(query)));
  if (results) results.hidden = !found;
  if (nothing) nothing.hidden = found;
}

export default function initSearch() {
  document.querySelectorAll('[data-search]').forEach(initForm);
  initSearchPage();
}
