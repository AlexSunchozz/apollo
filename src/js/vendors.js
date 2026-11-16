// Доступ к библиотекам из vendor.js (он подключается раньше script.js).
// Импортируйте отсюда, а не из пакетов — иначе библиотека попадёт в script.js.
//   import { Swiper, Offcanvas, Modal, Collapse } from '../../js/vendors.js';
export const { Swiper, Offcanvas, Modal, Collapse } = window;
