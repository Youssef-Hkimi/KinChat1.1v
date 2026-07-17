import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, Message } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('partners')
    .setDescription('Discover all of Kin Chat\'s trusted partners!');

export async function execute(interaction: ChatInputCommandInteraction) {
    const mainEmbed = new EmbedBuilder()
        .setTitle('🤝 Kin Chat Trusted Partners')
        .setDescription('Kin Chat is proud to be partnered with some amazing projects. Click the buttons below to learn more about our trusted partners!')
        .setColor('#2b2d31')
        .addFields(
            { name: '🌟 Our Partners', value: 'Discover the great bots and communities we work with!' }
        )
        .setThumbnail(interaction.client.user?.displayAvatarURL() || null)
        .setFooter({ text: 'Kin Chat Partners', iconURL: interaction.client.user?.displayAvatarURL() });

    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('partner_kamii')
                .setLabel('Kamii Bot')
                .setEmoji('<:kamii:1527611919425343558>')
                .setStyle(ButtonStyle.Primary)
        );

    // Initial reply is EPHEMERAL (Private and invisible to others)
    await interaction.reply({ embeds: [mainEmbed], components: [row], ephemeral: true });

    // Listen for button clicks in the channel by this user
    const filter = (i: any) => i.user.id === interaction.user.id;
    const collector = interaction.channel?.createMessageComponentCollector({ filter, time: 300000 });
    
    if (!collector) return;

    let publicMsg: Message | null = null;

    collector.on('collect', async i => {
        if (i.customId === 'partner_kamii') {
            const kamiiEmbed = new EmbedBuilder()
                .setTitle('Kamii Bot')
                .setDescription(`Kamii is an all in one easy to use security bot for discord. \nWith lots of features\n\n**Website:** **https://sakurakamii.cc/**\n**Support Server:** **https://discord.gg/mXvC5zmptZ**`)
                .setColor('#8B0000') // Dark red to match Kamii icon
                .setThumbnail('https://cdn.discordapp.com/emojis/1527611919425343558.webp?size=128&quality=lossless')
                .addFields(
                    { name: '🔔 Sekur-Noti', value: 'Be part of a web of servers helping each other to remain safe. Receive security alerts, get notified when troublemakers join your server - Its all Sekur-Noti is about' },
                    { name: '⏱️ Tracenime', value: 'Find the exact anime, season, episode and timestamp from just a screenshot!' },
                    { name: '🎟️ Accessibility', value: 'Kamii supports multiple languages such as Spanish and Hindi making it more accessible for everyone.' },
                    { name: '🌍 Customizability', value: 'You can customize practically anything in Kamii. Use our web panel to make this process 10x easier!' }
                )
                .setFooter({ text: 'Kin Chat x Kamii Bot Partner' });

            const backRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('partner_back')
                        .setLabel('Back to Partners')
                        .setStyle(ButtonStyle.Secondary)
                );

            await i.deferUpdate();
            
            // Try to delete the previous ephemeral reply to clear the screen
            try { await interaction.deleteReply(); } catch(e) {}

            // Send the public ad in the channel. 
            // We put the TopGG link in the content so Discord renders the "weblink image thumbnail" automatically below the embed.
            publicMsg = await (i.channel as any).send({ 
                content: `<@${i.user.id}> is viewing our partner **Kamii Bot**!\n**TopGG:** https://top.gg/bot/1487082333415673967`,
                embeds: [kamiiEmbed], 
                components: [backRow] 
            });

        } else if (i.customId === 'partner_back') {
            await i.deferUpdate();
            
            // Delete the public ad
            if (publicMsg) {
                try { await publicMsg.delete(); } catch(e) {}
                publicMsg = null;
            } else {
                try { await i.message.delete(); } catch(e) {}
            }

            // Send a NEW ephemeral menu back to the user (private and invisible)
            await i.followUp({ embeds: [mainEmbed], components: [row], ephemeral: true });
        }
    });
}
