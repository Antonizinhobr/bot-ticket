require("dotenv").config();
const {
  Client,
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
  StringSelectMenuOptionBuilder
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

const CREDITO_BOT = 'Bot desenvolvido por Anthonny Michael, entre em contato com o comando "/contato".';
const CREDITO_TEXTO = '\n\n*Bot desenvolvido por Anthonny Michael, entre em contato com o comando "/contato".*';
const URL_FOTO_DEV = "https://avatars.githubusercontent.com/Antonizinhobr";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel],
});

client.once("ready", async () => {
  const setupCommand = new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Configura os canais do sistema de tickets (Apenas Admins)")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addChannelOption((option) =>
      option.setName("painel").setDescription("Canal onde ficará o botão de abrir ticket").setRequired(true)
    )
    .addChannelOption((option) =>
      option.setName("admin").setDescription("Canal onde os admins receberão os alertas de novos tickets").setRequired(true)
    )
    .addChannelOption((option) =>
      option.setName("logs").setDescription("Canal onde os históricos (transcripts) serão salvos").setRequired(true)
    );

  const contatoCommand = new SlashCommandBuilder()
    .setName("contato")
    .setDescription("Entre em contato com o desenvolvedor do bot");

  const cargosCommand = new SlashCommandBuilder()
    .setName("cargos-ticket")
    .setDescription("Adiciona ou remove cargos que podem ver os tickets (Apenas Admins)")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addSubcommand((subcommand) =>
      subcommand.setName("adicionar").setDescription("Adiciona um cargo à lista de suporte").addRoleOption((option) =>
          option.setName("cargo").setDescription("Cargo que terá acesso").setRequired(true)
      )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("remover").setDescription("Remove um cargo da lista de suporte").addRoleOption((option) =>
          option.setName("cargo").setDescription("Cargo que perderá o acesso").setRequired(true)
      )
    );

  await client.application.commands.create(setupCommand);
  await client.application.commands.create(contatoCommand);
  await client.application.commands.create(cargosCommand);
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "setup") {
      if (!interaction.guild) {
        return interaction.reply({
          content: "Este comando só pode ser usado dentro de um servidor!" + CREDITO_TEXTO,
          ephemeral: true,
        });
      }

      const canalPainel = interaction.options.getChannel("painel");
      const canalAdmin = interaction.options.getChannel("admin");
      const canalLogs = interaction.options.getChannel("logs");

      await db.collection("guilds").doc(interaction.guild.id).set(
        {
          panelChannel: canalPainel.id,
          adminChannel: canalAdmin.id,
          logsChannel: canalLogs.id,
        },
        { merge: true }
      );

      const embed = new EmbedBuilder()
        .setTitle("Canal de Atendimento")
        .setDescription("Para receber SUPORTE, tirar DÚVIDAS ou realizar uma COMPRA, por favor, selecione uma das opções no menu abaixo.\n\nNossa equipe está pronta para ajudar assim que possível.")
        .setColor("#2ECC71")
        .setFooter({ text: `${CREDITO_BOT}`, iconURL: URL_FOTO_DEV });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("selecionar_categoria")
        .setPlaceholder("Selecione a categoria do ticket")
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel("Solicitação de Atendimento").setDescription("Está com dúvidas? Receba suporte da nossa equipe.").setEmoji("💬").setValue("atendimento"),
          new StringSelectMenuOptionBuilder().setLabel("Solicitação de Parceria").setDescription("Entre em contato para mais informações!").setEmoji("🤝").setValue("parceria")
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);

      await canalPainel.send({ embeds: [embed], components: [row] });

      return interaction.reply({
        content: "Sistema configurado com sucesso! O painel foi enviado." + CREDITO_TEXTO,
        ephemeral: true,
      });
    }

    if (interaction.commandName === "contato") {
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

      return interaction.reply({
        embeds: [embedContato],
        components: [row, row2],
        ephemeral: true,
      });
    }

    if (interaction.commandName === "cargos-ticket") {
      const subcommand = interaction.options.getSubcommand();
      const cargo = interaction.options.getRole("cargo");
      const guildRef = db.collection("guilds").doc(interaction.guild.id);

      const guildDoc = await guildRef.get();
      if (!guildDoc.exists) {
        return interaction.reply({
          content: "Você precisa configurar o sistema primeiro usando o `/setup`." + CREDITO_TEXTO,
          ephemeral: true,
        });
      }

      if (subcommand === "adicionar") {
        await guildRef.update({
          supportRoles: admin.firestore.FieldValue.arrayUnion(cargo.id),
        });
        return interaction.reply({
          content: `O cargo ${cargo} foi adicionado e agora pode ver os novos tickets!`,
          ephemeral: true,
        });
      }

      if (subcommand === "remover") {
        await guildRef.update({
          supportRoles: admin.firestore.FieldValue.arrayRemove(cargo.id),
        });
        return interaction.reply({
          content: `O cargo ${cargo} foi removido e não verá mais os novos tickets!`,
          ephemeral: true,
        });
      }
    }
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "selecionar_categoria") {
    const categoria = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(`modal_motivo_${categoria}`)
      .setTitle("Abrir Ticket - Motivo");

    const motivoInput = new TextInputBuilder()
      .setCustomId("motivo_texto")
      .setLabel("Descreva o motivo do seu ticket *")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Ex: Estou com um problema de acesso...")
      .setMaxLength(1000)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(motivoInput));
    await interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith("modal_motivo_")) {
    await interaction.deferReply({ ephemeral: true });
    
    const categoriaSelecionada = interaction.customId.split("_")[2];
    const motivo = interaction.fields.getTextInputValue("motivo_texto");

    const guildDoc = await db.collection("guilds").doc(interaction.guild.id).get();
    if (!guildDoc.exists) return interaction.editReply("O sistema não está configurado.");
    const configs = guildDoc.data();

    const permissoesCanal = [
      { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] },
      { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] },
    ];

    if (configs.supportRoles && configs.supportRoles.length > 0) {
      for (const roleId of configs.supportRoles) {
        permissoesCanal.push({
          id: roleId,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        });
      }
    }

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: permissoesCanal,
    });

    await db.collection("tickets").doc(channel.id).set({
      userId: interaction.user.id,
      guildId: interaction.guild.id,
      status: "aberto",
      categoria: categoriaSelecionada,
      openedAt: new Date(),
    });

    const acoesStaff = new StringSelectMenuBuilder()
      .setCustomId("acoes_ticket")
      .setPlaceholder("Selecione uma ação para o ticket")
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel("Adicionar Usuário").setEmoji("👤").setValue("add_user"),
        new StringSelectMenuOptionBuilder().setLabel("Remover Usuário").setEmoji("🗑️").setValue("rem_user"),
        new StringSelectMenuOptionBuilder().setLabel("Criar Call").setEmoji("📞").setValue("create_call"),
        new StringSelectMenuOptionBuilder().setLabel("Pokear").setEmoji("🔔").setValue("poke"),
        new StringSelectMenuOptionBuilder().setLabel("Finalizar Ticket").setEmoji("🚨").setValue("finalizar")
      );

    const embedTicket = new EmbedBuilder()
      .setTitle(`Ticket Aberto por @${interaction.user.username}`)
      .setColor("#2ECC71")
      .addFields(
        { name: "Categoria:", value: categoriaSelecionada === "atendimento" ? "Solicitação de Atendimento" : "Solicitação de Parceria", inline: false },
        { name: "Motivo do Ticket:", value: motivo, inline: false }
      );

    const roleMen = configs.supportRoles && configs.supportRoles.length > 0 ? `<@&${configs.supportRoles[0]}>` : "Equipe";

    await channel.send({ 
      content: `${roleMen} | <@${interaction.user.id}>`, 
      embeds: [embedTicket], 
      components: [new ActionRowBuilder().addComponents(acoesStaff)] 
    });

    await interaction.editReply(`Ticket criado com sucesso em <#${channel.id}>` + CREDITO_TEXTO);
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "acoes_ticket") {
    const acao = interaction.values[0];

    const guildDoc = await db.collection("guilds").doc(interaction.guild.id).get();
    const isStaff = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) || 
                    (guildDoc.data().supportRoles && guildDoc.data().supportRoles.some(r => interaction.member.roles.cache.has(r)));

    if (!isStaff) return interaction.reply({ content: "Apenas a equipe pode usar este menu.", ephemeral: true });

    if (acao === "finalizar") {
      await interaction.reply({ content: "Encerrando o ticket e gerando o histórico..." });

      const ticketDoc = await db.collection("tickets").doc(interaction.channel.id).get();
      const data = ticketDoc.data();
      const configs = guildDoc.data();

      const transcript = await discordTranscripts.createTranscript(
        interaction.channel,
        {
          limit: -1,
          filename: `ticket-${interaction.channel.name}.html`,
          saveImages: true,
        }
      );

      const logs = client.channels.cache.get(configs.logsChannel);
      if (logs) {
        const logMsg = await logs.send({
          files: [transcript],
        });

        const attachmentUrl = logMsg.attachments.first().url;

        const logEmbed = new EmbedBuilder()
          .setTitle("Ticket Finalizado")
          .addFields(
            { name: "Usuário", value: `<@${data.userId}>`, inline: true },
            { name: "Finalizado por", value: `<@${interaction.user.id}>`, inline: true }
          )
          .setColor("#3498DB")
          .setTimestamp();

        const rowButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("Abrir Histórico no Navegador")
            .setStyle(ButtonStyle.Link)
            .setURL(attachmentUrl)
        );

        await logMsg.edit({ embeds: [logEmbed], components: [rowButton] });
      }

      await db.collection("tickets").doc(interaction.channel.id).update({ status: "fechado" });

      const callChannel = interaction.guild.channels.cache.find(c => c.name === `call-${interaction.channel.name}` && c.type === ChannelType.GuildVoice);
      if(callChannel) callChannel.delete().catch(() => {});

      setTimeout(() => interaction.channel.delete().catch(() => {}), 4000);

    } else if (acao === "poke") {
      const data = (await db.collection("tickets").doc(interaction.channel.id).get()).data();
      await interaction.reply({ content: `🔔 <@${data.userId}>, a equipe está aguardando seu retorno neste ticket!` });
    } else if (acao === "create_call") {
      const callChannel = await interaction.guild.channels.create({ 
        name: `call-${interaction.channel.name}`, 
        type: ChannelType.GuildVoice, 
        parent: interaction.channel.parentId, 
        permissionOverwrites: interaction.channel.permissionOverwrites.cache.map(p => ({ id: p.id, allow: p.allow, deny: p.deny })) 
      });
      await interaction.reply({ content: `📞 Canal de voz criado: <#${callChannel.id}>` });
    } else {
      await interaction.reply({ content: `Ação selecionada: ${acao}.`, ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);