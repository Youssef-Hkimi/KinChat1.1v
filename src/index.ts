import { Client, GatewayIntentBits, REST, Routes, Collection, EmbedBuilder, ChannelType, PermissionsBitField, TextChannel } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { initMemory } from './memory/db';
import { startWebServer } from './server/index';
import { handleMessage } from './handlers/messageHandler';
import { presenceManager } from './managers/PresenceManager';
import { botPresenceManager } from './managers/BotPresenceManager';
import { settingsManager } from './managers/SettingsManager';
import { getCommandMention } from './utils/commandHelper';
import { sseManager } from './server/sse';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

// Dynamic Command Loader
export const commands = new Collection<string, any>();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    commands.set(command.data.name, command);
  } else {
    console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

client.once('ready', async () => {
  await initMemory();
  startWebServer(client);
  presenceManager.init(client);
  botPresenceManager.init(client);
  console.log(`Ready! Logged in as ${client.user?.tag}`);

  // Register commands
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
    console.log('Started refreshing application (/) commands.');

    const body = commands.map(cmd => cmd.data.toJSON());

    await rest.put(
      Routes.applicationCommands(client.user!.id),
      { body }
    );
    await client.application?.commands.fetch();

    console.log(`Successfully reloaded ${body.length} application (/) commands.`);
  } catch (error) {
    console.error(error);
  }
});


client.on('messageCreate', (message) => {
    handleMessage(message).catch(console.error);
});

client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
      if (interaction.guildId) {
          const settings = await settingsManager.getSettings(interaction.guildId);
          if (!settings.setupComplete && interaction.commandName !== 'setup' && interaction.commandName !== 'info') {
              const embed = new EmbedBuilder()
                  .setColor('#facc15')
                  .setTitle('🚧 Setup Required')
                  .setDescription(`This server hasn't completed setup yet.\n\nAn administrator can finish setup using the ${getCommandMention(interaction.client, 'setup')} command.`);
              await interaction.reply({ embeds: [embed], ephemeral: true });
              return;
          }
      }

      const command = commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
          await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
      }
  } else if (interaction.isButton()) {
      if (interaction.customId === 'btn_onboard_npcs') {
          const command = commands.get('npcs');
          if (command) {
              await command.execute(interaction as any).catch(console.error);
          }
      } else if (interaction.customId === 'btn_onboard_help') {
          const command = commands.get('info');
          if (command) {
              await command.execute(interaction as any).catch(console.error);
          }
      } else if (interaction.customId === 'btn_onboard_chat') {
          await interaction.message.delete().catch(() => {});
      }
  } else if (interaction.isAutocomplete()) {
      const command = commands.get(interaction.commandName);
      if (!command) return;

      try {
        if (command.autocomplete) {
            await command.autocomplete(interaction);
        }
      } catch (error) {
        console.error(error);
      }
  }
});



client.on('guildCreate', async (guild) => {
  sseManager.broadcast('activity', { type: 'server', message: `Joined new server: ${guild.name} (${guild.memberCount} members)` });
  try {
    const channel = guild.systemChannel || guild.channels.cache.find(c => 
      c.type === ChannelType.GuildText && 
      guild.members.me?.permissionsIn(c).has(PermissionsBitField.Flags.SendMessages)
    ) as TextChannel | undefined;

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('👋 Thanks for adding Kin Chat!')
      .setDescription(`I am an AI-powered Discord bot that brings your server to life with dynamic NPCs and natural conversations.\n\n**To get started, an Administrator must run the ${getCommandMention(client, 'setup')} command to configure the bot.**`)
      .setThumbnail('https://cdn3.emoji.gg/emojis/26386-mufflien-spacecat.png')
      .setImage('https://media.discordapp.net/attachments/1522654547862880266/1523412393701671082/New_Project_1.png?ex=6a4c03da&is=6a4ab25a&hm=6be8a8eae8668214e416bd787986dc5a2eb6c1be42a0a854b785845b82f6c2e7&=&format=webp&quality=lossless')
      .addFields(
        { name: '🚧 Setup Required', value: `The NPCs are currently asleep. They will not respond to any messages until the ${getCommandMention(client, 'setup')} wizard is completed.` },
        { name: '🔗 Useful Links', value: '[Support Server](https://discord.gg/your-invite) | [Follow the Dev on X](https://x.com/Yobbiyy)' }
      )
      .setFooter({ text: 'Kin Chat AI', iconURL: client.user?.displayAvatarURL() })
      .setTimestamp();

    if (channel) {
        await channel.send({ embeds: [embed] }).catch(() => {});
    }

    try {
        const owner = await guild.fetchOwner();
        if (owner) {
            await owner.send({ embeds: [embed] }).catch(() => {});
        }
    } catch (e) {
        console.error('Failed to DM owner', e);
    }
  } catch (error) {
    console.error('Error sending welcome message:', error);
  }
});

client.on('guildDelete', (guild) => {
    sseManager.broadcast('activity', { type: 'server_leave', message: `Left server: ${guild.name}` });
});

client.login(process.env.DISCORD_TOKEN);
