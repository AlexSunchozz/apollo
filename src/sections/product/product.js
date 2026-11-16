// Карточка товара — первый экран (sections/product): галерея и копирование артикула.
// Галерея: миниатюра [data-gallery-thumb="<путь к фото>"] показывает фото в большом [data-gallery-main];
// выбранная миниатюра — aria-current="true".
// Артикул: [data-product-copy] копирует текст [data-product-sku] в буфер обмена; рядом на 1,5 с — «Скопировано»
// ([data-product-copied], объявляется и для экранного диктора).
// Табы-разделы ниже (sections/product-details) — подсветка раздела ui/scrollspy.

import initScrollspy from '../../ui/scrollspy/scrollspy.js';

function initGallery(root) {
  const main = root.querySelector('[data-gallery-main]');
  const thumbs = [...root.querySelectorAll('[data-gallery-thumb]')];
  if (!main || !thumbs.length) return;

  const select = (thumb) => {
    thumbs.forEach((item) => item.toggleAttribute('aria-current', item === thumb));
    if (main.getAttribute('src') !== thumb.dataset.galleryThumb) main.setAttribute('src', thumb.dataset.galleryThumb);
  };

  thumbs.forEach((thumb) => thumb.addEventListener('click', () => select(thumb)));
  select(thumbs.find((thumb) => thumb.dataset.galleryThumb === main.getAttribute('src')) || thumbs[0]);
}

// Копирование: Clipboard API (https и localhost), иначе — запасной способ через скрытое поле (http, старые браузеры)
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.append(field);
    field.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (e) {
      ok = false;
    }
    field.remove();
    return ok;
  }
}

function initCopy(root) {
  const button = root.querySelector('[data-product-copy]');
  const sku = root.querySelector('[data-product-sku]');
  const status = root.querySelector('[data-product-copied]');
  if (!button || !sku) return;

  let timer = 0;
  button.addEventListener('click', async () => {
    const ok = await copyText(sku.textContent.trim());
    if (status) status.textContent = ok ? 'Скопировано' : 'Не удалось скопировать';
    button.classList.toggle('is-copied', ok);
    clearTimeout(timer);
    timer = setTimeout(() => {
      button.classList.remove('is-copied');
      if (status) status.textContent = '';
    }, 1500);
  });
}

export default function initProduct() {
  const root = document.querySelector('[data-product]');
  if (root) {
    initGallery(root);
    initCopy(root);
  }

  const details = document.querySelector('[data-product-details]');
  if (details) initScrollspy(details.querySelectorAll('.ap-line-tabs a[href^="#"]'));
}
