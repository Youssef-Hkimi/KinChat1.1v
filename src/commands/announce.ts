import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Preview or send the new update announcement.')
    .addBooleanOption(option =>
        option.setName('send_globally')
            .setDescription('WARNING: If true, sends to all servers. If false, just previews in this channel.')
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    if (interaction.user.id !== '950364079061602304') {
        return interaction.reply({ content: 'Only developers can use this command.', ephemeral: true });
    }

    const sendGlobally = interaction.options.getBoolean('send_globally') ?? false;
    const blackjackCmd = interaction.client.application?.commands.cache.find(c => c.name === 'blackjack');
    const blackjackMention = blackjackCmd ? `</blackjack:${blackjackCmd.id}>` : '`/blackjack`';

    const embed = new EmbedBuilder()
        .setAuthor({ name: 'MINIGAME UPDATE!' })
        .setThumbnail('https://cdn.discordapp.com/emojis/1526532999137722468.gif?size=128')
        .setDescription(`Hey everyone! We've just rolled out an awesome new update focusing on interactive minigames and smarter AI.\n\n` +
            `### 🃏 Blackjack is Here!\n` +
            `You can now play Blackjack against our NPCs! We've added a fully functioning economy system.\n` +
            `- **Starting Balance:** Everyone starts with **$5,000**.\n` +
            `- **Features:** Place your bets, hit, stand, or double down!\n\n` +
            `### 💫 Seamless NPC Integration\n` +
            `You don't even need to use the ${blackjackMention} command! You can simply ask an NPC to play (e.g., *"Hey Sali, let's play blackjack!"*), and they'll instantly set up the game for you.\n\n` +
            `### 🧠 Enhanced AI Memory\n` +
            `We've tweaked the NPC brains! They now have better memory retention for your conversations and will provide even cooler, more natural responses—including taunting you if you lose a hand of Blackjack or congratulating you if you win!`)
        .setColor('#2ecc71')
        .setFooter({ text: 'Card Minigame Engine & AI Updates' })
        .setTimestamp();

    if (!sendGlobally) {
        // Preview mode
        await interaction.reply({ content: '👀 **PREVIEW MODE:** (Run with `send_globally: true` to broadcast globally)', embeds: [embed] });
    } else {
        await interaction.deferReply({ ephemeral: true });
        let successCount = 0;
        let failCount = 0;

        for (const guild of interaction.client.guilds.cache.values()) {
            let targetChannel = guild.systemChannel;
            if (!targetChannel) {
                const firstText = guild.channels.cache.find(c => c.isTextBased());
                if (firstText && firstText.isTextBased()) {
                    targetChannel = firstText as any;
                }
            }

            if (targetChannel && 'send' in targetChannel) {
                try {
                    await (targetChannel as any).send({ embeds: [embed] });
                    successCount++;
                } catch (e) {
                    failCount++;
                }
            } else {
                failCount++;
            }
        }
        
        await interaction.editReply({ content: `✅ Announcement broadcasted globally to **${successCount}** servers! (Failed in **${failCount}** servers)` });
    }
}
