// Панель фильтров (ui/filters) — общий модуль.
// Форма [data-filters]: кнопки сброса — [data-filters-reset] внутри формы и [data-filters-reset="#<id формы>"]
// снаружи (например, в панели над товарами) — видны, только когда что-то выбрано или введена цена.
// Сброс очищает форму (ползунок цены возвращается к краям — ui/form/form.js по событию change полей «от / до»).
// Событие ap:filters-change (detail: { form, data: FormData, active }) — после каждого изменения и сброса:
// к нему интегратор подключает запрос к умному фильтру CMS и обновление списка товаров.

function isActive(form) {
  return [...form.elements].some((el) => {
    if (el.type === 'checkbox' || el.type === 'radio') return el.checked;
    if (el.type === 'number') return el.value !== '';
    return false;
  });
}

function initForm(form) {
  const resets = () => [
    ...form.querySelectorAll('[data-filters-reset]'),
    ...(form.id ? document.querySelectorAll(`[data-filters-reset="#${form.id}"]`) : []),
  ];

  const update = () => {
    const active = isActive(form);
    resets().forEach((button) => {
      button.hidden = !active;
    });
    form.dispatchEvent(new CustomEvent('ap:filters-change', { bubbles: true, detail: { form, data: new FormData(form), active } }));
  };

  form.addEventListener('change', update);
  form.addEventListener('input', (event) => {
    if (event.target.type === 'number') update();
  });

  form.addEventListener('reset', () => {
    // После очистки полей: ползунки цены — к краям, кнопки сброса — скрыть
    setTimeout(() => {
      form.querySelectorAll('[data-range-from], [data-range-to]').forEach((input) => input.dispatchEvent(new Event('change')));
      update();
    });
  });

  // Внешние кнопки сброса (в панели над товарами)
  if (form.id) {
    document.querySelectorAll(`[data-filters-reset="#${form.id}"]`).forEach((button) => {
      button.addEventListener('click', () => form.reset());
    });
  }

  resets().forEach((button) => {
    button.hidden = !isActive(form);
  });
}

export default function initFilters() {
  document.querySelectorAll('[data-filters]').forEach((form) => {
    if (form.dataset.filtersReady) return;
    form.dataset.filtersReady = '1';
    initForm(form);
  });
}
