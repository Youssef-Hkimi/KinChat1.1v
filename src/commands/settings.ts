import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, PermissionFlagsBits, ComponentType, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle, ModalActionRowComponentBuilder } from 'discord.js';
import { UIManager } from '../managers/UIManager';
import { settingsManager } from '../managers/SettingsManager';
import { getGuildSettings, updateGuildSettings } from '../memory/db';

export const data = new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Interactive Admin Control Panel for NPCs.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
    let settings = await getGuildSettings(interaction.guildId!);
    let currentCategory = 'general';

    const generateEmbed = () => {
        const embed = UIManager.createBaseEmbed('⚙️ Server Settings Panel', 'Configure how NPCs behave in your server.');
        
        switch (currentCategory) {
            case 'general':
                embed.addFields(
                    { name: 'Channel Mode', value: settings.mode === 'SPECIFIC_CHANNELS' ? 'Restrict to Channels' : 'Trigger Anywhere', inline: true },
                    { name: 'World Events', value: settings.worldEvents ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: 'Bot Chatter', value: settings.botChatter ? '✅ Enabled' : '❌ Disabled', inline: true }
                );
                if (settings.mode === 'SPECIFIC_CHANNELS') {
                    const channelsList = settings.allowedChannels.length > 0 
                        ? settings.allowedChannels.map(id => `<#${id}>`).join(', ') 
                        : 'None Selected (Will trigger anywhere until you select channels)';
                    embed.addFields({ name: 'Allowed Channels (Max 3)', value: channelsList });
                }
                embed.setFooter({ text: 'Use buttons below to modify settings.' });
                break;
            case 'behavior':
                embed.addFields(
                    { name: 'Response Frequency', value: settings.responseFrequency, inline: true },
                    { name: 'Mention Behavior', value: settings.mentionBehavior, inline: true },
                    { name: 'NPC Sleep Schedule', value: settings.npcSleepSchedule ? `✅ ${settings.quietHoursStart} - ${settings.quietHoursEnd}` : '❌ Disabled', inline: true }
                );
                break;
            case 'cooldowns':
                embed.addFields(
                    { name: 'Global Reply Cooldown', value: settings.cooldownMin === 0 ? 'Disabled' : `${settings.cooldownMin / 1000}s`, inline: true },
                    { name: 'Max Replies / Hour', value: `${settings.repliesPerHour}`, inline: true }
                );
                embed.setFooter({ text: 'Note: Cooldown is disabled (0s) by default for a better experience on smaller servers.' });
                break;
        }

        return embed;
    };

    const getComponents = () => {
        const components: any[] = [];
        
        const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('settings_category')
                .setPlaceholder('Select Settings Category')
                .addOptions(
                    new StringSelectMenuOptionBuilder().setLabel('General System').setValue('general').setEmoji('⚙️').setDefault(currentCategory === 'general'),
                    new StringSelectMenuOptionBuilder().setLabel('NPC Behavior').setValue('behavior').setEmoji('🧠').setDefault(currentCategory === 'behavior'),
                    new StringSelectMenuOptionBuilder().setLabel('Cooldowns & Limits').setValue('cooldowns').setEmoji('⏱️').setDefault(currentCategory === 'cooldowns')
                )
        );
        components.push(menuRow);

        if (currentCategory === 'general') {
            const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('btn_mode_specific').setLabel('Specific Channels').setStyle(settings.mode === 'SPECIFIC_CHANNELS' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_mode_anywhere').setLabel('Trigger Anywhere').setStyle(settings.mode === 'TRIGGER_ONLY_ANYWHERE' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            );
            components.push(btnRow);

            if (settings.mode === 'SPECIFIC_CHANNELS') {
                const channelSelectRow = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('select_allowed_channels')
                        .setPlaceholder('Select up to 3 specific channels')
                        .setMinValues(0)
                        .setMaxValues(3)
                        .setChannelTypes(ChannelType.GuildText)
                );
                components.push(channelSelectRow);
            }
        } else if (currentCategory === 'behavior') {
            const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('btn_toggle_sleep').setLabel(settings.npcSleepSchedule ? 'Disable Sleep Schedule' : 'Enable Sleep Schedule').setStyle(settings.npcSleepSchedule ? ButtonStyle.Danger : ButtonStyle.Success),
                new ButtonBuilder().setCustomId('btn_set_sleep_hours').setLabel('Set Sleep Hours').setStyle(ButtonStyle.Primary)
            );
            components.push(btnRow);
        } else if (currentCategory === 'cooldowns') {
            const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('btn_cd_0').setLabel('Disabled').setStyle(settings.cooldownMin === 0 ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_cd_5').setLabel('5s').setStyle(settings.cooldownMin === 5000 ? ButtonStyle.Primary : ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_cd_10').setLabel('10s').setStyle(settings.cooldownMin === 10000 ? ButtonStyle.Primary : ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_cd_15').setLabel('15s').setStyle(settings.cooldownMin === 15000 ? ButtonStyle.Primary : ButtonStyle.Secondary)
            );
            components.push(btnRow);
        }

        return components;
    };

    const message = await interaction.reply({
        embeds: [generateEmbed()],
        components: getComponents(),
        fetchReply: true,
        ephemeral: true
    });

    const collector = message.createMessageComponentCollector({ time: 300000 });

    collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
            await i.reply({ content: 'Only the command user can interact with this menu.', ephemeral: true });
            return;
        }

        if (i.isStringSelectMenu()) {
            currentCategory = i.values[0];
        } else if (i.isChannelSelectMenu()) {
            if (i.customId === 'select_allowed_channels') {
                const selectedChannels = i.values; // Array of channel IDs
                await updateGuildSettings(interaction.guildId!, { allowedChannels: selectedChannels });
                settings = await getGuildSettings(interaction.guildId!);
                settingsManager.invalidateCache(interaction.guildId!);
            }
        } else if (i.isButton()) {
            if (i.customId === 'btn_mode_specific') {
                await updateGuildSettings(interaction.guildId!, { mode: 'SPECIFIC_CHANNELS' });
            } else if (i.customId === 'btn_mode_anywhere') {
                await updateGuildSettings(interaction.guildId!, { mode: 'TRIGGER_ONLY_ANYWHERE' });
            } else if (i.customId === 'btn_toggle_sleep') {
                await updateGuildSettings(interaction.guildId!, { npcSleepSchedule: !settings.npcSleepSchedule });
            } else if (i.customId === 'btn_set_sleep_hours') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_sleep_hours')
                    .setTitle('Configure Sleep Hours (24h format)');
                
                const startInput = new TextInputBuilder()
                    .setCustomId('input_start')
                    .setLabel('Sleep Start (e.g. 01:00 or 23:00)')
                    .setStyle(TextInputStyle.Short)
                    .setValue(settings.quietHoursStart)
                    .setRequired(true);
                    
                const endInput = new TextInputBuilder()
                    .setCustomId('input_end')
                    .setLabel('Sleep End (e.g. 08:00)')
                    .setStyle(TextInputStyle.Short)
                    .setValue(settings.quietHoursEnd)
                    .setRequired(true);
                    
                modal.addComponents(
                    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(startInput),
                    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(endInput)
                );
                
                await i.showModal(modal);
                try {
                    const modalSubmit = await i.awaitModalSubmit({ time: 60000, filter: m => m.customId === 'modal_sleep_hours' && m.user.id === interaction.user.id });
                    const newStart = modalSubmit.fields.getTextInputValue('input_start');
                    const newEnd = modalSubmit.fields.getTextInputValue('input_end');
                    if (/^\d{1,2}:\d{2}$/.test(newStart) && /^\d{1,2}:\d{2}$/.test(newEnd)) {
                        await updateGuildSettings(interaction.guildId!, { quietHoursStart: newStart, quietHoursEnd: newEnd });
                        settings = await getGuildSettings(interaction.guildId!);
                        settingsManager.invalidateCache(interaction.guildId!);
                        await modalSubmit.deferUpdate();
                        await modalSubmit.editReply({ embeds: [generateEmbed()], components: getComponents() });
                    } else {
                        await modalSubmit.reply({ content: 'Invalid time format. Please use HH:MM (e.g. 23:00).', ephemeral: true });
                    }
                } catch(e) {}
                return;
            } else if (i.customId === 'btn_cd_0') {
                await updateGuildSettings(interaction.guildId!, { cooldownMin: 0 });
            } else if (i.customId === 'btn_cd_5') {
                await updateGuildSettings(interaction.guildId!, { cooldownMin: 5000 });
            } else if (i.customId === 'btn_cd_10') {
                await updateGuildSettings(interaction.guildId!, { cooldownMin: 10000 });
            } else if (i.customId === 'btn_cd_15') {
                await updateGuildSettings(interaction.guildId!, { cooldownMin: 15000 });
            }
            // Refresh settings from DB
            settings = await getGuildSettings(interaction.guildId!);
            settingsManager.invalidateCache(interaction.guildId!);
        }

        await i.update({
            embeds: [generateEmbed()],
            components: getComponents()
        });
    });

    collector.on('end', () => {
        interaction.editReply({ components: [] }).catch(() => {});
    });
}
