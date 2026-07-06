import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, AttachmentBuilder } from 'discord.js';
import { getDb } from '../memory/db';
import { UIManager } from '../managers/UIManager';

export const data = new SlashCommandBuilder()
    .setName('exportmemory')
    .setDescription('Admin command to export memory data.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
    const db = getDb();
    
    // In a real scenario, you'd filter by guildId if possible, but our current schema stores mostly per-user globally.
    // For now we'll just dump it all (since it's a private bot).
    const interactions = await db.all('SELECT * FROM UserInteractions');
    const relationships = await db.all('SELECT * FROM Relationships');
    const settings = await db.all('SELECT * FROM GuildSettings');

    const exportData = {
        interactions,
        relationships,
        settings
    };

    const buffer = Buffer.from(JSON.stringify(exportData, null, 2), 'utf8');
    const attachment = new AttachmentBuilder(buffer, { name: 'npc_memory_export.json' });

    const embed = UIManager.createBaseEmbed('📁 Memory Export', 'Attached is the JSON dump of all NPC memory and relationship vectors.');
    await interaction.reply({ embeds: [embed], files: [attachment], ephemeral: true });
}
