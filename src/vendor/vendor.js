// =============================================================================
// Сторонние библиотеки → dist/js/vendor.js (минифицирован, без sourcemap)
// Подключается ДО script.js. Наш код библиотеки не бандлит, а берёт из window
// через src/js/vendors.js — поэтому script.js остаётся маленьким и читаемым.
// =============================================================================
import Swiper from 'swiper';
import { Navigation, Pagination, Autoplay, EffectFade, A11y } from 'swiper/modules';
// Bootstrap Offcanvas — мобильное меню. Сразу включает data-API:
// data-bs-toggle="offcanvas" data-bs-target="#…" / data-bs-dismiss="offcanvas"
import Offcanvas from 'bootstrap/js/dist/offcanvas';
// Bootstrap Modal — модальные окна: data-bs-toggle="modal" data-bs-target="#…"
import Modal from 'bootstrap/js/dist/modal';
// Bootstrap Collapse — раскрывающиеся списки в формах: data-bs-toggle="collapse"
import Collapse from 'bootstrap/js/dist/collapse';

// Только используемые модули Swiper: стрелки, точки, автопрокрутка, плавная смена (первый экран), доступность
Swiper.use([Navigation, Pagination, Autoplay, EffectFade, A11y]);

window.Swiper = Swiper;
window.Offcanvas = Offcanvas;
window.Modal = Modal;
window.Collapse = Collapse;


