// Шапка: фиксированная после прокрутки, нижняя панель, меню каталога, счётчики на иконках, поиск.

// --- Фиксированная шапка (Figma 2:17826) и нижняя панель (Figma 2:18169) ----------------
// После 200px прокрутки шапке добавляется .is-sticky — панель становится fixed и показывает только
// верхнюю строку (стили — layout/_header.scss, только ≥ 1200); чтобы контент не прыгал, .ap-header сохраняет высоту.
// После 500px прокрутки нижней панели (< 768) добавляется .is-visible — выезжает снизу (layout/_tabbar.scss).
const STICKY_OFFSET = 200;
const TABBAR_OFFSET = 500;

export function initStickyHeader() {
  const header = document.querySelector('[data-header]');
  const tabbar = document.querySelector('[data-tabbar]');
  if (!header && !tabbar) return;

  const panel = header?.querySelector('.ap-header__panel');
  let ticking = false;

  const update = () => {
    ticking = false;
    const scrolled = window.scrollY > STICKY_OFFSET;

    tabbar?.classList.toggle('is-visible', window.scrollY > TABBAR_OFFSET);

    if (!header || scrolled === header.classList.contains('is-sticky')) return;
    header.style.height = scrolled ? `${panel.offsetHeight}px` : '';
    header.classList.toggle('is-sticky', scrolled);
  };

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );

  // Ширина окна изменилась — высота шапки могла измениться: пересчитать
  window.addEventListener('resize', () => {
    if (header?.classList.contains('is-sticky')) {
      header.classList.remove('is-sticky');
      header.style.height = '';
    }
    update();
  });

  update(); // страница могла открыться уже прокрученной (якорь, обновление)
}

// --- Меню каталога (layout/catalog-menu.html, Bootstrap Offcanvas #catalog-menu) -----------
// Открытие / закрытие (кнопка «Меню», 5-я иконка нижней панели, крестик, Esc, клик мимо) — data-API Bootstrap.
// Здесь: ≥ 1200 панель встаёт ровно под шапку (обычную или фиксированную) — --ap-catalog-top;
// у шапки .is-menu-open (крестик у «Меню»), у body .is-catalog-open (прозрачная подложка на десктопе),
// aria-expanded у кнопок.
export function initCatalogMenu() {
  const menu = document.querySelector('[data-catalog]');
  if (!menu) return;

  const header = document.querySelector('[data-header]');
  const panel = header?.querySelector('.ap-header__panel');
  const toggles = document.querySelectorAll(`[data-bs-target="#${menu.id}"]`);

  const setOpen = (open) => {
    header?.classList.toggle('is-menu-open', open);
    document.body.classList.toggle('is-catalog-open', open);
    toggles.forEach((btn) => btn.setAttribute('aria-expanded', String(open)));
  };

  // Низ шапки. Пересчёт и после открытия: Bootstrap прячет полосу прокрутки, ширина окна растёт
  // (на границе 1200 шапка может перестроиться), и при изменении размера окна с открытым меню.
  const placeUnderHeader = () => {
    if (panel) menu.style.setProperty('--ap-catalog-top', `${Math.max(0, panel.getBoundingClientRect().bottom)}px`);
  };

  menu.addEventListener('show.bs.offcanvas', () => {
    placeUnderHeader();
    setOpen(true);
  });
  menu.addEventListener('shown.bs.offcanvas', placeUnderHeader);
  menu.addEventListener('hide.bs.offcanvas', () => setOpen(false));
  window.addEventListener('resize', () => {
    if (menu.classList.contains('show')) placeUnderHeader();
  });
}

// --- Счётчики сравнения / избранного / корзины ------------------------------------------
// <span class="ap-counter …" data-counter="cart"></span> — пустой элемент не виден (CSS :empty).
// Счётчики одного типа в шапке и в нижней панели обновляются вместе.
// Начальное число может вывести сервер прямо в разметке (текстом или data-count="12").
// Обновление из любого кода — событиями:
//   задать число:     document.dispatchEvent(new CustomEvent('ap:counter', { detail: { counter: 'cart', count: 3 } }));
//   прибавить/убавить: document.dispatchEvent(new CustomEvent('ap:counter-change', { detail: { counter: 'cart', delta: 1 } }));
// counter: compare | favorites | cart; 0 и меньше — счётчик скрывается, больше 99 — «99+» (число хранится в data-count).
export function getCounter(counter) {
  const el = document.querySelector(`[data-counter="${counter}"]`);
  if (!el) return 0;
  return Number(el.dataset.count ?? el.textContent.replace(/\D/g, '')) || 0;
}

export function setCounter(counter, count) {
  const value = Math.max(0, Number(count) || 0);
  const text = value > 0 ? (value > 99 ? '99+' : String(value)) : '';
  document.querySelectorAll(`[data-counter="${counter}"]`).forEach((el) => {
    el.dataset.count = String(value);
    el.textContent = text;
  });
}

export default function initCounters() {
  document.addEventListener('ap:counter', (event) => {
    const { counter, count } = event.detail || {};
    if (counter) setCounter(counter, count);
  });

  document.addEventListener('ap:counter-change', (event) => {
    const { counter, delta } = event.detail || {};
    if (counter) setCounter(counter, getCounter(counter) + (Number(delta) || 0));
  });
}

// --- Поиск в шапке: крестик «Очистить» (Figma 43:18464) ------------------------------------------
// [data-search-clear] виден, когда в поле [data-search-input] есть хотя бы один символ; клик — очищает поле
// и возвращает в него фокус. Сам поиск (подсказки, отправку) подключает интегратор.
export function initSearch() {
  document.querySelectorAll('[data-search]').forEach((form) => {
    const input = form.querySelector('[data-search-input]');
    const clear = form.querySelector('[data-search-clear]');
    if (!input || !clear) return;

    const update = () => {
      clear.hidden = input.value.length === 0;
    };

    input.addEventListener('input', update);
    clear.addEventListener('click', () => {
      input.value = '';
      update();
      input.focus();
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    update(); // браузер может восстановить текст в поле при возврате на страницу
  });
}
