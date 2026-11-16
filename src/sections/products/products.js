// Товары (sections/products): показ карточек порциями.
// Сначала видно data-products карточек (8), кнопка [data-products-more] открывает следующую порцию;
// если скрытых карточек не осталось — кнопка скрыта. Без JS видны все карточки, кнопки нет (атрибут hidden в разметке).
// data-brand у секции — код бренда для фильтра товаров на сервере (страницы брендов).
// Событие ap:products-more (detail: { root, brand, shown, total }) — для интегратора, если товары подгружаются с сервера.

const DEFAULT_PAGE = 8;

function initBlock(root) {
  const list = root.querySelector('[data-products-list]');
  const more = root.querySelector('[data-products-more]');
  if (!list) return;

  const page = Number(root.dataset.products) || DEFAULT_PAGE;
  const items = [...list.children];
  let shown = Math.min(page, items.length);

  const update = () => {
    items.forEach((item, index) => {
      item.hidden = index >= shown;
    });
    if (more) more.hidden = shown >= items.length;
  };

  more?.addEventListener('click', () => {
    const firstNew = items[shown];
    shown = Math.min(shown + page, items.length);
    update();
    root.dispatchEvent(new CustomEvent('ap:products-more', { bubbles: true, detail: { root, brand: root.dataset.brand || null, shown, total: items.length } }));
    // Фокус — на первую открывшуюся карточку, чтобы с клавиатуры не возвращаться к началу списка
    firstNew?.querySelector('a[href]:not([tabindex="-1"])')?.focus({ preventScroll: true });
  });

  update();
}

export default function initProducts() {
  document.querySelectorAll('[data-products]').forEach((root) => {
    if (root.dataset.productsReady) return;
    root.dataset.productsReady = '1';
    initBlock(root);
  });
}
