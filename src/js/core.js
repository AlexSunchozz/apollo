// Общий код сайта (без секций): заглушки ссылок, шапка, меню каталога, счётчики, общие UI-модули (карточки товара, формы…).

import initStubs from './stubs.js';
import initCounters, { initStickyHeader, initCatalogMenu, initAccount, initTabbarSheets } from '../layout/header.js';
import initSearch from '../ui/search/search.js';
import initProductCards from '../ui/product-card/product-card.js';
import initForms from '../ui/form/form.js';
import initAuth from '../layout/auth.js';
import initCartDemo from './cart-demo.js';
import initFavoritesDemo from './favorites-demo.js';

export default function initCore() {
  initStubs();
  initStickyHeader();
  initCatalogMenu();
  initCounters();
  initCartDemo();
  initFavoritesDemo();
  initSearch();
  initAccount();
  initTabbarSheets();
  initProductCards();
  initForms();
  initAuth();
}
