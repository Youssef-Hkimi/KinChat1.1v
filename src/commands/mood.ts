import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { NPCS } from '../npcs';

export const data = new SlashCommandBuilder()
    .setName('mood')
    .setDescription('Check an NPC\'s current mood and status.')
    .addStringOption(option =>
        option.setName('npc')
            .setDescription('Select the NPC')
            .setRequired(true)
            .addChoices(...NPCS.map(npc => ({ name: npc.name, value: npc.id })))
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const npcId = interaction.options.getString('npc', true);
    const npc = NPCS.find(n => n.id === npcId);

    if (!npc) {
        return interaction.reply({ content: 'NPC not found.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setTitle(`🎭 Mood Scanner: ${npc.name}`)
        .setColor('#9b59b6');

    if (npc.avatarUrl && npc.avatarUrl.startsWith('http')) {
        embed.setThumbnail(npc.avatarUrl);
    }

    embed.addFields(
        { name: 'Base Mood', value: npc.defaultMood, inline: true },
        { name: 'Energy Level', value: '⚡ 85%', inline: true },
        { name: 'Current Activity', value: `${npc.schedule.afternoon.emoji} ${npc.schedule.afternoon.activity}`, inline: false }
    )
    .setFooter({ text: 'Dynamic Mood System' })
    .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
