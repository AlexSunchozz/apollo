
import fs from 'node:fs';
import path from 'node:path';

const DIST_DIR = path.resolve('dist');
const OUTPUT_DIR = path.resolve('gh-pages');
const BASE_PATH = '/apollo';

if (!fs.existsSync(DIST_DIR)) {
    throw new Error('Папка dist не найдена. Сначала выполни npm run build.');
}

// Исходный HTML-файл -> адрес страницы на GitHub Pages.
const pages = [
    ['index.html', ''],

    ['pages/about.html', 'about'],
    ['pages/apollo.html', 'apollo-web'],
    ['pages/apollo-genio.html', 'apollo-genio'],
    ['pages/apollo-premier.html', 'apollo-premier'],

    ['pages/catalog.html', 'catalog'],
    ['pages/nozhi.html', 'catalog/nozhi'],
    [
        'pages/nozh-dlya-ovoshchey-swift.html',
        'catalog/nozhi/nozh-dlya-ovoshchey-swift',
    ],

    ['pages/blog.html', 'blog'],
    [
        'pages/kakie-nozhi-nuzhny-na-domashney-kukhne.html',
        'blog/kakie-nozhi-nuzhny-na-domashney-kukhne',
    ],

    ['pages/contacts.html', 'contacts'],
    ['pages/gde-kupit.html', 'gde-kupit'],
];

const routeAliases = {
    '/': `${BASE_PATH}/`,
    '/about': `${BASE_PATH}/about/`,
    '/apollo': `${BASE_PATH}/apollo-web/`,
    '/apollo-genio': `${BASE_PATH}/apollo-genio/`,
    '/apollo-premier': `${BASE_PATH}/apollo-premier/`,
    '/catalog': `${BASE_PATH}/catalog/`,
    '/catalog/nozhi': `${BASE_PATH}/catalog/nozhi/`,
    '/catalog/nozhi/nozh-dlya-ovoshchey-swift':
        `${BASE_PATH}/catalog/nozhi/nozh-dlya-ovoshchey-swift/`,
    '/blog': `${BASE_PATH}/blog/`,
    '/blog/kakie-nozhi-nuzhny-na-domashney-kukhne':
        `${BASE_PATH}/blog/kakie-nozhi-nuzhny-na-domashney-kukhne/`,
    '/contacts': `${BASE_PATH}/contacts/`,
    '/gde-kupit': `${BASE_PATH}/gde-kupit/`,
};

function rewriteUrl(value, sourceFile) {
    if (
        !value ||
        value.startsWith('#') ||
        value.startsWith('//') ||
        /^(https?:|mailto:|tel:|data:|javascript:)/i.test(value)
    ) {
        return value;
    }

    // Разделяем путь, query-параметры и hash.
    const match = value.match(/^([^?#]*)([?#].*)?$/);

    if (!match) return value;

    let [, urlPath, suffix = ''] = match;

    // Абсолютные внутренние ссылки.
    if (urlPath.startsWith('/')) {
        const normalizedPath = urlPath.replace(/\/+$/, '') || '/';
        const target =
            routeAliases[normalizedPath] ??
            `${BASE_PATH}${normalizedPath === '/' ? '/' : `${normalizedPath}/`}`;

        return `${target}${suffix}`;
    }

    // Относительные пути к CSS, JS, изображениям и другим ресурсам.
    if (urlPath.startsWith('./') || urlPath.startsWith('../')) {
        const sourceDir = path.posix.dirname(sourceFile);
        const resourcePath = path.posix.normalize(
            path.posix.join(sourceDir, urlPath),
        );

        return `${BASE_PATH}/${resourcePath.replace(/^\/+/, '')}${suffix}`;
    }

    return value;
}

function rewriteHtml(html, sourceFile) {
    return html.replace(
        /\b(href|src|poster|srcset|data-gallery-thumb)\s*=\s*(["'])(.*?)\2/gi,
        (attribute, name, quote, value) => {
            let rewritten;

            if (name.toLowerCase() === 'srcset') {
                rewritten = value
                    .split(',')
                    .map((item) => {
                        const parts = item.trim().split(/\s+/);
                        parts[0] = rewriteUrl(parts[0], sourceFile);
                        return parts.join(' ');
                    })
                    .join(', ');
            } else {
                rewritten = rewriteUrl(value, sourceFile);
            }

            return `${name}=${quote}${rewritten}${quote}`;
        },
    );
}

function writePage(sourceFile, route) {
    const sourcePath = path.join(DIST_DIR, sourceFile);

    if (!fs.existsSync(sourcePath)) {
        throw new Error(`Не найдена страница: ${sourceFile}`);
    }

    const outputPath = route
        ? path.join(OUTPUT_DIR, route, 'index.html')
        : path.join(OUTPUT_DIR, 'index.html');

    const html = fs.readFileSync(sourcePath, 'utf8');
    const rewrittenHtml = rewriteHtml(html, sourceFile);

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, rewrittenHtml);

    console.log(`✓ ${sourceFile} -> ${route || '/'}`);
}

// Очищаем только папку публикации, dist не трогаем.
fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Переносим ресурсы.
for (const directory of ['css', 'js', 'img', 'fonts']) {
    const source = path.join(DIST_DIR, directory);

    if (fs.existsSync(source)) {
        fs.cpSync(source, path.join(OUTPUT_DIR, directory), {
            recursive: true,
        });
    }
}

// Копируем файлы из корня dist.
for (const file of ['favicon.ico', 'site.webmanifest']) {
    const source = path.join(DIST_DIR, file);

    if (fs.existsSync(source)) {
        fs.copyFileSync(source, path.join(OUTPUT_DIR, file));
    }
}

// Формируем страницы.
for (const [sourceFile, route] of pages) {
    writePage(sourceFile, route);
}

// Пользовательская 404 должна находиться в корне публикации.
const errorPage = path.join(DIST_DIR, 'pages/404.html');
const errorHtml = fs.readFileSync(errorPage, 'utf8');

fs.writeFileSync(
    path.join(OUTPUT_DIR, '404.html'),
    rewriteHtml(errorHtml, 'pages/404.html'),
);

console.log('✓ pages/404.html -> /404.html');

console.log('\nGitHub Pages подготовлен: gh-pages/');
