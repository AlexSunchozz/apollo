// «Каталог» (pages/catalog/catalog-list): табы «Категории / Коллекции» и счётчик карточек.
//
// Табы — общий модуль ui/tabs/tabs.js: панель [data-catalog-panel] показывается по табу, заголовок страницы
// берётся из data-title панели.
// Строка [data-catalog-count] — по видимым карточкам активной панели: «Показаны все 8 категорий каталога»
// (видны все), «Показаны 6 коллекций каталога» (часть); слова — data-words панели («одна|две|пять»).
// Пересчитывается при смене таба и после «Показать еще» (событие ap:products-more из sections/products/products.js).
// Вид «сетка / список» — общий модуль ui/view-switch/view-switch.js.

import initTabs from '../../../ui/tabs/tabs.js';

const plural = (n, [one, few, many]) => {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
};

export default function initCatalogList() {
  const root = document.querySelector('[data-catalog-list]');
  if (!root) return;

  const title = root.querySelector('[data-catalog-title]');
  const count = root.querySelector('[data-catalog-count]');
  const panels = [...root.querySelectorAll('[data-catalog-panel]')];
  const activePanel = () => panels.find((panel) => !panel.hidden) || panels[0];

  const updateCount = () => {
    const panel = activePanel();
    if (!count || !panel) return;
    const items = [...panel.querySelectorAll('[data-catalog-grid] > *')];
    const shown = items.filter((item) => !item.hidden).length;
    const words = (panel.dataset.words || '').split('|');
    const verb = plural(shown, ['Показана', 'Показаны', 'Показаны']);
    const all = shown === items.length && shown > 1 ? 'все ' : '';
    count.textContent = `${verb} ${all}${shown} ${plural(shown, words)} каталога`;
  };

  const tablist = root.querySelector('[data-tabs]');
  if (tablist) {
    initTabs(tablist, {
      onSelect(tab) {
        const id = tab.getAttribute('aria-controls');
        panels.forEach((panel) => {
          panel.hidden = panel.id !== id;
        });
        const panel = activePanel();
        if (title && panel?.dataset.title) title.textContent = panel.dataset.title;
        updateCount();
      },
    });
  }

  root.addEventListener('ap:products-more', updateCount);
  updateCount();
}
