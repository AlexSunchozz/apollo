// Сравнение товаров (pages/compare/compare-table).
//   Категории — ui/tabs (у каждой своя таблица [data-compare-panel]).
//   Крестик в карточке [data-compare-remove] — товар убирается из таблицы (все ячейки его колонки [data-compare-col]),
//   счётчик сравнения −1 (ap:counter-change); событие ap:compare-remove (detail: { id, table }) — запрос на сервер.
//   Последний товар категории убран — пропадают её таблица и таб; ничего не осталось — «В сравнении пока пусто».
//   «Очистить сравнение» [data-compare-clear] — событие ap:compare-clear, счётчик 0, вид «пусто».
//   «Показать только различия» [data-compare-diff] — скрывает строки, где у всех товаров одинаковые значения.
//   < 768 видны два товара (.is-slot-a / .is-slot-b): «<» / «>» в карточке листают товары в её колонке
//   (товар соседней колонки пропускается); «1 из 3» — номер товара в категории.
//   Количество — в заголовке [data-compare-total] (всего) и в табах [data-compare-count] (в категории).
//   ?empty в адресе — вид «пусто» (на сайте сервер выводит его сразу).
// Сердце и корзина в карточке — общий обработчик ui/product-card (data-product-action).

import initTabs from '../../../ui/tabs/tabs.js';

const PRODUCT_CELLS = '.ap-compare-table__row--products [data-compare-col]';

export default function initCompareTable() {
  const root = document.querySelector('[data-compare]');
  if (!root) return;

  const empty = root.querySelector('[data-compare-empty]');
  const total = root.querySelector('[data-compare-total]');
  const diff = root.querySelector('[data-compare-diff]');

  const setEmpty = () => {
    root.classList.add('is-empty');
    if (empty) empty.hidden = false;
  };

  if (new URLSearchParams(window.location.search).has('empty')) {
    setEmpty();
    return;
  }

  const tablist = root.querySelector('[data-tabs]');
  if (tablist) initTabs(tablist);

  const tables = [...root.querySelectorAll('[data-compare-panel]')].map((panel) => {
    const table = panel.querySelector('[data-compare-table]');
    const slot = (name) => table.querySelector(`${PRODUCT_CELLS}.is-slot-${name}`)?.dataset.compareCol ?? null;
    return { panel, table, a: slot('a'), b: slot('b') };
  });

  const cols = (state) => [...state.table.querySelectorAll(PRODUCT_CELLS)].map((cell) => cell.dataset.compareCol);
  const tabOf = (state) => root.querySelector(`[role="tab"][aria-controls="${state.panel.id}"]`);

  const apply = (state) => {
    const ids = cols(state);
    const n = ids.length;
    state.table.style.setProperty('--ap-compare-cols', String(Math.max(n, 1)));

    // Мобильные колонки: a — всегда есть, b — другой товар (если он есть)
    if (!ids.includes(state.a)) state.a = ids[0] ?? null;
    if (!ids.includes(state.b) || state.b === state.a) state.b = ids.find((id) => id !== state.a) ?? null;
    state.table.classList.toggle('is-single', n === 1);
    state.table.querySelectorAll('[data-compare-col]').forEach((cell) => {
      cell.classList.toggle('is-slot-a', cell.dataset.compareCol === state.a);
      cell.classList.toggle('is-slot-b', cell.dataset.compareCol === state.b);
    });

    state.table.querySelectorAll(PRODUCT_CELLS).forEach((cell, index) => {
      const pos = cell.querySelector('[data-compare-pos]');
      if (pos) pos.textContent = `${index + 1} из ${n}`;
    });
    const count = tabOf(state)?.querySelector('[data-compare-count]');
    if (count) count.textContent = String(n);

    const onlyDiff = Boolean(diff?.checked);
    state.table.querySelectorAll('[data-compare-row]').forEach((row) => {
      const values = [...row.querySelectorAll('[data-compare-col]')].map((cell) => cell.textContent.replace(/\s+/g, ' ').trim());
      const same = values.length > 1 && values.every((value) => value === values[0]);
      row.hidden = onlyDiff && same;
    });
  };

  const update = () => {
    // Категории без товаров убираются вместе с табом; если был выбран — выбрать первый оставшийся
    for (let i = tables.length - 1; i >= 0; i -= 1) {
      const state = tables[i];
      if (cols(state).length) continue;
      const tab = tabOf(state);
      const wasSelected = tab?.getAttribute('aria-selected') === 'true';
      tab?.remove();
      state.panel.remove();
      tables.splice(i, 1);
      if (wasSelected && tables[0]) tabOf(tables[0])?.click();
    }
    if (!tables.length) {
      setEmpty();
      return;
    }
    tables.forEach(apply);
    if (total) total.textContent = String(tables.reduce((sum, state) => sum + cols(state).length, 0));
  };

  root.addEventListener('click', (event) => {
    const cell = event.target.closest('[data-compare-col]');
    const state = cell && tables.find((item) => item.table.contains(cell));

    if (event.target.closest('[data-compare-clear]')) {
      root.dispatchEvent(new CustomEvent('ap:compare-clear', { bubbles: true }));
      document.dispatchEvent(new CustomEvent('ap:counter', { detail: { counter: 'compare', count: 0 } }));
      tables.forEach((item) => item.table.querySelectorAll('[data-compare-col]').forEach((el) => el.remove()));
      update();
      return;
    }
    if (!state) return;
    const col = cell.dataset.compareCol;

    if (event.target.closest('[data-compare-remove]')) {
      const id = cell.querySelector('[data-compare-product]')?.dataset.compareProduct;
      cell.dispatchEvent(new CustomEvent('ap:compare-remove', { bubbles: true, detail: { id, table: state.table } }));
      document.dispatchEvent(new CustomEvent('ap:counter-change', { detail: { counter: 'compare', delta: -1 } }));
      state.table.querySelectorAll(`[data-compare-col="${col}"]`).forEach((el) => el.remove());
      update();
      return;
    }

    const step = event.target.closest('[data-compare-next]') ? 1 : event.target.closest('[data-compare-prev]') ? -1 : 0;
    if (!step) return;
    const ids = cols(state);
    const which = state.a === col ? 'a' : 'b';
    const other = which === 'a' ? state.b : state.a;
    let index = ids.indexOf(col);
    for (let i = 0; i < ids.length; i += 1) {
      index = (index + step + ids.length) % ids.length;
      if (ids[index] !== other) break;
    }
    state[which] = ids[index];
    apply(state);
  });

  diff?.addEventListener('change', () => tables.forEach(apply));

  update();
}
