// Пустое состояние страницы (sections/empty-state): кнопка «Обновить страницу» [data-empty-reload] (технические работы).
// По умолчанию href="" — перезагрузка текущего адреса (сервер отдаёт страницу работ на том адресе, где случилась
// ошибка). Если пришли перенаправлением — исходный адрес в ?back=<путь>: кнопка ведёт туда. Принимается только
// путь этого же сайта (/catalog/…), не внешняя ссылка.

export default function initEmptyState() {
  const button = document.querySelector('[data-empty-reload]');
  if (!button) return;

  const back = new URLSearchParams(window.location.search).get('back');
  if (back && back.startsWith('/') && !back.startsWith('//')) button.setAttribute('href', back);

  button.addEventListener('click', (event) => {
    if (button.getAttribute('href')) return; // переход по ?back
    event.preventDefault();
    window.location.reload();
  });
}
