
import fs from 'node:fs';
import path from 'node:path';

const DIST_DIR = path.resolve('dist');
const OUTPUT_DIR = path.resolve('gh-pages');
// Адрес сайта на GitHub Pages: https://<user>.github.io/<репозиторий>/.
// В GitHub Actions имя репозитория берётся из GITHUB_REPOSITORY, локально — 'apollo'.
const REPO_NAME = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'apollo';
const BASE_PATH = `/${REPO_NAME}`;

if (!fs.existsSync(DIST_DIR)) {
    throw new Error('Папка dist не найдена. Сначала выполни npm run build.');
}

// Исходный HTML-файл -> адрес страницы на GitHub Pages.
// Адрес повторяет папки страницы: dist/pages/brands/apollo.html -> /apollo/brands/apollo/,
// dist/pages/catalog/nozhi.html -> /apollo/catalog/nozhi/. 404 — отдельно, в корень публикации.
const pages = [
    ['index.html', ''],
    ...fs
        .readdirSync(path.join(DIST_DIR, 'pages'), { recursive: true })
        .map((file) => file.split(path.sep).join('/'))
        .filter((file) => file.endsWith('.html') && file !== '404.html')
        .sort()
        .map((file) => [`pages/${file}`, file.replace(/\.html$/, '')]),
];

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

    // Абсолютные внутренние ссылки: /catalog/nozhi -> /apollo/catalog/nozhi/ (папка с index.html).
    if (urlPath.startsWith('/')) {
        const normalizedPath = urlPath.replace(/\/+$/, '');

        return `${BASE_PATH}${normalizedPath}/${suffix}`;
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
        (_attribute, name, quote, value) => {
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
