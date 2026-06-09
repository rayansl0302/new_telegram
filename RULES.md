# Regras do Projeto

## 1. Paridade Webapp ↔ APK Android (REGRA PRINCIPAL)

> **Toda atualização no webapp DEVE estar identicamente refletida no APK
> Android.** Não existe feature "só web" — se vai pra produção, vai pros dois.

### Como essa regra é garantida arquiteturalmente

O APK Android **não é** uma reimplementação nativa. Ele é uma **Trusted Web
Activity (TWA)** — um shell Android extremamente fino que carrega
`https://new-telegram-bice.vercel.app` dentro de um Chrome Custom Tab em modo
fullscreen.

**Consequência prática:**

- Mudança em React/CSS/JS → deploy no Vercel → **APK já reflete na próxima
  abertura**, sem rebuild.
- Mudança em service worker / PWA cache → mesma coisa, automático.
- Mudança em Firestore rules → automático.

**Quando precisa rebuildar o APK** (rodar `npm run build:apk`):

1. Mudar `public/manifest.webmanifest` ou `vite.config.js` (manifest gerado):
   nome do app, ícone, theme color, display mode.
2. Adicionar permissões nativas que o TWA precisa declarar (notificações
   geralmente já vêm pelo PWA, mas câmera/microfone podem precisar revisão).
3. Trocar de domínio (precisa atualizar Digital Asset Links).
4. Antes de uma release "marco" (1.0, 2.0, etc.) — só pra garantir que a
   versão do shell está atualizada.

### Checklist antes de mergear pra `main`

- [ ] Build do webapp passa (`npm run build`)
- [ ] Se mudou `manifest.webmanifest`, `index.html` `<title>`, ou ícone:
  rodar `npm run build:apk` e commitar o `public/downloads/app.apk` atualizado
- [ ] Feature foi testada em viewport mobile (DevTools ou dispositivo real)
- [ ] Se a feature usa API nativa do browser (Notifications, Camera,
  Geolocation, Web Audio), validar que funciona dentro de TWA (não apenas no
  Chrome standalone)

## 2. PWA é a fonte da verdade

- PWA continua sendo a opção **recomendada** no perfil. Mais leve, atualiza
  sempre, funciona em todos os sistemas.
- APK é a alternativa pra usuários Android que preferem app nativo instalado
  fora da Play Store.

## 3. Não comitar segredos

- `.env.local`, `.env.*.local`, `.env` → no `.gitignore`
- Keystore Android (`*.keystore`, `*.jks`, `android.keystore`) → no
  `.gitignore`. **A keystore E a senha são responsabilidade do dono do
  projeto guardar fora do repo.** Sem elas não dá pra atualizar o APK.
- Cloudinary: usar APENAS unsigned upload preset. Nunca colocar API secret
  no frontend.

## 4. Firestore rules são parte do código

Toda mudança no modelo de dados precisa de ajuste correspondente em
`firestore.rules` no console do Firebase. Não há deploy automatizado das
rules — o dono do projeto aplica manualmente.

## 5. Estilo

- React 19 + Vite + Tailwind v4 (`@import "tailwindcss"`).
- Sem TypeScript no momento. JSDoc inline quando precisar tipar.
- Comentários em português quando explicam lógica de negócio. Inglês para
  termos técnicos comuns.
- Sem emojis em arquivos de código (apenas em UI quando faz parte da feature,
  ex: reactions picker).
