// Карточка товара — отзывы (sections/product-reviews).
//
// «Оставить отзыв» [data-review-open]: если пользователь вошёл (data-authorized="true" у секции — ставит сервер),
// открывается форма отзыва #review-modal, иначе — окно «Войдите, чтобы оставить отзыв» #review-login-modal.
// Для проверки вёрстки: адрес страницы с ?auth — как будто пользователь вошёл.
// «С фото» [data-reviews-photo] — показывать только отзывы с фото (у них data-review-photos), «Показать еще» после этого
// работает как обычно (sections/products/products.js). Сортировка [data-reviews-sort] — выбор закрывает список,
// событие ap:sort-change (detail: { value }) — пересортировку подключает интегратор.

import { Modal, Collapse } from '../../js/vendors.js';

export default function initProductReviews() {
  const root = document.querySelector('[data-product-reviews]');
  if (!root) return;

  if (new URLSearchParams(window.location.search).has('auth')) root.dataset.authorized = 'true';

  root.querySelectorAll('[data-review-open]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = root.dataset.authorized === 'true' ? '#review-modal' : '#review-login-modal';
      const modal = document.querySelector(id);
      if (modal && Modal) Modal.getOrCreateInstance(modal).show();
    });
  });

  const photoFilter = root.querySelector('[data-reviews-photo]');
  const list = root.querySelector('[data-products-list]');
  if (photoFilter && list) {
    photoFilter.addEventListener('change', () => {
      [...list.children].forEach((item) => {
        item.classList.toggle('is-filtered', photoFilter.checked && !item.hasAttribute('data-review-photos'));
      });
    });
  }

  const sort = root.querySelector('[data-reviews-sort]');
  if (sort) {
    sort.addEventListener('change', (event) => {
      if (event.target.type !== 'radio') return;
      const panel = sort.querySelector('.collapse');
      if (panel && Collapse) Collapse.getOrCreateInstance(panel, { toggle: false }).hide();
      sort.dispatchEvent(new CustomEvent('ap:sort-change', { bubbles: true, detail: { value: event.target.value } }));
    });
  }
}
