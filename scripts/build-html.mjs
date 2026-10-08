import { build } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const buildDirectory = path.resolve(root, 'work/standalone-build');
const destination = path.resolve(root, '彼岸花-写实版.html');

await build({
  root,
  configFile: false,
  base: './',
  publicDir: false,
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    outDir: buildDirectory,
    emptyOutDir: true,
    copyPublicDir: false,
    target: 'es2022',
  },
});

const html = await readFile(path.join(buildDirectory, 'index.html'), 'utf8');
const fontLicense = await readFile(path.join(root, 'public/assets/OFL-NotoSerifSC.txt'), 'utf8');
const assetCredits = await readFile(path.join(root, 'ASSET-CREDITS.md'), 'utf8');
const thirdPartyLicenses = await readFile(path.join(root, 'THIRD-PARTY-LICENSES.md'), 'utf8');
const projectLicense = await readFile(path.join(root, 'LICENSE'), 'utf8');
await writeFile(destination, `${html}\n<!-- Project license\n${projectLicense.replaceAll('--', '- -')}\n-->\n<!-- Asset credits\n${assetCredits.replaceAll('--', '- -')}\n-->\n<!-- Third-party licenses\n${thirdPartyLicenses.replaceAll('--', '- -')}\n-->\n<!-- Noto Serif SC font license\n${fontLicense.replaceAll('--', '- -')}\n-->\n`);
console.log(`Standalone HTML: ${destination} (${((await stat(destination)).size / 1024 / 1024).toFixed(2)} MB)`);
