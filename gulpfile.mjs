/**
 * Сборка статической вёрстки Apollo.
 *
 *   npm run dev     — сборка + dev-сервер с live reload (http://127.0.0.1:3000)
 *   npm run build   — чистая сборка в dist/ (HTML, CSS, JS отформатированы Prettier — .prettierrc.json)
 *   npm run preview — чистая сборка + сервер без отслеживания (посмотреть ровно то, что будет передано)
 *
 * dist/ — финальная статическая вёрстка, которую получает интегратор (разбиение на шаблоны CMS — на его стороне):
 *   index.html, pages/**      → готовые страницы (папки — как в src/pages/, все @@include / @@loop раскрыты)
 *   css/template_styles.css   → наши стили: база, ui/*, layout, все секции — один файл на все страницы
 *                               (любой блок переносится на другую страницу вместе со стилями)
 *   css/vendor.css            → стили библиотек (Swiper; CSS Bootstrap — в template_styles.css), минифицированы
 *   js/script.js              → наш код, читаемый
 *   js/vendor.js              → библиотеки (Swiper, Bootstrap JS: Offcanvas, Modal, Collapse), минифицированы, подключать первым
 *   img/, img/sprite.svg, fonts/, favicon.ico, site.webmanifest
 * Никаких PHP-файлов, шаблонов CMS и необработанных @@-конструкций: checkHtml роняет сборку, если они остались.
 *
 * Секции — src/sections/<name>/ (общие) и src/pages/<page>/<name>/ (уникальные). Имя секции = БЭМ-блок .ap-<name>
 * и должно быть уникальным во всём проекте — checkSections роняет сборку при дубле.
 */
import gulp from 'gulp';
import fileInclude from 'gulp-file-include';
import * as dartSass from 'sass';
import gulpSass from 'gulp-sass';
import postcss from 'gulp-postcss';
import autoprefixer from 'autoprefixer';
import pxtorem from 'postcss-pxtorem';
import svgSprite from 'gulp-svg-sprite';
import * as esbuild from 'esbuild';
import browserSync from 'browser-sync';
import { deleteAsync } from 'del';
import fs from 'node:fs';
import path from 'node:path';
import { Transform } from 'node:stream';
import * as prettier from 'prettier';

const { src, dest, watch, series, parallel } = gulp;
const sass = gulpSass(dartSass);
const bs = browserSync.create();
const isDev = !process.argv.includes('build') && !process.argv.includes('preview');

const paths = {
  src: 'src',
  dist: 'dist',
  // Главная — src/index.html → dist/index.html; остальные страницы — src/pages/**/<page>.html → dist/pages/**/<page>.html
  // (папки страниц в dist повторяют src: src/pages/brands/apollo.html → dist/pages/brands/apollo.html; см. pageFiles)
  html: { index: 'src/index.html', pages: 'src/pages', watch: 'src/**/*.{html,json}' },
  styles: { entry: 'src/scss/template_styles.scss', watch: 'src/**/*.scss' },
  scripts: { entry: 'src/js/main.js', watch: ['src/**/*.js', '!src/vendor/**'] },
  vendor: { js: 'src/vendor/vendor.js', css: 'src/vendor/vendor.css', watch: 'src/vendor/*' },
  images: 'src/img/**/*',
  icons: 'src/icons/*.svg',
  root: 'src/root/**/*', // файлы для корня сайта: favicon.ico, site.webmanifest
  fonts: [
    // Nunito 400/700 и Inter 400, кириллица + латиница (OFL, self-hosted из @fontsource)
    'node_modules/@fontsource/nunito/files/nunito-{cyrillic,latin}-{400,700}-normal.woff2',
    'node_modules/@fontsource/inter/files/inter-{cyrillic,latin}-400-normal.woff2',
    // Свои woff2 (если шрифта нет в npm)
    'src/fonts/*.woff2',
  ],
};

export const clean = () => deleteAsync([paths.dist]);

// Настройки Sass и PostCSS
const sassOptions = {
  loadPaths: ['node_modules'],
  quietDeps: true,
  // Bootstrap 5.3 пока на @import — глушим предупреждения Dart Sass
  silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'legacy-js-api', 'if-function'],
};
// px → rem (1rem = 16px). В исходниках пишем px из макета, в CSS получаются rem —
// поэтому ниже 375px и от 1920px всё масштабируется пропорционально через font-size у html (_base.scss).
// Не трогаем: медиазапросы и значения < 2px (рамки 1px). «PX» заглавными — не переводится.
const postcssPlugins = () => [
  pxtorem({ rootValue: 16, propList: ['*'], minPixelValue: 2, mediaQuery: false }),
  autoprefixer(),
  noCssComments(),
];

// Страницы и уникальные секции лежат вместе в src/pages/, с любой вложенностью папок:
//   страница — HTML-файл с каркасом (подключает layout/head.html): src/pages/brands/apollo.html;
//   секция — папка, в которой есть <name>.html без каркаса: src/pages/catalog/catalog-list/catalog-list.html
//   (внутрь папок секций не заходим — там только их части).
// Имя секции = БЭМ-блок .ap-<name>: две секции с одним именем конфликтовали бы стилями — сборка падает.
// Адрес страницы = её путь от src/pages/ без .html: src/pages/brands/apollo.html → /brands/apollo.
const subdirs = (dir) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
    : [];

const isPage = (file) => /@@include\(\s*['"]layout\/head\.html/.test(fs.readFileSync(file, 'utf8'));

// Обход src/pages/ → { pages: [путь к .html], sections: [{ name, dir }] }
const scanPages = () => {
  const pages = [];
  const sections = [];
  const walk = (dir) => {
    for (const d of fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : []) {
      const full = `${dir}/${d.name}`;
      if (d.isFile() && d.name.endsWith('.html') && isPage(full)) pages.push(full);
      if (!d.isDirectory()) continue;
      const own = `${full}/${d.name}.html`;
      if (fs.existsSync(own) && !isPage(own)) sections.push({ name: d.name, dir: full });
      else walk(full);
    }
  };
  walk(paths.html.pages);
  return { pages, sections };
};

const sectionDirs = () => {
  const found = [
    ...subdirs('src/sections')
      .map((name) => ({ name, dir: `src/sections/${name}` }))
      .filter(({ name, dir }) => fs.existsSync(`${dir}/${name}.html`)),
    ...scanPages().sections,
  ];
  const seen = new Map();
  for (const { name, dir } of found) {
    if (seen.has(name)) {
      throw new Error(
        `Секция «${name}» объявлена дважды: ${seen.get(name)} и ${dir}. ` +
          'Имя секции = БЭМ-блок .ap-<name> и должно быть уникальным. ' +
          'Используйте одну реализацию (общую — в src/sections/) или переименуйте секцию.',
      );
    }
    seen.set(name, dir);
  }
  return found;
};

// Главная + все страницы src/pages/**
const pageFiles = () => [paths.html.index, ...scanPages().pages];

export const checkSections = async () => {
  sectionDirs();
};

// Комментарии в разметке (назначение секции, Figma, адаптив) нужны только в исходниках — в dist их нет,
// чтобы не засорять вёрстку. Вместо них крупные блоки (шапка, крошки, секции, подвал, окна) отделяются пустой строкой.
const BLOCK_START = /^\s*<(section\b|header\b|footer\b|main\b|nav class="ap-breadcrumbs|div class="modal\b|div class="offcanvas\b)/;
const stripComments = (text) => {
  const lines = text.replace(/<!--[\s\S]*?-->/g, '').split('\n');
  const out = [];
  lines.forEach((line) => {
    if (!line.trim()) {
      if (out.length && out[out.length - 1] !== '') out.push(''); // не больше одной пустой строки подряд
      return;
    }
    if (BLOCK_START.test(line) && out.length && out[out.length - 1] !== '') out.push('');
    out.push(line.replace(/\s+$/, ''));
  });
  return out.join('\n');
};
const noComments = () =>
  new Transform({
    objectMode: true,
    transform(file, _enc, cb) {
      file.contents = Buffer.from(stripComments(file.contents.toString()));
      cb(null, file);
    },
  });

// CSS без комментариев; лицензионные /*! … */ (Bootstrap) сохраняются
const noCssComments = () => ({
  postcssPlugin: 'no-comments',
  Comment(comment) {
    if (!comment.text.startsWith('!')) comment.remove();
  },
});
noCssComments.postcss = true;

// Готовая страница — чистый статический HTML: все конструкции gulp-file-include раскрыты
// (оставшийся @@… — это параметр, не переданный в @@include, или опечатка), PHP-вставок нет.
// dev: ошибка в консоли, watch продолжает работу; build: сборка падает.
const unresolved = /@@[A-Za-z_][\w.]*|<\?(?:php|=)?/g;

// Типограф: висящие предлоги, союзы и частицы. Короткое слово должно быть связано со следующим
// неразрывным пробелом (&nbsp;), иначе оно может остаться в конце строки. Проверяется только видимый
// текст (без тегов, атрибутов, скриптов, <title> и комментариев). Только предупреждение — сборка не падает.
const SHORT_WORDS = 'а|в|во|и|к|ко|о|об|обо|с|со|у|я|на|но|по|за|из|изо|от|до|не|ни|ну|да|же|ли|бы|для|при|без|под|над|про|или|как|что|это|его|её|их|мы|вы|он|она|оно|они';
const hanging = new RegExp(`(?:^|[\\s(«"„\\u0001])(${SHORT_WORDS})[ \\t\\r\\n]+(?=[^\\s\\u0001])`, 'gi');
const visibleText = (html) =>
  html
    .replace(/<(script|style|title)\b[\s\S]*?<\/\1>/gi, '\u0001') // <title> не переносится по строкам — как атрибуты
    .replace(/<!--[\s\S]*?-->/g, '\u0001')
    .replace(/<[^>]+>/g, '\u0001')
    .replace(/&nbsp;|&#160;| /g, ' ');
const findHanging = (html) => {
  const text = visibleText(html);
  const out = new Set();
  for (const m of text.matchAll(hanging)) {
    const start = m.index + m[0].indexOf(m[1]);
    out.add(text.slice(start, start + 30).split(/[\u0001\n]/)[0].trim());
  }
  return [...out];
};

const checkHtml = () =>
  new Transform({
    objectMode: true,
    transform(file, _enc, cb) {
      const html = file.contents.toString();
      const hangingWords = findHanging(html);
      if (hangingWords.length) {
        console.warn(
          `\x1b[33m[typograph] ${file.relative}: висящие предлоги — свяжите со следующим словом через &nbsp;:\n  ` +
            hangingWords.map((s) => `«${s}»`).join('\n  ') +
            '\x1b[0m',
        );
      }
      const found = [...new Set(html.match(unresolved) ?? [])];
      if (!found.length) return cb(null, file);
      const message = `${file.relative}: необработанные конструкции ${found.join(', ')} — передайте параметр в @@include или уберите его`;
      if (!isDev) return cb(new Error(message));
      console.error(`\x1b[31m[checkHtml] ${message}\x1b[0m`);
      cb(null, file);
    },
  });

// @@root — путь от страницы до корня dist: «.» у index.html, «..» у pages/<page>.html, «../..» у pages/<папка>/<page>.html.
// Все локальные ссылки в разметке пишутся от него: href="@@root/css/…", src="@@root/img/…", href="@@root/pages/about.html".
// gulp-file-include оставляет неизвестный @@root как есть — подставляем после раскрытия, по месту файла в dist.
const resolveRoot = () =>
  new Transform({
    objectMode: true,
    transform(file, _enc, cb) {
      const depth = file.relative.split(path.sep).length - 1;
      const root = depth ? Array(depth).fill('..').join('/') : '.';
      file.contents = Buffer.from(file.contents.toString().replace(/@@root\b/g, root));
      cb(null, file);
    },
  });

// HTML: главная + страницы из src/pages/, части подключаются через @@include / @@loop (пути — от src/)
export const html = () =>
  // base — абсолютный: от него gulp-file-include ищет JSON для @@loop ('data/…'), и он же сохраняет pages/<папки>/ в dist
  src(pageFiles(), { base: path.resolve(paths.src) })
    .pipe(fileInclude({ prefix: '@@', basepath: paths.src, indent: true }))
    .pipe(resolveRoot())
    .pipe(noComments())
    .pipe(checkHtml())
    .pipe(dest(paths.dist))
    .pipe(bs.stream());

// SCSS → один файл template_styles.css на все страницы
export const styles = () =>
  src(paths.styles.entry, { sourcemaps: isDev })
    .pipe(
      sass(sassOptions).on('error', function onSassError(err) {
        // dev: показать ошибку и продолжить watch; build: уронить сборку
        if (!isDev) throw err;
        sass.logError.call(this, err);
      }),
    )
    .pipe(postcss(postcssPlugins()))
    .pipe(dest(`${paths.dist}/css`, { sourcemaps: isDev ? '.' : false }))
    .pipe(bs.stream());

// Запрет импорта npm-пакетов в наш код: библиотеки живут только в vendor.js
const noPackagesInApp = {
  name: 'no-packages-in-app',
  setup(build) {
    build.onResolve({ filter: /^[^./]/ }, (args) => ({
      errors: [{ text: `«${args.path}»: библиотеки подключаются в src/vendor/vendor.js, а в коде берутся из src/js/vendors.js` }],
    }));
  },
};

// JS (наш код): без минификации — интегратору нужен читаемый код
export const scripts = async () => {
  await esbuild.build({
    entryPoints: [paths.scripts.entry],
    outfile: `${paths.dist}/js/script.js`,
    bundle: true,
    format: 'iife',
    target: ['es2018'],
    sourcemap: isDev,
    minify: false,
    logLevel: 'warning',
    plugins: [noPackagesInApp],
  });
  bs.reload();
};

// Библиотеки: dist/js/vendor.js + dist/css/vendor.css, минифицированы
export const vendor = async () => {
  await esbuild.build({
    entryPoints: { 'js/vendor': paths.vendor.js, 'css/vendor': paths.vendor.css },
    outdir: paths.dist,
    bundle: true,
    format: 'iife',
    target: ['es2018'],
    minify: true,
    legalComments: 'none',
    logLevel: 'warning',
  });
  bs.reload();
};

// SVG-иконки → img/sprite.svg (<svg class="ap-icon"><use href="img/sprite.svg#name"></use></svg>)
export const sprite = () =>
  src(paths.icons, { allowEmpty: true })
    .pipe(svgSprite({ mode: { symbol: { dest: '.', sprite: 'sprite.svg' } } }))
    // overflow="visible" у каждого <symbol>: иконки, упирающиеся в край viewBox, иначе срезаются.
    // Пара к overflow: visible у .ap-icon в _base.scss
    .pipe(
      new Transform({
        objectMode: true,
        transform(file, _enc, cb) {
          file.contents = Buffer.from(file.contents.toString().replace(/<symbol /g, '<symbol overflow="visible" '));
          cb(null, file);
        },
      }),
    )
    .pipe(dest(`${paths.dist}/img`));

// encoding:false обязателен в gulp 5, иначе бинарники портятся.
// allowEmpty: в каркасе ещё нет картинок, иконок и шрифтов — пустой источник не ошибка.
export const images = () => src(paths.images, { encoding: false, allowEmpty: true }).pipe(dest(`${paths.dist}/img`));
export const fonts = () => src(paths.fonts, { encoding: false, allowEmpty: true }).pipe(dest(`${paths.dist}/fonts`));

// Файлы корня сайта (favicon.ico, site.webmanifest) → dist/
export const root = () => src(paths.root, { encoding: false, allowEmpty: true }).pipe(dest(paths.dist));

// Только для dev/preview-сервера: адреса сайта без pages/ и .html (ссылки между страницами в вёрстке — такие же,
// абсолютные, без слэша в конце). Адрес повторяет папки страницы в src/pages/:
//   /about → pages/about.html, /brands/apollo → pages/brands/apollo.html,
//   /catalog/nozhi/nozh-dlya-ovoshchey/nozh-dlya-ovoshchey-swift → pages/catalog/nozhi/nozh-dlya-ovoshchey/….html.
// Глубина адреса = глубина файла, поэтому относительные пути ресурсов (@@root) указывают в корень dist.
// dist не меняется, маршрутизацию на сайте настраивает интегратор (адрес = путь файла от pages/ без .html).
// Несуществующая страница (адрес без расширения или .html) — показываем pages/404.html с кодом 404, как на сайте.
const prettyUrls = (req, res, next) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const route = url.replace(/^\/|\/$/g, '');
  if (/^[\w-]+(\/[\w-]+)*$/.test(route) && fs.existsSync(path.join(paths.dist, 'pages', `${route}.html`))) {
    req.url = `/pages/${route}.html`;
    return next();
  }
  const file = path.join(paths.dist, url.endsWith('/') ? `${url}index.html` : url);
  const isPage = !path.extname(url) || url.endsWith('.html');
  if (isPage && !fs.existsSync(file) && fs.existsSync(path.join(paths.dist, 'pages', '404.html'))) {
    req.url = '/pages/404.html';
    res.statusCode = 404;
  }
  next();
};
const server = { baseDir: paths.dist, middleware: [prettyUrls] };

const serve = (done) => {
  // listen: 127.0.0.1 — на Node 18+ portscanner падает с AggregateError при резолве localhost в ::1
  bs.init({ server, listen: '127.0.0.1', port: 3000, notify: false, open: true, ui: false });
  watch(paths.html.watch, html);
  watch(paths.styles.watch, styles);
  watch(paths.scripts.watch, scripts);
  watch(paths.vendor.watch, vendor);
  watch(paths.images, images);
  watch(paths.icons, sprite);
  watch(paths.fonts, fonts);
  watch(paths.root, root);
  done();
};

// Форматирование dist (Prettier, настройки — .prettierrc.json в корне, те же, что у редактора):
// HTML, наш CSS и JS — с отступами и переносами, как после «Форматировать документ».
// Библиотеки (vendor.*) остаются минифицированными. В dev (npm run dev) не форматируем —
// там нужны sourcemap и быстрая пересборка; передаётся результат npm run build.
export const format = async () => {
  if (isDev) return;
  const config = (await prettier.resolveConfig('gulpfile.mjs')) ?? {};
  const files = fs
    .readdirSync(paths.dist, { recursive: true })
    .map((f) => path.join(paths.dist, f))
    .filter((f) => /\.(html|css|js)$/.test(f) && !/vendor\.(css|js)$/.test(f));
  await Promise.all(
    files.map(async (file) => {
      const source = fs.readFileSync(file, 'utf8');
      fs.writeFileSync(file, await prettier.format(source, { ...config, filepath: file }));
    }),
  );
};

export const build = series(
  checkSections,
  clean,
  parallel(html, styles, scripts, vendor, sprite, images, fonts, root),
  format,
);
export default series(build, serve);

// Просмотр итоговой сборки: dist ровно в том виде, в котором передаётся, без sourcemap и без отслеживания
const servePreview = (done) => {
  bs.init({ server, listen: '127.0.0.1', port: 3000, notify: false, open: true, ui: false });
  done();
};
export const preview = series(build, servePreview);
