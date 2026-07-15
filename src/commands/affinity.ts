import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { NPCS } from '../npcs/index';
import { getAffinity } from '../memory/db';

export const data = new SlashCommandBuilder()
    .setName('affinity')
    .setDescription('Check your affinity and bond with an NPC.')
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

    const affinity = await getAffinity(interaction.user.id, npc.id);

    // Generate progress bar
    const totalBars = 10;
    const filledBars = Math.min(10, Math.max(1, Math.floor(affinity.score / 10)));
    const emptyBars = totalBars - filledBars;
    const progressBar = '🟩'.repeat(filledBars) + '⬛'.repeat(emptyBars);

    const embed = new EmbedBuilder()
        .setTitle(`❤️ Affinity Profile: ${npc.name}`)
        .setColor('#ff4757')
        .setDescription(`Your current relationship with **${npc.name}**. Interact with them in chat to increase your bond!`);

    if (npc.avatarUrl && npc.avatarUrl.startsWith('http')) {
        embed.setThumbnail(npc.avatarUrl);
    }

    embed.addFields(
        { name: 'Bond Rank', value: `🏅 **${affinity.bondRank}**`, inline: true },
        { name: 'Affinity XP', value: `⭐ ${affinity.score}/100`, inline: true },
        { name: 'Progress', value: progressBar, inline: false },
        { name: 'Trust', value: `${affinity.trust}/10`, inline: true },
        { name: 'Humor Compatibility', value: `${affinity.humor}/10`, inline: true },
        { name: 'Respect', value: `${affinity.respect}/10`, inline: true }
    )
    .setFooter({ text: `Affinity System • ${interaction.user.tag}` })
    .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
