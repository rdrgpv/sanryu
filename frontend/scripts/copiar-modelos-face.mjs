// Copia os modelos do reconhecimento facial (presença por foto) de node_modules para public/, pra
// serem servidos pelo próprio site — sem depender de CDN e sem mandar nada pra fora. Roda sozinho
// antes do dev e do build (ver package.json). Os arquivos (~12MB) ficam fora do git.
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const origem = join(raiz, 'node_modules', '@vladmandic', 'face-api', 'model');
const destino = join(raiz, 'public', 'modelos-face');

const MODELOS = ['ssd_mobilenetv1_model', 'face_landmark_68_model', 'face_recognition_model'];

if (!existsSync(origem)) {
  console.error('Modelos do face-api não encontrados — rode "npm install".');
  process.exit(1);
}

mkdirSync(destino, { recursive: true });

for (const modelo of MODELOS) {
  for (const sufixo of ['-weights_manifest.json', '.bin']) {
    cpSync(join(origem, `${modelo}${sufixo}`), join(destino, `${modelo}${sufixo}`));
  }
}

console.log(`Modelos de reconhecimento facial copiados para public/modelos-face (${MODELOS.length}).`);
