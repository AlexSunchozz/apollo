// Точка входа нашего JS → dist/js/script.js (читаемый, без минификации) — один файл на все страницы.
// Библиотеки (Swiper, Bootstrap) — в отдельном dist/js/vendor.js, здесь берутся через ./vendors.js.
// Скрипты секций лежат рядом с их разметкой: src/sections/<name>/<name>.js, src/pages/<page>/<name>/<name>.js.
// Каждый init сам проверяет, есть ли его блок на странице (if (!root) return), — поэтому безопасен везде.

import initCore from './core.js';

// Общие секции (по алфавиту):
import initArticle from '../sections/article/article.js';
import initCategory from '../sections/category/category.js';
import initEmptyState from '../sections/empty-state/empty-state.js';
import initProduct from '../sections/product/product.js';
import initProductReviews from '../sections/product-reviews/product-reviews.js';
import initProducts from '../sections/products/products.js';

// Общие модули компонентов:
import initFilters from '../ui/filters/filters.js';
import initQuantities from '../ui/quantity/quantity.js';
import initViewSwitch from '../ui/view-switch/view-switch.js';

// Уникальные секции страниц:
import initCatalogList from '../pages/catalog/catalog-list/catalog-list.js';
import initBlogList from '../pages/blog/blog-list/blog-list.js';
import initHomeHero from '../pages/index/home-hero/home-hero.js';
import initHomeProducts from '../pages/index/home-products/home-products.js';
import initAccountData from '../pages/personal/data/account-data/account-data.js';
import initAccountOrders from '../pages/personal/orders/account-orders/account-orders.js';

document.addEventListener('DOMContentLoaded', () => {
  initCore();
  initArticle();
  initProducts();
  initProduct();
  initProductReviews();
  initQuantities();
  initViewSwitch();
  initFilters();
  initCategory();
  initEmptyState();
  initBlogList();
  initCatalogList();
  initHomeHero();
  initHomeProducts();
  initAccountData();
  initAccountOrders();
});
