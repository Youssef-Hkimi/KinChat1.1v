import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getDb } from '../memory/db';
import { UIManager } from '../managers/UIManager';

export const data = new SlashCommandBuilder()
    .setName('memories')
    .setDescription('View what the NPCs remember about you.');

export async function execute(interaction: ChatInputCommandInteraction) {
    const db = getDb();
    
    // Fetch facts from UserMemory table (if it exists and is populated by the LLM)
    const memories = await db.all('SELECT fact FROM UserMemory WHERE userId = ?', [interaction.user.id]);
    
    // Fetch interactions
    const interactions = await db.all('SELECT npcId, messageCount FROM UserInteractions WHERE userId = ?', [interaction.user.id]);
    
    let desc = '';
    
    if (memories.length > 0) {
        desc += '**Explicit Memories:**\n';
        memories.forEach(m => desc += `- ${m.fact}\n`);
        desc += '\n';
    } else {
        desc += '*The NPCs don\'t have any explicit facts saved about you yet.*\n\n';
    }

    if (interactions.length > 0) {
        desc += '**Interaction Counts:**\n';
        interactions.forEach(i => desc += `- NPC ${i.npcId}: ${i.messageCount} messages\n`);
    }

    const embed = UIManager.createBaseEmbed('🧠 Your Memories', desc || 'You have no data stored.');
    await interaction.reply({ embeds: [embed], ephemeral: true });
}
