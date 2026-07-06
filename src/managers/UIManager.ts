import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, MessageComponentInteraction } from 'discord.js';

import fs from 'fs';
import path from 'path';

export class UIManager {
    public static createBaseEmbed(title: string, description: string, color?: string): EmbedBuilder {
        let globalColor = '#82FC7E';
        try {
            const configPath = path.join(__dirname, '../data/embedConfig.json');
            if (fs.existsSync(configPath)) {
                const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (data.embedColor) globalColor = data.embedColor;
            }
        } catch (e) {}

        let finalColor = color || globalColor;
        finalColor = finalColor.trim();
        if (finalColor && !finalColor.startsWith('#') && /^[0-9A-Fa-f]{6}$/.test(finalColor)) {
            finalColor = '#' + finalColor;
        }

        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(finalColor as any)
            .setTimestamp()
            .setFooter({ text: 'Community NPC System' });
    }

    public static async paginate(
        interaction: ChatInputCommandInteraction | MessageComponentInteraction, 
        pages: EmbedBuilder[], 
        time: number = 120000,
        ephemeral: boolean = false
    ) {
        if (pages.length === 0) return;
        if (pages.length === 1) {
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [pages[0]], components: [] });
            } else {
                await interaction.reply({ embeds: [pages[0]], components: [], ephemeral });
            }
            return;
        }

        let currentIndex = 0;

        const getRow = (index: number) => {
            return new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_first')
                    .setEmoji('⏪')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(index === 0),
                new ButtonBuilder()
                    .setCustomId('btn_prev')
                    .setEmoji('◀')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(index === 0),
                new ButtonBuilder()
                    .setCustomId('btn_close')
                    .setEmoji('✖')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('btn_next')
                    .setEmoji('▶')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(index === pages.length - 1),
                new ButtonBuilder()
                    .setCustomId('btn_last')
                    .setEmoji('⏩')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(index === pages.length - 1)
            );
        };

        let message;
        if (interaction.replied || interaction.deferred) {
            message = await interaction.editReply({
                embeds: [pages[currentIndex]],
                components: [getRow(currentIndex)]
            });
        } else {
            message = await interaction.reply({
                embeds: [pages[currentIndex]],
                components: [getRow(currentIndex)],
                fetchReply: true,
                ephemeral
            });
        }

        const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time });

        collector.on('collect', async (i) => {
            if (i.user.id !== (interaction.user || (interaction as any).member?.user).id) {
                await i.reply({ content: 'You cannot use these buttons.', ephemeral: true });
                return;
            }

            if (i.customId === 'btn_first') currentIndex = 0;
            else if (i.customId === 'btn_prev') currentIndex--;
            else if (i.customId === 'btn_next') currentIndex++;
            else if (i.customId === 'btn_last') currentIndex = pages.length - 1;
            else if (i.customId === 'btn_close') {
                await i.update({ components: [] });
                collector.stop();
                return;
            }

            await i.update({
                embeds: [pages[currentIndex]],
                components: [getRow(currentIndex)]
            });
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => {});
        });
    }
}
