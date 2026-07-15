import { Client, GatewayIntentBits, EmbedBuilder, TextChannel, PermissionFlagsBits } from 'discord.js';
import * as dotenv from 'dotenv';
dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const DEV_SERVER_ID = '1013722132351553556';
const OWNER_MENTION = '<@950364079061602304>';

client.once('ready', async () => {
    console.log(`Logged in as ${client.user?.tag} for sending feedback test message`);

    const embed = new EmbedBuilder()
        .setTitle('📝 We Value Your Feedback!')
        .setDescription(`We would love to hear your thoughts and suggestions about the bot! If you have any feedback, or if you need any questions or help, please contact ${OWNER_MENTION}.\n\nThank you for using our bot! 🌟`)
        .setColor('#3498db') // Blue
        .setTimestamp()
        .setFooter({ text: 'Feedback & Support' });

    try {
        const guild = await client.guilds.fetch(DEV_SERVER_ID);
        if (!guild) {
            console.error(`Guild with ID ${DEV_SERVER_ID} not found.`);
            process.exit(1);
        }

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
            console.log(`Sent feedback test message in ${guild.name} (#${targetChannel.name})`);
        } else {
            console.error(`Could not find a suitable channel to send message in guild ${guild.name}`);
        }
    } catch (error) {
        console.error('Error occurred:', error);
    }

    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
