// Подсветка текущего раздела в навигации по якорям — общий модуль (оглавление статьи, табы карточки товара).
//
//   initScrollspy(links)   links — ссылки вида href="#id" (NodeList / массив)
// Выделена (aria-current="true") ссылка раздела, до которого дошёл центр экрана: последний раздел, чей верх
// выше середины окна; пока центр не дошёл до второго раздела — первая ссылка.
// Клик по ссылке: выделена именно она, пока идёт плавная прокрутка (короткие разделы в конце центр экрана
// проходит по несколько сразу), — до следующей прокрутки пользователем. Отступ при переходе — scroll-margin-top
// у разделов, плавность — scroll-behavior: smooth (Bootstrap).

export default function initScrollspy(links) {
  const pairs = [...links]
    .map((link) => [link, document.getElementById(decodeURIComponent(link.hash.slice(1)))])
    .filter(([, target]) => target);
  if (!pairs.length) return;

  let current = null;
  const setActive = (link) => {
    if (link === current) return;
    current?.removeAttribute('aria-current');
    link.setAttribute('aria-current', 'true');
    current = link;
  };

  const update = () => {
    const center = window.innerHeight / 2;
    let active = pairs[0][0];
    pairs.forEach(([link, target]) => {
      if (target.getBoundingClientRect().top <= center) active = link;
    });
    setActive(active);
  };

  let locked = false;
  let lockTimer = 0;
  const unlockLater = () => {
    clearTimeout(lockTimer);
    lockTimer = setTimeout(() => {
      locked = false;
    }, 150);
  };
  pairs.forEach(([link]) => {
    link.addEventListener('click', () => {
      setActive(link);
      locked = true;
      unlockLater();
    });
  });

  let ticking = false;
  const onScroll = () => {
    if (locked) {
      unlockLater();
      return;
    }
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      update();
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}
