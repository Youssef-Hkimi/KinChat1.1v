import { Client, GatewayIntentBits, EmbedBuilder, TextChannel, PermissionFlagsBits } from 'discord.js';
import * as dotenv from 'dotenv';
dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    console.log(`Logged in as ${client.user?.tag} for sending global message`);

    const embed = new EmbedBuilder()
        .setTitle('🔧 Maintenance Complete!')
        .setDescription('Sorry for the downtime! We were performing some necessary maintenance to improve the bot. Everything is back online and running smoothly now.\n\nThank you for your patience! 💖')
        .setColor('#00FF00') // Green color
        .setTimestamp()
        .setFooter({ text: 'Kin Chat Team' });

    let successCount = 0;
    let failCount = 0;

    for (const [id, guild] of client.guilds.cache) {
        try {
            // Try to find the system channel first
            let targetChannel = guild.systemChannel;

            // If no system channel or missing permissions, find the first available text channel
            if (!targetChannel || !targetChannel.permissionsFor(guild.members.me!)?.has(PermissionFlagsBits.SendMessages)) {
                const channels = await guild.channels.fetch();
                targetChannel = channels.find(c => 
                    c?.isTextBased() && 
                    c.permissionsFor(guild.members.me!)?.has(PermissionFlagsBits.SendMessages) &&
                    c.permissionsFor(guild.members.me!)?.has(PermissionFlagsBits.ViewChannel)
                ) as TextChannel | null;
            }

            if (targetChannel && targetChannel.isTextBased()) {
                await targetChannel.send({ embeds: [embed] });
                console.log(`Sent message in ${guild.name} (#${targetChannel.name})`);
                successCount++;
            } else {
                console.log(`Could not find a suitable channel to send message in ${guild.name}`);
                failCount++;
            }
        } catch (error) {
            console.error(`Failed to send in ${guild.name}:`, error);
            failCount++;
        }
    }

    console.log(`Finished sending messages. Success: ${successCount}, Fail: ${failCount}`);
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
