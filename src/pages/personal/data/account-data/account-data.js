// Личный кабинет — «Мои данные» (pages/personal/data/account-data).
//
//   Строки [data-data-row]: «Изменить» [data-row-edit] — форма в строке (.is-editing), «Отмена» — обратно, поле
//   возвращается к прежнему значению. «Сохранить» — проверка ui/form/form.js, затем ap:form-submit
//   (detail: { form, data }) — сохранение подключает интегратор.
//   Телефон (у формы есть [data-row-confirm]): первое «Сохранить» — отправка СМС, в строке появляется поле кода,
//   кнопка — «Подтвердить номер»; второе — подтверждение.
//   Адреса [data-addresses]: «+ Добавить адрес» / «Изменить» — форма адреса [data-address-form] (при изменении —
//   с данными карточки из data-address), «Удалить» — событие ap:address-delete (detail: { card }).
//   Уведомления [data-notify]: событие ap:notify-change (detail: { name, checked }).
//   Пока у форм action="#" (статичная вёрстка) — ответ сервера имитируется: новое значение сразу видно в строке,
//   адрес — в карточке.

const NBSP = String.fromCharCode(160);

const isStatic = (form) => {
  const action = form.getAttribute('action');
  return !action || action === '#';
};

function initRow(row) {
  const form = row.querySelector('[data-row-form]');
  const value = row.querySelector('[data-row-value]');
  const input = form?.querySelector('input:not([name="code"])');
  const confirm = form?.querySelector('[data-row-confirm]');
  const code = confirm?.querySelector('input');
  const hint = form?.querySelector('[data-row-hint]');
  const submit = form?.querySelector('[data-row-submit]');
  if (!form || !input) return;

  const initial = { hint: hint?.innerHTML, submit: submit?.textContent };

  const setConfirm = (on) => {
    if (!confirm) return;
    confirm.hidden = !on;
    code.disabled = !on;
    code.value = '';
    input.readOnly = on;
    if (hint) hint.innerHTML = on && hint.dataset.sent ? hint.dataset.sent : initial.hint;
    if (submit) submit.textContent = on ? submit.dataset.confirmText : initial.submit;
  };

  const open = (on) => {
    row.classList.toggle('is-editing', on);
    form.hidden = !on;
    if (on) {
      input.focus();
    } else {
      form.reset();
      setConfirm(false);
      form.querySelectorAll('.is-invalid').forEach((field) => field.classList.remove('is-invalid'));
    }
  };

  row.querySelector('[data-row-edit]')?.addEventListener('click', () => open(true));
  form.querySelector('[data-row-cancel]')?.addEventListener('click', () => {
    open(false);
    row.querySelector('[data-row-edit]')?.focus();
  });

  form.addEventListener('ap:form-submit', () => {
    if (!isStatic(form)) return;
    if (confirm && confirm.hidden) {
      setConfirm(true); // «отправили СМС» — ждём код
      code.focus();
      return;
    }
    if (value) value.textContent = input.type === 'password' ? '••••••••' : input.value.trim().replace(/\s+/g, NBSP);
    const current = form.querySelector('.ap-account-data__current');
    if (current && input.type !== 'password') current.textContent = current.textContent.replace(/:.*$/, `: ${input.value.trim()}`);
    open(false);
  });
}

function initAddresses(root) {
  const box = root.querySelector('[data-addresses]');
  if (!box) return;
  const list = box.querySelector('[data-address-list]');
  const form = box.querySelector('[data-address-form]');
  const title = form?.querySelector('[data-address-form-title]');
  if (!list || !form) return;
  let editing = null; // карточка, которую меняем (null — новый адрес)

  const show = (card) => {
    editing = card;
    form.reset();
    if (title) title.textContent = card ? title.dataset.titleEdit : title.dataset.titleNew;
    if (card) {
      const data = JSON.parse(card.dataset.address || '{}');
      Object.entries(data).forEach(([name, val]) => {
        const field = form.elements[name];
        if (!field) return;
        if (field.type === 'checkbox') field.checked = Boolean(val);
        else field.value = val;
      });
    }
    form.hidden = false;
    form.querySelector('input')?.focus();
  };
  const hide = () => {
    form.hidden = true;
    editing = null;
  };

  box.querySelector('[data-address-add]')?.addEventListener('click', () => show(null));
  form.querySelector('[data-address-cancel]')?.addEventListener('click', hide);

  list.addEventListener('click', (event) => {
    const card = event.target.closest('[data-address]');
    if (!card) return;
    if (event.target.closest('[data-address-edit]')) show(card);
    if (event.target.closest('[data-address-delete]')) {
      const allowed = card.dispatchEvent(new CustomEvent('ap:address-delete', { bubbles: true, cancelable: true, detail: { card } }));
      if (allowed && isStatic(form)) card.remove();
    }
  });

  // Статичная вёрстка: карточка адреса обновляется / добавляется сразу
  form.addEventListener('ap:form-submit', ({ detail: { data } }) => {
    if (!isStatic(form)) return;
    const get = (name) => (data.get(name) || '').trim();
    const card = editing || list.querySelector('[data-address]')?.cloneNode(true);
    if (!card) return;
    const values = {};
    ['title', 'city', 'street', 'house', 'building', 'flat', 'entrance', 'floor', 'intercom'].forEach((name) => {
      values[name] = get(name);
    });
    values.main = data.get('main') === 'Y';
    card.dataset.address = JSON.stringify(values);

    const join = (parts) => parts.filter(Boolean).join(', ');
    const line1 = join([values.city, values.street, values.house, values.building && `корпус${NBSP}${values.building}`, values.flat && `квартира${NBSP}${values.flat}`]);
    const line2 = join([values.entrance && `Подъезд${NBSP}${values.entrance}`, values.floor && `этаж${NBSP}${values.floor}`, values.intercom && `домофон${NBSP}${values.intercom}`]);
    card.querySelector('[data-address-title]').textContent = values.title || 'Адрес';
    const text = card.querySelector('[data-address-text]');
    text.textContent = line1;
    if (line2) text.append(document.createElement('br'), line2);

    if (values.main) {
      list.querySelectorAll('[data-address-main]').forEach((badge) => {
        badge.hidden = true;
      });
    }
    card.querySelector('[data-address-main]').hidden = !values.main;
    if (!editing) list.append(card);
    hide();
  });
}

export default function initAccountData() {
  const root = document.querySelector('[data-account-data]');
  if (!root) return;

  root.querySelectorAll('[data-data-row]').forEach(initRow);
  initAddresses(root);

  root.querySelector('[data-notify]')?.addEventListener('change', (event) => {
    const { name, checked } = event.target;
    event.target.dispatchEvent(new CustomEvent('ap:notify-change', { bubbles: true, detail: { name, checked } }));
  });
}
