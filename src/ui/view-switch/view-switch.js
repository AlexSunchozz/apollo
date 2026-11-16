// Переключатель вида списка карточек (ui/view-switch) — общий модуль.
// [data-view-switch] с кнопками [data-view="grid|large|list"] и data-view-target — селектор сеток.
// У сетки на каждый вид — атрибуты: data-view-<вид>="классы колонок" и необязательно
// data-view-<вид>-item="классы карточек" (ставятся детям сетки). При переключении классы прошлого вида
// снимаются, нового — ставятся; выбранная кнопка — aria-pressed="true", у сетки — data-view-current.
// Событие ap:view-change (detail: { view, targets }) — например, чтобы запомнить выбор на сервере.

const key = (view, suffix = '') => `view${view.charAt(0).toUpperCase()}${view.slice(1)}${suffix}`;
const classes = (grid, view, suffix) => (grid.dataset[key(view, suffix)] || '').split(/\s+/).filter(Boolean);

function initSwitch(root) {
  const buttons = [...root.querySelectorAll('[data-view]')];
  const views = buttons.map((button) => button.dataset.view);
  const targets = () => [...document.querySelectorAll(root.dataset.viewTarget)];

  const setView = (view, { silent = false } = {}) => {
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
    targets().forEach((grid) => {
      views.forEach((name) => grid.classList.remove(...classes(grid, name)));
      grid.classList.add(...classes(grid, view));
      grid.dataset.viewCurrent = view;

      const itemOff = views.flatMap((name) => classes(grid, name, 'Item'));
      const itemOn = classes(grid, view, 'Item');
      [...grid.children].forEach((item) => {
        item.classList.remove(...itemOff);
        item.classList.add(...itemOn);
      });
    });
    if (!silent) root.dispatchEvent(new CustomEvent('ap:view-change', { bubbles: true, detail: { view, targets: targets() } }));
  };

  buttons.forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));

  const current = buttons.find((button) => button.getAttribute('aria-pressed') === 'true') || buttons[0];
  if (current) setView(current.dataset.view, { silent: true });
}

export default function initViewSwitch() {
  document.querySelectorAll('[data-view-switch]').forEach((root) => {
    if (root.dataset.viewReady) return;
    root.dataset.viewReady = '1';
    initSwitch(root);
  });
}
