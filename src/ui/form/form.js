// Элементы форм (ui/form): выпадающий список с чекбоксами, выбор файла, бюджет с ползунком, проверка при отправке.
// Общий модуль для всех форм сайта. Работает по data-атрибутам, повторный запуск безопасен.
//
//   [data-select]  — подпись в поле = выбранные пункты через запятую; список — Bootstrap Collapse,
//                    закрывается кликом мимо и по Esc
//   [data-file]    — в поле показывается имя файла (или «Файлов: N»)
//   [data-range]   — поля «от / до» и два ползунка синхронизированы (data-min / data-max / data-step)
//   [data-form]    — при отправке: [required] не пустые, [data-phone] — 10–15 цифр, type=email — адрес вида name@domain.ru, обязательные чекбоксы
//                    отмечены; ошибка — .is-invalid (красная обводка), снимается при вводе.
//                    Если всё верно — событие ap:form-submit (detail: { form, data }) для интегратора;
//                    пока action="#" — форма никуда не отправляется.
//   [data-form-success="#id"] — после успешной проверки форма очищается и открывается окно #id
//                    (Bootstrap Modal, например «Спасибо за подписку!»). Интегратор при AJAX-отправке может
//                    убрать атрибут и открывать окно сам по ответу сервера.

import { Collapse, Modal } from '../../js/vendors.js';

function initSelect(select) {
  const value = select.querySelector('[data-select-value]');
  const panel = select.querySelector('.collapse');
  const update = () => {
    const checked = [...select.querySelectorAll('input:checked')].map((input) => input.value);
    value.textContent = checked.join(', ');
  };
  select.addEventListener('change', update);
  update();

  if (!panel || !Collapse) return;
  const hide = () => {
    if (panel.classList.contains('show')) Collapse.getOrCreateInstance(panel, { toggle: false }).hide();
  };
  document.addEventListener('click', (event) => {
    if (!select.contains(event.target)) hide();
  });
  select.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel.classList.contains('show')) {
      event.stopPropagation(); // Esc закрывает список, а не всё окно
      hide();
      select.querySelector('[data-bs-toggle]')?.focus();
    }
  });
}

function initFile(input) {
  const field = input.closest('.ap-file');
  const text = field?.querySelector('[data-file-text]');
  if (!text) return;
  const placeholder = text.textContent;
  input.addEventListener('change', () => {
    const files = input.files ? [...input.files] : [];
    text.textContent = files.length === 0 ? placeholder : files.length === 1 ? files[0].name : `Файлов: ${files.length}`;
    field.classList.toggle('is-filled', files.length > 0);
  });
}

function initRange(range) {
  const min = Number(range.dataset.min) || 0;
  const max = Number(range.dataset.max) || 100;
  const step = Number(range.dataset.step) || 1;
  const from = range.querySelector('[data-range-from]');
  const to = range.querySelector('[data-range-to]');
  const sliderMin = range.querySelector('[data-range-min]');
  const sliderMax = range.querySelector('[data-range-max]');
  if (!from || !to || !sliderMin || !sliderMax) return;

  [sliderMin, sliderMax].forEach((slider) => Object.assign(slider, { min, max, step }));
  sliderMin.value = min;
  sliderMax.value = max;

  const clamp = (n) => Math.min(max, Math.max(min, n));

  sliderMin.addEventListener('input', () => {
    sliderMin.value = Math.min(Number(sliderMin.value), Number(sliderMax.value));
    from.value = Number(sliderMin.value) > min ? sliderMin.value : '';
  });
  sliderMax.addEventListener('input', () => {
    sliderMax.value = Math.max(Number(sliderMax.value), Number(sliderMin.value));
    to.value = Number(sliderMax.value) < max ? sliderMax.value : '';
  });
  from.addEventListener('change', () => {
    if (from.value === '') { sliderMin.value = min; return; }
    const n = clamp(Math.min(Number(from.value), Number(sliderMax.value)));
    from.value = n;
    sliderMin.value = n;
  });
  to.addEventListener('change', () => {
    if (to.value === '') { sliderMax.value = max; return; }
    const n = clamp(Math.max(Number(to.value), Number(sliderMin.value)));
    to.value = n;
    sliderMax.value = n;
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isFieldValid = (field) => {
  if (field.type === 'checkbox') return !field.required || field.checked;
  const value = field.value.trim();
  if (field.required && !value) return false;
  if (field.hasAttribute('data-phone') && value) {
    const digits = value.replace(/\D/g, '').length;
    return digits >= 10 && digits <= 15;
  }
  if (field.type === 'email' && value) return EMAIL_RE.test(value);
  return true;
};

function initForm(form) {
  form.addEventListener('submit', (event) => {
    const fields = [...form.querySelectorAll('[required], [data-phone], [type="email"]')];
    const invalid = fields.filter((field) => !isFieldValid(field));
    fields.forEach((field) => field.classList.toggle('is-invalid', invalid.includes(field)));

    if (invalid.length) {
      event.preventDefault();
      invalid[0].focus();
      return;
    }

    const action = form.getAttribute('action');
    if (!action || action === '#') event.preventDefault(); // статичная вёрстка: никуда не отправляем
    form.dispatchEvent(new CustomEvent('ap:form-submit', { bubbles: true, detail: { form, data: new FormData(form) } }));

    const success = form.dataset.formSuccess && document.querySelector(form.dataset.formSuccess);
    if (success && Modal) {
      form.reset();
      Modal.getOrCreateInstance(success).show();
    }
  });

  // Ошибка снимается, как только поле исправили
  form.addEventListener('input', (event) => {
    if (event.target.classList.contains('is-invalid') && isFieldValid(event.target)) event.target.classList.remove('is-invalid');
  });
  form.addEventListener('change', (event) => {
    if (event.target.classList.contains('is-invalid') && isFieldValid(event.target)) event.target.classList.remove('is-invalid');
  });
}

export default function initForms(root = document) {
  const once = (el, fn) => {
    if (el.dataset.formReady) return;
    el.dataset.formReady = '1';
    fn(el);
  };
  root.querySelectorAll('[data-select]').forEach((el) => once(el, initSelect));
  root.querySelectorAll('[data-file]').forEach((el) => once(el, initFile));
  root.querySelectorAll('[data-range]').forEach((el) => once(el, initRange));
  root.querySelectorAll('[data-form]').forEach((el) => once(el, initForm));
}
