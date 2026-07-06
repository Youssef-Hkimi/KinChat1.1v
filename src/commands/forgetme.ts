import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getDb } from '../memory/db';
import { UIManager } from '../managers/UIManager';

export const data = new SlashCommandBuilder()
    .setName('forgetme')
    .setDescription('Instantly wipe all your data and memories from the bot.');

export async function execute(interaction: ChatInputCommandInteraction) {
    const db = getDb();
    const userId = interaction.user.id;

    await db.run('DELETE FROM UserMemory WHERE userId = ?', [userId]);
    await db.run('DELETE FROM UserInteractions WHERE userId = ?', [userId]);
    await db.run('DELETE FROM Relationships WHERE userId = ?', [userId]);

    const embed = UIManager.createBaseEmbed('🗑️ Data Erased', 'All your interactions, affinity scores, and memories have been permanently deleted from the database. The NPCs no longer know who you are.');
    await interaction.reply({ embeds: [embed], ephemeral: true });
}
