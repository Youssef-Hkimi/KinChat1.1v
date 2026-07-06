import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { UIManager } from '../managers/UIManager';

export const data = new SlashCommandBuilder()
    .setName('about')
    .setDescription('Learn about the bot\'s origins.');

export async function execute(interaction: ChatInputCommandInteraction) {
    const embed = UIManager.createBaseEmbed(
        '🤖 About This Bot', 
        'This bot brings Discord servers to life with dynamic AI-powered NPCs.'
    ).addFields(
        { name: 'Version', value: '2.0.0 Phase 2', inline: true },
        { name: 'Powered By', value: 'Discord.js & Groq AI', inline: true }
    );
    await interaction.reply({ embeds: [embed], ephemeral: true });
}
