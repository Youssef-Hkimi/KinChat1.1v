import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { UIManager } from '../managers/UIManager';

export const data = new SlashCommandBuilder()
    .setName('support')
    .setDescription('Get support for the bot.');

export async function execute(interaction: ChatInputCommandInteraction) {
    const embed = UIManager.createBaseEmbed('🛠️ Support', 'Need help with the Community NPC Bot?\n\nContact the developer or join the support server (link here) for further assistance.');
    await interaction.reply({ embeds: [embed], ephemeral: true });
}
