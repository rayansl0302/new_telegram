# Build do APK Android (TWA)

O APK do Telegram Clone é gerado **localmente** via
[@bubblewrap/core](https://github.com/GoogleChromeLabs/bubblewrap) — usado
programaticamente pelo script `scripts/build-apk.mjs` (sem CLI interativo).

Depois de gerado, o APK fica em `public/downloads/app.apk` e é servido
estaticamente pelo Vercel. O frontend detecta a presença do arquivo via
`HEAD /downloads/app.apk` e mostra o botão "Baixar APK" no perfil.

> **Por que TWA e não Capacitor/React Native?**
> TWA garante a regra principal do projeto (veja `RULES.md`): qualquer
> atualização no webapp **automaticamente** chega no APK na próxima
> abertura, sem rebuild. O shell Android só carrega
> `https://new-telegram-bice.vercel.app`.

---

## Setup inicial (uma vez por máquina)

### 1. JDK 17

Baixe a versão portátil do Temurin (Eclipse Adoptium):
https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse

Extraia em qualquer lugar (sugestão: `%LOCALAPPDATA%\jdk-17\`). Confirme:

```powershell
& "$env:LOCALAPPDATA\jdk-17\jdk-17.0.19+10\bin\java.exe" -version
```

Defina `JAVA_HOME` apontando para essa pasta:

```powershell
[System.Environment]::SetEnvironmentVariable("JAVA_HOME", "$env:LOCALAPPDATA\jdk-17\jdk-17.0.19+10", "User")
```

### 2. Android SDK

Baixe as Command Line Tools:
https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip

Extraia em `%LOCALAPPDATA%\android-sdk\cmdline-tools\latest\` (importante:
o conteúdo do ZIP fica DENTRO de `cmdline-tools/latest/`, não em
`cmdline-tools/cmdline-tools/`).

Defina `ANDROID_HOME`:

```powershell
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\android-sdk", "User")
```

**Aceitar licenças sem prompt** — crie estes arquivos manualmente:

```powershell
mkdir "$env:ANDROID_HOME\licenses"
"`n8933bad161af4178b1185d1a37fbf41ea5269c55`nd56f5187479451eabf01fb78af6dfcb131a6481e`n24333f8a63b6825ea9c5514f83c2829b004d1fee" | Set-Content "$env:ANDROID_HOME\licenses\android-sdk-license" -Encoding ASCII
"`n84831b9409646a918e30573bab4c9c91346d8abd`n504667f4c0de7af1a06de9f4b1727b84351f2910" | Set-Content "$env:ANDROID_HOME\licenses\android-sdk-preview-license" -Encoding ASCII
```

**Instalar packages obrigatórios:**

```powershell
$sdkmanager = "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat"
& $sdkmanager --install "platforms;android-34" "build-tools;34.0.0" "platform-tools"
```

**Criar pasta `tools/` (workaround):** o `@bubblewrap/core` espera
`$ANDROID_HOME/tools/` ou `$ANDROID_HOME/bin/`. Copie o cmdline-tools para
satisfazer:

```powershell
Copy-Item -Recurse "$env:ANDROID_HOME\cmdline-tools\latest" "$env:ANDROID_HOME\tools"
```

### 3. Bubblewrap CLI

```powershell
npm install -g @bubblewrap/cli
```

Isso instala também o `@bubblewrap/core` que o script `build-apk.mjs` usa
programaticamente.

### 4. Verificar

```powershell
java -version            # deve dizer 17.x
Test-Path "$env:ANDROID_HOME\tools\bin\sdkmanager.bat"  # True
Test-Path "$env:ANDROID_HOME\build-tools\34.0.0"        # True
bubblewrap --version     # deve mostrar versao
```

---

## Gerar / atualizar o APK

Tudo via npm script único:

```bash
npm run build:apk
```

O script `scripts/build-apk.mjs`:

1. Valida JDK + Android SDK
2. Carrega `https://new-telegram-bice.vercel.app/site.webmanifest`
3. Customiza package ID (`com.rayan.telegramclone`), nome, versão
4. **Primeira execução**: gera nova keystore em `android/android.keystore`
   com senha gravada em `android/KEYSTORE-CREDENTIALS.txt` (gitignored)
5. **Re-execução**: PRESERVA a keystore existente (continuidade de
   assinatura — Android só aceita atualização se a chave for a mesma)
6. Gera projeto Android via TwaGenerator
7. Roda Gradle assembleRelease (Gradle distribution baixado na 1ª vez, ~150MB)
8. Zipalign + apksigner
9. Copia APK assinado para `public/downloads/app.apk`

Output esperado:

```
[build-apk] APK gerado: D:\Projetos\new_whatsapp\public\downloads\app.apk
[build-apk] Tamanho: 2.49 MB
```

---

## Backup OBRIGATÓRIO da keystore

`android/android.keystore` é a chave privada do app. Sem ela, **você não
consegue publicar atualizações** que o Android reconheça como "mesma app".

**Faça backup em local seguro:**

- O arquivo `android/android.keystore`
- O arquivo `android/KEYSTORE-CREDENTIALS.txt` (que tem a senha)

Sugestões: 1Password, Bitwarden, drive criptografado, pen drive guardado.

**Estes arquivos NÃO vão pro git** (gitignored). Se você perder, o melhor
caminho é trocar o `packageId` (`com.rayan.telegramclone` → `com.rayan.telegramclone2`)
e tratar como app novo — usuários existentes precisam desinstalar a versão antiga.

---

## Atualizando o conteúdo do app (caso comum)

**Você NÃO precisa rebuildar o APK pra cada feature do webapp.** O TWA
carrega o site do Vercel a cada abertura, então:

- Mudou um componente React → `git push` → APK reflete na próxima abertura
- Mudou Firestore rules → aplica no console Firebase → APK reflete
- Mudou serviço backend → reflete

Veja `RULES.md` para a lista exata de quando rebuild é obrigatório.

---

## Após rebuildar — commitar o APK

```bash
git add public/downloads/app.apk android/twa-manifest.json
git commit -m "chore: atualiza APK Android"
git push
```

O Vercel deploya, o frontend detecta `/downloads/app.apk` via HEAD e o botão
"Baixar APK" continua aparecendo no perfil pra usuários Android.

---

## Digital Asset Links (TWA fullscreen sem barra do Chrome)

Pra o APK abrir o site sem mostrar a barra de URL do Chrome (modo fullscreen
de verdade), precisa publicar `.well-known/assetlinks.json` no domínio.

Pegue o SHA-256 fingerprint da sua keystore:

```powershell
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
keytool -list -v -keystore android\android.keystore -alias android -storepass "TelegramClone2026!"
```

Procure a linha `SHA256:` e use no arquivo `public/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.rayan.telegramclone",
    "sha256_cert_fingerprints": ["AA:BB:CC:..."]
  }
}]
```

Vai pro Vercel como `https://new-telegram-bice.vercel.app/.well-known/assetlinks.json`.

Sem isso, o APK ainda funciona — só mostra uma barrinha discreta com a URL no
topo. Com isso, fica fullscreen igual app nativo.

---

## Troubleshooting

### `ValidatePathError: The provided androidSdk isn't correct`

Falta a pasta `$ANDROID_HOME/tools/` ou `$ANDROID_HOME/bin/`. Veja seção 2
acima — copie `cmdline-tools/latest` para `tools/`.

### `'gradlew.bat' não é reconhecido como um comando interno`

cmd.exe não está procurando no cwd. O script já faz workaround prependando
`android/` ao PATH antes de chamar Gradle. Se ainda falhar, confirme que
`android/gradlew.bat` foi gerado.

### Gradle baixa de novo a cada build

Normal na 1ª execução. Próximas usam cache em `~/.gradle/`.

### Mudei o ícone do app mas o APK ainda mostra o antigo

Os ícones do TWA são copiados de `public/android-chrome-512x512.png` durante
o build. Confirme que o arquivo foi atualizado no Vercel deploy ANTES de
rodar `npm run build:apk`.
