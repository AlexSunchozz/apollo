// Категория (sections/category): счётчик показанных товаров и сортировка.
// «Показано 12 из 142 товаров» [data-category-shown] — число видимых карточек; пересчитывается после
// «Показать ещё товары» (событие ap:products-more из sections/products/products.js).
// Сортировка [data-category-sort] (ui/form .ap-select, радиокнопки): выбор закрывает список;
// событие ap:sort-change (detail: { value }) — к нему интегратор подключает пересортировку на сервере.
// Вид списка — ui/view-switch, фильтры — ui/filters, «Показать ещё» — sections/products/products.js.

import { Collapse } from '../../js/vendors.js';

export default function initCategory() {
  const root = document.querySelector('[data-category]');
  if (!root) return;

  const shown = root.querySelector('[data-category-shown] span');
  const list = root.querySelector('[data-products-list]');
  const updateShown = () => {
    if (!shown || !list) return;
    shown.textContent = [...list.children].filter((item) => !item.hidden).length;
  };
  root.addEventListener('ap:products-more', updateShown);
  updateShown();

  const sort = root.querySelector('[data-category-sort]');
  if (sort) {
    sort.addEventListener('change', (event) => {
      if (event.target.type !== 'radio') return;
      const panel = sort.querySelector('.collapse');
      if (panel && Collapse) Collapse.getOrCreateInstance(panel, { toggle: false }).hide();
      sort.dispatchEvent(new CustomEvent('ap:sort-change', { bubbles: true, detail: { value: event.target.value } }));
    });
  }
}
