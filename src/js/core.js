// Общий код сайта (без секций): заглушки ссылок, шапка, меню каталога, счётчики, общие UI-модули (карточки товара, формы…).

import initStubs from './stubs.js';
import initCounters, { initStickyHeader, initCatalogMenu, initSearch, initAccount } from '../layout/header.js';
import initProductCards from '../ui/product-card/product-card.js';
import initForms from '../ui/form/form.js';
import initAuth from '../layout/auth.js';

export default function initCore() {
  initStubs();
  initStickyHeader();
  initCatalogMenu();
  initCounters();
  initSearch();
  initAccount();
  initProductCards();
  initForms();
  initAuth();
}
