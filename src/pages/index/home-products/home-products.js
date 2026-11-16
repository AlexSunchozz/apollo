// Товары на главной: переключение табов — общий модуль ui/tabs/tabs.js.
// Слайдеры в карточках запускает ui/product-card/product-card.js (core.js).

import initTabs from '../../../ui/tabs/tabs.js';

export default function initHomeProducts() {
  const tablist = document.querySelector('.ap-home-products [data-tabs]');
  if (tablist) initTabs(tablist);
}
