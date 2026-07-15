import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { UIManager } from '../managers/UIManager';
import { getCommandMention } from '../utils/commandHelper';

export const data = new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all available bot commands.');

export async function execute(interaction: ChatInputCommandInteraction) {
    const mention = (name: string) => getCommandMention(interaction.client, name);

    const embed = UIManager.createBaseEmbed(
        '📚 Command Help',
        'Here are all the available commands for the Community NPC bot.'
    ).addFields(
        { name: '👥 User Commands', value: `${mention('info')} - Welcome Guide\n${mention('npcs')} - View all NPCs\n${mention('profile')} \`<npc>\` - View NPC profile\n${mention('affinity')} \`<npc>\` - Check your bond\n${mention('mood')} \`<npc>\` - Check an NPC's mood\n${mention('memories')} - View what NPCs remember about you\n${mention('stats')} - Server activity stats` },
        { name: '🎮 Mini Games', value: `${mention('blackjack')} - Play Blackjack with an NPC` },
        { name: '⚙️ Admin Commands', value: `${mention('settings')} - Interactive config panel\n${mention('resetmemory')} - Wipe an NPC's memory\n${mention('announce')} - Announce updates` },
        { name: '🔗 Other', value: `${mention('about')} - About the bot\n${mention('ping')} - Check latency\n${mention('invite')} - Invite link\n${mention('privacy')} - Privacy policy` }
    );

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
