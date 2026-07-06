import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { statisticsManager } from '../managers/StatisticsManager';
import { UIManager } from '../managers/UIManager';
import { getDb } from '../memory/db';

export const data = new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View server activity and NPC statistics.');

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;
    
    const date = new Date().toISOString().split('T')[0];
    const stats = await statisticsManager.getDailyStats(interaction.guildId, date);

    const db = getDb();
    
    // Most active NPC overall (by interaction count)
    const topNpcRow = await db.get('SELECT npcId, SUM(messageCount) as total FROM UserInteractions GROUP BY npcId ORDER BY total DESC LIMIT 1');
    
    // Most active User overall
    const topUserRow = await db.get('SELECT userId, SUM(messageCount) as total FROM UserInteractions GROUP BY userId ORDER BY total DESC LIMIT 1');

    const embed = UIManager.createBaseEmbed('📊 Server Statistics', 'Here is the community activity report.')
        .addFields(
            { name: '📅 Today\'s Activity', value: `Total Messages Analyzed: **${stats.messages}**\nTotal NPC Replies: **${stats.npcReplies}**` },
            { name: '🏆 Top User', value: topUserRow ? `<@${topUserRow.userId}> (${topUserRow.total} interactions)` : 'None yet' },
            { name: '🤖 Most Popular NPC', value: topNpcRow ? `NPC ID: ${topNpcRow.npcId} (${topNpcRow.total} interactions)` : 'None yet' }
        );

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
