// Gera/atualiza o APK Android via @bubblewrap/core (programatico, sem
// interatividade). Output: public/downloads/app.apk
//
// Idempotente:
//   - Se android/android.keystore ja existe, REUSA (preserva assinatura).
//   - Se nao existe, gera uma nova com a senha em KEYSTORE_PASSWORD.
//   - Sempre regenera o projeto Android (build artifacts sao descartaveis).
//
// IMPORTANTE: A keystore eh a chave privada do app. Sem ela voce nao
// consegue atualizar o APK em devices que ja instalaram a versao antiga.
// Faca backup do arquivo android/android.keystore + KEYSTORE-CREDENTIALS.txt
// em local seguro (1Password, drive criptografado).
//
// Pre-requisitos (uma vez por maquina — veja docs/ANDROID.md):
//   - JDK 17 instalado (com $JAVA_HOME configurado)
//   - Android SDK em $ANDROID_HOME com platforms;android-34, build-tools;34.0.0
//     e platform-tools
//   - @bubblewrap/cli instalado globalmente (`npm install -g @bubblewrap/cli`)
//
// Uso:
//   npm run build:apk

import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Caminhos padrao deste ambiente. Override via env vars se for em outra
// maquina.
const JDK_PATH =
  process.env.JAVA_HOME ||
  "C:\\Users\\Rayan\\AppData\\Local\\jdk-17\\jdk-17.0.19+10";
const ANDROID_SDK_PATH =
  process.env.ANDROID_HOME ||
  "C:\\Users\\Rayan\\AppData\\Local\\android-sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const ANDROID_DIR = path.join(PROJECT_ROOT, "android");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "downloads");
const FINAL_APK = path.join(OUTPUT_DIR, "app.apk");

const WEB_MANIFEST_URL =
  "https://new-telegram-bice.vercel.app/site.webmanifest";
const PACKAGE_ID = "com.rayan.telegramclone";
const APP_NAME = "Telegram Clone";
const LAUNCHER_NAME = "Telegram";

// Senha do keystore — usada na primeira execucao pra gerar a chave.
// Em rebuilds, a mesma senha eh usada pra assinar. Se voce trocar
// manualmente, atualize aqui tambem (ou passe via env var).
const KEYSTORE_PASSWORD =
  process.env.KEYSTORE_PASSWORD || "TelegramClone2026!";
const KEYSTORE_ALIAS = "android";

function resolveBubblewrapCore() {
  const candidates = [
    "@bubblewrap/core",
    "C:\\nvm4w\\nodejs\\node_modules\\@bubblewrap\\cli\\node_modules\\@bubblewrap\\core",
    "C:\\Users\\Rayan\\AppData\\Local\\nvm\\v20.19.5\\node_modules\\@bubblewrap\\cli\\node_modules\\@bubblewrap\\core",
  ];
  for (const c of candidates) {
    try {
      return require(c);
    } catch {}
  }
  throw new Error(
    "Nao consegui encontrar @bubblewrap/core. Instale com: npm install -g @bubblewrap/cli"
  );
}

async function main() {
  const {
    Config,
    JdkHelper,
    AndroidSdkTools,
    TwaManifest,
    TwaGenerator,
    GradleWrapper,
    KeyTool,
    ConsoleLog,
  } = resolveBubblewrapCore();

  const log = new ConsoleLog("build-apk");

  log.info("=== Setup ===");
  log.info(`JDK: ${JDK_PATH}`);
  log.info(`Android SDK: ${ANDROID_SDK_PATH}`);

  const config = new Config(JDK_PATH, ANDROID_SDK_PATH);
  const jdkHelper = new JdkHelper(process, config);
  const androidSdkTools = await AndroidSdkTools.create(
    process,
    config,
    jdkHelper,
    log
  );

  if (!(await androidSdkTools.checkBuildTools())) {
    log.info("Build tools 34.0.0 nao encontradas; instalando...");
    await androidSdkTools.installBuildTools();
  }

  // Backup keystore existente antes de wipe da pasta
  const keystorePath = path.join(ANDROID_DIR, "android.keystore");
  let preservedKeystore = null;
  if (existsSync(keystorePath)) {
    preservedKeystore = await fs.readFile(keystorePath);
    log.info("Keystore existente encontrada — sera preservada.");
  }

  // Wipe da pasta android/ (limpa build artifacts; keystore restaurada abaixo)
  if (existsSync(ANDROID_DIR)) {
    await fs.rm(ANDROID_DIR, { recursive: true, force: true });
  }
  await fs.mkdir(ANDROID_DIR, { recursive: true });

  // Restaura keystore se existia
  if (preservedKeystore) {
    await fs.writeFile(keystorePath, preservedKeystore);
  }

  // Carrega manifest do PWA em producao
  log.info(`Carregando ${WEB_MANIFEST_URL}...`);
  const twaManifest = await TwaManifest.fromWebManifest(WEB_MANIFEST_URL);

  // Customiza campos
  twaManifest.packageId = PACKAGE_ID;
  twaManifest.name = APP_NAME;
  twaManifest.launcherName = LAUNCHER_NAME;
  twaManifest.appVersionName = "1.0.0";
  twaManifest.appVersionCode = Math.floor(Date.now() / 1000); // monotone
  twaManifest.signingKey = {
    path: keystorePath,
    alias: KEYSTORE_ALIAS,
  };
  twaManifest.enableNotifications = true;
  twaManifest.enableSiteSettingsShortcut = true;
  twaManifest.generatorApp = "telegram-clone-build-apk";

  // Cria keystore se ainda nao existe
  if (!preservedKeystore) {
    log.info("Gerando nova keystore...");
    const keyTool = new KeyTool(jdkHelper, log);
    await keyTool.createSigningKey(
      {
        path: keystorePath,
        alias: KEYSTORE_ALIAS,
        fullName: "Rayan SL",
        organization: "Telegram Clone",
        organizationalUnit: "Dev",
        country: "BR",
        password: KEYSTORE_PASSWORD,
        keypassword: KEYSTORE_PASSWORD,
      },
      true
    );
    await fs.writeFile(
      path.join(ANDROID_DIR, "KEYSTORE-CREDENTIALS.txt"),
      `Keystore: android.keystore
Alias: ${KEYSTORE_ALIAS}
Password: ${KEYSTORE_PASSWORD}
KeyPassword: ${KEYSTORE_PASSWORD}

ATENCAO: este arquivo NAO vai pro git (gitignored).
Faca backup em local seguro (1Password, drive criptografado, etc.).
Sem essa senha + a android.keystore voce NAO consegue atualizar o APK
em devices que ja tem a versao antiga instalada.
`,
      "utf8"
    );
  }

  // Gera projeto Android (TWA)
  log.info("Gerando projeto Android (TwaGenerator)...");
  const twaGenerator = new TwaGenerator();
  await twaGenerator.createTwaProject(ANDROID_DIR, twaManifest, log);
  await twaManifest.saveToFile(path.join(ANDROID_DIR, "twa-manifest.json"));

  // Build APK com Gradle.
  // O GradleWrapper invoca 'gradlew.bat' sem prefixo '.\\' em Windows.
  // Em algumas configs o cmd.exe nao procura no cwd por seguranca
  // (NoDefaultCurrentDirectoryInExePath). Workaround: prepend android/
  // ao PATH para que o cmd.exe ache gradlew.bat.
  log.info("Buildando APK release com Gradle (pode demorar 3-5 min)...");
  process.env.PATH = `${ANDROID_DIR};${process.env.PATH || ""}`;
  delete process.env.NoDefaultCurrentDirectoryInExePath;
  const gradle = new GradleWrapper(process, androidSdkTools, ANDROID_DIR);
  await gradle.assembleRelease();

  // Sign + zipalign
  const unsignedApk = path.join(
    ANDROID_DIR,
    "app",
    "build",
    "outputs",
    "apk",
    "release",
    "app-release-unsigned.apk"
  );
  const alignedApk = path.join(ANDROID_DIR, "app-release-aligned.apk");
  const signedApk = path.join(ANDROID_DIR, "app-release-signed.apk");

  log.info("Alinhando APK (zipalign)...");
  await androidSdkTools.zipalign(unsignedApk, alignedApk);

  log.info("Assinando APK (apksigner)...");
  await androidSdkTools.apksigner(
    keystorePath,
    KEYSTORE_PASSWORD,
    KEYSTORE_ALIAS,
    KEYSTORE_PASSWORD,
    alignedApk,
    signedApk
  );

  // Copia para public/downloads
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.copyFile(signedApk, FINAL_APK);

  const stat = await fs.stat(FINAL_APK);
  log.info(`\nAPK gerado: ${FINAL_APK}`);
  log.info(`Tamanho: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
  log.info("\nProximos passos:");
  log.info("  git add public/downloads/app.apk");
  log.info('  git commit -m "chore: atualiza APK Android"');
  log.info("  git push");
}

main().catch((err) => {
  console.error("\n[build-apk] ERRO:", err);
  process.exit(1);
});
