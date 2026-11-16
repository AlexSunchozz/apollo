// Выбор количества (ui/quantity) — общий модуль: [data-quantity] с кнопками −/+ и полем.
// Значение — в пределах min…max поля (по умолчанию 1…99), кнопка у границы неактивна.
// Событие ap:quantity-change (detail: { value }) — например, пересчитать сумму или передать в корзину.

function initQuantity(root) {
  const input = root.querySelector('[data-quantity-input]');
  const minus = root.querySelector('[data-quantity-minus]');
  const plus = root.querySelector('[data-quantity-plus]');
  if (!input) return;

  const min = Number(input.min) || 1;
  const max = Number(input.max) || 99;

  const set = (value, silent = false) => {
    const n = Math.min(max, Math.max(min, Math.round(Number(value)) || min));
    input.value = n;
    if (minus) minus.disabled = n <= min;
    if (plus) plus.disabled = n >= max;
    if (!silent) root.dispatchEvent(new CustomEvent('ap:quantity-change', { bubbles: true, detail: { value: n } }));
  };

  minus?.addEventListener('click', () => set(Number(input.value) - 1));
  plus?.addEventListener('click', () => set(Number(input.value) + 1));
  input.addEventListener('change', () => set(input.value));
  set(input.value, true);
}

export default function initQuantities() {
  document.querySelectorAll('[data-quantity]').forEach((root) => {
    if (root.dataset.quantityReady) return;
    root.dataset.quantityReady = '1';
    initQuantity(root);
  });
}
