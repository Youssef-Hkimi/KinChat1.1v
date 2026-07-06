import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { UIManager } from '../managers/UIManager';

export const data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot\'s latency.');

export async function execute(interaction: ChatInputCommandInteraction) {
    const embed = UIManager.createBaseEmbed('🏓 Pong!', `Latency is ${Date.now() - interaction.createdTimestamp}ms.`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
}
