// Универсальные табы (ARIA tablist / tab / tabpanel) — общий модуль для любых секций с табами.
//
//   <div role="tablist">
//     <button role="tab" aria-selected="true"  aria-controls="panel-1" tabindex="0">…</button>
//     <button role="tab" aria-selected="false" aria-controls="panel-2" tabindex="-1">…</button>
//   </div>
//   <div role="tabpanel" id="panel-1">…</div>
//   <div role="tabpanel" id="panel-2" hidden>…</div>
//
// Клик или клавиатура: ← → ↑ ↓ — соседний таб, Home / End — первый / последний.
//
// initTabs(tablist)              — переключает панели (hidden у неактивных).
// initTabs(tablist, { onSelect }) — панели не трогает, вызывает onSelect(tab, index) — например, листает слайдер.
// Возвращает { select(index) } — выделить таб программно (без вызова onSelect), например при смене слайда.

export default function initTabs(tablist, { onSelect } = {}) {
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  if (!tabs.length) return { select() {} };

  const select = (tab, { focus = false, silent = false } = {}) => {
    tabs.forEach((item) => {
      const isActive = item === tab;
      item.setAttribute('aria-selected', String(isActive));
      item.tabIndex = isActive ? 0 : -1;
      if (!onSelect) {
        const panel = document.getElementById(item.getAttribute('aria-controls'));
        if (panel) panel.hidden = !isActive;
      }
    });
    if (focus) tab.focus();
    if (onSelect && !silent) onSelect(tab, tabs.indexOf(tab));
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));

    tab.addEventListener('keydown', (event) => {
      const last = tabs.length - 1;
      const next = {
        ArrowRight: index === last ? 0 : index + 1,
        ArrowDown: index === last ? 0 : index + 1,
        ArrowLeft: index === 0 ? last : index - 1,
        ArrowUp: index === 0 ? last : index - 1,
        Home: 0,
        End: last,
      }[event.key];

      if (next === undefined) return;
      event.preventDefault();
      select(tabs[next], { focus: true });
    });
  });

  return {
    select(index) {
      if (tabs[index]) select(tabs[index], { silent: true });
    },
  };
}
