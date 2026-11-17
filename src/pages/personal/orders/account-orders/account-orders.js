// Личный кабинет — «Мои заказы» (pages/personal/orders/account-orders).
//   Табы «Активные / Завершенные / Отмененные / Купленные товары» — ui/tabs/tabs.js (панели переключаются в вёрстке;
//   на сайте каждый таб может быть и отдельной загрузкой — по событию интегратора не требуется).
//   Купленные товары: годы [data-purchases-year] (aria-pressed) и «Скрыть отмененные» [data-purchases-hide-returned] —
//   событие ap:purchases-filter (detail: { year, hideReturned }) для сервера. В статике карточки фильтруются
//   по data-purchase-year / data-purchase-returned; нет ни одной — «За … покупок не найдено» [data-purchases-empty].
//   ?empty в адресе — во всех табах заказов «Заказов пока нет» вместо списка (проверка вида; на сайте выбирает сервер).

import initTabs from '../../../../ui/tabs/tabs.js';

export default function initAccountOrders() {
  const root = document.querySelector('[data-account-orders]');
  if (!root) return;

  const tablist = root.querySelector('[data-tabs]');
  if (tablist) initTabs(tablist);

  if (new URLSearchParams(window.location.search).has('empty')) {
    root.querySelectorAll('[data-orders-list]').forEach((list) => {
      list.hidden = true;
    });
    root.querySelectorAll('[data-orders-empty]').forEach((empty) => {
      empty.hidden = false;
    });
  }

  const purchases = root.querySelector('[data-purchases]');
  if (!purchases) return;
  const years = [...purchases.querySelectorAll('[data-purchases-year]')];
  const hideReturned = purchases.querySelector('[data-purchases-hide-returned]');
  const list = purchases.querySelector('[data-purchases-list]');
  const none = purchases.querySelector('[data-purchases-empty]');
  const demo = new URLSearchParams(window.location.search).has('empty');

  const update = () => {
    const current = years.find((button) => button.getAttribute('aria-pressed') === 'true');
    const year = current?.dataset.purchasesYear || '';
    const hide = Boolean(hideReturned?.checked);
    root.dispatchEvent(new CustomEvent('ap:purchases-filter', { bubbles: true, detail: { year, hideReturned: hide } }));

    let shown = 0;
    [...(list?.children || [])].forEach((card) => {
      const visible = !demo && card.dataset.purchaseYear === year && !(hide && card.hasAttribute('data-purchase-returned'));
      card.hidden = !visible;
      if (visible) shown += 1;
    });
    if (list) list.hidden = shown === 0;
    if (none) {
      none.hidden = shown > 0;
      const nb = String.fromCharCode(160); // неразрывный пробел — без висящих предлогов
      none.textContent = year === '12m' ? `За${nb}последние 12${nb}месяцев покупок не${nb}найдено` : `За${nb}${year}${nb}год покупок не${nb}найдено`;
    }
  };

  years.forEach((button) => {
    button.addEventListener('click', () => {
      years.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      update();
    });
  });
  hideReturned?.addEventListener('change', update);
  update();
}
