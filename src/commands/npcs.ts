import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ColorResolvable } from 'discord.js';
import { NPCS } from '../npcs/index';
import fs from 'fs';
import path from 'path';

export const data = new SlashCommandBuilder()
    .setName('npcs')
    .setDescription('View the interactive directory of all available NPCs.');

export async function execute(interaction: ChatInputCommandInteraction) {
    let currentIndex = 0;

    let config = {
        embedColor: "#7289da",
        footerText: "Interactive NPC System",
        showBanners: true,
        showThumbnails: true
    };

    try {
        const configPath = path.join(__dirname, '../data/embedConfig.json');
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf8');
            config = { ...config, ...JSON.parse(data) };
        }
    } catch (e) {
        console.error("Failed to load embed config", e);
    }

    const generateEmbed = (index: number) => {
        const npc = NPCS[index];
        let colorToUse = (npc.embedColor || config.embedColor) as string;
        colorToUse = colorToUse.trim();
        if (colorToUse && !colorToUse.startsWith('#') && /^[0-9A-Fa-f]{6}$/.test(colorToUse)) {
            colorToUse = '#' + colorToUse;
        }
        
        const embed = new EmbedBuilder()
            .setTitle(`📖 NPC Directory: ${npc.name}`)
            .setDescription(npc.personalitySummary)
            .setColor(colorToUse as any);

        if (config.showThumbnails && npc.avatarUrl && npc.avatarUrl.startsWith('http')) {
            embed.setThumbnail(npc.avatarUrl);
        }
        if (config.showBanners && npc.bannerUrl && npc.bannerUrl.startsWith('http')) {
            embed.setImage(npc.bannerUrl);
        }

        embed.addFields(
            { name: '💼 Occupation', value: npc.occupation || 'Unknown', inline: true },
            { name: '🎭 Mood', value: npc.defaultMood || 'Unknown', inline: true },
            { name: '🎂 Age', value: npc.age || 'Unknown', inline: true }
        );
        
        if (npc.schedule && npc.schedule.afternoon) {
            embed.addFields({ name: '📍 Current Status', value: `${npc.schedule.afternoon.emoji} ${npc.schedule.afternoon.activity}`, inline: false });
        }
        
        if (npc.likes && npc.likes.length > 0) {
            embed.addFields({ name: '👍 Likes', value: npc.likes.join(', '), inline: true });
        }
        if (npc.dislikes && npc.dislikes.length > 0) {
            embed.addFields({ name: '👎 Dislikes', value: npc.dislikes.join(', '), inline: true });
        }
        
        // Add an invisible third column to force Likes & Dislikes to take exactly 1/3 width, keeping them aligned perfectly.
        if ((npc.likes && npc.likes.length > 0) || (npc.dislikes && npc.dislikes.length > 0)) {
            embed.addFields({ name: '\u200B', value: '\u200B', inline: true });
        }

        if (npc.favoriteQuote) {
            embed.addFields({ name: '💬 Quote', value: `*${npc.favoriteQuote}*`, inline: false });
        }

        embed.setFooter({ text: `Page ${index + 1} of ${NPCS.length} • ${config.footerText}` });

        return embed;
    };

    const generateButtons = (index: number) => {
        return new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('prev_npc')
                .setLabel('◀ Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(index === 0),
            new ButtonBuilder()
                .setCustomId('next_npc')
                .setLabel('Next ▶')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(index === NPCS.length - 1),
            new ButtonBuilder()
                .setCustomId('view_profile')
                .setLabel('View Profile')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('👤')
        );
    };

    const message = await interaction.reply({
        embeds: [generateEmbed(currentIndex)],
        components: [generateButtons(currentIndex)],
        fetchReply: true
    });

    const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
            await i.reply({ content: 'You cannot interact with this menu.', ephemeral: true });
            return;
        }

        if (i.customId === 'prev_npc') currentIndex--;
        else if (i.customId === 'next_npc') currentIndex++;
        else if (i.customId === 'view_profile') {
            await i.reply({ content: `You can view the full profile by typing \`/npc profile ${NPCS[currentIndex].id}\``, ephemeral: true });
            return;
        }

        await i.update({
            embeds: [generateEmbed(currentIndex)],
            components: [generateButtons(currentIndex)]
        });
    });

    collector.on('end', () => {
        interaction.editReply({ components: [] }).catch(() => { });
    });
}
