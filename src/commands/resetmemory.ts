import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { getDb } from '../memory/db';
import { UIManager } from '../managers/UIManager';

export const data = new SlashCommandBuilder()
    .setName('resetmemory')
    .setDescription('Admin command to reset memory.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option => 
        option.setName('user')
            .setDescription('The user whose memory to wipe')
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const db = getDb();
    const targetUser = interaction.options.getUser('user');

    if (!targetUser) return;

    await db.run('DELETE FROM UserMemory WHERE userId = ?', [targetUser.id]);
    await db.run('DELETE FROM UserInteractions WHERE userId = ?', [targetUser.id]);
    await db.run('DELETE FROM Relationships WHERE userId = ?', [targetUser.id]);

    const embed = UIManager.createBaseEmbed('🛠️ Memory Reset', `All memory and relationship data for <@${targetUser.id}> has been wiped.`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
}
