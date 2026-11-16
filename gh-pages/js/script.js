(() => {
  // src/js/stubs.js
  function initStubs() {
    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-stub]')) event.preventDefault();
    });
  }

  // src/layout/header.js
  var STICKY_OFFSET = 200;
  var TABBAR_OFFSET = 500;
  function initStickyHeader() {
    const header = document.querySelector('[data-header]');
    const tabbar = document.querySelector('[data-tabbar]');
    if (!header && !tabbar) return;
    const panel = header == null ? void 0 : header.querySelector('.ap-header__panel');
    let ticking = false;
    const update = () => {
      ticking = false;
      const scrolled = window.scrollY > STICKY_OFFSET;
      tabbar == null ? void 0 : tabbar.classList.toggle('is-visible', window.scrollY > TABBAR_OFFSET);
      if (!header || scrolled === header.classList.contains('is-sticky')) return;
      header.style.height = scrolled ? `${panel.offsetHeight}px` : '';
      header.classList.toggle('is-sticky', scrolled);
    };
    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true },
    );
    window.addEventListener('resize', () => {
      if (header == null ? void 0 : header.classList.contains('is-sticky')) {
        header.classList.remove('is-sticky');
        header.style.height = '';
      }
      update();
    });
    update();
  }
  function initCatalogMenu() {
    const menu = document.querySelector('[data-catalog]');
    if (!menu) return;
    const header = document.querySelector('[data-header]');
    const panel = header == null ? void 0 : header.querySelector('.ap-header__panel');
    const toggles = document.querySelectorAll(`[data-bs-target="#${menu.id}"]`);
    const setOpen = (open) => {
      header == null ? void 0 : header.classList.toggle('is-menu-open', open);
      document.body.classList.toggle('is-catalog-open', open);
      toggles.forEach((btn) => btn.setAttribute('aria-expanded', String(open)));
    };
    const placeUnderHeader = () => {
      if (panel) menu.style.setProperty('--ap-catalog-top', `${Math.max(0, panel.getBoundingClientRect().bottom)}px`);
    };
    menu.addEventListener('show.bs.offcanvas', () => {
      placeUnderHeader();
      setOpen(true);
    });
    menu.addEventListener('shown.bs.offcanvas', placeUnderHeader);
    menu.addEventListener('hide.bs.offcanvas', () => setOpen(false));
    window.addEventListener('resize', () => {
      if (menu.classList.contains('show')) placeUnderHeader();
    });
  }
  function getCounter(counter) {
    var _a;
    const el = document.querySelector(`[data-counter="${counter}"]`);
    if (!el) return 0;
    return Number((_a = el.dataset.count) != null ? _a : el.textContent.replace(/\D/g, '')) || 0;
  }
  function setCounter(counter, count) {
    const value = Math.max(0, Number(count) || 0);
    const text = value > 0 ? (value > 99 ? '99+' : String(value)) : '';
    document.querySelectorAll(`[data-counter="${counter}"]`).forEach((el) => {
      el.dataset.count = String(value);
      el.textContent = text;
    });
  }
  function initCounters() {
    document.addEventListener('ap:counter', (event) => {
      const { counter, count } = event.detail || {};
      if (counter) setCounter(counter, count);
    });
    document.addEventListener('ap:counter-change', (event) => {
      const { counter, delta } = event.detail || {};
      if (counter) setCounter(counter, getCounter(counter) + (Number(delta) || 0));
    });
  }
  function initSearch() {
    document.querySelectorAll('[data-search]').forEach((form) => {
      const input = form.querySelector('[data-search-input]');
      const clear = form.querySelector('[data-search-clear]');
      if (!input || !clear) return;
      const update = () => {
        clear.hidden = input.value.length === 0;
      };
      input.addEventListener('input', update);
      clear.addEventListener('click', () => {
        input.value = '';
        update();
        input.focus();
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      update();
    });
  }

  // src/js/vendors.js
  var { Swiper, Offcanvas, Modal, Collapse } = window;

  // src/ui/product-card/product-card.js
  var actionsBound = false;
  function bindProductActions() {
    if (actionsBound) return;
    actionsBound = true;
    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-product-action]');
      if (!button) return;
      event.preventDefault();
      const action = button.dataset.productAction;
      let active = true;
      let delta = 1;
      if (button.hasAttribute('aria-pressed')) {
        active = button.getAttribute('aria-pressed') !== 'true';
        button.setAttribute('aria-pressed', String(active));
        delta = active ? 1 : -1;
      }
      document.dispatchEvent(new CustomEvent('ap:counter-change', { detail: { counter: action, delta } }));
      button.dispatchEvent(
        new CustomEvent('ap:product-action', {
          bubbles: true,
          detail: { action, active, card: button.closest('.ap-product-card') },
        }),
      );
    });
  }
  function initProductCards(root = document) {
    bindProductActions();
    if (!Swiper) return;
    root.querySelectorAll('[data-product-slider]').forEach((slider) => {
      var _a;
      if (slider.swiper) return;
      const slides = slider.querySelectorAll('.swiper-slide');
      if (slides.length < 2) return;
      const dots = (_a = slider.closest('.ap-product-card')) == null ? void 0 : _a.querySelector('[data-product-dots]');
      new Swiper(slider, {
        speed: 400,
        nested: true,
        observer: true,
        observeParents: true,
        pagination: dots
          ? {
              el: dots,
              clickable: true,
              bulletClass: 'ap-product-card__dot',
              bulletActiveClass: 'is-active',
              renderBullet: (index, className) =>
                `<button class="${className}" type="button" aria-label="\u0424\u043E\u0442\u043E ${index + 1}"></button>`,
            }
          : false,
        a11y: { enabled: true },
      });
    });
  }

  // src/ui/form/form.js
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
      var _a;
      if (event.key === 'Escape' && panel.classList.contains('show')) {
        event.stopPropagation();
        hide();
        (_a = select.querySelector('[data-bs-toggle]')) == null ? void 0 : _a.focus();
      }
    });
  }
  function initFile(input) {
    const field = input.closest('.ap-file');
    const text = field == null ? void 0 : field.querySelector('[data-file-text]');
    if (!text) return;
    const placeholder = text.textContent;
    input.addEventListener('change', () => {
      const files = input.files ? [...input.files] : [];
      text.textContent =
        files.length === 0
          ? placeholder
          : files.length === 1
            ? files[0].name
            : `\u0424\u0430\u0439\u043B\u043E\u0432: ${files.length}`;
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
      if (from.value === '') {
        sliderMin.value = min;
        return;
      }
      const n = clamp(Math.min(Number(from.value), Number(sliderMax.value)));
      from.value = n;
      sliderMin.value = n;
    });
    to.addEventListener('change', () => {
      if (to.value === '') {
        sliderMax.value = max;
        return;
      }
      const n = clamp(Math.max(Number(to.value), Number(sliderMin.value)));
      to.value = n;
      sliderMax.value = n;
    });
  }
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var isFieldValid = (field) => {
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
      if (!action || action === '#') event.preventDefault();
      form.dispatchEvent(
        new CustomEvent('ap:form-submit', { bubbles: true, detail: { form, data: new FormData(form) } }),
      );
      const success = form.dataset.formSuccess && document.querySelector(form.dataset.formSuccess);
      if (success && Modal) {
        form.reset();
        Modal.getOrCreateInstance(success).show();
      }
    });
    form.addEventListener('input', (event) => {
      if (event.target.classList.contains('is-invalid') && isFieldValid(event.target))
        event.target.classList.remove('is-invalid');
    });
    form.addEventListener('change', (event) => {
      if (event.target.classList.contains('is-invalid') && isFieldValid(event.target))
        event.target.classList.remove('is-invalid');
    });
  }
  function initForms(root = document) {
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

  // src/js/core.js
  function initCore() {
    initStubs();
    initStickyHeader();
    initCatalogMenu();
    initCounters();
    initSearch();
    initProductCards();
    initForms();
  }

  // src/ui/scrollspy/scrollspy.js
  function initScrollspy(links) {
    const pairs = [...links]
      .map((link) => [link, document.getElementById(decodeURIComponent(link.hash.slice(1)))])
      .filter(([, target]) => target);
    if (!pairs.length) return;
    let current = null;
    const setActive = (link) => {
      if (link === current) return;
      current == null ? void 0 : current.removeAttribute('aria-current');
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

  // src/sections/article/article.js
  var SHARE = {
    telegram: (url, title) => `https://t.me/share/url?url=${url}&text=${title}`,
    vk: (url, title) => `https://vk.com/share.php?url=${url}&title=${title}`,
  };
  function initShare(root) {
    var _a;
    const url = encodeURIComponent(window.location.href.split('#')[0]);
    const title = encodeURIComponent(
      ((_a = root.querySelector('h1')) == null ? void 0 : _a.textContent.trim()) || document.title,
    );
    root.querySelectorAll('[data-share]').forEach((link) => {
      const build = SHARE[link.dataset.share];
      if (!build) return;
      link.href = build(url, title);
      link.removeAttribute('data-stub');
    });
  }
  function initArticle() {
    const root = document.querySelector('.ap-article');
    if (!root) return;
    initShare(root);
    initScrollspy(root.querySelectorAll('[data-toc] a[href^="#"]'));
  }

  // src/sections/category/category.js
  function initCategory() {
    const root = document.querySelector('[data-category]');
    if (!root) return;
    const shown = root.querySelector('[data-category-shown] span');
    const list = root.querySelector('[data-products-list]');
    const updateShown = () => {
      if (!shown || !list) return;
      shown.textContent = [...list.children].filter((item) => !item.hidden).length;
    };
    root.addEventListener('ap:products-more', updateShown);
    updateShown();
    const sort = root.querySelector('[data-category-sort]');
    if (sort) {
      sort.addEventListener('change', (event) => {
        if (event.target.type !== 'radio') return;
        const panel = sort.querySelector('.collapse');
        if (panel && Collapse) Collapse.getOrCreateInstance(panel, { toggle: false }).hide();
        sort.dispatchEvent(new CustomEvent('ap:sort-change', { bubbles: true, detail: { value: event.target.value } }));
      });
    }
  }

  // src/sections/product/product.js
  function initGallery(root) {
    const main = root.querySelector('[data-gallery-main]');
    const thumbs = [...root.querySelectorAll('[data-gallery-thumb]')];
    if (!main || !thumbs.length) return;
    const select = (thumb) => {
      thumbs.forEach((item) => item.toggleAttribute('aria-current', item === thumb));
      if (main.getAttribute('src') !== thumb.dataset.galleryThumb) main.setAttribute('src', thumb.dataset.galleryThumb);
    };
    thumbs.forEach((thumb) => thumb.addEventListener('click', () => select(thumb)));
    select(thumbs.find((thumb) => thumb.dataset.galleryThumb === main.getAttribute('src')) || thumbs[0]);
  }
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      const field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      field.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
      document.body.append(field);
      field.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (e) {
        ok = false;
      }
      field.remove();
      return ok;
    }
  }
  function initCopy(root) {
    const button = root.querySelector('[data-product-copy]');
    const sku = root.querySelector('[data-product-sku]');
    const status = root.querySelector('[data-product-copied]');
    if (!button || !sku) return;
    let timer = 0;
    button.addEventListener('click', async () => {
      const ok = await copyText(sku.textContent.trim());
      if (status)
        status.textContent = ok
          ? '\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u043E'
          : '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C';
      button.classList.toggle('is-copied', ok);
      clearTimeout(timer);
      timer = setTimeout(() => {
        button.classList.remove('is-copied');
        if (status) status.textContent = '';
      }, 1500);
    });
  }
  function initProduct() {
    const root = document.querySelector('[data-product]');
    if (root) {
      initGallery(root);
      initCopy(root);
    }
    const details = document.querySelector('[data-product-details]');
    if (details) initScrollspy(details.querySelectorAll('.ap-line-tabs a[href^="#"]'));
  }

  // src/sections/product-reviews/product-reviews.js
  function initProductReviews() {
    const root = document.querySelector('[data-product-reviews]');
    if (!root) return;
    if (new URLSearchParams(window.location.search).has('auth')) root.dataset.authorized = 'true';
    root.querySelectorAll('[data-review-open]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = root.dataset.authorized === 'true' ? '#review-modal' : '#review-login-modal';
        const modal = document.querySelector(id);
        if (modal && Modal) Modal.getOrCreateInstance(modal).show();
      });
    });
    const photoFilter = root.querySelector('[data-reviews-photo]');
    const list = root.querySelector('[data-products-list]');
    if (photoFilter && list) {
      photoFilter.addEventListener('change', () => {
        [...list.children].forEach((item) => {
          item.classList.toggle('is-filtered', photoFilter.checked && !item.hasAttribute('data-review-photos'));
        });
      });
    }
    const sort = root.querySelector('[data-reviews-sort]');
    if (sort) {
      sort.addEventListener('change', (event) => {
        if (event.target.type !== 'radio') return;
        const panel = sort.querySelector('.collapse');
        if (panel && Collapse) Collapse.getOrCreateInstance(panel, { toggle: false }).hide();
        sort.dispatchEvent(new CustomEvent('ap:sort-change', { bubbles: true, detail: { value: event.target.value } }));
      });
    }
  }

  // src/sections/products/products.js
  var DEFAULT_PAGE = 8;
  function initBlock(root) {
    const list = root.querySelector('[data-products-list]');
    const more = root.querySelector('[data-products-more]');
    if (!list) return;
    const page = Number(root.dataset.products) || DEFAULT_PAGE;
    const items = [...list.children];
    let shown = Math.min(page, items.length);
    const update = () => {
      items.forEach((item, index) => {
        item.hidden = index >= shown;
      });
      if (more) more.hidden = shown >= items.length;
    };
    more == null
      ? void 0
      : more.addEventListener('click', () => {
          var _a;
          const firstNew = items[shown];
          shown = Math.min(shown + page, items.length);
          update();
          root.dispatchEvent(
            new CustomEvent('ap:products-more', {
              bubbles: true,
              detail: { root, brand: root.dataset.brand || null, shown, total: items.length },
            }),
          );
          (_a = firstNew == null ? void 0 : firstNew.querySelector('a[href]:not([tabindex="-1"])')) == null
            ? void 0
            : _a.focus({ preventScroll: true });
        });
    update();
  }
  function initProducts() {
    document.querySelectorAll('[data-products]').forEach((root) => {
      if (root.dataset.productsReady) return;
      root.dataset.productsReady = '1';
      initBlock(root);
    });
  }

  // src/ui/filters/filters.js
  function isActive(form) {
    return [...form.elements].some((el) => {
      if (el.type === 'checkbox' || el.type === 'radio') return el.checked;
      if (el.type === 'number') return el.value !== '';
      return false;
    });
  }
  function initForm2(form) {
    const resets = () => [
      ...form.querySelectorAll('[data-filters-reset]'),
      ...(form.id ? document.querySelectorAll(`[data-filters-reset="#${form.id}"]`) : []),
    ];
    const update = () => {
      const active = isActive(form);
      resets().forEach((button) => {
        button.hidden = !active;
      });
      form.dispatchEvent(
        new CustomEvent('ap:filters-change', { bubbles: true, detail: { form, data: new FormData(form), active } }),
      );
    };
    form.addEventListener('change', update);
    form.addEventListener('input', (event) => {
      if (event.target.type === 'number') update();
    });
    form.addEventListener('reset', () => {
      setTimeout(() => {
        form
          .querySelectorAll('[data-range-from], [data-range-to]')
          .forEach((input) => input.dispatchEvent(new Event('change')));
        update();
      });
    });
    if (form.id) {
      document.querySelectorAll(`[data-filters-reset="#${form.id}"]`).forEach((button) => {
        button.addEventListener('click', () => form.reset());
      });
    }
    resets().forEach((button) => {
      button.hidden = !isActive(form);
    });
  }
  function initFilters() {
    document.querySelectorAll('[data-filters]').forEach((form) => {
      if (form.dataset.filtersReady) return;
      form.dataset.filtersReady = '1';
      initForm2(form);
    });
  }

  // src/ui/quantity/quantity.js
  function initQuantity(root) {
    const input = root.querySelector('[data-quantity-input]');
    const minus = root.querySelector('[data-quantity-minus]');
    const plus = root.querySelector('[data-quantity-plus]');
    if (!input) return;
    const min = Number(input.min) || 1;
    const max = Number(input.max) || 99;
    const set = (value, silent = false) => {
      const n = Math.min(max, Math.max(min, Math.round(Number(value)) || min));
      input.value = n;
      if (minus) minus.disabled = n <= min;
      if (plus) plus.disabled = n >= max;
      if (!silent) root.dispatchEvent(new CustomEvent('ap:quantity-change', { bubbles: true, detail: { value: n } }));
    };
    minus == null ? void 0 : minus.addEventListener('click', () => set(Number(input.value) - 1));
    plus == null ? void 0 : plus.addEventListener('click', () => set(Number(input.value) + 1));
    input.addEventListener('change', () => set(input.value));
    set(input.value, true);
  }
  function initQuantities() {
    document.querySelectorAll('[data-quantity]').forEach((root) => {
      if (root.dataset.quantityReady) return;
      root.dataset.quantityReady = '1';
      initQuantity(root);
    });
  }

  // src/ui/view-switch/view-switch.js
  var key = (view, suffix = '') => `view${view.charAt(0).toUpperCase()}${view.slice(1)}${suffix}`;
  var classes = (grid, view, suffix) => (grid.dataset[key(view, suffix)] || '').split(/\s+/).filter(Boolean);
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
      if (!silent)
        root.dispatchEvent(new CustomEvent('ap:view-change', { bubbles: true, detail: { view, targets: targets() } }));
    };
    buttons.forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
    const current = buttons.find((button) => button.getAttribute('aria-pressed') === 'true') || buttons[0];
    if (current) setView(current.dataset.view, { silent: true });
  }
  function initViewSwitch() {
    document.querySelectorAll('[data-view-switch]').forEach((root) => {
      if (root.dataset.viewReady) return;
      root.dataset.viewReady = '1';
      initSwitch(root);
    });
  }

  // src/ui/tabs/tabs.js
  function initTabs(tablist, { onSelect } = {}) {
    const tabs = [...tablist.querySelectorAll('[role="tab"]')];
    if (!tabs.length) return { select() {} };
    const select = (tab, { focus = false, silent = false } = {}) => {
      tabs.forEach((item) => {
        const isActive2 = item === tab;
        item.setAttribute('aria-selected', String(isActive2));
        item.tabIndex = isActive2 ? 0 : -1;
        if (!onSelect) {
          const panel = document.getElementById(item.getAttribute('aria-controls'));
          if (panel) panel.hidden = !isActive2;
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
        if (next === void 0) return;
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

  // src/pages/catalog/catalog-list/catalog-list.js
  var plural = (n, [one, few, many]) => {
    const n10 = n % 10;
    const n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return one;
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
    return many;
  };
  function initCatalogList() {
    const root = document.querySelector('[data-catalog-list]');
    if (!root) return;
    const title = root.querySelector('[data-catalog-title]');
    const count = root.querySelector('[data-catalog-count]');
    const panels = [...root.querySelectorAll('[data-catalog-panel]')];
    const activePanel = () => panels.find((panel) => !panel.hidden) || panels[0];
    const updateCount = () => {
      const panel = activePanel();
      if (!count || !panel) return;
      const items = [...panel.querySelectorAll('[data-catalog-grid] > *')];
      const shown = items.filter((item) => !item.hidden).length;
      const words = (panel.dataset.words || '').split('|');
      const verb = plural(shown, [
        '\u041F\u043E\u043A\u0430\u0437\u0430\u043D\u0430',
        '\u041F\u043E\u043A\u0430\u0437\u0430\u043D\u044B',
        '\u041F\u043E\u043A\u0430\u0437\u0430\u043D\u044B',
      ]);
      const all = shown === items.length && shown > 1 ? '\u0432\u0441\u0435 ' : '';
      count.textContent = `${verb} ${all}${shown}\xA0${plural(shown, words)} \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430`;
    };
    const tablist = root.querySelector('[data-tabs]');
    if (tablist) {
      initTabs(tablist, {
        onSelect(tab) {
          const id = tab.getAttribute('aria-controls');
          panels.forEach((panel2) => {
            panel2.hidden = panel2.id !== id;
          });
          const panel = activePanel();
          if (title && (panel == null ? void 0 : panel.dataset.title)) title.textContent = panel.dataset.title;
          updateCount();
        },
      });
    }
    root.addEventListener('ap:products-more', updateCount);
    updateCount();
  }

  // src/ui/pagination/pagination.js
  var WINDOW = 5;
  function initPagination(nav, { onSelect } = {}) {
    const list = nav.querySelector('ul');
    if (!list) return { render() {} };
    nav.addEventListener('click', (event) => {
      const button = event.target.closest('[data-page]');
      if (!button || button.disabled) return;
      onSelect == null ? void 0 : onSelect(Number(button.dataset.page));
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
          items.push(
            item(page, String(page), {
              label: `\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 ${page}`,
              current: page >= from && page <= to,
            }),
          );
        }
        const isLast = to >= last;
        items.push(
          item(Math.min(to + 1, last), '>', {
            label:
              '\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0430\u044F \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430',
            disabled: isLast,
          }),
        );
        items.push(
          item(last, '>>', {
            label:
              '\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u044F\u044F \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430',
            disabled: isLast,
          }),
        );
        list.replaceChildren(...items);
      },
    };
  }

  // src/pages/blog/blog-list/blog-list.js
  var DEFAULT_PAGE2 = 6;
  function initPanel(panel, scrollTarget) {
    const list = panel.querySelector('[data-articles-list]');
    if (!list) return;
    const more = panel.querySelector('[data-articles-more]');
    const nav = panel.querySelector('[data-pagination]');
    const size = Number(panel.dataset.articles) || DEFAULT_PAGE2;
    const items = [...list.children];
    const last = Math.max(1, Math.ceil(items.length / size));
    let from = 1;
    let to = 1;
    const update = () => {
      items.forEach((item, index) => {
        item.hidden = index < (from - 1) * size || index >= to * size;
      });
      if (more) more.hidden = to >= last;
      pagination == null ? void 0 : pagination.render({ from, to, last });
    };
    const go = (nextFrom, nextTo) => {
      from = nextFrom;
      to = nextTo;
      update();
      panel.dispatchEvent(new CustomEvent('ap:articles-page', { bubbles: true, detail: { panel, from, to, last } }));
    };
    const pagination = nav
      ? initPagination(nav, {
          onSelect(page) {
            go(page, page);
            if (scrollTarget && scrollTarget.getBoundingClientRect().top < 0) {
              scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          },
        })
      : null;
    more == null
      ? void 0
      : more.addEventListener('click', () => {
          var _a;
          const firstNew = items[to * size];
          go(from, to + 1);
          (_a = firstNew == null ? void 0 : firstNew.querySelector('a[href]')) == null
            ? void 0
            : _a.focus({ preventScroll: true });
        });
    update();
  }
  function initBlogList() {
    const root = document.querySelector('.ap-blog-list');
    if (!root) return;
    const tablist = root.querySelector('[data-tabs]');
    if (tablist) initTabs(tablist);
    root.querySelectorAll('[data-articles]').forEach((panel) => initPanel(panel, tablist));
  }

  // src/pages/index/home-hero/home-hero.js
  function initHomeHero() {
    var _a;
    const root = document.querySelector('[data-hero-slider]');
    if (!root || !Swiper) return;
    const dots = (_a = root.closest('.ap-home-hero')) == null ? void 0 : _a.querySelector('[data-hero-dots]');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    new Swiper(root, {
      loop: true,
      effect: 'fade',
      fadeEffect: { crossFade: true },
      speed: 800,
      autoplay: reduceMotion ? false : { delay: 5e3, disableOnInteraction: false },
      pagination: dots
        ? {
            el: dots,
            clickable: true,
            bulletClass: 'ap-home-hero__dot',
            bulletActiveClass: 'is-active',
            renderBullet: (index, className) =>
              `<button class="${className}" type="button" aria-label="\u0424\u043E\u0442\u043E ${index + 1}"></button>`,
          }
        : false,
      a11y: { enabled: true },
    });
  }

  // src/pages/index/home-products/home-products.js
  function initHomeProducts() {
    const tablist = document.querySelector('.ap-home-products [data-tabs]');
    if (tablist) initTabs(tablist);
  }

  // src/js/main.js
  document.addEventListener('DOMContentLoaded', () => {
    initCore();
    initArticle();
    initProducts();
    initProduct();
    initProductReviews();
    initQuantities();
    initViewSwitch();
    initFilters();
    initCategory();
    initBlogList();
    initCatalogList();
    initHomeHero();
    initHomeProducts();
  });
})();
