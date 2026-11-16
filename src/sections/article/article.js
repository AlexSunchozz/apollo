// Статья (sections/article): выделение пункта оглавления при прокрутке и ссылки «Поделиться».
//
// Оглавление [data-toc]: выделение пункта при прокрутке — общий модуль ui/scrollspy/scrollspy.js
// (раздел, до которого дошёл центр экрана; работает и с текстом из редактора CMS — нужны id у заголовков).
//
// «Поделиться» [data-share="telegram|vk"]: ссылка на текущую страницу, открывается в новой вкладке.

import initScrollspy from '../../ui/scrollspy/scrollspy.js';

const SHARE = {
  telegram: (url, title) => `https://t.me/share/url?url=${url}&text=${title}`,
  vk: (url, title) => `https://vk.com/share.php?url=${url}&title=${title}`,
};

function initShare(root) {
  const url = encodeURIComponent(window.location.href.split('#')[0]);
  const title = encodeURIComponent(root.querySelector('h1')?.textContent.trim() || document.title);
  root.querySelectorAll('[data-share]').forEach((link) => {
    const build = SHARE[link.dataset.share];
    if (!build) return;
    link.href = build(url, title);
    link.removeAttribute('data-stub');
  });
}

export default function initArticle() {
  const root = document.querySelector('.ap-article');
  if (!root) return;

  initShare(root);
  initScrollspy(root.querySelectorAll('[data-toc] a[href^="#"]'));
}
