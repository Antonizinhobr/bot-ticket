# 🎫 Bot de Tickets para Discord

Bot de atendimento por tickets para Discord. Usa o visual novo de mensagens do Discord (Components V2) e guarda os dados no **Firebase (Firestore)**. Cada ticket gera um **histórico da conversa que abre direto no navegador**.

> Desenvolvido por **Anthonny Michael**. Use `/contato` no Discord para falar com o desenvolvedor.

---

## 📑 Sumário

- [Funcionalidades](#-funcionalidades)
- [Como funciona um ticket](#-como-funciona-um-ticket)
- [Requisitos](#-requisitos)
- [Estrutura de arquivos](#-estrutura-de-arquivos)
- [1. Criar o bot no Discord](#1-criar-o-bot-no-discord)
- [2. Configurar o Firebase](#2-configurar-o-firebase)
- [3. Arquivo `.env`](#3-arquivo-env)
- [4. Arquivo `package.json`](#4-arquivo-packagejson)
- [5. Hospedar na Discloud](#5-hospedar-na-discloud)
- [6. Configurar no servidor](#6-configurar-no-servidor)
- [Comandos](#-comandos)
- [Histórico dos tickets](#-histórico-dos-tickets)
- [Personalização (`CONFIG`)](#-personalização-config)
- [Banco de dados](#-banco-de-dados)
- [Solução de problemas](#-solução-de-problemas)

---

## ✨ Funcionalidades

- **Painel de atendimento** com título, texto, banner e menu de categorias
- **Formulário (modal)** para o usuário escrever o motivo do ticket, com até 4000 caracteres
- **Canal privado por ticket** (`🎫・nomedousuario`), visível só para o autor, a equipe e o bot
- **Mensagem do ticket fixada** com a categoria, o motivo, a miniatura do servidor e a menção do cargo da equipe
- **Menu de ações da equipe:**
  - 👤 **Adicionar Usuário:** dá acesso ao ticket para outra pessoa
  - 🗑️ **Remover Usuário:** tira o acesso de quem foi adicionado
  - 📞 **Criar Call:** cria um canal de voz vinculado ao ticket
  - 🔔 **Pokear:** marca o autor no ticket e manda uma DM avisando
  - 🟥 **Finalizar Ticket:** fecha o ticket, gera o histórico, registra no canal de logs e avisa o autor por DM
- **Histórico em página web:** o botão 🔗 **Histórico** abre a conversa inteira no navegador
- **Um ticket aberto por pessoa:** quem já tem ticket aberto recebe o link dele em vez de abrir outro
- **Vários servidores:** cada servidor tem sua própria configuração de logs, categoria, cargos e imagens
- **Cargos por categoria:** cargos gerais (veem todos os tickets) ou só de uma categoria
- **Plano B do histórico:** se a biblioteca de histórico falhar, o bot gera uma página própria, mais simples

---

## 🔄 Como funciona um ticket

1. Um admin usa `/send-ticket` no canal de atendimento e o painel aparece.
2. O membro escolhe a categoria no menu e preenche o motivo no formulário.
3. O bot cria o canal `🎫・nomedousuario`, fixa a mensagem do ticket e avisa: *"Nossa equipe está ciente da sua necessidade…"*.
4. A equipe atende e usa o menu **"Selecione uma ação para o ticket"** quando precisar.
5. Ao escolher **Finalizar Ticket**:
   - aparece *"⚠️ Fechamento do Ticket: este ticket será fechado em 3 segundos…"*
   - o histórico da conversa é salvo
   - o canal de logs recebe: `✅ TICKET de usuario 123456789 foi finalizado.` com o botão **🔗 Histórico**
   - o autor recebe uma DM **"Ticket Finalizado"** com o banner e o botão **🔗 Histórico**
   - a call do ticket, se existir, é apagada
   - o canal do ticket é apagado

---

## 📋 Requisitos

| Item | Versão / observação |
|---|---|
| Node.js | **20 ou superior** (recomendado 22+) |
| discord.js | **14.19 ou superior** (abaixo disso o visual novo não funciona) |
| Firebase | Projeto com **Firestore** ativado (o plano gratuito Spark serve) |
| Discloud | Plano **Platinum ou superior** para usar o subdomínio do histórico |
| Permissão do bot | **Administrador** no servidor |

---

## 📁 Estrutura de arquivos

```
bot-ticket/
├── index.js            # código do bot
├── package.json        # dependências
├── .env                # tokens e chaves (NUNCA compartilhe)
├── discloud.config     # configuração da Discloud
└── historico/
    └── index.html      # (opcional) página do histórico para o GitHub Pages
```

Se for usar Git, crie um `.gitignore`:

```
node_modules/
.env
```

---

## 1. Criar o bot no Discord

1. Acesse o [Discord Developer Portal](https://discord.com/developers/applications) e clique em **New Application**.
2. Na aba **Bot**:
   - clique em **Reset Token** e copie o token (ele vai no `.env`)
   - em **Privileged Gateway Intents**, ative a **Message Content Intent**. Sem ela o bot não liga e o histórico sai sem o texto das mensagens.
3. Para convidar o bot, troque `SEU_CLIENT_ID` pelo **Application ID** (aba *General Information*) e abra:

```
https://discord.com/oauth2/authorize?client_id=SEU_CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

> `permissions=8` = Administrador. O bot precisa disso para criar canais, mexer em permissões e fixar mensagens.

---

## 2. Configurar o Firebase

1. Acesse o [Console do Firebase](https://console.firebase.google.com/) e crie um projeto (ou use um existente).
2. Vá em **Firestore Database → Criar banco de dados**.
3. Vá em **⚙️ Configurações do projeto → Contas de serviço → Gerar nova chave privada**. Isso baixa um arquivo `.json`.
4. Do arquivo `.json`, você vai usar três campos no `.env`:

| Campo no `.json` | Variável no `.env` |
|---|---|
| `project_id` | `FIREBASE_PROJECT_ID` |
| `client_email` | `FIREBASE_CLIENT_EMAIL` |
| `private_key` | `FIREBASE_PRIVATE_KEY` |

> O bot usa o **Firebase Admin**, que ignora as regras de segurança do Firestore. Você só precisa mexer nas regras se for usar o histórico pelo **GitHub Pages** (veja [Histórico dos tickets](#-histórico-dos-tickets)).

---

## 3. Arquivo `.env`

Crie um arquivo `.env` na mesma pasta do `index.js`:

```env
DISCORD_TOKEN=SEU_TOKEN_DO_BOT

FIREBASE_PROJECT_ID=seu-projeto-firebase
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seu-projeto-firebase.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSUA_CHAVE_PRIVADA_AQUI\n-----END PRIVATE KEY-----\n"

HISTORICO_URL=https://seu-subdominio.discloud.app
```

| Variável | Para que serve |
|---|---|
| `DISCORD_TOKEN` | Token do bot (Developer Portal → Bot) |
| `FIREBASE_PROJECT_ID` | ID do projeto do Firebase |
| `FIREBASE_CLIENT_EMAIL` | E-mail da conta de serviço |
| `FIREBASE_PRIVATE_KEY` | Chave privada. Cole **entre aspas** e mantenha os `\n` como estão no `.json` |
| `HISTORICO_URL` | Onde o histórico abre no navegador (veja [Histórico dos tickets](#-histórico-dos-tickets)). Pode ficar vazio |

> ⚠️ **Nunca** envie o `.env` para o GitHub nem mostre ele para ninguém. Quem tiver o token controla o seu bot.

---

## 4. Arquivo `package.json`

```json
{
  "name": "bot-ticket",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "discord-html-transcripts": "^3.3.0",
    "discord.js": "^14.22.0",
    "dotenv": "^17.0.0",
    "firebase-admin": "^13.0.0"
  }
}
```

Para instalar no seu computador:

```bash
npm install
npm start
```

> Atualize o discord.js com `npm i discord.js@14`, e **não** com `@latest`, que pode instalar uma versão futura incompatível.

---

## 5. Hospedar na Discloud

### 5.1 Criar o subdomínio

No painel da Discloud, vá na aba **Domains → + Create Subdomain** e escolha um nome (até 20 caracteres: letras, números e hífen). Exemplo: `seu-subdominio`.

### 5.2 `discloud.config`

```properties
NAME=BotTicket
TYPE=site
ID=seu-subdominio
MAIN=index.js
RAM=512
AUTORESTART=true
VERSION=latest
APT=tools
```

| Campo | Explicação |
|---|---|
| `NAME` | Nome do app no painel |
| `TYPE=site` | Libera o subdomínio. O bot roda normal **e** serve as páginas de histórico |
| `ID` | Nome do subdomínio criado no passo 5.1, **sem** o `.discloud.app` |
| `MAIN` | Arquivo principal |
| `RAM` | Mínimo **512** para apps do tipo site |
| `AUTORESTART` | Reinicia sozinho se cair (Platinum+) |
| `VERSION` | Versão do ambiente |
| `APT` | Pacotes extras do sistema |

### 5.3 Enviar

Compacte `index.js`, `package.json`, `.env` e `discloud.config` (sem a pasta `node_modules`) e envie pela Discloud. Nos logs do app devem aparecer estas linhas:

```
Site do histórico ligado na porta 8080
Bot online como NomeDoBot#0000
Conexão com o Firebase pronta
```

> Deixe **só um app** rodando com esse token. Dois bots com o mesmo token causam o erro `Unknown interaction`.

---

## 6. Configurar no servidor

Faça na ordem, com uma conta de **Administrador**:

1. **Canal de logs e categoria dos tickets:**
   ```
   /config-ticket logs:#logs-tickets categoria:Tickets
   ```
2. **Cargo da equipe** (vê e atende todos os tickets):
   ```
   /cargos-ticket adicionar cargo:@Equipe
   ```
3. **(Opcional) Imagens:**
   ```
   /config-ticket imagem-painel:https://link-da-imagem.png imagem-fechamento:https://link-da-imagem.png
   ```
4. **Enviar o painel** no canal de abertura de tickets:
   ```
   /send-ticket
   ```

Para ver a configuração atual, use `/config-ticket` sem nenhuma opção.

---

## 🧭 Comandos

Todos os comandos (menos o `/contato`) são **só para administradores**.

### `/send-ticket`
Cria o painel de tickets no canal atual. **Rode de novo** sempre que mudar o texto, as categorias ou a imagem do painel, e apague o painel antigo.

### `/config-ticket`
Configura o sistema neste servidor. Todas as opções são opcionais. Sem nenhuma, o comando só mostra a configuração atual.

| Opção | O que faz |
|---|---|
| `logs` | Canal onde os tickets finalizados são registrados |
| `logs-ativos` | Liga ou desliga o registro no canal de logs |
| `categoria` | Categoria onde os canais de ticket são criados |
| `imagem-painel` | Banner do painel (link PNG, JPG ou GIF). Escreva `remover` para tirar |
| `imagem-fechamento` | Banner da DM "Ticket Finalizado". Escreva `remover` para tirar |
| `thumbnail` | Miniatura da mensagem "Ticket Aberto por". Escreva `remover` para tirar |

Imagens padrão, quando não configuradas:
- **Painel:** banner do servidor (se tiver)
- **Fechamento:** a mesma imagem do painel
- **Miniatura:** ícone do servidor

### `/cargos-ticket adicionar | remover`

| Opção | O que faz |
|---|---|
| `cargo` | Cargo que vai ganhar ou perder acesso aos tickets |
| `categoria` | (Opcional) Vale só para essa categoria. Vazio = todos os tickets |

Quem pode usar o menu de ações: **administradores** e os **cargos cadastrados** (gerais ou da categoria do ticket). O autor do ticket **não** usa o menu, a não ser que também seja da equipe.

O cargo marcado na mensagem do ticket é o cargo da categoria, se houver um. Se não houver, são os cargos gerais.

### `/contato`
Mostra as redes sociais do desenvolvedor.

---

## 📜 Histórico dos tickets

Quando um ticket é finalizado, o bot gera a página da conversa, compacta e salva no Firestore, na coleção `transcripts`. O link do botão **🔗 Histórico** depende do `HISTORICO_URL`:

| `HISTORICO_URL` | Como o histórico abre |
|---|---|
| `https://seu-subdominio.discloud.app` | **(Recomendado)** O próprio bot serve a página em `https://seu-subdominio.discloud.app/historico/CODIGO` |
| `https://seu-usuario.github.io/historico-tickets/` | A página `historico/index.html` no GitHub Pages lê o histórico direto do Firestore |
| *(vazio)* | O histórico vai como **arquivo `.html`** para baixar, no log e na DM |

- Cada histórico tem um código aleatório impossível de adivinhar, então só abre quem tem o link.
- O link **não expira**.
- Se a conversa tiver muitas imagens e passar de ~1 MB, o bot refaz o histórico sem embutir as imagens.

### Opção GitHub Pages (sem plano Platinum)

1. Crie um repositório público, por exemplo `historico-tickets`, e envie o arquivo `historico/index.html`.
2. Em **Settings → Pages**, escolha a Branch `main` e salve.
3. No Firestore, vá em **Regras** e adicione dentro de `match /databases/{database}/documents { ... }`:
   ```
   match /transcripts/{id} {
     allow get: if true;
   }
   ```
4. No `.env`:
   ```env
   HISTORICO_URL=https://seu-usuario.github.io/historico-tickets/
   ```

---

## 🎨 Personalização (`CONFIG`)

No começo do `index.js` fica o bloco `CONFIG`. Tudo o que é visual se muda ali. Essas mudanças valem para **todos os servidores** que usam o bot.

```js
const CONFIG = {
  corDestaque: 0x1de9b6,      // cor da barra lateral das mensagens (hex com 0x na frente)
  segundosParaFechar: 3,      // tempo até apagar o canal ao finalizar
  marca: null,                // null = usa o nome do servidor no rodapé e na DM
  prefixoCanal: "🎫・",       // canal do ticket: 🎫・nomedousuario
  prefixoCall: "📞・",        // call do ticket:  📞・nomedousuario
  emojis: { ... },            // emojis usados nas mensagens e no menu
  painel: { ... },            // título, texto, citação e placeholder do painel
  categorias: [ ... ],        // opções do menu do painel
  imagens: { ... },           // imagens padrão (links)
};
```

### Emojis personalizados

Troque qualquer emoji em `CONFIG.emojis` pelo formato `<:nome:ID>`, ou `<a:nome:ID>` se for animado. Para descobrir o código, digite `\:nomedoemoji:` em qualquer canal do Discord e envie.

```js
verificado: "<:verificado:123456789012345678>",
```

> O bot precisa estar no servidor de onde o emoji é. Em outros servidores, o cargo do bot precisa da permissão **Usar emojis externos**.

### Textos do painel

```js
painel: {
  titulo: "Canal de Atendimento",
  texto: "Para receber **SUPORTE** ou tirar **DÚVIDAS**, por favor, selecione uma das opções no menu abaixo.",
  citacao: "Nossa equipe está pronta para ajudar assim que possível.",
  placeholder: "Selecione a categoria do ticket",
},
```

### Adicionar uma categoria

Adicione um objeto em `categorias` (até 25):

```js
categorias: [
  {
    valor: "atendimento",
    nome: "Solicitação de Atendimento",
    descricao: "Está com dúvidas? Receba suporte da nossa equipe.",
    emoji: "💬",
  },
  {
    valor: "denuncia",
    nome: "Denúncia",
    descricao: "Denuncie um membro ou situação.",
    emoji: "🚨",
  },
],
```

- `valor`: identificador interno, **sem espaços nem `_`**. Não mude depois de usar, porque os cargos por categoria ficam ligados a ele.
- `nome`: o que aparece no menu e no ticket (até 100 caracteres).
- `descricao`: texto menor embaixo do nome (até 100 caracteres).

Depois de mudar, reinicie o bot e rode `/send-ticket` de novo.

---

## 💾 Banco de dados

O bot cria e usa três coleções no Firestore:

**`guilds/{idDoServidor}`**: configuração de cada servidor

| Campo | Conteúdo |
|---|---|
| `logsChannel` | ID do canal de logs |
| `logsAtivos` | `true` / `false` |
| `categoryChannel` | ID da categoria dos tickets |
| `supportRoles` | Lista de cargos gerais |
| `categoryRoles` | Cargos por categoria (`{ atendimento: [...] }`) |
| `imagemPainel`, `imagemFechamento`, `thumbnail` | Links das imagens |
| `panelChannel` | Último canal onde o painel foi enviado |

**`tickets/{idDoCanal}`**: cada ticket

| Campo | Conteúdo |
|---|---|
| `userId`, `guildId` | Autor e servidor |
| `status` | `aberto` / `fechado` |
| `categoria`, `motivo`, `codigo` | Dados da abertura |
| `openedAt`, `closedAt`, `closedBy` | Datas e quem finalizou |
| `mensagemId`, `callId` | Mensagem fixada e call do ticket |
| `transcriptUrl` | Link do histórico |

**`transcripts/{codigoAleatorio}`**: históricos (HTML compactado), com `guildId`, `userId`, `canal` e `criadoEm`.

> Mudanças feitas pelos comandos valem na hora. Se editar algo direto no console do Firebase, pode levar até 60 segundos para o bot perceber.

O tópico de cada canal de ticket segue o formato `idDoUsuario|CODIGO|categoria`.

---

## 🔧 Solução de problemas

| Problema | Causa / solução |
|---|---|
| Bot não liga: `Used disallowed intents` | Ative a **Message Content Intent** no Developer Portal (passo 1) |
| `DiscordAPIError[10062]: Unknown interaction` | Tem **dois bots rodando com o mesmo token** (app antigo na Discloud ou no seu PC). Deixe só um |
| `Missing Permissions` | Dê **Administrador** ao cargo do bot |
| Histórico não abre / site fora do ar | Confira `TYPE=site`, o `ID` igual ao subdomínio, `RAM=512` e a linha `Site do histórico ligado na porta 8080` nos logs |
| Página mostra **"Sem permissão"** | Modo GitHub Pages: falta a regra do Firestore (veja [Opção GitHub Pages](#opção-github-pages-sem-plano-platinum)) |
| Log mostra `usando o histórico simples` | A biblioteca de histórico falhou e o bot usou o plano B. O histórico continua sendo gerado, só que mais simples |
| Botão **Histórico** não aparece | Veja se o `HISTORICO_URL` está no `.env`. Se estiver vazio, o histórico vai como arquivo `.html` |
| Painel antigo continua igual | Apague o painel e rode `/send-ticket` de novo |
| Emoji aparece como `:nome:` | O bot não está no servidor do emoji, ou falta a permissão **Usar emojis externos** |
| Erro com o `FIREBASE_PRIVATE_KEY` | Coloque a chave **entre aspas** e mantenha os `\n` |
| "Você já possui um ticket aberto" | O usuário já tem um ticket. Ele recebe o link do ticket que está aberto |

---

<p align="center">Feito com 💚 por <b>Anthonny Michael</b> · <a href="https://github.com/Antonizinhobr">GitHub</a></p>