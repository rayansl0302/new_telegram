// Build do APK Android via Bubblewrap.
//
// Pré-requisito: setup inicial em `android/` (veja docs/ANDROID.md).
//
// O que esse script faz:
// 1. Verifica se a pasta `android/` foi inicializada
// 2. Roda `bubblewrap build` dentro dela (vai pedir senha da keystore)
// 3. Copia o APK assinado resultante pra `public/downloads/app.apk`,
//    onde o Vercel serve estaticamente e o frontend detecta via HEAD.

import { execSync } from "node:child_process";
import { existsSync, copyFileSync, mkdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const root = process.cwd();
const androidDir = resolve(root, "android");
const outputDir = resolve(root, "public", "downloads");
const apkDest = join(outputDir, "app.apk");

// Possíveis nomes do APK que o Bubblewrap gera (depende da versão).
// O assinado é o que termina em `-signed.apk`. Listamos em ordem de
// preferência.
const candidates = [
  "app-release-signed.apk",
  "app-release-bundle.apk",
  "app-release.apk",
];

function fail(msg) {
  console.error(`\n[build-apk] ${msg}\n`);
  process.exit(1);
}

if (!existsSync(androidDir)) {
  fail(
    'Pasta `android/` nao existe. Faca o setup inicial primeiro:\n' +
      '  mkdir android && cd android\n' +
      '  bubblewrap init --manifest=https://new-telegram-bice.vercel.app/manifest.webmanifest\n' +
      'Veja docs/ANDROID.md para o passo-a-passo completo.'
  );
}

if (!existsSync(join(androidDir, "twa-manifest.json"))) {
  fail(
    "android/twa-manifest.json nao encontrado. Rode `bubblewrap init` em android/. Veja docs/ANDROID.md."
  );
}

console.log("[build-apk] Rodando `bubblewrap build` em android/...");
console.log("[build-apk] (pode levar 2-5 minutos na primeira vez)\n");

try {
  execSync("bubblewrap build", {
    cwd: androidDir,
    stdio: "inherit",
  });
} catch (err) {
  fail(
    'Build do Bubblewrap falhou (veja erro acima).\n' +
      'Causas comuns:\n' +
      '  - Java JDK 17 nao instalado ou JAVA_HOME nao configurado\n' +
      '  - Senha da keystore incorreta\n' +
      '  - Bubblewrap nao instalado globalmente (`npm i -g @bubblewrap/cli`)'
  );
}

let apkSource = null;
for (const name of candidates) {
  const candidate = join(androidDir, name);
  if (existsSync(candidate)) {
    apkSource = candidate;
    break;
  }
}

if (!apkSource) {
  fail(
    `APK nao encontrado em android/ depois do build. Procurei por: ${candidates.join(
      ", "
    )}.\nListe o conteudo da pasta android/ pra ver o que foi gerado.`
  );
}

mkdirSync(outputDir, { recursive: true });
copyFileSync(apkSource, apkDest);

const sizeMb = (statSync(apkDest).size / 1024 / 1024).toFixed(2);
console.log(
  `\n[build-apk] APK copiado para public/downloads/app.apk (${sizeMb} MB)`
);
console.log("[build-apk] Proximos passos:");
console.log("  git add public/downloads/app.apk");
console.log('  git commit -m "chore: atualiza APK Android"');
console.log("  git push");
console.log(
  "[build-apk] Depois do deploy do Vercel, o botao 'Baixar APK' aparece"
);
console.log("[build-apk] automaticamente no perfil para usuarios Android.");
