import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getDb } from '../memory/db';
import { UIManager } from '../managers/UIManager';

export const data = new SlashCommandBuilder()
    .setName('preferences')
    .setDescription('Manage your user preferences and privacy settings.')
    .addBooleanOption(option => 
        option.setName('community_recommendations')
            .setDescription('Allow the bot to send you Community Spotlight recommendations in DMs.')
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const enabled = interaction.options.getBoolean('community_recommendations') ?? true;
    const db = getDb();
    
    // Insert or update preference
    await db.run(
        `INSERT INTO UserPreferences (userId, recommendationsEnabled) VALUES (?, ?)
         ON CONFLICT(userId) DO UPDATE SET recommendationsEnabled=excluded.recommendationsEnabled`,
        [interaction.user.id, enabled ? 1 : 0]
    );

    const statusText = enabled ? '✅ **Enabled**' : '❌ **Disabled**';
    
    const embed = UIManager.createBaseEmbed(
        '⚙️ User Preferences Saved',
        `Your settings have been updated.\n\n**Community Recommendations:** ${statusText}`
    );

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
