/* Zlozi z appky jeden samostatny HTML subor na rychly nahlad (Artifact).
   Vysledok je ta ista appka — len vsetko CSS a JS je vlozene priamo dnu,
   aby fungovala aj tam, kde sa nedaju nacitat samostatne subory.
   Spustenie:  node tools/build-artifact.js                                  */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

const css = read('css/style.css');
const html = read('index.html');

/* z index.html vyberieme len obsah <body> bez <script> znaciek */
const body = html
  .slice(html.indexOf('<body>') + 6, html.indexOf('</body>'))
  .replace(/<script[\s\S]*?<\/script>\s*/g, '')
  .trim();

const JS = ['foods-db', 'exercises-db', 'store', 'targets', 'ui', 'charts', 'food', 'training', 'stats', 'app'];

const out = [
  '<title>Silný zadok, chudý pás</title>',
  '<style>',
  css.trim(),
  '</style>',
  '',
  body,
  '',
  ...JS.map(f => '<script>\n/* ' + f + '.js */\n' + read('js/' + f + '.js').trim() + '\n</script>')
].join('\n');

const dir = path.join(ROOT, 'dist');
if (!fs.existsSync(dir)) fs.mkdirSync(dir);
const file = path.join(dir, 'nahlad.html');
fs.writeFileSync(file, out, 'utf8');
console.log('zapisane', file, Math.round(out.length / 1024) + ' kB');
