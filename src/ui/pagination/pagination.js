// Постраничная навигация (ui/pagination): рисует номера страниц в <nav data-pagination> и сообщает о выборе.
// Логику страниц (что показать) держит секция-владелец — здесь только кнопки.
//
//   const pagination = initPagination(nav, { onSelect(page) { … } });
//   pagination.render({ from, to, last });
//     from–to — открытые страницы (после «Показать ещё» их несколько — все отмечены aria-current),
//     last — число страниц. Номеров — не больше 5 (окно вокруг последней открытой), дальше «>» — следующая,
//     «>>» — последняя (на последней странице неактивны). Одна страница — навигация скрыта.

const WINDOW = 5;

export default function initPagination(nav, { onSelect } = {}) {
  const list = nav.querySelector('ul');
  if (!list) return { render() {} };

  nav.addEventListener('click', (event) => {
    const button = event.target.closest('[data-page]');
    if (!button || button.disabled) return;
    onSelect?.(Number(button.dataset.page));
  });

  const item = (page, text, { label, current = false, disabled = false } = {}) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ap-pagination__item';
    button.dataset.page = String(page);
    button.textContent = text;
    if (label) button.setAttribute('aria-label', label);
    if (current) button.setAttribute('aria-current', 'page');
    button.disabled = disabled;
    li.append(button);
    return li;
  };

  return {
    render({ from, to, last }) {
      nav.hidden = last <= 1;
      if (last <= 1) return;

      const start = Math.max(1, Math.min(to - Math.floor(WINDOW / 2), last - WINDOW + 1));
      const end = Math.min(last, start + WINDOW - 1);
      const items = [];
      for (let page = start; page <= end; page += 1) {
        items.push(item(page, String(page), { label: `Страница ${page}`, current: page >= from && page <= to }));
      }
      const isLast = to >= last;
      items.push(item(Math.min(to + 1, last), '>', { label: 'Следующая страница', disabled: isLast }));
      items.push(item(last, '>>', { label: 'Последняя страница', disabled: isLast }));
      list.replaceChildren(...items);
    },
  };
}
