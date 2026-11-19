// Оформление заказа (sections/checkout).
// Сохранённые адреса (вошёл): «Изменить» — форма адреса [data-address-editor] переносится в карточку и заполняется
// её данными (data-address); «+ Добавить адрес» — та же форма в блоке «Новый адрес». «Сохранить» проверяет город,
// улицу и дом, обновляет карточку (или добавляет новую из <template data-address-template>) и шлёт событие
// ap:address-save (detail: { address, card, isNew }) — к нему интегратор подключает запрос на сервер.
// Поля в скрытых блоках отключаются (disabled) — ui/form/form.js их не проверяет и не отправляет.
// Вошедшему поля контактов заполняются из data-auth-value (на сайте значения выводит сервер).
// Демо-режим (body[data-demo]): после успешной проверки формы — переход на адрес data-checkout-success.

const NBSP = ' ';
const REQUIRED = ['city', 'street', 'house'];

const formatLines = (a) => {
  const line1 = [a.city, a.street, a.house, a.building && `корпус${NBSP}${a.building}`, a.flat && `квартира${NBSP}${a.flat}`]
    .filter(Boolean)
    .join(', ');
  const line2 = [a.entrance && `Подъезд${NBSP}${a.entrance}`, a.floor && `этаж${NBSP}${a.floor}`, a.intercom && `домофон${NBSP}${a.intercom}`]
    .filter(Boolean)
    .join(', ');
  return [line1, line2];
};

const readAddress = (card) => {
  try {
    return JSON.parse(card.dataset.address || '{}');
  } catch {
    return {};
  }
};

function initAddresses(root, syncFields) {
  const editor = root.querySelector('[data-address-editor]');
  const list = root.querySelector('[data-address-list]');
  if (!editor || !list) return;

  const radio = editor.querySelector('[data-address-editor-radio]');
  const fields = [...editor.querySelectorAll('[data-address-field]')];
  const newBlock = root.querySelector('[data-address-new]');
  const newSlot = root.querySelector('[data-address-new-slot]');
  const addButton = root.querySelector('[data-address-add]');
  const template = root.querySelector('[data-address-template]');
  const home = editor.parentElement; // где форма ждёт, пока закрыта
  let current = null; // карточка, которую изменяют; null — новый адрес

  const fill = (data = {}) => {
    fields.forEach((field) => {
      field.value = data[field.dataset.addressField] || '';
      field.classList.remove('is-invalid');
    });
  };

  const close = () => {
    if (current) current.classList.remove('is-editing');
    current = null;
    editor.hidden = true;
    home.append(editor);
    if (newBlock) newBlock.hidden = true;
    if (addButton) addButton.hidden = false;
    syncFields();
  };

  const open = (card) => {
    close();
    current = card;
    if (card) {
      card.classList.add('is-editing');
      const input = card.querySelector('input[type="radio"]');
      if (input) input.checked = true;
      card.append(editor);
      fill(readAddress(card));
    } else {
      newSlot.append(editor);
      newBlock.hidden = false;
      addButton.hidden = true;
      fill();
    }
    if (radio) radio.hidden = !card;
    editor.hidden = false;
    syncFields();
    fields[0].focus();
  };

  const save = () => {
    const invalid = fields.filter((field) => REQUIRED.includes(field.dataset.addressField) && !field.value.trim());
    fields.forEach((field) => field.classList.toggle('is-invalid', invalid.includes(field)));
    if (invalid.length) {
      invalid[0].focus();
      return;
    }

    const isNew = !current;
    let card = current;
    if (isNew) {
      if (!template) return;
      card = template.content.firstElementChild.cloneNode(true);
      const id = `new-${Date.now()}`;
      const input = card.querySelector('input[type="radio"]');
      input.id = `checkout-address-${id}`;
      input.value = id;
      card.querySelector('label').htmlFor = input.id;
      list.append(card);
      input.checked = true;
    }

    const address = { ...readAddress(card) };
    fields.forEach((field) => {
      address[field.dataset.addressField] = field.value.trim();
    });
    if (!address.title) address.title = 'Адрес';
    card.dataset.address = JSON.stringify(address);
    card.querySelector('[data-address-title]').textContent = address.title;
    const text = card.querySelector('[data-address-text]');
    const [line1, line2] = formatLines(address);
    text.textContent = line1;
    if (line2) text.append(document.createElement('br'), line2);

    close();
    root.dispatchEvent(new CustomEvent('ap:address-save', { bubbles: true, detail: { address, card, isNew } }));
  };

  root.addEventListener('click', (event) => {
    const edit = event.target.closest('[data-address-edit]');
    if (edit) open(edit.closest('[data-address]'));
    else if (event.target.closest('[data-address-add]')) open(null);
    else if (event.target.closest('[data-address-cancel]')) close();
    else if (event.target.closest('[data-address-save]')) save();
  });

  // Enter в поле адреса — «Сохранить», а не отправка всего заказа
  editor.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.matches('input')) {
      event.preventDefault();
      save();
    }
  });
}

export default function initCheckout() {
  const root = document.querySelector('[data-checkout]');
  if (!root) return;

  const form = root.querySelector('form');
  const syncFields = () => {
    form.querySelectorAll('input, textarea, select').forEach((field) => {
      field.disabled = Boolean(field.closest('[hidden]'));
    });
  };

  // Вошёл (layout/header.js: data-authorized у [data-account], для проверки — ?auth): сохранённые адреса и данные профиля
  if (document.querySelector('[data-account][data-authorized="true"]')) {
    root.querySelectorAll('[data-auth-only]').forEach((el) => {
      el.hidden = false;
    });
    root.querySelectorAll('[data-auth-value]').forEach((field) => {
      if (!field.value) field.value = field.dataset.authValue;
    });
  }

  initAddresses(root, syncFields);
  syncFields();

  // Статичная вёрстка: после успешной проверки — страница результата
  const success = root.dataset.checkoutSuccess;
  if (success && document.body.hasAttribute('data-demo')) {
    form.addEventListener('ap:form-submit', () => {
      window.location.href = success;
    });
  }
}
