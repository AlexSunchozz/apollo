// Корзина (sections/cart-content).
//   Количество (ui/quantity, событие ap:quantity-change) — сумма строки = цена за штуку (data-price) × количество,
//   сводка пересчитывается: «Товары, N шт.», сумма, итог = сумма − скидка (data-cart-discount у сводки, в рублях).
//   «Удалить» [data-cart-remove] — товар убирается из списка. «В избранное» — общий обработчик
//   ui/product-card (data-product-action="favorites", aria-pressed, счётчик избранного).
//   Счётчик корзины в шапке и нижней панели — событие ap:counter (количество товаров в наличии).
//   Состояние: есть товары в наличии — список, промокод, сводка; только недоступные — .is-unavailable у секции,
//   «Товары в корзине пока недоступны»; ничего — «В корзине пока пусто». Для проверки — ?unavailable / ?empty.
//
// События для интегратора (всплывают от товара / формы):
//   ap:cart-change  (detail: { item, id, quantity }) — изменено количество;
//   ap:cart-remove  (detail: { item, id })           — товар удалён (перед удалением из разметки);
//   ap:cart-notify  (detail: { item, id })           — «Сообщить о поступлении»;
//   ap:form-submit  (ui/form/form.js) у формы [data-cart-promo] — применить промокод.
// Ответ сервера о промокоде:
//   document.dispatchEvent(new CustomEvent('ap:promo-result', { detail: { form, ok, message, discount } }))
//   ok — применён (поле только для чтения, кнопка «очистить»), иначе ошибка; message — текст под полем
//   (по умолчанию — data-promo-success / data-promo-error формы); discount — новая скидка в рублях (необязательно).
//   «Очистить» у применённого промокода — событие ap:promo-remove (detail: { form }).
//   Пока action="#" — ответ имитируется: промокод применяется; с ?promo-error в адресе — ошибка.
// Демо-корзина (js/cart-demo.js, data-demo у <body>): товары берутся из localStorage (добавленные в каталоге
//   и на странице товара) и выводятся по шаблонам [data-cart-template*]; изменения записываются обратно.
//   Первый визит — пример из вёрстки сохраняется как начальная корзина. На сайте атрибута нет — список выводит сервер.

import initQuantities from '../../ui/quantity/quantity.js';
import { isDemo, readCart, writeCart } from '../../js/cart-demo.js';

const formatPrice = (value) => `${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽`;

const text = (el) => (el?.textContent || '').replace(/s+/g, ' ').trim();

// Демо-корзина: товар из разметки → данные для localStorage
function itemData(item) {
  const photo = item.querySelector('.ap-cart-content__item-photo');
  const input = item.querySelector('[data-quantity-input]');
  return {
    id: item.dataset.cartId,
    href: photo?.getAttribute('href') || '#',
    img: photo?.querySelector('img')?.src || '',
    cover: Boolean(photo?.classList.contains('ap-cart-content__item-photo--cover')),
    article: text(item.querySelector('.ap-cart-content__item-article')).replace(/^Артикул:s*/, ''),
    title: text(item.querySelector('.ap-cart-content__item-title')),
    price: Number(item.dataset.price) || 0,
    qty: Number(input?.value) || 0,
    max: Number(input?.max) || 0,
    note: text(item.querySelector('.ap-cart-content__item-note')),
    unavailable: item.hasAttribute('data-cart-unavailable'),
    similar: item.querySelector('.ap-cart-content__item-link--similar')?.getAttribute('href') || '',
  };
}

// Демо-корзина: данные → товар по шаблону (та же разметка cart-item.html)
function renderItem(template, data) {
  const item = template?.content.querySelector('[data-cart-item]')?.cloneNode(true);
  if (!item) return null;
  item.dataset.cartId = data.id;
  item.dataset.price = String(data.price);

  item.querySelectorAll('a[href="#"]').forEach((link) => link.setAttribute('href', data.href));
  const photo = item.querySelector('.ap-cart-content__item-photo');
  photo?.classList.toggle('ap-cart-content__item-photo--cover', Boolean(data.cover));
  const img = photo?.querySelector('img');
  if (img && data.img) img.src = data.img;

  const article = item.querySelector('.ap-cart-content__item-article');
  if (data.article) article.textContent = `Артикул: ${data.article}`;
  else article?.remove();

  const title = item.querySelector('.ap-cart-content__item-title a');
  if (title) title.textContent = data.title;

  const note = item.querySelector('.ap-cart-content__item-note');
  if (data.note) note.textContent = data.note;
  else note?.remove();

  const input = item.querySelector('[data-quantity-input]');
  if (input) {
    input.max = String(data.max || 99);
    input.value = String(data.qty || 1);
  }
  const similar = item.querySelector('.ap-cart-content__item-link--similar');
  if (similar && data.similar) similar.setAttribute('href', data.similar);
  return item;
}

function initPromo(form, setDiscount) {
  const field = form.querySelector('[data-promo-field]');
  const input = form.querySelector('[data-promo-input]');
  const submit = form.querySelector('[data-promo-submit]');
  const clear = form.querySelector('[data-promo-clear]');
  const message = form.querySelector('[data-promo-message]');
  if (!field || !input) return;

  const setState = (state, text = '') => {
    field.classList.toggle('is-error', state === 'error');
    field.classList.toggle('is-success', state === 'success');
    input.readOnly = state === 'success';
    if (submit) submit.hidden = state === 'success';
    if (clear) clear.hidden = state !== 'success';
    if (message) {
      message.textContent = text;
      message.hidden = !text;
    }
  };

  form.addEventListener('ap:form-submit', () => {
    const action = form.getAttribute('action');
    if (action && action !== '#') return; // ответ даст сервер (ap:promo-result)
    const ok = !new URLSearchParams(window.location.search).has('promo-error');
    document.dispatchEvent(new CustomEvent('ap:promo-result', { detail: { form, ok } }));
  });

  document.addEventListener('ap:promo-result', (event) => {
    const { form: target, ok, message: text, discount } = event.detail || {};
    if (target !== form) return;
    const fallback = ok ? form.dataset.promoSuccess : form.dataset.promoError;
    setState(ok ? 'success' : 'error', text || fallback || '');
    if (!ok) input.classList.add('is-invalid');
    if (typeof discount === 'number') setDiscount(discount);
  });

  // Ввод нового кода или «очистить» (layout/auth.js очищает поле и шлёт input) — ответ под полем убирается
  input.addEventListener('input', () => {
    const wasApplied = field.classList.contains('is-success');
    setState('');
    if (wasApplied) form.dispatchEvent(new CustomEvent('ap:promo-remove', { bubbles: true, detail: { form } }));
  });
}

export default function initCartContent() {
  const root = document.querySelector('[data-cart]');
  if (!root) return;

  const list = root.querySelector('[data-cart-list]');
  const body = root.querySelector('[data-cart-body]');
  const summary = root.querySelector('[data-cart-summary]');
  const empty = root.querySelector('[data-cart-empty]');
  const unavailableState = root.querySelector('[data-cart-unavailable-state]');
  const params = new URLSearchParams(window.location.search);
  // Демо-корзина; при просмотре видов (?empty, ?unavailable) сохранённое не трогаем
  const demo = isDemo() && !params.has('empty') && !params.has('unavailable');


  const items = () => [...list.querySelectorAll('[data-cart-item]')];
  const inStock = () => items().filter((item) => !item.hasAttribute('data-cart-unavailable'));
  const quantity = (item) => Number(item.querySelector('[data-quantity-input]')?.value) || 0;
  const setText = (selector, text) => {
    const el = summary?.querySelector(selector);
    if (el) el.textContent = text;
  };

  const update = () => {
    const available = inStock();
    let count = 0;
    let sum = 0;
    available.forEach((item) => {
      const qty = quantity(item);
      const price = Number(item.dataset.price) || 0;
      count += qty;
      sum += qty * price;
      const line = item.querySelector('[data-cart-item-sum]');
      if (line) line.textContent = formatPrice(qty * price);
    });

    const discount = Number(summary?.dataset.cartDiscount) || 0;
    setText('[data-cart-count]', String(count));
    setText('[data-cart-sum]', formatPrice(sum));
    setText('[data-cart-discount-value]', `- ${formatPrice(discount)}`);
    setText('[data-cart-total]', formatPrice(Math.max(0, sum - discount)));
    const discountRow = summary?.querySelector('[data-cart-discount-row]');
    if (discountRow) discountRow.hidden = discount <= 0;

    const hasItems = items().length > 0;
    const onlyUnavailable = hasItems && available.length === 0;
    body.hidden = !hasItems;
    root.classList.toggle('is-unavailable', onlyUnavailable);
    root.querySelectorAll('[data-cart-in-stock]').forEach((el) => {
      el.hidden = onlyUnavailable;
    });
    if (unavailableState) unavailableState.hidden = !onlyUnavailable;
    if (empty) empty.hidden = hasItems;

    document.dispatchEvent(new CustomEvent('ap:counter', { detail: { counter: 'cart', count } }));
    if (demo) writeCart(items().map(itemData));
  };

  const setDiscount = (value) => {
    if (summary) summary.dataset.cartDiscount = String(value);
    update();
  };

  // Демо-корзина: сохранённые товары вместо примера из вёрстки
  if (demo) {
    const saved = readCart();
    if (saved) {
      items().forEach((item) => item.remove());
      saved.forEach((data) => {
        const template = root.querySelector(data.unavailable ? '[data-cart-template-unavailable]' : '[data-cart-template]');
        const item = renderItem(template, data);
        if (item) list.append(item);
      });
      initQuantities();
    }
  }

  // Проверка видов без сервера
  if (params.has('empty')) items().forEach((item) => item.remove());
  else if (params.has('unavailable')) inStock().forEach((item) => item.remove());

  list.addEventListener('ap:quantity-change', (event) => {
    const item = event.target.closest('[data-cart-item]');
    if (!item) return;
    update();
    item.dispatchEvent(
      new CustomEvent('ap:cart-change', {
        bubbles: true,
        detail: { item, id: item.dataset.cartId, quantity: event.detail.value },
      }),
    );
  });

  list.addEventListener('click', (event) => {
    const item = event.target.closest('[data-cart-item]');
    if (!item) return;

    if (event.target.closest('[data-cart-remove]')) {
      item.dispatchEvent(new CustomEvent('ap:cart-remove', { bubbles: true, detail: { item, id: item.dataset.cartId } }));
      item.remove();
      update();
      return;
    }

    if (event.target.closest('[data-cart-notify]')) {
      item.dispatchEvent(new CustomEvent('ap:cart-notify', { bubbles: true, detail: { item, id: item.dataset.cartId } }));
    }
  });

  const promo = root.querySelector('[data-cart-promo]');
  if (promo) initPromo(promo, setDiscount);

  update();
}
