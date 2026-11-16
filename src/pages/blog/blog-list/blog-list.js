// «Блог» (pages/blog/blog-list): рубрики-табы, страницы статей и «Показать еще».
// Табы — общий модуль ui/tabs/tabs.js; номера страниц — ui/pagination/pagination.js.
// В каждой панели [data-articles] — по data-articles статей (6) на страницу:
//   номер страницы — показать только её, «>» — следующую, «>>» — последнюю;
//   «Показать еще» — добавить следующую страницу к открытым (в пагинации отмечены все открытые);
//   на последней странице кнопки нет. Без JS видны все статьи (пагинация и кнопка скрыты атрибутом hidden).
// Событие ap:articles-page (detail: { panel, from, to, last }) — для интегратора, если статьи подгружаются с сервера.

import initTabs from '../../../ui/tabs/tabs.js';
import initPagination from '../../../ui/pagination/pagination.js';

const DEFAULT_PAGE = 6;

function initPanel(panel, scrollTarget) {
  const list = panel.querySelector('[data-articles-list]');
  if (!list) return;

  const more = panel.querySelector('[data-articles-more]');
  const nav = panel.querySelector('[data-pagination]');
  const size = Number(panel.dataset.articles) || DEFAULT_PAGE;
  const items = [...list.children];
  const last = Math.max(1, Math.ceil(items.length / size));
  let from = 1;
  let to = 1;

  const update = () => {
    items.forEach((item, index) => {
      item.hidden = index < (from - 1) * size || index >= to * size;
    });
    if (more) more.hidden = to >= last;
    pagination?.render({ from, to, last });
  };

  const go = (nextFrom, nextTo) => {
    from = nextFrom;
    to = nextTo;
    update();
    panel.dispatchEvent(new CustomEvent('ap:articles-page', { bubbles: true, detail: { panel, from, to, last } }));
  };

  const pagination = nav
    ? initPagination(nav, {
        onSelect(page) {
          go(page, page);
          // Новая страница — к началу списка (к рубрикам), если они ушли за верх экрана
          if (scrollTarget && scrollTarget.getBoundingClientRect().top < 0) {
            scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        },
      })
    : null;

  more?.addEventListener('click', () => {
    const firstNew = items[to * size];
    go(from, to + 1);
    // Фокус — на первую открывшуюся статью, чтобы с клавиатуры не возвращаться к началу списка
    firstNew?.querySelector('a[href]')?.focus({ preventScroll: true });
  });

  update();
}

export default function initBlogList() {
  const root = document.querySelector('.ap-blog-list');
  if (!root) return;

  const tablist = root.querySelector('[data-tabs]');
  if (tablist) initTabs(tablist);

  root.querySelectorAll('[data-articles]').forEach((panel) => initPanel(panel, tablist));
}
