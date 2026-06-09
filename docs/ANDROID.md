# Build do APK Android (TWA)

O APK do Telegram Clone é gerado **localmente** via
[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) — a CLI oficial
do Google para empacotar PWAs como Trusted Web Activity.

Depois de gerado, o APK fica em `public/downloads/app.apk` e é servido
estaticamente pelo Vercel. O frontend detecta a presença do arquivo via
`HEAD /downloads/app.apk` e mostra o botão "Baixar APK" no perfil.

> **Por que TWA e não Capacitor/React Native?**
> TWA garante a regra principal do projeto (veja `RULES.md`): qualquer
> atualização no webapp **automaticamente** chega no APK na próxima
> abertura, sem rebuild. O shell Android só carrega `https://new-telegram-bice.vercel.app`.

---

## Setup inicial (uma vez por máquina)

### 1. Pré-requisitos

- Node.js 18+ (já tem)
- **JDK 17** — https://adoptium.net/temurin/releases/?version=17
- Bubblewrap usa o Android SDK Command-Line Tools por baixo, mas baixa
  automaticamente na primeira execução.

Confirme:

```bash
java -version
# deve mostrar "openjdk version 17.x"
```

### 2. Instalar Bubblewrap globalmente

```bash
npm install -g @bubblewrap/cli
```

Confirme:

```bash
bubblewrap --help
```

Se aparecer ajuda da CLI, está OK.

### 3. Inicializar a pasta `android/`

Na **primeira vez**, dentro da raiz do projeto:

```bash
mkdir android
cd android
bubblewrap init --manifest=https://new-telegram-bice.vercel.app/manifest.webmanifest
```

Bubblewrap vai perguntar várias coisas. Sugestões de resposta:

| Pergunta | Resposta |
|---|---|
| Domain | `new-telegram-bice.vercel.app` |
| URL path | `/` |
| Application name | `Telegram Clone` |
| Short name | `Telegram` |
| Application ID | `com.rayan.telegramclone` |
| Display mode | `standalone` |
| Orientation | `default` |
| Status bar color | (mesmo do theme_color do manifest) |
| Signing key | **Generate new keystore** (primeira vez) |
| Key alias | `android` |
| Key store password | escolha uma senha forte — **GUARDE FORA DO REPO** |
| Key password | mesma senha tá OK |

Bubblewrap vai criar `twa-manifest.json` e `android.keystore` em `android/`.

**⚠️ A keystore é a chave privada do app.** Sem ela, você não consegue
publicar atualizações que o Android reconheça como "mesma app". O
`.gitignore` já ignora `*.keystore`, então ela fica **só na sua máquina** —
faça backup em local seguro (1Password, drive criptografado, etc.).

### 4. Validar o setup

```bash
cd android
bubblewrap doctor
```

Se tudo OK, próximo passo é gerar o APK.

---

## Gerar/atualizar o APK

Sempre que precisar regenerar (mudou manifest, ícone, ou release marco):

```bash
npm run build:apk
```

Esse script:

1. Roda `bubblewrap build` dentro de `android/`
2. Vai pedir a senha da keystore
3. Copia o APK assinado pra `public/downloads/app.apk`

Depois:

```bash
git add public/downloads/app.apk
git commit -m "chore: atualiza APK Android"
git push
```

O Vercel deploya, o frontend detecta `/downloads/app.apk` via HEAD e o botão
"Baixar APK" aparece no perfil pra usuários Android.

---

## Atualizando o conteúdo do app (caso comum)

**Você NÃO precisa rebuildar o APK pra cada feature do webapp.** O TWA carrega
o site do Vercel a cada abertura, então:

- Mudou um componente React → `git push` → APK reflete na próxima abertura
- Mudou Firestore rules → aplica no console Firebase → APK reflete
- Mudou serviço backend → reflete

Veja `RULES.md` para a lista exata de quando rebuild é obrigatório.

---

## Digital Asset Links (TWA fullscreen sem barra do Chrome)

Pra o APK abrir o site sem mostrar a barra de URL do Chrome (modo fullscreen
de verdade), precisa publicar um arquivo `.well-known/assetlinks.json` no
domínio.

Bubblewrap gera o arquivo no setup. Conteúdo típico:

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

Salve isso em `public/.well-known/assetlinks.json` (já vai pro Vercel
automaticamente como `https://new-telegram-bice.vercel.app/.well-known/assetlinks.json`).

Sem isso, o APK ainda funciona — só mostra uma barrinha discreta com a URL no
topo. Com isso, fica fullscreen igual app nativo.

---

## Troubleshooting

### `bubblewrap build` falha com "JDK não encontrado"

Setar `JAVA_HOME`:

- Windows: `setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-17.0.x"`
- Mac/Linux: `export JAVA_HOME=$(/usr/libexec/java_home -v 17)` no `~/.zshrc`

### APK gerado mas não instala no celular

- Confirme que "Fontes desconhecidas" / "Instalar apps desconhecidos" está
  habilitado para o navegador que baixou o APK.
- Confirme que o APK foi **assinado** (não é `app-release-unsigned.apk`).

### Como saber a versão do APK que está em produção

```bash
# Mac/Linux
unzip -p public/downloads/app.apk META-INF/MANIFEST.MF | head

# Ou abrir o twa-manifest.json — campos `appVersionCode` e `appVersionName`
cat android/twa-manifest.json
```

Bubblewrap incrementa `appVersionCode` automaticamente a cada build.
