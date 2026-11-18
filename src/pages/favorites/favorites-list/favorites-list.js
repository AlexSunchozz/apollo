// Избранное (pages/favorites/favorites-list).
//   Сердце в карточке — общий обработчик ui/product-card (data-product-action="favorites", aria-pressed, счётчик
//   избранного, событие ap:product-action → запрос на сервер). Здесь: снятое сердце приглушает карточку (.is-removed),
//   повторный клик возвращает её; «N товаров» — по карточкам в избранном.
//   Сортировка (radio [data-sort]): new — как вывел сервер (сначала недавно добавленные), old — обратный порядок,
//   cheap / expensive — по цене, rating — по оценке; карточки без цены (нет в наличии) — в конце.
//   Событие ap:sort-change (detail: { value, sort }) — если порядок задаёт сервер.
//   ?empty в адресе — вид «В избранном пока пусто» (на сайте сервер выводит его вместо списка).
//   Демо-режим (js/favorites-demo.js): товары выводятся из localStorage по шаблонам [data-favorites-template*]
//   (та же ui/product-card); первый визит — пример из вёрстки сохраняется как начальное избранное.

import { isDemo } from '../../../js/cart-demo.js';
import { cardData, markHearts, readFavorites, writeFavorites } from '../../../js/favorites-demo.js';
import initProductCards from '../../../ui/product-card/product-card.js';

// Демо: данные → карточка по шаблону (разметка ui/product-card)
function renderCard(template, data) {
  const card = template?.content.querySelector('.ap-product-card')?.cloneNode(true);
  if (!card) return null;
  card.classList.toggle('ap-product-card--photo', Boolean(data.photo));

  const wrapper = card.querySelector('.swiper-wrapper');
  const slide = wrapper?.querySelector('.ap-product-card__slide');
  if (wrapper && slide) {
    wrapper.innerHTML = '';
    (data.imgs?.length ? data.imgs : [slide.querySelector('img')?.src]).forEach((src) => {
      const item = slide.cloneNode(true);
      item.setAttribute('href', data.href);
      item.querySelector('img').src = src;
      wrapper.append(item);
    });
  }

  const link = card.querySelector('.ap-product-card__title a');
  if (link) {
    link.setAttribute('href', data.href);
    link.textContent = data.title;
  }
  const series = card.querySelectorAll('.ap-product-card__series span');
  if (series.length === 3) {
    series[0].textContent = data.collection || '';
    series[2].textContent = data.series || '';
    if (!data.series) series[1].remove();
    if (!data.series) series[2].remove();
    if (!data.collection && !data.series) card.querySelector('.ap-product-card__series')?.remove();
  }
  const rating = card.querySelectorAll('.ap-product-card__rating span');
  if (data.rating && rating.length === 3) {
    rating[0].textContent = data.rating;
    rating[2].textContent = data.reviews || '';
  } else {
    card.querySelector('.ap-product-card__rating')?.remove();
  }
  const price = card.querySelector('.ap-product-card__price');
  if (price) price.textContent = data.price || '';
  const similar = card.querySelector('.ap-product-card__similar');
  if (similar && data.similar) similar.setAttribute('href', data.similar);
  return card;
}

const plural = (n, one, few, many) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};

const number = (el) => {
  const value = parseFloat((el?.textContent || '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(value) ? value : null;
};

export default function initFavoritesList() {
  const root = document.querySelector('[data-favorites]');
  if (!root) return;

  const list = root.querySelector('[data-favorites-list]');
  const grid = root.querySelector('[data-favorites-grid]');
  const count = root.querySelector('[data-favorites-count]');
  const empty = root.querySelector('[data-favorites-empty]');
  if (!grid) return;

  const showEmpty = () => {
    if (list) list.hidden = true;
    if (empty) empty.hidden = false;
  };

  if (new URLSearchParams(window.location.search).has('empty')) {
    showEmpty();
    return;
  }

  // Демо: сохранённое избранное вместо примера; первый визит — пример становится начальным избранным
  if (isDemo()) {
    const saved = readFavorites();
    if (saved) {
      grid.querySelectorAll('.ap-product-card').forEach((card) => card.remove());
      saved.forEach((data) => {
        const template = root.querySelector(data.unavailable ? '[data-favorites-template-unavailable]' : '[data-favorites-template]');
        const card = renderCard(template, data);
        if (card) grid.append(card);
      });
      initProductCards(grid);
      markHearts(grid);
    } else {
      writeFavorites([...grid.querySelectorAll('.ap-product-card')].map(cardData));
      document.dispatchEvent(new CustomEvent('ap:counter', { detail: { counter: 'favorites', count: grid.querySelectorAll('.ap-product-card').length } }));
    }
    if (!grid.querySelector('.ap-product-card')) {
      showEmpty();
      return;
    }
  }

  const cards = () => [...grid.querySelectorAll('.ap-product-card')];
  // Порядок вывода сервера = «сначала недавно добавленные»
  cards().forEach((card, index) => {
    card.dataset.favoritesOrder = String(index);
  });

  const updateCount = () => {
    const n = cards().filter((card) => !card.classList.contains('is-removed')).length;
    if (count) count.textContent = `${n} ${plural(n, 'товар', 'товара', 'товаров')}`;
  };

  grid.addEventListener('ap:product-action', (event) => {
    const { action, active, card } = event.detail || {};
    if (action !== 'favorites' || !card) return;
    card.classList.toggle('is-removed', !active);
    updateCount();
  });

  const sorters = {
    new: (a, b) => a.order - b.order,
    old: (a, b) => b.order - a.order,
    cheap: (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity),
    expensive: (a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity),
    rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
  };

  root.querySelector('[data-favorites-sort]')?.addEventListener('change', (event) => {
    const input = event.target.closest('input[data-sort]');
    if (!input) return;
    const sort = input.dataset.sort;
    const items = cards().map((card) => ({
      card,
      order: Number(card.dataset.favoritesOrder) || 0,
      price: number(card.querySelector('.ap-product-card__price')),
      rating: number(card.querySelector('.ap-product-card__rating span')),
    }));
    // цена неизвестна (нет в наличии) — всегда в конце
    const compare = sorters[sort] || sorters.new;
    items
      .sort((a, b) => (sort === 'cheap' || sort === 'expensive') && (a.price === null) !== (b.price === null)
        ? (a.price === null ? 1 : -1)
        : compare(a, b))
      .forEach(({ card }) => grid.append(card));
    root.dispatchEvent(new CustomEvent('ap:sort-change', { bubbles: true, detail: { value: input.value, sort } }));
    // выбор сделан — открытый список закрывается
    const toggle = input.closest('[data-select]')?.querySelector('[data-bs-toggle]');
    if (toggle?.getAttribute('aria-expanded') === 'true') toggle.click();
  });

  updateCount();
}
