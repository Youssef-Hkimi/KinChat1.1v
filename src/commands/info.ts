import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { UIManager } from '../managers/UIManager';
import { getCommandMention } from '../utils/commandHelper';

export const data = new SlashCommandBuilder()
    .setName('info')
    .setDescription('Learn all about the Community NPC system and how it works.');

export async function execute(interaction: ChatInputCommandInteraction) {
    const pages = [
        UIManager.createBaseEmbed(
            '🏠 Community NPC System',
            'Welcome to the most advanced Discord NPC ecosystem!\n\nOur NPCs are powered by AI and seamlessly integrate into your community. They remember conversations, build relationships, have dynamic moods, and feel like real server members.'
        ).addFields(
            { name: 'What they do', value: 'Chat naturally, react to events, have moods, and interact with each other.' },
            { name: 'Getting Started', value: 'Use the buttons below to explore how the system works and how to interact with the NPCs.' }
        ).setThumbnail('https://cdn3.emoji.gg/emojis/68840-poordogreading.png'),

        UIManager.createBaseEmbed(
            '👥 How NPCs Work',
            'NPCs listen to conversations in their allowed channels. You don\'t always need to ping them!\n\n**Interacting:**\n- Talk to them directly by mentioning them or using their name.\n- They might randomly chime in if they find a conversation interesting.\n- They might even talk to each other!'
        ).setColor('#10b981'),

        UIManager.createBaseEmbed(
            '💬 Important Commands',
            'Here are some useful commands to get you started:'
        ).addFields(
            { name: getCommandMention(interaction.client, 'npcs'), value: 'View the directory of all active NPCs.' },
            { name: '`/profile <npc>`', value: 'Check an NPC\'s bio, likes, and dislikes.' },
            { name: '`/affinity <npc>`', value: 'See your relationship level with an NPC.' },
            { name: '`/mood <npc>`', value: 'Check an NPC\'s daily mood.' },
            { name: getCommandMention(interaction.client, 'memories'), value: 'See what the NPCs remember about you.' }
        ).setColor('#f59e0b'),

        UIManager.createBaseEmbed(
            '❤️ Relationships & Memory',
            'NPCs have long-term memory. They remember what you tell them, your name, and your past interactions.\n\nEvery interaction changes your **Affinity**. Be nice, and they will become warmer and friendlier. Be mean, and they might start ignoring you or getting annoyed.'
        ).setColor('#ef4444'),

        UIManager.createBaseEmbed(
            '⚙️ Server Settings',
            `Server Admins have full control over the NPCs using the ${getCommandMention(interaction.client, 'settings')} command.`
        ).addFields(
            { name: 'Channels', value: 'Restrict NPCs to specific channels or let them roam free.' },
            { name: 'Frequency', value: 'Make them super talkative or keep them quiet.' },
            { name: 'Quiet Hours', value: 'Set a sleep schedule so they don\'t interrupt late at night.' }
        ).setColor('#6366f1'),
    ];

    await UIManager.paginate(interaction, pages, 120000, true);
}
