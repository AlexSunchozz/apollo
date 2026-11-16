// Заглушки: ссылки и кнопки с data-stub пока никуда не ведут (href="#" не прыгает наверх).
// Когда появится реальный адрес — проставить его и убрать data-stub.
export default function initStubs() {
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-stub]')) event.preventDefault();
  });
}
