// Демо-корзина для статичной вёрстки: работает, пока у <body> есть атрибут data-cart-demo (layout/head.html).
// На сайте корзину ведёт сервер — интегратор убирает атрибут, и этот модуль ничего не делает.
//
//   «В корзину» (data-product-action="cart") в карточке товара (ui/product-card) и на странице товара (sections/product,
//   с выбранным количеством) — товар добавляется в localStorage; повторно — растёт количество.
//   Счётчик корзины в шапке и нижней панели на любой странице — по сохранённым товарам (событие ap:counter).
//   Страница корзины (pages/cart/cart-content) выводит сохранённые товары и записывает изменения обратно.
//   ?cart-reset в адресе — очистить демо-корзину (корзина снова покажет пример из data/cart-items.json).

const KEY = 'ap-cart-demo';

export const isCartDemo = () => Boolean(document.body?.hasAttribute('data-cart-demo'));

// null — корзину ещё не трогали (страница корзины покажет пример из вёрстки)
export function readCart() {
  try {
    const raw = window.localStorage.getItem(KEY);
    const items = raw ? JSON.parse(raw) : null;
    return Array.isArray(items) ? items : null;
  } catch (error) {
    return null;
  }
}

export function writeCart(items) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch (error) {
    // хранилище недоступно (приватный режим) — корзина живёт до перезагрузки
  }
}

export const cartCount = (items) =>
  items.filter((item) => !item.unavailable).reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

const setCounter = (items) =>
  document.dispatchEvent(new CustomEvent('ap:counter', { detail: { counter: 'cart', count: cartCount(items) } }));

const text = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
const digits = (el) => Number(text(el).replace(/\D/g, '')) || 0;

// Данные товара по кнопке: карточка товара или первый экран страницы товара
function productFrom(button) {
  const card = button.closest('.ap-product-card');
  if (card) {
    const link = card.querySelector('.ap-product-card__title a');
    const title = text(link);
    return {
      id: card.dataset.productId || `${link?.getAttribute('href') || ''}|${title}`,
      href: link?.getAttribute('href') || '#',
      img: card.querySelector('.ap-product-card__img')?.src || '',
      cover: card.classList.contains('ap-product-card--photo'),
      article: '',
      title,
      price: digits(card.querySelector('.ap-product-card__price')),
      qty: 1,
    };
  }

  const product = button.closest('[data-product]');
  if (product) {
    const title = text(product.querySelector('#product-title'));
    return {
      id: product.dataset.productId || `${window.location.pathname}|${title}`,
      href: window.location.pathname,
      img: product.querySelector('[data-gallery-main]')?.src || '',
      cover: true,
      article: text(product.querySelector('[data-product-sku]')),
      title,
      price: digits(product.querySelector('.ap-product__price')),
      qty: Number(product.querySelector('[data-quantity-input]')?.value) || 1,
    };
  }

  return null;
}

export default function initCartDemo() {
  if (!isCartDemo()) return;

  if (new URLSearchParams(window.location.search).has('cart-reset')) {
    try {
      window.localStorage.removeItem(KEY);
    } catch (error) {
      // ничего
    }
  }

  const saved = readCart();
  if (saved) setCounter(saved);

  document.addEventListener('ap:product-action', (event) => {
    if (event.detail?.action !== 'cart') return;
    const product = productFrom(event.target);
    if (!product || !product.title) return;

    const items = readCart() || [];
    const same = items.find((item) => item.id === product.id || item.title === product.title);
    if (same) {
      same.qty = Math.min(Number(same.max) || 99, (Number(same.qty) || 0) + product.qty);
    } else {
      items.push({ ...product, max: 99, note: '', unavailable: false, similar: '' });
    }
    writeCart(items);
    setCounter(items);
  });
}
