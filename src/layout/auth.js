// Окна входа и регистрации (layout/modal-auth.html, layout/modal-auth-code.html) + общие кнопки полей ui/form.
//
//   [data-field-clear]     — кнопка в поле (.ap-field--legend): очищает поле и ставит в него фокус
//   [data-password-toggle] — показать / скрыть пароль (aria-pressed)
//   [data-auth-logout]     — «Выйти» (#logout-modal): событие ap:auth-logout (cancelable); не отменено — перезагрузка без ?auth
//   [data-auth-login]      — «Войти по почте / по телефону»: вид окна входа с паролем #auth-login-modal
//                            (="email" | "phone" — заголовок, поле, текст ошибки, ссылка внизу — [data-login-mode])
//   [data-auth-send]       — «Получить код» по телефону: введённый телефон подставляется в окно кода ([data-auth-target]);
//                            окно кода открывает ui/form/form.js (data-form-success)
//   [data-auth-email]      — «Получить код» по почте: окно выбирает сервер — событие
//                              document.dispatchEvent(new CustomEvent('ap:auth-email', { detail: { form, registered } }))
//                            registered: true — почта зарегистрирована → вход с паролем (data-auth-registered, почта
//                            подставляется в поле), false — регистрация → окно кода (data-auth-next).
//                            Пока action="#" — имитация: регистрация; с ?auth-registered в адресе — вход с паролем.
//   [data-auth-code]       — поле кода (data-code-length) отправляет форму само, когда введены все цифры;
//                            «Отправить новый код» — событие ap:auth-resend (detail: { form }) для интегратора
//   [data-auth-check]      — формы, ответ на которые даёт сервер (код, вход по паролю). Ошибку показывает событие
//                              document.dispatchEvent(new CustomEvent('ap:auth-error', { detail: { form } }))
//                            — состояние «Неверный код» / «Неверно указан адрес…».
//                            Пока action="#" (статичная вёрстка) — ответ имитируется: код верный → «Спасибо за регистрацию!»,
//                            вход → окно закрывается; с ?auth-error в адресе — всегда ошибка (для проверки вида).

import { Modal } from '../js/vendors.js';
import initTabs from '../ui/tabs/tabs.js';

// Сменить окно: текущее закрывается, следующее открывается после его закрытия (без двух подложек)
export function switchModal(from, to) {
  if (!to || !Modal) return;
  const show = () => Modal.getOrCreateInstance(to).show();
  if (!from || !from.classList.contains('show')) {
    show();
    return;
  }
  from.addEventListener('hidden.bs.modal', show, { once: true });
  Modal.getOrCreateInstance(from).hide();
}


// Куда отправили код — в текст окна кода; пробелы неразрывные (телефон не разрывается по строкам)
const setTarget = (modal, value) => {
  const slot = modal?.querySelector('[data-auth-target]');
  if (slot && value) slot.textContent = value.trim().replace(/\s+/g, String.fromCharCode(160));
};

const setState = (form, state) => {
  const modal = form.closest('.modal') || form;
  form.toggleAttribute('data-auth-failed', state === 'error');
  modal.querySelectorAll('[data-auth-state]').forEach((el) => {
    el.hidden = el.dataset.authState !== state;
  });
  modal.querySelectorAll('[data-auth-error]').forEach((el) => {
    el.hidden = state !== 'error';
  });
  if (!form.hasAttribute('data-auth-code')) {
    form.querySelectorAll('.ap-input').forEach((input) => input.classList.toggle('is-invalid', state === 'error'));
  }
};

const resetCode = (form) => {
  const input = form.querySelector('[data-code-length]');
  if (!input) return;
  input.value = '';
  input.focus();
};

export default function initAuth() {
  // «Выйти» в окне «Выйти из профиля?»: событие ap:auth-logout для интегратора; пока статичная вёрстка —
  // страница перезагружается без ?auth (вход сбрасывается)
  document.addEventListener('click', (event) => {
    const logout = event.target.closest('[data-auth-logout]');
    if (!logout) return;
    const allowed = logout.dispatchEvent(new CustomEvent('ap:auth-logout', { bubbles: true, cancelable: true }));
    if (!allowed) return; // интегратор сам выполнил выход (event.preventDefault())
    const url = new URL(window.location.href);
    url.searchParams.delete('auth');
    window.location.href = url.toString();
  });

  // Кнопки в полях — на всех формах сайта
  document.addEventListener('click', (event) => {
    const clear = event.target.closest('[data-field-clear]');
    if (clear) {
      const input = clear.closest('.ap-field')?.querySelector('input');
      if (!input) return;
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
      return;
    }

    const toggle = event.target.closest('[data-password-toggle]');
    if (toggle) {
      const input = toggle.closest('.ap-field')?.querySelector('input');
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      toggle.setAttribute('aria-pressed', String(show));
      toggle.setAttribute('aria-label', show ? 'Скрыть пароль' : 'Показать пароль');
    }
  });


  const authModal = document.getElementById('auth-modal');
  if (!authModal) return;

  // Табы «По телефону / По почте»
  const tablist = authModal.querySelector('[data-tabs]');
  if (tablist) initTabs(tablist);

  // Вход с паролем: вид «по почте» / «по телефону» — заголовок, поле, текст ошибки, ссылка внизу.
  // Поле скрытого вида отключено — не проверяется и не отправляется.
  const loginModal = document.getElementById('auth-login-modal');
  const loginForm = loginModal?.querySelector('form');
  const setLoginMode = (mode) => {
    if (!loginModal) return;
    if (loginForm) setState(loginForm, 'default');
    loginModal.querySelectorAll('[data-login-mode]').forEach((el) => {
      const active = el.dataset.loginMode === mode;
      el.hidden = !active;
      el.querySelectorAll('input').forEach((input) => {
        input.disabled = !active;
        input.classList.remove('is-invalid');
      });
    });
  };
  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-auth-login]');
    if (!link) return;
    setLoginMode(link.dataset.authLogin);
    if (!link.hasAttribute('data-bs-toggle')) {
      // ссылка внутри окна — только смена вида
      event.preventDefault();
      loginModal?.querySelector(`[data-login-mode="${link.dataset.authLogin}"] input`)?.focus();
    }
  });

  document.addEventListener('ap:form-submit', (event) => {
    const { form, data } = event.detail;

    // «Получить код» по телефону: куда отправили — в окно кода (его открывает form.js, data-form-success)
    if (form.hasAttribute('data-auth-send')) {
      setTarget(document.querySelector(form.dataset.formSuccess), data.get('phone'));
      return;
    }

    // «Получить код» по почте: какое окно открыть, решает сервер (ap:auth-email); пока action="#" — имитация
    if (form.hasAttribute('data-auth-email')) {
      const action = form.getAttribute('action');
      if (action && action !== '#') return;
      const registered = new URLSearchParams(window.location.search).has('auth-registered');
      document.dispatchEvent(new CustomEvent('ap:auth-email', { detail: { form, registered } }));
      return;
    }

    // Код / вход по паролю: пока статичная вёрстка — имитация ответа сервера
    if (!form.hasAttribute('data-auth-check')) return;
    const action = form.getAttribute('action');
    if (action && action !== '#') return;

    if (new URLSearchParams(window.location.search).has('auth-error')) {
      document.dispatchEvent(new CustomEvent('ap:auth-error', { detail: { form } }));
      return;
    }
    const modal = form.closest('.modal');
    if (form.hasAttribute('data-auth-code')) {
      switchModal(modal, document.getElementById('auth-success-modal'));
    } else if (modal && Modal) {
      Modal.getOrCreateInstance(modal).hide();
    }
  });

  // Почта зарегистрирована — вход с паролем (почта уже в поле), иначе — регистрация: окно кода
  document.addEventListener('ap:auth-email', (event) => {
    const { form, registered } = event.detail || {};
    const email = form?.querySelector('[type="email"]')?.value.trim();
    if (!form || !email) return;
    const target = document.querySelector(registered ? form.dataset.authRegistered : form.dataset.authNext);
    if (!target) return;
    if (registered) {
      if (target === loginModal) setLoginMode('email');
      const input = target.querySelector('[type="email"]');
      if (input) input.value = email;
    } else {
      setTarget(target, email);
    }
    form.reset();
    switchModal(form.closest('.modal'), target);
  });

  document.addEventListener('ap:auth-error', (event) => {
    const form = event.detail?.form;
    if (form) setState(form, 'error');
  });

  document.querySelectorAll('[data-auth-check]').forEach((form) => {
    // Исправляют данные — сообщение об ошибке входа скрывается
    if (!form.hasAttribute('data-auth-code')) {
      form.addEventListener('input', () => {
        if (form.hasAttribute('data-auth-failed')) setState(form, 'default');
      });
    }

    const modal = form.closest('.modal');
    const code = form.querySelector('[data-code-length]');
    if (!code) return;

    // Окно кода открылось — обычное состояние, пустое поле в фокусе
    modal?.addEventListener('show.bs.modal', () => {
      setState(form, 'default');
      code.value = '';
    });
    modal?.addEventListener('shown.bs.modal', () => code.focus());

    const length = Number(code.dataset.codeLength) || 4;
    code.addEventListener('input', () => {
      code.value = code.value.replace(/\D/g, '').slice(0, length);
      if (code.value.length !== length) return;
      if (form.requestSubmit) form.requestSubmit();
      else form.dispatchEvent(new Event('submit', { cancelable: true }));
    });

    form.querySelector('[data-auth-resend]')?.addEventListener('click', () => {
      form.dispatchEvent(new CustomEvent('ap:auth-resend', { bubbles: true, detail: { form } }));
      resetCode(form);
    });

    form.querySelector('[data-auth-retry]')?.addEventListener('click', () => {
      setState(form, 'default');
      resetCode(form);
    });
  });
}
