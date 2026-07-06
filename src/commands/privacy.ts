import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { UIManager } from '../managers/UIManager';
import { getCommandMention } from '../utils/commandHelper';

export const data = new SlashCommandBuilder()
    .setName('privacy')
    .setDescription('View the bot\'s privacy policy and memory usage.');

export async function execute(interaction: ChatInputCommandInteraction) {
    const embed = UIManager.createBaseEmbed('🔒 Privacy Policy', 'Your privacy is strictly respected.');
    embed.addFields(
        { name: 'Data Storage', value: 'We only store interaction counts, relationship vectors, and explicit facts you share with the NPCs.' },
        { name: 'Your Control', value: `You can use ${getCommandMention(interaction.client, 'forgetme')} to instantly wipe all data the NPCs have stored about you.` }
    );
    await interaction.reply({ embeds: [embed], ephemeral: true });
}
