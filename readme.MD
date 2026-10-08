# Bot Ticket

> Sistema completo de atendimento por tickets para servidores Discord, com canais privados, equipe de suporte, avaliação do atendimento, transcripts em HTML e persistência no Firebase Firestore.

[![Node.js](https://img.shields.io/badge/Node.js-CommonJS-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?logo=discord&logoColor=white)](https://discord.js.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Admin%20SDK-FFCA28?logo=firebase&logoColor=111)](https://firebase.google.com/)
[![Discloud](https://img.shields.io/badge/Deploy-Discloud-5865F2)](https://discloudbot.com/)

O **Bot Ticket** automatiza o suporte dentro de um servidor Discord. Um administrador configura os canais do sistema, os usuários abrem tickets por botão, a equipe de atendimento assume os chamados e, ao final, o usuário avalia o atendimento. O bot salva os dados no Firestore e envia o histórico completo para o canal de logs.

---

## Índice

- [Recursos](#recursos)

- [Fluxo do atendimento](#fluxo-do-atendimento)

- [Comandos](#comandos)

- [Requisitos](#requisitos)

- [Instalação local](#instala%C3%A7%C3%A3o-local)

- [Configuração do Firebase](#configura%C3%A7%C3%A3o-do-firebase)

- [Variáveis de ambiente](#vari%C3%A1veis-de-ambiente)

- [Permissões do bot](#permiss%C3%B5es-do-bot)

- [Estrutura do Firestore](#estrutura-do-firestore)

- [Execução](#execu%C3%A7%C3%A3o)

- [Deploy na Discloud](#deploy-na-discloud)

- [Estrutura do projeto](#estrutura-do-projeto)

- [Solução de problemas](#solu%C3%A7%C3%A3o-de-problemas)

- [Segurança](#seguran%C3%A7a)

- [Licença](#licen%C3%A7a)

- [Autor](#autor)

---

## Recursos

- Painel de abertura de tickets por botão;

- Criação automática de canais privados;

- Acesso exclusivo ao usuário que abriu o ticket;

- Acesso para o próprio bot;

- Acesso configurável para cargos de suporte;

- Canal separado para alertas de novos tickets;

- Botão para um administrador assumir o chamado;

- Registro do administrador responsável pelo atendimento;

- Botão para finalizar o ticket;

- Avaliação do atendimento pelo usuário;

- Nota de atendimento de 0 a 10;

- Geração automática de transcript HTML;

- Preservação de imagens no transcript;

- Envio do histórico para um canal de logs;

- Registro de status, usuário, servidor, atendente, nota e horários no Firebase;

- Comando de contato com o desenvolvedor;

- Créditos automáticos nas mensagens e embeds;

- Deploy preparado para Discloud;

- Configuração persistida por servidor no Firestore.

---

## Fluxo do atendimento

```
Administrador executa /setup
          ↓
Bot envia o painel de tickets
          ↓
Usuário clica em "Abrir Ticket"
          ↓
Bot cria um canal privado
          ↓
Equipe recebe alerta no canal administrativo
          ↓
Administrador clica em "Atender Chamado"
          ↓
Atendimento acontece no canal privado
          ↓
Administrador clica em "Finalizar Ticket"
          ↓
Usuário avalia o atendimento
          ↓
Bot gera transcript HTML
          ↓
Histórico é enviado ao canal de logs
          ↓
Ticket é salvo como fechado e o canal é excluído
```

### 1. Configuração

Um administrador executa `/setup` e seleciona três canais:

- Canal do painel;

- Canal de alertas administrativos;

- Canal de logs.

O bot salva esses IDs no documento do servidor dentro da coleção `guilds`.

### 2. Abertura

O usuário clica no botão **Abrir Ticket**. O bot:

1. Consulta a configuração do servidor;

1. Cria um canal de texto chamado `ticket-nome-do-usuário`;

1. Bloqueia a visualização para o servidor inteiro;

1. Libera acesso para o usuário;

1. Libera acesso para o bot;

1. Libera acesso para os cargos de suporte configurados;

1. Salva o ticket no Firestore;

1. Envia um alerta no canal administrativo.

### 3. Atendimento

Um administrador ou membro com cargo de suporte pode assumir o chamado pelo botão **Atender Chamado**. Ao assumir:

- O usuário é informado;

- O administrador recebe acesso ao canal;

- O ticket é marcado como `em_atendimento`;

- O botão de atendimento é removido;

- O responsável fica salvo no Firestore.

### 4. Encerramento

O administrador responsável ou um administrador do servidor pode iniciar a finalização. O usuário dono do ticket deve clicar em **Avaliar Atendimento** e enviar uma nota.

Depois da avaliação, o bot:

- Gera um transcript HTML completo;

- Salva imagens quando possível;

- Envia o transcript para o canal de logs;

- Registra a nota no Firestore;

- Marca o ticket como `fechado`;

- Exclui o canal depois de alguns segundos.

---

## Comandos

### `/setup`

Configura o sistema de tickets no servidor.

**Permissão:** Administrador.

**Opções obrigatórias:**

| Opção | Descrição |
| --- | --- |
| `painel` | Canal onde o painel para abrir tickets será enviado |
| `admin` | Canal que receberá alertas de novos tickets |
| `logs` | Canal onde os transcripts e avaliações serão enviados |

**Exemplo:**

```
/setup painel:#abrir-ticket admin:#suporte logs:#logs-tickets
```

O comando salva uma configuração semelhante a:

```json
{
  "panelChannel": "ID_DO_CANAL_PAINEL",
  "adminChannel": "ID_DO_CANAL_ADMIN",
  "logsChannel": "ID_DO_CANAL_LOGS"
}
```

> Executar `/setup` novamente atualiza a configuração e envia um novo painel no canal selecionado.

---

### `/cargos-ticket adicionar`

Adiciona um cargo à lista de suporte.

**Permissão:** Administrador.

```
/cargos-ticket adicionar cargo:@Suporte
```

Membros com esse cargo poderão visualizar e responder aos novos tickets.

### `/cargos-ticket remover`

Remove um cargo da lista de suporte.

**Permissão:** Administrador.

```
/cargos-ticket remover cargo:@Suporte
```

O sistema precisa ter sido configurado com `/setup` antes de adicionar ou remover cargos.

### `/contato`

Exibe um embed privado com informações e links de contato do desenvolvedor:

- Instagram;

- TikTok;

- LinkedIn;

- GitHub;

- Discord.

A resposta é enviada de forma efêmera, visível apenas para quem executou o comando.

---

## Requisitos

- Node.js 18 ou superior recomendado;

- npm;

- Aplicação criada no [Discord Developer Portal](https://discord.com/developers/applications);

- Bot adicionado ao servidor;

- Token do bot;

- Firebase habilitado;

- Firestore habilitado;

- Conta de serviço ou credenciais do Firebase Admin;

- Permissões suficientes para criar canais, editar permissões e enviar arquivos.

Verifique as versões instaladas:

```bash
node --version
npm --version
```

---

## Instalação local

Clone o repositório:

```bash
git clone https://github.com/Antonizinhobr/bot-ticket.git
cd bot-ticket
```

Instale as dependências:

```bash
npm install
```

O projeto utiliza CommonJS:

```json
{
  "main": "index.js",
  "type": "commonjs"
}
```

Inicie o bot com:

```bash
node index.js
```

---

## Configuração do Firebase

O bot utiliza o Firebase Admin SDK para salvar configurações e histórico dos tickets.

### 1. Criar o projeto

1. Acesse o [Firebase Console](https://console.firebase.google.com/);

1. Crie um projeto ou escolha um existente;

1. Acesse **Firestore Database**;

1. Crie o banco de dados;

1. Gere credenciais para uma conta de serviço.

### 2. Credenciais utilizadas

O código espera três variáveis:

```
FIREBASE_PROJECT_ID=seu-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seu-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSUA_CHAVE\n-----END PRIVATE KEY-----\n"
```

A chave privada é convertida pelo código para o formato correto:

```
privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
```

### 3. Arquivo `.env`

Crie um arquivo `.env` na raiz do projeto:

```
DISCORD_TOKEN=seu_token_do_bot
FIREBASE_PROJECT_ID=seu-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seu-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSUA_CHAVE\n-----END PRIVATE KEY-----\n"
```

O pacote `dotenv` carrega automaticamente essas variáveis quando o processo começa.

> Nunca publique o `.env`, o token do Discord ou a chave privada do Firebase no GitHub.

---

## Variáveis de ambiente

| Variável | Obrigatória | Finalidade |
| --- | --- | --- |
| `DISCORD_TOKEN` | Sim | Token utilizado para conectar o bot ao Discord |
| `FIREBASE_PROJECT_ID` | Sim | ID do projeto Firebase |
| `FIREBASE_CLIENT_EMAIL` | Sim | E-mail da conta de serviço |
| `FIREBASE_PRIVATE_KEY` | Sim | Chave privada da conta de serviço |

Exemplo de `.env.example`:

```
DISCORD_TOKEN=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=""
```

---

## Permissões do bot

O bot precisa ser convidado com permissões compatíveis com o sistema. Na prática, são necessárias permissões para:

- Ver canais;

- Enviar mensagens;

- Ler histórico de mensagens;

- Gerenciar canais;

- Gerenciar permissões de canais;

- Incorporar links;

- Anexar arquivos;

- Usar comandos de aplicação;

- Ver membros, conforme a configuração do servidor.

O código utiliza estas intents:

```
GatewayIntentBits.Guilds
GatewayIntentBits.GuildMessages
GatewayIntentBits.MessageContent
```

No Discord Developer Portal, habilite o **Message Content Intent** caso ele seja exigido pela configuração da aplicação.

O bot também precisa estar acima dos cargos de suporte na hierarquia do servidor quando a configuração de permissões exigir isso.

---

## Estrutura do Firestore

O bot usa principalmente duas coleções:

```
guilds
└── ID_DO_SERVIDOR

tickets
└── ID_DO_CANAL_DO_TICKET
```

### Coleção `guilds`

O ID do documento é o ID do servidor Discord.

Exemplo:

```json
{
  "panelChannel": "ID_DO_CANAL_PAINEL",
  "adminChannel": "ID_DO_CANAL_ADMIN",
  "logsChannel": "ID_DO_CANAL_LOGS",
  "supportRoles": [
    "ID_DO_CARGO_SUPORTE_1",
    "ID_DO_CARGO_SUPORTE_2"
  ]
}
```

### Campos de `guilds`

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `panelChannel` | string | Canal onde o painel é enviado |
| `adminChannel` | string | Canal de alertas administrativos |
| `logsChannel` | string | Canal dos transcripts |
| `supportRoles` | array de strings | IDs dos cargos autorizados a ver tickets |

### Coleção `tickets`

O ID do documento é o ID do canal criado para o ticket.

Exemplo durante o atendimento:

```json
{
  "userId": "ID_DO_USUARIO",
  "guildId": "ID_DO_SERVIDOR",
  "adminId": "ID_DO_ATENDENTE",
  "status": "em_atendimento",
  "openedAt": "Timestamp"
}
```

Exemplo após a avaliação:

```json
{
  "userId": "ID_DO_USUARIO",
  "guildId": "ID_DO_SERVIDOR",
  "adminId": "ID_DO_ATENDENTE",
  "status": "fechado",
  "nota": "10",
  "openedAt": "Timestamp"
}
```

### Estados do ticket

| Status | Significado |
| --- | --- |
| `pendente` | Ticket aberto e aguardando atendimento |
| `em_atendimento` | Um administrador assumiu o chamado |
| `fechado` | Atendimento avaliado e histórico gerado |

---

## Execução

Inicie o processo com:

```bash
node index.js
```

Quando conectar corretamente, o console informa algo semelhante a:

```
✅ Bot online como NomeDoBot#0000
```

Os comandos são registrados quando o evento `ready` é executado.

> Como o código registra os comandos usando `client.application.commands.create(...)`, eles são comandos globais. A propagação de comandos globais pode levar algum tempo no Discord.

---

## Deploy na Discloud

O repositório possui a seguinte configuração:

```
NAME=BotTicket
TYPE=bot
MAIN=index.js
RAM=100
AUTORESTART=true
VERSION=latest
APT=tools
```

### Passos

1. Faça login na Discloud;

1. Crie uma aplicação do tipo bot;

1. Envie os arquivos do projeto;

1. Configure as variáveis de ambiente;

1. Confirme que `index.js` é o arquivo principal;

1. Inicie ou reinicie a aplicação;

1. Consulte os logs até aparecer a mensagem de bot online.

Variáveis que precisam ser configuradas no painel da Discloud:

```
DISCORD_TOKEN=seu_token
FIREBASE_PROJECT_ID=seu_projeto
FIREBASE_CLIENT_EMAIL=seu_email_de_servico
FIREBASE_PRIVATE_KEY="sua_chave_com_\\n"
```

A configuração atual usa:

```
RAM=100
AUTORESTART=true
```

Se o Puppeteer não é utilizado neste bot, a configuração `APT=tools` pode permanecer conforme o arquivo atual, mas não é uma dependência funcional central do projeto.

---

## Estrutura do projeto

```
.
├── .gitignore
├── discloud.config
├── index.js
├── package.json
├── package-lock.json
└── .env                 # local, não publicar
```

O arquivo principal concentra:

- Inicialização do Discord client;

- Inicialização do Firebase Admin;

- Registro dos slash commands;

- Interações de botões;

- Interações de modal;

- Criação de canais;

- Atualizações do Firestore;

- Geração e envio de transcripts;

- Login do bot.

---

## Solução de problemas

### O bot não conecta

Verifique:

- `DISCORD_TOKEN` está correto;

- o token não expirou ou foi regenerado;

- o bot foi convidado ao servidor;

- a aplicação não está desativada;

- os logs da hospedagem não indicam erro de intent.

Se o token foi exposto, gere um novo imediatamente no Discord Developer Portal.

### Os comandos não aparecem

Os comandos são registrados globalmente no evento `ready`. Aguarde a sincronização do Discord e confirme que:

- o bot possui o escopo `applications.commands`;

- o bot está no servidor correto;

- o processo chegou ao evento `ready`;

- o token corresponde à aplicação esperada.

### `/setup` não envia o painel

Confirme que o bot possui permissão para:

- ver o canal;

- enviar mensagens;

- incorporar links;

- usar componentes interativos.

Também confirme que os três canais selecionados são acessíveis pelo bot.

### O ticket não é criado

Verifique:

- se `/setup` já foi executado no servidor;

- se o bot pode criar canais;

- se o bot pode gerenciar permissões;

- se o limite de canais do servidor não foi atingido;

- se o Firestore está acessível.

### O usuário não consegue abrir o ticket

Confira se o canal criado recebeu as permissões para:

- visualizar o canal;

- enviar mensagens;

- anexar arquivos.

### O transcript não aparece nos logs

Confira:

- se o canal de logs está correto no Firestore;

- se o bot consegue enviar arquivos;

- se o bot ainda consegue acessar o canal;

- se a biblioteca `discord-html-transcripts` foi instalada;

- se o transcript não ultrapassou limites de tamanho do Discord.

### Erro no Firebase

Confirme todas as credenciais:

```
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

A chave privada deve manter as quebras de linha representadas como `\\n` dentro da variável de ambiente.

---

## Segurança

- Nunca publique `DISCORD_TOKEN`;

- Nunca publique `FIREBASE_PRIVATE_KEY`;

- Não versione o arquivo `.env`;

- Se uma credencial for exposta, faça a rotação imediatamente;

- Restrinja as permissões da conta de serviço quando possível;

- Dê ao bot somente as permissões necessárias;

- Mantenha o bot acima dos cargos que ele precisa gerenciar;

- Revise as permissões dos canais de tickets;

- Evite colocar dados sensíveis nos transcripts;

- Limite quem pode usar `/setup` e `/cargos-ticket`.

As verificações administrativas dos comandos são reforçadas por:

```
.setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
```

Mesmo assim, as permissões do servidor e a hierarquia do Discord continuam sendo importantes.

---

## Observações técnicas

### Mensagens efêmeras

As respostas de configuração, contato e alguns erros são enviadas como efêmeras. Isso mantém informações administrativas fora do canal público.

### Transcripts

O histórico é gerado com:

```
createTranscript(interaction.channel, {
  limit: -1,
  filename: `ticket-${interaction.channel.name}.html`,
  saveImages: true
});
```

O limite `-1` indica que o bot tenta incluir todo o histórico disponível do canal.

### Fechamento automático

Depois da avaliação e do envio dos logs, o canal é excluído após alguns segundos:

```
setTimeout(() => interaction.channel.delete().catch(() => {}), 4000);
```

### Validação da nota

O campo informa ao usuário que a nota deve estar entre 0 e 10. Para reforçar essa regra no código, recomenda-se validar numericamente o valor antes de salvar:

```
const notaNumerica = Number(nota);

if (!Number.isInteger(notaNumerica) || notaNumerica < 0 || notaNumerica > 10) {
  return interaction.editReply('A nota precisa ser um número inteiro entre 0 e 10.');
}
```

---

## Licença

O `package.json` atual declara a licença:

```
ISC
```

Consulte o mantenedor antes de redistribuir ou modificar o projeto para uso em produção.

---

## Links

- [Repositório do bot](https://github.com/Antonizinhobr/bot-ticket)

- [Discord.js](https://discord.js.org/)

- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

- [Cloud Firestore](https://firebase.google.com/docs/firestore)

- [Discord Developer Portal](https://discord.com/developers/applications)

- [Discloud](https://discloudbot.com/)

- [discord-html-transcripts](https://www.npmjs.com/package/discord-html-transcripts)

---

## Autor

Desenvolvido por [Anthonny Michael](https://github.com/Antonizinhobr).

Use o comando `/contato` dentro do bot para acessar os canais oficiais de contato.