// Демо-избранное для статичной вёрстки: работает, пока у <body> есть атрибут data-demo (layout/head.html).
// На сайте избранное ведёт сервер — интегратор убирает атрибут, и этот модуль ничего не делает.
//
//   Сердце (data-product-action="favorites") на любой странице — в карточке товара, на странице товара, в сравнении,
//   в корзине — добавляет товар в localStorage (сверху — недавно добавленные) или убирает его оттуда.
//   При загрузке любой страницы сердца сохранённых товаров закрашены, счётчик избранного — по их числу (ap:counter).
//   Страница «Избранное» (pages/favorites/favorites-list) выводит сохранённые товары по шаблону карточки
//   (ui/product-card); при первом открытии начальным избранным становится пример из data/favorites-products.json.
//   Товар узнаётся по названию (в статике у товаров нет кодов).
//   ?favorites-reset в адресе — очистить (избранное снова покажет пример).

import { isDemo } from './cart-demo.js';

const KEY = 'ap-favorites-demo';

const text = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
const formatPrice = (value) => `${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽`;

// null — избранное ещё не трогали (страница «Избранное» покажет пример из вёрстки)
export function readFavorites() {
  try {
    const raw = window.localStorage.getItem(KEY);
    const items = raw ? JSON.parse(raw) : null;
    return Array.isArray(items) ? items : null;
  } catch (error) {
    return null;
  }
}

export function writeFavorites(items) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch (error) {
    // хранилище недоступно (приватный режим) — избранное живёт до перезагрузки
  }
}

const setCounter = (items) =>
  document.dispatchEvent(new CustomEvent('ap:counter', { detail: { counter: 'favorites', count: items.length } }));

// Карточка товара (ui/product-card) → данные для хранения (и для шаблона на странице «Избранное»)
export function cardData(card) {
  const link = card.querySelector('.ap-product-card__title a');
  const series = card.querySelectorAll('.ap-product-card__series span');
  const rating = card.querySelectorAll('.ap-product-card__rating span');
  const similar = card.querySelector('.ap-product-card__similar');
  return {
    title: text(link),
    href: link?.getAttribute('href') || '#',
    collection: text(series[0]),
    series: text(series[2]),
    rating: text(rating[0]),
    reviews: text(rating[2]),
    price: text(card.querySelector('.ap-product-card__price')),
    imgs: [...card.querySelectorAll('.ap-product-card__img')].map((img) => img.src),
    photo: card.classList.contains('ap-product-card--photo'),
    unavailable: Boolean(similar),
    similar: similar?.getAttribute('href') || '',
  };
}

// Данные товара по кнопке-сердцу на любой странице
function productData(button) {
  const card = button.closest('.ap-product-card');
  if (card) return cardData(card);

  const compared = button.closest('[data-compare-product]');
  if (compared) {
    const link = compared.querySelector('.ap-compare-table__name a');
    return {
      title: text(link), href: link?.getAttribute('href') || '#', collection: text(compared.querySelector('.ap-compare-table__category')),
      series: '', rating: '', reviews: '', price: text(compared.querySelector('.ap-compare-table__price')),
      imgs: [compared.querySelector('.ap-compare-table__photo img')?.src].filter(Boolean), photo: false, unavailable: false, similar: '',
    };
  }

  const cartItem = button.closest('[data-cart-item]');
  if (cartItem) {
    const link = cartItem.querySelector('.ap-cart-content__item-title a');
    const photo = cartItem.querySelector('.ap-cart-content__item-photo');
    return {
      title: text(link), href: link?.getAttribute('href') || '#', collection: '', series: '', rating: '', reviews: '',
      price: formatPrice(Number(cartItem.dataset.price) || 0), imgs: [photo?.querySelector('img')?.src].filter(Boolean),
      photo: Boolean(photo?.classList.contains('ap-cart-content__item-photo--cover')), unavailable: false, similar: '',
    };
  }

  const product = button.closest('[data-product]');
  if (product) {
    const line = product.querySelectorAll('.ap-product__line span');
    return {
      title: text(product.querySelector('#product-title')), href: window.location.pathname, collection: text(line[0]), series: text(line[1]),
      rating: '', reviews: '', price: text(product.querySelector('.ap-product__price')),
      imgs: [product.querySelector('[data-gallery-main]')?.src].filter(Boolean), photo: true, unavailable: false, similar: '',
    };
  }
  return null;
}

// Название товара у кнопки-сердца — чтобы закрасить сохранённые
function buttonTitle(button) {
  const holder = button.closest('.ap-product-card, [data-compare-product], [data-cart-item], [data-product]');
  if (!holder) return '';
  return text(holder.querySelector('.ap-product-card__title, .ap-compare-table__name, .ap-cart-content__item-title, #product-title'));
}

// Закрасить сердца сохранённых товаров (и снять у остальных) в пределах root
export function markHearts(root = document) {
  const items = readFavorites();
  if (!items) return;
  const titles = new Set(items.map((item) => item.title));
  root.querySelectorAll('[data-product-action="favorites"]').forEach((button) => {
    const title = buttonTitle(button);
    if (title) button.setAttribute('aria-pressed', String(titles.has(title)));
  });
}

export default function initFavoritesDemo() {
  if (!isDemo()) return;

  if (new URLSearchParams(window.location.search).has('favorites-reset')) {
    try {
      window.localStorage.removeItem(KEY);
    } catch (error) {
      // ничего
    }
  }

  const saved = readFavorites();
  if (saved) {
    markHearts();
    setCounter(saved);
  }

  document.addEventListener('ap:product-action', (event) => {
    const { action, active } = event.detail || {};
    if (action !== 'favorites') return;
    const data = productData(event.target);
    if (!data?.title) return;
    const items = (readFavorites() || []).filter((item) => item.title !== data.title);
    if (active) items.unshift(data);
    writeFavorites(items);
    setCounter(items);
  });
}
