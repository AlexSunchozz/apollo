// Карточка товара: слайдер фото (Swiper — из vendor.js) с точками-полосками + кнопки
// «сравнение», «избранное», «в корзину». Общий модуль для всех страниц с карточками.
// Один слайд — без слайдера и точек. Карточки в скрытых панелях табов: observer пересчитывает
// размеры, когда панель показывается.

import { Swiper } from '../../js/vendors.js';

// --- Кнопки карточки -----------------------------------------------------------------------
// [data-product-action="compare" | "favorites"] — переключатель (aria-pressed): +1 / −1 к счётчику;
// [data-product-action="cart"] — каждый клик +1 к счётчику корзины.
// Счётчики в шапке и нижней панели меняет layout/header.js по событию ap:counter-change.
// Для интегратора: после клика на карточке срабатывает ap:product-action
//   (detail: { action, active, card }) — сюда вешается запрос на сервер.
// Слушатель — один на документ: работает и для карточек, добавленных позже (подгрузка, фильтры).
let actionsBound = false;

function bindProductActions() {
  if (actionsBound) return;
  actionsBound = true;

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-product-action]');
    if (!button) return;
    event.preventDefault();

    const action = button.dataset.productAction;
    let active = true;
    let delta = 1;

    if (button.hasAttribute('aria-pressed')) {
      active = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(active));
      delta = active ? 1 : -1;
    }

    document.dispatchEvent(new CustomEvent('ap:counter-change', { detail: { counter: action, delta } }));
    button.dispatchEvent(
      new CustomEvent('ap:product-action', {
        bubbles: true,
        detail: { action, active, card: button.closest('.ap-product-card') },
      }),
    );
  });
}

export default function initProductCards(root = document) {
  bindProductActions();
  if (!Swiper) return;

  root.querySelectorAll('[data-product-slider]').forEach((slider) => {
    if (slider.swiper) return; // уже запущен
    const slides = slider.querySelectorAll('.swiper-slide');
    if (slides.length < 2) return;

    const dots = slider.closest('.ap-product-card')?.querySelector('[data-product-dots]');

    // eslint-disable-next-line no-new
    new Swiper(slider, {
      speed: 400,
      nested: true,
      observer: true,
      observeParents: true,
      pagination: dots
        ? {
            el: dots,
            clickable: true,
            bulletClass: 'ap-product-card__dot',
            bulletActiveClass: 'is-active',
            renderBullet: (index, className) =>
              `<button class="${className}" type="button" aria-label="Фото ${index + 1}"></button>`,
          }
        : false,
      a11y: { enabled: true },
    });
  });
}
