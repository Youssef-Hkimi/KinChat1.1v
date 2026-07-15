import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, AutocompleteInteraction } from 'discord.js';
import { NPCS } from '../npcs/index';
import { getAffinity } from '../memory/db';

export const data = new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View an NPC\'s full profile.')
    .addStringOption(option =>
        option.setName('npc')
            .setDescription('Select the NPC')
            .setRequired(true)
            .setAutocomplete(true)
    );

export async function autocomplete(interaction: AutocompleteInteraction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const choices = NPCS.map(npc => ({ name: npc.name, value: npc.id }));
    const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedValue));
    
    await interaction.respond(
        filtered.slice(0, 25)
    );
}

export async function execute(interaction: ChatInputCommandInteraction) {
    const npcId = interaction.options.getString('npc', true);
    const npc = NPCS.find(n => n.id === npcId);

    if (!npc) {
        return interaction.reply({ content: 'NPC not found.', ephemeral: true });
    }

    const affinity = await getAffinity(interaction.user.id, npc.id);

    const embed = new EmbedBuilder()
        .setTitle(`👤 Profile: ${npc.name}`)
        .setDescription(`*${npc.favoriteQuote}*`)
        .setColor('#2ecc71');

    if (npc.avatarUrl && npc.avatarUrl.startsWith('http')) embed.setThumbnail(npc.avatarUrl);
    if (npc.bannerUrl && npc.bannerUrl.startsWith('http')) embed.setImage(npc.bannerUrl);

    embed.addFields(
        { name: 'Occupation', value: npc.occupation, inline: true },
        { name: 'Age', value: npc.age, inline: true },
        { name: 'Your Bond', value: `🏅 ${affinity.bondRank}`, inline: true },
        { name: 'Likes', value: npc.likes.join(', '), inline: false },
        { name: 'Dislikes', value: npc.dislikes.join(', '), inline: false },
        { name: 'Current Status', value: `${npc.schedule.afternoon.emoji} ${npc.schedule.afternoon.activity}`, inline: false }
    )
    .setFooter({ text: `NPC Profiles • You have ${affinity.score} Affinity XP with ${npc.name}` })
    .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
