require('dotenv').config();
const { 
    Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, 
    ButtonStyle, EmbedBuilder, ChannelType, PermissionsBitField, 
    ModalBuilder, TextInputBuilder, TextInputStyle, SlashCommandBuilder 
} = require('discord.js');
const admin = require('firebase-admin');
const discordTranscripts = require('discord-html-transcripts');

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const CREDITO_BOT = 'Bot desenvolvido por Anthonny Michael, entre em contato com o comando "/contato".';
const CREDITO_TEXTO = '\n\n*Bot desenvolvido por Anthonny Michael, entre em contato com o comando "/contato".*';
const URL_FOTO_DEV = 'https://avatars.githubusercontent.com/Antonizinhobr';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Message, Partials.Channel]
});

client.once('ready', async () => {
    console.log(`✅ Bot online como ${client.user.tag}`);

    const setupCommand = new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Configura os canais do sistema de tickets (Apenas Admins)')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addChannelOption(option => 
            option.setName('painel')
            .setDescription('Canal onde ficará o botão de abrir ticket')
            .setRequired(true))
        .addChannelOption(option => 
            option.setName('admin')
            .setDescription('Canal onde os admins receberão os alertas de novos tickets')
            .setRequired(true))
        .addChannelOption(option => 
            option.setName('logs')
            .setDescription('Canal onde os históricos (transcripts) serão salvos')
            .setRequired(true));

    const contatoCommand = new SlashCommandBuilder()
        .setName('contato')
        .setDescription('📱 Entre em contato com o desenvolvedor do bot');

    await client.application.commands.create(setupCommand);
    await client.application.commands.create(contatoCommand);
});

client.on('interactionCreate', async (interaction) => {
    
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'setup') {
            
            if (!interaction.guild) {
                return interaction.reply({ content: '❌ Este comando só pode ser usado dentro de um servidor!' + CREDITO_TEXTO, ephemeral: true });
            }

            const canalPainel = interaction.options.getChannel('painel');
            const canalAdmin = interaction.options.getChannel('admin');
            const canalLogs = interaction.options.getChannel('logs');

            await db.collection('guilds').doc(interaction.guild.id).set({
                panelChannel: canalPainel.id,
                adminChannel: canalAdmin.id,
                logsChannel: canalLogs.id
            }, { merge: true });

            const embed = new EmbedBuilder()
                .setTitle('🎫 Suporte - Abrir Ticket')
                .setDescription('Clique no botão abaixo para iniciar um atendimento privado.')
                .setColor('#5865F2')
                .setFooter({ text: `${CREDITO_BOT}`, iconURL: URL_FOTO_DEV });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('abrir_ticket')
                    .setLabel('Abrir Ticket')
                    .setEmoji('📩')
                    .setStyle(ButtonStyle.Primary)
            );

            await canalPainel.send({ embeds: [embed], components: [row] });
            
            return interaction.reply({ content: '✅ Sistema configurado com sucesso! O painel foi enviado.' + CREDITO_TEXTO, ephemeral: true });
        }

        if (interaction.commandName === 'contato') {
            const embedContato = new EmbedBuilder()
                .setColor('#5865F2')
                .setAuthor({ name: '👨‍💻 Anthonny Michael', iconURL: URL_FOTO_DEV })
                .setTitle('📱 Entre em Contato com o Desenvolvedor')
                .setDescription('Olá! Sou o **Anthonny Michael**, desenvolvedor deste bot. Fique à vontade para entrar em contato comigo através das minhas redes sociais abaixo, caso tenha algum problema ou dúvida sobre o bot:')
                .setThumbnail(URL_FOTO_DEV)
                .addFields(
                    { 
                        name: '👨‍💻 Sobre Mim', 
                        value: 'Sou um desenvolvedor apaixonado por tecnologia e automação. Este bot foi criado para gerenciar suportes e facilitar a comunicação no seu servidor!',
                        inline: false 
                    },
                    { 
                        name: '📱 Redes Sociais', 
                        value: 'Clique nos botões abaixo para me seguir e acompanhar meu trabalho!',
                        inline: false 
                    }
                )
                .setFooter({ text: CREDITO_BOT, iconURL: URL_FOTO_DEV })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('📸 Instagram')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://www.instagram.com/_ofcanthonny_santos__/')
                        .setEmoji('📸'),
                    new ButtonBuilder()
                        .setLabel('🎵 TikTok')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://www.tiktok.com/@anthonny_secbr')
                        .setEmoji('🎵'),
                    new ButtonBuilder()
                        .setLabel('💼 LinkedIn')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://www.linkedin.com/in/anthonny-michael/')
                        .setEmoji('💼'),
                    new ButtonBuilder()
                        .setLabel('🐙 GitHub')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://github.com/Antonizinhobr')
                        .setEmoji('🐙')
                );

            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('💬 Discord')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://discord.com/users/anthonnybrbr')
                        .setEmoji('💬')
                );

            return interaction.reply({ 
                embeds: [embedContato], 
                components: [row, row2],
                ephemeral: true 
            });
        }
    }

    if (interaction.isButton() && interaction.customId === 'abrir_ticket') {
        await interaction.deferReply({ ephemeral: true });

        const guildDoc = await db.collection('guilds').doc(interaction.guild.id).get();
        if (!guildDoc.exists) return interaction.editReply('❌ O sistema ainda não foi configurado neste servidor. Um administrador precisa usar o `/setup`.' + CREDITO_TEXTO);
        
        const configs = guildDoc.data();

        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] },
                { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] }
            ]
        });

        await db.collection('tickets').doc(channel.id).set({
            userId: interaction.user.id,
            guildId: interaction.guild.id, 
            status: 'pendente',
            openedAt: new Date()
        });

        const adminChannel = client.channels.cache.get(configs.adminChannel);
        if (adminChannel) {
            const adminEmbed = new EmbedBuilder()
                .setTitle('🚨 Novo Ticket Aberto')
                .setDescription(`O usuário <@${interaction.user.id}> solicitou suporte.\nCanal criado: <#${channel.id}>`)
                .setColor('#FEE75C')
                .setFooter({ text: CREDITO_BOT, iconURL: URL_FOTO_DEV });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`assumir_${channel.id}_${interaction.user.id}`)
                    .setLabel('Atender Chamado')
                    .setStyle(ButtonStyle.Success)
            );

            await adminChannel.send({ embeds: [adminEmbed], components: [row] });
        }

        await interaction.editReply(`✅ Ticket criado com sucesso em <#${channel.id}>` + CREDITO_TEXTO);
    }

    if (interaction.isButton() && interaction.customId.startsWith('assumir_')) {
        const [, channelId, userId] = interaction.customId.split('_');
        const channel = client.channels.cache.get(channelId);

        if (!channel) return interaction.reply({ content: '❌ Ticket não encontrado ou já deletado.' + CREDITO_TEXTO, ephemeral: true });

        await channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, SendMessages: true });

        await db.collection('tickets').doc(channelId).update({
            adminId: interaction.user.id,
            status: 'em_atendimento'
        });

        const embed = new EmbedBuilder()
            .setDescription(`O administrador <@${interaction.user.id}> vai atender seu chamado agora.`)
            .setColor('#57F287')
            .setFooter({ text: CREDITO_BOT, iconURL: URL_FOTO_DEV });

        const closeRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('pre_finalizar').setLabel('Finalizar Ticket').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: `<@${userId}>`, embeds: [embed], components: [closeRow] });
        
        await interaction.update({ components: [], embeds: [EmbedBuilder.from(interaction.message.embeds[0]).setColor('Green').setFooter({text: `Atendido por ${interaction.user.tag} | ${CREDITO_BOT}`, iconURL: URL_FOTO_DEV})] });
    }

    if (interaction.isButton() && interaction.customId === 'pre_finalizar') {
        const data = (await db.collection('tickets').doc(interaction.channel.id).get()).data();
        
        if (interaction.user.id !== data.adminId && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Somente o administrador responsável pode fechar este ticket.' + CREDITO_TEXTO, ephemeral: true });
        }

        const evalRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('avaliar').setLabel('Avaliar Atendimento').setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({ content: `<@${data.userId}>, o suporte foi concluído. Por favor, avalie para encerrar e gerar o histórico.${CREDITO_TEXTO}`, components: [evalRow] });
    }

    if (interaction.isButton() && interaction.customId === 'avaliar') {
        const data = (await db.collection('tickets').doc(interaction.channel.id).get()).data();
        if (interaction.user.id !== data.userId) return interaction.reply({ content: '❌ Apenas o usuário dono do ticket pode avaliar.' + CREDITO_TEXTO, ephemeral: true });

        const modal = new ModalBuilder().setCustomId('modal_feedback').setTitle('Avaliação do Suporte');
        const nota = new TextInputBuilder()
            .setCustomId('nota_input')
            .setLabel('De 0 a 10, qual sua nota para o admin?')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(2)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(nota));
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_feedback') {
        await interaction.deferReply();
        const nota = interaction.fields.getTextInputValue('nota_input');
        
        const ticketDoc = await db.collection('tickets').doc(interaction.channel.id).get();
        const data = ticketDoc.data();

        const guildDoc = await db.collection('guilds').doc(data.guildId).get();
        const configs = guildDoc.data();

        const transcript = await discordTranscripts.createTranscript(interaction.channel, {
            limit: -1,
            filename: `ticket-${interaction.channel.name}.html`,
            saveImages: true
        });

        const logs = client.channels.cache.get(configs.logsChannel);
        if (logs) {
            const logEmbed = new EmbedBuilder()
                .setTitle('📈 Ticket Finalizado')
                .addFields(
                    { name: 'Usuário', value: `<@${data.userId}>`, inline: true },
                    { name: 'Atendente', value: `<@${data.adminId}>`, inline: true },
                    { name: 'Nota do Atendimento', value: `⭐ ${nota}/10`, inline: true }
                )
                .setColor('#3498DB')
                .setFooter({ text: CREDITO_BOT, iconURL: URL_FOTO_DEV })
                .setTimestamp();

            await logs.send({ content: '@everyone', embeds: [logEmbed], files: [transcript] });
        }
        
        await db.collection('tickets').doc(interaction.channel.id).update({ status: 'fechado', nota: nota });
        await interaction.editReply('✅ Obrigado! O ticket será encerrado em instantes.' + CREDITO_TEXTO);
        
        setTimeout(() => interaction.channel.delete().catch(() => {}), 4000);
    }
});

client.login(process.env.DISCORD_TOKEN);