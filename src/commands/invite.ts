import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { partnerManager } from '../managers/PartnerManager';

export const data = new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Get the invite link for the bot.');

export async function execute(interaction: ChatInputCommandInteraction) {
    const clientId = interaction.client.user?.id || 'YOUR_CLIENT_ID';
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;
    
    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✨ Invite Kin Chat to Your Server! ✨')
        .setDescription('Bring your server to life with dynamic AI NPCs, immersive roleplay, and natural conversations!\n\nClick the button below to add me to your server.')
        .setThumbnail('https://cdn3.emoji.gg/emojis/26386-mufflien-spacecat.png')
        .setImage('https://media.discordapp.net/attachments/1522654547862880266/1523412393701671082/New_Project_1.png?ex=6a4c03da&is=6a4ab25a&hm=6be8a8eae8668214e416bd787986dc5a2eb6c1be42a0a854b785845b82f6c2e7&=&format=webp&quality=lossless')
        .setFooter({ text: 'Powered by Kin Chat AI', iconURL: interaction.client.user?.displayAvatarURL() });

    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setLabel('Add to Server')
                .setStyle(ButtonStyle.Link)
                .setURL(inviteUrl)
                .setEmoji('🔗')
        );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

    // Asynchronously send the Spotlight DM (won't block or error the interaction)
    partnerManager.sendSpotlightDM(interaction.user).catch(e => console.error("Spotlight DM Failed", e));
}
