import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('partners')
    .setDescription('Discover all of Kin Chat\'s trusted partners!');

export async function execute(interaction: ChatInputCommandInteraction) {
    const mainEmbed = new EmbedBuilder()
        .setTitle('🤝 Kin Chat Trusted Partners')
        .setDescription('Kin Chat is proud to be partnered with some amazing projects. Click the buttons below to learn more about our trusted partners!')
        .setColor('#2b2d31') // Beautiful dark theme color
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

    const response = await interaction.reply({ embeds: [mainEmbed], components: [row] });

    const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 }); // 5 minutes

    collector.on('collect', async i => {
        if (i.customId === 'partner_kamii') {
            const kamiiEmbed = new EmbedBuilder()
                .setTitle('Kamii Bot')
                .setDescription(`Kamii is a all in one easy to use security bot for discord. \nWith lots of features\n\n**Website:** **[sakurakamii.cc](https://sakurakamii.cc/)**\n**TopGG:** **https://top.gg/bot/1487082333415673967**\n**Support Server:** **https://discord.gg/mXvC5zmptZ**`)
                .setColor('#8B0000') // Dark red to match Kamii icon
                .setThumbnail('https://cdn.discordapp.com/emojis/1527611919425343558.webp?size=128&quality=lossless')
                .addFields(
                    { name: '🔔 Sekur-Noti', value: 'Be part of a web of servers helping each other to remain safe. Receive security alerts, get notified when troublemakers join your server - Its all Sekur-Noti is about' },
                    { name: '⏱️ Tracenime', value: 'Find the exact anime, season, episode and timestamp from just a screenshot!' },
                    { name: '🎟️ Accessibility', value: 'Kamii supports multiple languages such as Spanish and Hindu making it more accessible for everyone.' },
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

            await i.update({ embeds: [kamiiEmbed], components: [backRow] });
        } else if (i.customId === 'partner_back') {
            await i.update({ embeds: [mainEmbed], components: [row] });
        }
    });

    collector.on('end', () => {
        // Just remove the components when time is up
        interaction.editReply({ components: [] }).catch(() => {});
    });
}
