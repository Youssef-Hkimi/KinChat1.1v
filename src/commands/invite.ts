import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { UIManager } from '../managers/UIManager';
import { partnerManager } from '../managers/PartnerManager';

export const data = new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Get the invite link for the bot.');

export async function execute(interaction: ChatInputCommandInteraction) {
    const clientId = interaction.client.user?.id || 'YOUR_CLIENT_ID';
    const embed = UIManager.createBaseEmbed('🔗 Invite Me!', `Use the link below to invite me to your server.\n\n[Click here to invite](https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands)`);
    await interaction.reply({ embeds: [embed], ephemeral: true });

    // Asynchronously send the Spotlight DM (won't block or error the interaction)
    partnerManager.sendSpotlightDM(interaction.user).catch(e => console.error("Spotlight DM Failed", e));
}
