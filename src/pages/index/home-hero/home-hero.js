// Первый экран главной: слайдер фото (Swiper — из vendor.js).
// Смена фото плавным переходом (fade), автопрокрутка 5 с, точки-полоски внизу.
// Если в системе включено «уменьшение движения» — без автопрокрутки.

import { Swiper } from '../../../js/vendors.js';

export default function initHomeHero() {
  const root = document.querySelector('[data-hero-slider]');
  if (!root || !Swiper) return;

  const dots = root.closest('.ap-home-hero')?.querySelector('[data-hero-dots]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // eslint-disable-next-line no-new
  new Swiper(root, {
    loop: true,
    effect: 'fade',
    fadeEffect: { crossFade: true },
    speed: 800,
    autoplay: reduceMotion ? false : { delay: 5000, disableOnInteraction: false },
    pagination: dots
      ? {
          el: dots,
          clickable: true,
          bulletClass: 'ap-home-hero__dot',
          bulletActiveClass: 'is-active',
          renderBullet: (index, className) =>
            `<button class="${className}" type="button" aria-label="Фото ${index + 1}"></button>`,
        }
      : false,
    a11y: { enabled: true },
  });
}
