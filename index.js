require("dotenv").config();
const {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
  PermissionsBitField,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  UserSelectMenuBuilder,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  InteractionContextType,
} = require("discord.js");
const admin = require("firebase-admin");
const discordTranscripts = require("discord-html-transcripts");

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();
const { FieldValue } = admin.firestore;

const URL_FOTO_DEV = "https://avatars.githubusercontent.com/Antonizinhobr";

const CONFIG = {
  corDestaque: 0x1de9b6,
  segundosParaFechar: 3,
  marca: null,
  prefixoCanal: "🎫・",
  prefixoCall: "📞・",

  emojis: {
    verificado: "☑️",
    atendimento: "💬",
    sucesso: "✅",
    aviso: "⚠️",
    relogio: "⏰",
    link: "🔗",
    erro: "❌",
    config: "⚙️",
    addUser: "👤",
    remUser: "🗑️",
    call: "📞",
    poke: "🔔",
    finalizar: "🟥",
  },

  painel: {
    titulo: "Canal de Atendimento",
    texto:
      "Para receber **SUPORTE** ou tirar **DÚVIDAS**, por favor, selecione uma das opções no menu abaixo.",
    citacao: "Nossa equipe está pronta para ajudar assim que possível.",
    placeholder: "Selecione a categoria do ticket",
  },

  categorias: [
    {
      valor: "atendimento",
      nome: "Solicitação de Atendimento",
      descricao: "Está com dúvidas? Receba suporte da nossa equipe.",
      emoji: "💬",
    },
  ],

  imagens: {
    painel: "",
    fechamento: "",
    thumbnail: "",
  },
};
const E = CONFIG.emojis;

const V2 = MessageFlags.IsComponentsV2;
const V2_EFEMERO = MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral;
const fechando = new Set();

const urlValida = (u) => typeof u === "string" && /^https?:\/\/\S+$/i.test(u.trim());
const nomeMarca = (guild) => CONFIG.marca || guild.name;
const texto = (conteudo) => new TextDisplayBuilder().setContent(conteudo);
const container = () => new ContainerBuilder().setAccentColor(CONFIG.corDestaque);
const caixa = (conteudo) => container().addTextDisplayComponents(texto(conteudo));
const separador = () => new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small);
const galeria = (url) => new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(url));
const linha = (...componentes) => new ActionRowBuilder().addComponents(...componentes);
const rodape = (guild) => texto(`-# ${E.verificado} ${nomeMarca(guild)} © Todos os direitos reservados`);
const botaoLink = (label, url, emoji) => {
  const b = new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(label).setURL(url);
  if (emoji) b.setEmoji(emoji);
  return b;
};
const botaoHistorico = (url) => botaoLink("Histórico", url, E.link);

function categoriaInfo(valor) {
  return (
    CONFIG.categorias.find((c) => c.valor === valor) || {
      valor,
      nome: valor,
      descricao: "",
      emoji: E.atendimento,
    }
  );
}

function gerarCodigo() {
  const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let codigo = "";
  for (let i = 0; i < 4; i++) codigo += letras[Math.floor(Math.random() * letras.length)];
  return codigo + Math.floor(1000 + Math.random() * 9000);
}

async function getConfigs(guildId) {
  const doc = await db.collection("guilds").doc(guildId).get();
  return doc.exists ? doc.data() : {};
}

function cargosDoTicket(configs, categoria) {
  const gerais = configs.supportRoles || [];
  const daCategoria = (configs.categoryRoles && configs.categoryRoles[categoria]) || [];
  return {
    acesso: [...new Set([...gerais, ...daCategoria])],
    mencionar: daCategoria.length ? daCategoria : gerais,
  };
}

function isStaff(interaction, configs, categoria) {
  if (interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) return true;
  const { acesso } = cargosDoTicket(configs, categoria);
  const roles = interaction.member?.roles;
  const ids = roles?.cache ? [...roles.cache.keys()] : roles || [];
  return ids.some((id) => acesso.includes(id));
}

function imagensDoServidor(guild, configs) {
  const banner = guild.bannerURL({ size: 1024, extension: "png" });
  const painel = [configs.imagemPainel, CONFIG.imagens.painel, banner].find(urlValida) || null;
  return {
    painel,
    fechamento: [configs.imagemFechamento, CONFIG.imagens.fechamento, painel].find(urlValida) || null,
    thumbnail: [
      configs.thumbnail,
      CONFIG.imagens.thumbnail,
      guild.iconURL({ size: 256, extension: "png" }),
      client.user.displayAvatarURL({ size: 256, extension: "png" }),
    ].find(urlValida),
  };
}

async function ticketAberto(guild, userId) {
  const snap = await db
    .collection("tickets")
    .where("guildId", "==", guild.id)
    .where("userId", "==", userId)
    .where("status", "==", "aberto")
    .get();
  for (const doc of snap.docs) {
    const canal = guild.channels.cache.get(doc.id) || (await guild.channels.fetch(doc.id).catch(() => null));
    if (canal) return canal.id;
    await doc.ref.update({ status: "fechado" }).catch(() => {});
  }
  return null;
}

function montarPainel(guild, configs) {
  const P = CONFIG.painel;
  const { painel } = imagensDoServidor(guild, configs);

  const menu = new StringSelectMenuBuilder()
    .setCustomId("selecionar_categoria")
    .setPlaceholder(P.placeholder)
    .addOptions(
      CONFIG.categorias.map((c) => {
        const op = new StringSelectMenuOptionBuilder().setLabel(c.nome).setValue(c.valor);
        if (c.descricao) op.setDescription(c.descricao);
        if (c.emoji) op.setEmoji(c.emoji);
        return op;
      })
    );

  const c = container().addTextDisplayComponents(
    texto(`### ${E.atendimento} ${P.titulo}\n${P.texto}\n\n> ${P.citacao}`)
  );
  if (painel) c.addMediaGalleryComponents(galeria(painel));
  c.addActionRowComponents(linha(menu));
  c.addTextDisplayComponents(rodape(guild));
  return c;
}

function menuAcoes() {
  const op = (label, descricao, emoji, valor) =>
    new StringSelectMenuOptionBuilder().setLabel(label).setDescription(descricao).setEmoji(emoji).setValue(valor);

  return new StringSelectMenuBuilder()
    .setCustomId("acoes_ticket")
    .setPlaceholder("Selecione uma ação para o ticket")
    .addOptions(
      op("Adicionar Usuário", "Adiciona um usuário ao ticket", E.addUser, "add_user"),
      op("Remover Usuário", "Remove um usuário do ticket", E.remUser, "rem_user"),
      op("Criar Call", "Cria um canal de voz vinculado ao ticket", E.call, "create_call"),
      op("Pokear", "Envia uma notificação ao autor do ticket", E.poke, "poke"),
      op("Finalizar Ticket", "Finaliza e fecha o ticket", E.finalizar, "finalizar")
    );
}

function montarMensagemTicket(guild, configs, ticket) {
  const cat = categoriaInfo(ticket.categoria);
  const mencionar = cargosDoTicket(configs, ticket.categoria).mencionar.filter((id) => guild.roles.cache.has(id));
  const { thumbnail } = imagensDoServidor(guild, configs);
  const motivo = ticket.motivo.length > 3000 ? ticket.motivo.slice(0, 2997) + "..." : ticket.motivo;

  const secao = new SectionBuilder()
    .addTextDisplayComponents(
      texto(`## ${E.verificado} Ticket Aberto por <@${ticket.userId}>`),
      texto(`**Categoria:**\n${cat.nome}\n\n**Motivo do Ticket:**\n${motivo}`)
    )
    .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnail));
  if (mencionar.length) secao.addTextDisplayComponents(texto(`> ${mencionar.map((r) => `<@&${r}>`).join(" ")}`));

  return container()
    .addSectionComponents(secao)
    .addSeparatorComponents(separador())
    .addActionRowComponents(linha(menuAcoes()))
    .addTextDisplayComponents(rodape(guild));
}

async function resetarMenu(interaction, configs, ticket) {
  try {
    if (interaction.message.flags.has(MessageFlags.IsComponentsV2) && ticket && typeof ticket.motivo === "string") {
      await interaction.message.edit({
        components: [montarMensagemTicket(interaction.guild, configs, ticket)],
        allowedMentions: { parse: [] },
      });
    } else {
      await interaction.message.edit({ components: interaction.message.components });
    }
  } catch (err) {
    console.error("Erro ao resetar o menu:", err);
  }
}

async function enviarComHistorico(destino, transcript, montar) {
  if (!transcript) {
    await destino.send({ flags: V2, components: [montar(null)], allowedMentions: { parse: [] } });
    return null;
  }
  const msg = await destino.send({
    flags: V2,
    components: [montar(null)],
    files: [transcript],
    allowedMentions: { parse: [] },
  });
  const url = msg.attachments.first()?.url || null;
  if (url) await msg.edit({ components: [montar(url)] });
  return url;
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Message, Partials.Channel],
  allowedMentions: { parse: [] },
});

client.once(Events.ClientReady, async () => {
  const sendTicket = new SlashCommandBuilder()
    .setName("send-ticket")
    .setDescription("Cria o painel de tickets no canal atual")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator);

  const configTicket = new SlashCommandBuilder()
    .setName("config-ticket")
    .setDescription("Configura o sistema de tickets (sem opções = mostra a configuração atual)")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addChannelOption((o) =>
      o
        .setName("logs")
        .setDescription("Canal onde os históricos dos tickets serão enviados")
        .addChannelTypes(ChannelType.GuildText)
    )
    .addBooleanOption((o) => o.setName("logs-ativos").setDescription("Habilitar ou desabilitar as logs"))
    .addChannelOption((o) =>
      o
        .setName("categoria")
        .setDescription("Categoria onde os canais de ticket serão criados")
        .addChannelTypes(ChannelType.GuildCategory)
    )
    .addStringOption((o) =>
      o.setName("imagem-painel").setDescription('URL da imagem do painel (PNG, JPG ou GIF) — "remover" para tirar')
    )
    .addStringOption((o) =>
      o.setName("imagem-fechamento").setDescription('URL da imagem da DM de ticket finalizado — "remover" para tirar')
    )
    .addStringOption((o) =>
      o.setName("thumbnail").setDescription('URL da miniatura do ticket aberto — "remover" para tirar')
    );

  const escolhasCategoria = CONFIG.categorias.map((c) => ({ name: c.nome, value: c.valor }));
  const cargosTicket = new SlashCommandBuilder()
    .setName("cargos-ticket")
    .setDescription("Adiciona ou remove cargos que podem ver os tickets (Apenas Admins)")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addSubcommand((s) =>
      s
        .setName("adicionar")
        .setDescription("Adiciona um cargo à lista de suporte")
        .addRoleOption((o) => o.setName("cargo").setDescription("Cargo que terá acesso").setRequired(true))
        .addStringOption((o) =>
          o
            .setName("categoria")
            .setDescription("Só para esta categoria (vazio = todas)")
            .addChoices(...escolhasCategoria)
        )
    )
    .addSubcommand((s) =>
      s
        .setName("remover")
        .setDescription("Remove um cargo da lista de suporte")
        .addRoleOption((o) => o.setName("cargo").setDescription("Cargo que perderá o acesso").setRequired(true))
        .addStringOption((o) =>
          o
            .setName("categoria")
            .setDescription("Remover só desta categoria (vazio = lista geral)")
            .addChoices(...escolhasCategoria)
        )
    );

  const contato = new SlashCommandBuilder()
    .setName("contato")
    .setDescription("Entre em contato com o desenvolvedor do bot");

  await client.application.commands.set([sendTicket, configTicket, cargosTicket, contato]);
  console.log(`Bot online como ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) return await tratarComando(interaction);
    if (interaction.isStringSelectMenu() && interaction.customId === "selecionar_categoria")
      return await tratarEscolhaCategoria(interaction);
    if (interaction.isModalSubmit() && interaction.customId.startsWith("modal_motivo_"))
      return await tratarAberturaTicket(interaction);
    if (interaction.isStringSelectMenu() && interaction.customId === "acoes_ticket")
      return await tratarAcaoTicket(interaction);
    if (interaction.isUserSelectMenu() && ["ticket_add_user", "ticket_rem_user"].includes(interaction.customId))
      return await tratarSelecaoUsuario(interaction);
  } catch (err) {
    console.error(err);
    if (!interaction.isRepliable()) return;
    const aviso = { content: `${E.erro} Ocorreu um erro ao processar esta ação.`, flags: MessageFlags.Ephemeral };
    if (interaction.deferred || interaction.replied) await interaction.followUp(aviso).catch(() => {});
    else await interaction.reply(aviso).catch(() => {});
  }
});

async function tratarComando(interaction) {
  const { commandName, guild } = interaction;

  if (commandName === "send-ticket") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const configs = await getConfigs(guild.id);
    await interaction.channel.send({ flags: V2, components: [montarPainel(guild, configs)] });
    await db.collection("guilds").doc(guild.id).set({ panelChannel: interaction.channel.id }, { merge: true });
    return interaction.editReply(`${E.sucesso} Sistema de ticket criado com sucesso!`);
  }

  if (commandName === "config-ticket") {
    const opt = interaction.options;
    const ref = db.collection("guilds").doc(guild.id);
    const updates = {};

    const logs = opt.getChannel("logs");
    if (logs) updates.logsChannel = logs.id;
    const logsAtivos = opt.getBoolean("logs-ativos");
    if (logsAtivos !== null) updates.logsAtivos = logsAtivos;
    const categoria = opt.getChannel("categoria");
    if (categoria) updates.categoryChannel = categoria.id;

    for (const [opcao, campo] of [
      ["imagem-painel", "imagemPainel"],
      ["imagem-fechamento", "imagemFechamento"],
      ["thumbnail", "thumbnail"],
    ]) {
      const valor = opt.getString(opcao);
      if (valor === null) continue;
      if (valor.trim().toLowerCase() === "remover") updates[campo] = FieldValue.delete();
      else if (urlValida(valor)) updates[campo] = valor.trim();
      else
        return interaction.reply({
          content: `${E.erro} A opção \`${opcao}\` precisa ser um link começando com http:// ou https://`,
          flags: MessageFlags.Ephemeral,
        });
    }

    if (Object.keys(updates).length) await ref.set(updates, { merge: true });
    const c = await getConfigs(guild.id);

    const cargos = (lista) => (lista && lista.length ? lista.map((r) => `<@&${r}>`).join(", ") : "Nenhum");
    const linhasCategorias = CONFIG.categorias
      .map((cat) => `**Cargos — ${cat.nome}:** ${cargos(c.categoryRoles && c.categoryRoles[cat.valor])}`)
      .join("\n");

    const resumo = [
      `### ${E.config} Configurações do Ticket`,
      `**Histórico dos tickets:** ${c.logsChannel ? `<#${c.logsChannel}>` : "Não definido"} (${
        c.logsAtivos === false ? "desativado" : "ativado"
      })`,
      `**Categoria dos canais:** ${c.categoryChannel ? `<#${c.categoryChannel}>` : "Nenhuma"}`,
      `**Cargos (todas as categorias):** ${cargos(c.supportRoles)}`,
      linhasCategorias,
      `**Imagem do painel:** ${c.imagemPainel || "Padrão"}`,
      `**Imagem do fechamento:** ${c.imagemFechamento || "Padrão"}`,
      `**Miniatura:** ${c.thumbnail || "Padrão (ícone do servidor)"}`,
    ].join("\n");

    return interaction.reply({ flags: V2_EFEMERO, components: [caixa(resumo)] });
  }

  if (commandName === "cargos-ticket") {
    const sub = interaction.options.getSubcommand();
    const cargo = interaction.options.getRole("cargo");
    const categoria = interaction.options.getString("categoria");
    const ref = db.collection("guilds").doc(guild.id);
    const op = sub === "adicionar" ? FieldValue.arrayUnion(cargo.id) : FieldValue.arrayRemove(cargo.id);

    if (categoria) await ref.set({ categoryRoles: { [categoria]: op } }, { merge: true });
    else await ref.set({ supportRoles: op }, { merge: true });

    const onde = categoria ? ` de **${categoriaInfo(categoria).nome}**` : "";
    return interaction.reply({
      content:
        sub === "adicionar"
          ? `${E.sucesso} O cargo ${cargo} foi adicionado e agora pode ver os novos tickets${onde}!`
          : `${E.sucesso} O cargo ${cargo} foi removido e não verá mais os novos tickets${onde}!`,
      flags: MessageFlags.Ephemeral,
    });
  }

  if (commandName === "contato") {
    const embedContato = new EmbedBuilder()
      .setColor("#5865F2")
      .setAuthor({ name: "Anthonny Michael", iconURL: URL_FOTO_DEV })
      .setTitle("Entre em Contato com o Desenvolvedor")
      .setDescription("Olá! Sou o Anthonny Michael, desenvolvedor deste bot.")
      .setThumbnail(URL_FOTO_DEV)
      .addFields(
        { name: "Sobre Mim", value: "Sou um desenvolvedor apaixonado por tecnologia e automação.", inline: false },
        { name: "Redes Sociais", value: "Clique nos botões abaixo para me seguir e acompanhar meu trabalho!", inline: false }
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("Instagram").setStyle(ButtonStyle.Link).setURL("https://www.instagram.com/_ofcanthonny_santos__/").setEmoji("📸"),
      new ButtonBuilder().setLabel("TikTok").setStyle(ButtonStyle.Link).setURL("https://www.tiktok.com/@anthonny_secbr").setEmoji("🎵"),
      new ButtonBuilder().setLabel("LinkedIn").setStyle(ButtonStyle.Link).setURL("https://www.linkedin.com/in/anthonny-michael/").setEmoji("💼"),
      new ButtonBuilder().setLabel("GitHub").setStyle(ButtonStyle.Link).setURL("https://github.com/Antonizinhobr").setEmoji("🐙")
    );
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("Discord").setStyle(ButtonStyle.Link).setURL("https://discord.com/users/anthonnybrbr").setEmoji("💬")
    );

    return interaction.reply({ embeds: [embedContato], components: [row, row2], flags: MessageFlags.Ephemeral });
  }
}

async function tratarEscolhaCategoria(interaction) {
  const categoria = interaction.values[0];

  const aberto = await Promise.race([
    ticketAberto(interaction.guild, interaction.user.id).catch(() => null),
    new Promise((r) => setTimeout(() => r(null), 1500)),
  ]);
  if (aberto) {
    return interaction.reply({
      content: `${E.erro} Você já possui um ticket aberto: <#${aberto}>`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const modal = new ModalBuilder().setCustomId(`modal_motivo_${categoria}`).setTitle("Abrir Ticket - Motivo");
  const motivoInput = new TextInputBuilder()
    .setCustomId("motivo_texto")
    .setLabel("Descreva o motivo do seu ticket")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Ex: Estou com um problema de acesso...")
    .setMaxLength(4000)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(motivoInput));
  await interaction.showModal(modal);
}

async function tratarAberturaTicket(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const { guild, user } = interaction;
  const categoria = interaction.customId.slice("modal_motivo_".length);
  const motivo = interaction.fields.getTextInputValue("motivo_texto");
  const cat = categoriaInfo(categoria);

  const aberto = await ticketAberto(guild, user.id);
  if (aberto) return interaction.editReply(`${E.erro} Você já possui um ticket aberto: <#${aberto}>`);

  const configs = await getConfigs(guild.id);
  const { acesso, mencionar } = cargosDoTicket(configs, categoria);
  const P = PermissionsBitField.Flags;
  const permissoesMembro = [P.ViewChannel, P.SendMessages, P.AttachFiles, P.EmbedLinks, P.ReadMessageHistory];

  const permissoesCanal = [
    { id: guild.id, deny: [P.ViewChannel] },
    { id: user.id, allow: permissoesMembro },
    {
      id: client.user.id,
      allow: [...permissoesMembro, P.ManageChannels, P.ManageMessages],
    },
    ...acesso.filter((id) => guild.roles.cache.has(id)).map((id) => ({ id, allow: permissoesMembro })),
  ];

  let parent = null;
  if (configs.categoryChannel) {
    const categoriaCanal = guild.channels.cache.get(configs.categoryChannel);
    if (categoriaCanal?.type === ChannelType.GuildCategory) parent = categoriaCanal.id;
  }

  const codigo = gerarCodigo();
  const channel = await guild.channels.create({
    name: `${CONFIG.prefixoCanal}${user.username}`,
    type: ChannelType.GuildText,
    parent,
    topic: `${user.id}|${codigo}|${cat.nome.toLowerCase().replace(/\s+/g, "_")}`,
    permissionOverwrites: permissoesCanal,
  });

  const ticket = {
    userId: user.id,
    guildId: guild.id,
    status: "aberto",
    categoria,
    motivo,
    codigo,
    openedAt: new Date(),
  };
  const ticketRef = db.collection("tickets").doc(channel.id);
  await ticketRef.set(ticket);

  const msgTicket = await channel.send({
    flags: V2,
    components: [montarMensagemTicket(guild, configs, ticket)],
    allowedMentions: { users: [user.id], roles: mencionar.filter((id) => guild.roles.cache.has(id)) },
  });
  await msgTicket.pin().catch(() => {});

  await channel.send({
    flags: V2,
    components: [caixa("**Nossa equipe está ciente da sua necessidade. Por favor, aguarde ser atendido!**")],
  });

  await ticketRef.update({ mensagemId: msgTicket.id }).catch(() => {});

  await interaction.editReply({
    content: `${E.sucesso} Seu ticket foi criado com sucesso: <#${channel.id}>`,
    components: [linha(botaoLink("Ir para o ticket", channel.url))],
  });
}

async function tratarAcaoTicket(interaction) {
  const acao = interaction.values[0];
  const { guild, channel } = interaction;
  const configs = await getConfigs(guild.id);
  const ticketRef = db.collection("tickets").doc(channel.id);
  const snap = await ticketRef.get();
  const ticket = snap.exists ? snap.data() : null;
  const resetar = () => resetarMenu(interaction, configs, ticket);

  if (!ticket) {
    await interaction.reply({
      content: `${E.erro} Não encontrei este ticket no banco de dados.`,
      flags: MessageFlags.Ephemeral,
    });
    return resetar();
  }

  if (!isStaff(interaction, configs, ticket.categoria)) {
    await interaction.reply({ content: `${E.erro} Apenas a equipe pode usar este menu.`, flags: MessageFlags.Ephemeral });
    return resetar();
  }

  if (acao === "add_user" || acao === "rem_user") {
    const adicionar = acao === "add_user";
    const menu = new UserSelectMenuBuilder()
      .setCustomId(adicionar ? "ticket_add_user" : "ticket_rem_user")
      .setPlaceholder(adicionar ? "Selecione o usuário para adicionar" : "Selecione o usuário para remover")
      .setMinValues(1)
      .setMaxValues(1);

    await interaction.reply({
      flags: V2_EFEMERO,
      components: [
        container()
          .addTextDisplayComponents(
            texto(
              adicionar
                ? `### ${E.addUser} Adicionar Usuário\nSelecione abaixo o usuário que deseja adicionar ao ticket.`
                : `### ${E.remUser} Remover Usuário\nSelecione abaixo o usuário que deseja remover do ticket.`
            )
          )
          .addActionRowComponents(linha(menu)),
      ],
    });
    return resetar();
  }

  if (acao === "create_call") {
    if (ticket.callId) {
      const existente =
        guild.channels.cache.get(ticket.callId) || (await guild.channels.fetch(ticket.callId).catch(() => null));
      if (existente) {
        await interaction.reply({
          content: `${E.erro} Este ticket já possui uma call: <#${existente.id}>`,
          flags: MessageFlags.Ephemeral,
        });
        return resetar();
      }
    }

    await interaction.deferReply();
    await resetar();

    const P = PermissionsBitField.Flags;
    const dono = await client.users.fetch(ticket.userId).catch(() => null);
    const overwrites = channel.permissionOverwrites.cache.map((ow) => {
      if (ow.id === guild.id) return { id: ow.id, type: ow.type, deny: [P.ViewChannel, P.Connect] };
      if (ow.id === client.user.id)
        return { id: ow.id, type: ow.type, allow: [P.ViewChannel, P.Connect, P.Speak, P.ManageChannels] };
      if (ow.allow.has(P.ViewChannel))
        return { id: ow.id, type: ow.type, allow: [P.ViewChannel, P.Connect, P.Speak, P.Stream, P.UseVAD] };
      return { id: ow.id, type: ow.type, allow: ow.allow, deny: ow.deny };
    });

    const call = await guild.channels.create({
      name: `${CONFIG.prefixoCall}${dono ? dono.username : "call"}`,
      type: ChannelType.GuildVoice,
      parent: channel.parentId,
      permissionOverwrites: overwrites,
    });
    await ticketRef.update({ callId: call.id });

    return interaction.editReply({
      flags: V2,
      components: [caixa(`${E.call} Call do ticket criada com sucesso: <#${call.id}>`)],
    });
  }

  if (acao === "poke") {
    await interaction.reply({
      flags: V2,
      components: [caixa(`${E.poke} <@${ticket.userId}>, a equipe está aguardando seu retorno neste ticket!`)],
      allowedMentions: { users: [ticket.userId] },
    });
    await resetar();

    const dono = await client.users.fetch(ticket.userId).catch(() => null);
    if (dono) {
      await dono
        .send({
          flags: V2,
          components: [
            container()
              .addTextDisplayComponents(
                texto(
                  `## ${E.poke} Você foi notificado\nOlá, **${dono.globalName || dono.username}**. A equipe da **${nomeMarca(
                    guild
                  )}** está aguardando o seu retorno no seu ticket.`
                )
              )
              .addActionRowComponents(linha(botaoLink("Ir para o ticket", channel.url)))
              .addSeparatorComponents(separador())
              .addTextDisplayComponents(rodape(guild)),
          ],
        })
        .catch(() => {});
    }
    return;
  }

  if (acao === "finalizar") {
    if (fechando.has(channel.id)) {
      await interaction.reply({
        content: `${E.erro} Este ticket já está sendo finalizado.`,
        flags: MessageFlags.Ephemeral,
      });
      return resetar();
    }
    fechando.add(channel.id);
    const inicio = Date.now();

    await interaction.reply({
      flags: V2,
      components: [
        caixa(
          `## ${E.aviso} Fechamento do Ticket\n${E.relogio} Este ticket será fechado em \`${CONFIG.segundosParaFechar}\` segundos...`
        ),
      ],
    });
    await resetar();

    try {
      await finalizarTicket({ guild, channel, configs, ticket, ticketRef, fechadoPor: interaction.user });
    } catch (err) {
      console.error("Erro ao finalizar ticket:", err);
    }

    const restante = CONFIG.segundosParaFechar * 1000 - (Date.now() - inicio);
    setTimeout(() => {
      channel.delete().catch(() => {});
      fechando.delete(channel.id);
    }, Math.max(0, restante));
  }
}

async function finalizarTicket({ guild, channel, configs, ticket, ticketRef, fechadoPor }) {
  const dono = await client.users.fetch(ticket.userId).catch(() => null);
  const nomeUsuario = dono ? dono.username : ticket.userId;
  const imagens = imagensDoServidor(guild, configs);

  let transcript = null;
  try {
    const nomeArquivo = `transcript-${nomeUsuario.replace(/[^a-z0-9_-]/gi, "") || "ticket"}-${
      ticket.codigo || channel.id
    }.html`;
    transcript = await discordTranscripts.createTranscript(channel, {
      limit: -1,
      filename: nomeArquivo,
      saveImages: true,
      poweredBy: false,
    });
  } catch (err) {
    console.error("Erro ao gerar transcript:", err);
  }

  let urlHistorico = null;
  if (configs.logsAtivos !== false && configs.logsChannel) {
    const logs = await guild.channels.fetch(configs.logsChannel).catch(() => null);
    if (logs?.isTextBased()) {
      const textoLog = `${E.sucesso} **TICKET** de ${nomeUsuario} \`${ticket.userId}\` foi finalizado.`;
      urlHistorico = await enviarComHistorico(logs, transcript, (url) => {
        const c = caixa(textoLog);
        if (url) c.addActionRowComponents(linha(botaoHistorico(url)));
        return c;
      }).catch((err) => {
        console.error("Erro ao enviar log:", err);
        return null;
      });
    }
  }

  if (dono) {
    const montarDM = (url) => {
      const c = container().addTextDisplayComponents(
        texto(
          `## ${E.sucesso} Ticket Finalizado\nOlá, **${
            dono.globalName || dono.username
          }**. Passando para te informar que o seu ticket foi fechado na **${nomeMarca(guild)}**.`
        )
      );
      if (imagens.fechamento) c.addMediaGalleryComponents(galeria(imagens.fechamento));
      if (url) c.addActionRowComponents(linha(botaoHistorico(url)));
      c.addSeparatorComponents(separador()).addTextDisplayComponents(rodape(guild));
      return c;
    };

    try {
      if (urlHistorico || !transcript) {
        await dono.send({ flags: V2, components: [montarDM(urlHistorico)] });
      } else {
        const dm = await dono.createDM();
        urlHistorico = await enviarComHistorico(dm, transcript, montarDM);
      }
    } catch {
    }
  }

  await ticketRef
    .update({ status: "fechado", closedAt: new Date(), closedBy: fechadoPor.id, transcriptUrl: urlHistorico })
    .catch(() => {});

  if (ticket.callId) {
    const call = guild.channels.cache.get(ticket.callId);
    if (call) await call.delete().catch(() => {});
  }
}

async function tratarSelecaoUsuario(interaction) {
  const adicionar = interaction.customId === "ticket_add_user";
  const { guild, channel } = interaction;
  const configs = await getConfigs(guild.id);
  const ticketRef = db.collection("tickets").doc(channel.id);
  const snap = await ticketRef.get();
  const ticket = snap.exists ? snap.data() : null;

  const responder = (conteudo) => interaction.update({ components: [caixa(conteudo)] });

  if (!ticket || ticket.status !== "aberto") return responder(`${E.erro} Este ticket não está mais aberto.`);
  if (!isStaff(interaction, configs, ticket.categoria))
    return responder(`${E.erro} Apenas a equipe pode usar este menu.`);

  const alvo = interaction.users.get(interaction.values[0]);
  if (!alvo) return responder(`${E.erro} Usuário não encontrado.`);
  if (alvo.bot) return responder(`${E.erro} Não é possível selecionar um bot.`);

  const P = PermissionsBitField.Flags;
  const call = ticket.callId ? guild.channels.cache.get(ticket.callId) : null;

  if (adicionar) {
    await channel.permissionOverwrites.edit(alvo.id, {
      ViewChannel: true,
      SendMessages: true,
      AttachFiles: true,
      EmbedLinks: true,
      ReadMessageHistory: true,
    });
    if (call) await call.permissionOverwrites.edit(alvo.id, { ViewChannel: true, Connect: true, Speak: true }).catch(() => {});

    await responder(`${E.sucesso} ${alvo} foi adicionado ao ticket.`);
    return channel.send({
      flags: V2,
      components: [caixa(`${E.addUser} ${alvo} foi adicionado ao ticket por ${interaction.user}.`)],
      allowedMentions: { users: [alvo.id] },
    });
  }

  if (alvo.id === ticket.userId) return responder(`${E.erro} Não é possível remover o autor do ticket.`);
  if (!channel.permissionOverwrites.cache.has(alvo.id))
    return responder(`${E.erro} ${alvo} não foi adicionado manualmente a este ticket.`);

  await channel.permissionOverwrites.delete(alvo.id);
  if (call) await call.permissionOverwrites.delete(alvo.id).catch(() => {});

  await responder(`${E.sucesso} ${alvo} foi removido do ticket.`);
  return channel.send({
    flags: V2,
    components: [caixa(`${E.remUser} ${alvo} foi removido do ticket por ${interaction.user}.`)],
  });
}

client.on(Events.ChannelDelete, async (channel) => {
  if (!channel.guild || channel.type !== ChannelType.GuildText) return;
  try {
    const ref = db.collection("tickets").doc(channel.id);
    const snap = await ref.get();
    if (!snap.exists) return;
    const ticket = snap.data();
    if (ticket.status === "aberto") await ref.update({ status: "fechado", closedAt: new Date() });
    if (ticket.callId) await channel.guild.channels.cache.get(ticket.callId)?.delete().catch(() => {});
  } catch (err) {
    console.error(err);
  }
});

client.login(process.env.DISCORD_TOKEN);