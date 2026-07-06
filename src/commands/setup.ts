import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType } from 'discord.js';
import { getGuildSettings, updateGuildSettings } from '../memory/db';
import { settingsManager } from '../managers/SettingsManager';
import { getCommandMention } from '../utils/commandHelper';

export const data = new SlashCommandBuilder()
    .setName('setup')
    .setDescription('First-time setup wizard for the NPC ecosystem.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
    let settings = await getGuildSettings(interaction.guildId!);
    
    // Allow re-running setup if they want, but default to current settings
    let step = 1;
    let mode = settings.mode;
    let allowedChannels = settings.allowedChannels || [];
    let communityMode = settings.communityMode || 'Standard';

    const generateEmbed = () => {
        const embed = new EmbedBuilder().setColor('#5865F2');
        
        if (step === 1) {
            embed.setTitle('Welcome to Kin Chat AI! 🤖')
                 .setDescription('Thank you for inviting the most advanced Discord NPC ecosystem!\n\nThis setup wizard will configure your server. Before NPCs can talk, you must complete this setup.\n\n**Features you are about to unlock:**\n• Living AI NPCs with unique personalities\n• Dynamic conversations that remember you\n• Relationship and Bond system\n• Immersive World Events')
                 .setFooter({ text: 'Step 1 of 4 • Welcome' });
        } else if (step === 2) {
            embed.setTitle('Step 2: Channel Configuration 📡')
                 .setDescription('Where should the NPCs be allowed to speak and respond?\n\n**Everywhere:** NPCs will respond in any text channel when triggered.\n**Selected Channels:** Restrict NPCs to specific channels (e.g., #general, #bot-commands).')
                 .addFields({ name: 'Current Selection', value: mode === 'TRIGGER_ONLY_ANYWHERE' ? 'Everywhere' : (allowedChannels.length > 0 ? allowedChannels.map(id => `<#${id}>`).join(', ') : 'Selected Channels (None Selected yet!)') })
                 .setFooter({ text: 'Step 2 of 4 • Channels' });
        } else if (step === 3) {
            embed.setTitle('Step 3: Community Preferences 🎭')
                 .setDescription('What kind of community is this? This setting changes the AI\'s tone and behavior to better suit your members.')
                 .addFields({ name: 'Current Selection', value: communityMode })
                 .setFooter({ text: 'Step 3 of 4 • Community' });
        } else if (step === 4) {
            embed.setTitle('🚧 Beta Notice')
                 .setColor('#facc15')
                 .setDescription('This project is actively being developed. You may occasionally encounter:\n\n• Bugs or glitches\n• Unexpected NPC behavior\n• Temporary downtime\n\nYour feedback helps improve the project immensely!')
                 .setFooter({ text: 'Step 4 of 4 • Acknowledgement' });
        } else if (step === 5) {
            embed.setTitle('🎉 Setup Complete!')
                 .setColor('#22c55e')
                 .setDescription(`Your server is now ready. The NPCs are awake and ready to chat!\n\n**Quick Start Commands:**\n${getCommandMention(interaction.client, 'info')} - View server status\n${getCommandMention(interaction.client, 'npcs')} - View the character roster\n${getCommandMention(interaction.client, 'settings')} - Adjust these preferences later`)
                 .setFooter({ text: 'You can dismiss this message.' });
        }
        
        return embed;
    };

    const getComponents = () => {
        const components: any[] = [];
        
        if (step === 1) {
            components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('btn_cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('btn_next').setLabel('Next').setStyle(ButtonStyle.Primary)
            ));
        } else if (step === 2) {
            components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('btn_mode_anywhere').setLabel('Everywhere').setStyle(mode === 'TRIGGER_ONLY_ANYWHERE' ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_mode_specific').setLabel('Selected Channels').setStyle(mode === 'SPECIFIC_CHANNELS' ? ButtonStyle.Success : ButtonStyle.Secondary)
            ));
            
            if (mode === 'SPECIFIC_CHANNELS') {
                components.push(new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('select_channels')
                        .setPlaceholder('Select allowed channels (Max 3)')
                        .setMinValues(1)
                        .setMaxValues(3)
                        .setChannelTypes(ChannelType.GuildText)
                ));
            }

            const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('btn_back').setLabel('Back').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_next').setLabel('Next').setStyle(ButtonStyle.Primary).setDisabled(mode === 'SPECIFIC_CHANNELS' && allowedChannels.length === 0)
            );
            components.push(navRow);
        } else if (step === 3) {
            components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select_community')
                    .setPlaceholder('Select Community Mode')
                    .addOptions(
                        new StringSelectMenuOptionBuilder().setLabel('Family Friendly (Safe)').setValue('Family Friendly').setDescription('Very safe responses, minimal sarcasm.').setEmoji('🟢').setDefault(communityMode === 'Family Friendly'),
                        new StringSelectMenuOptionBuilder().setLabel('Standard (Recommended)').setValue('Standard').setDescription('Balanced humor, normal conversations.').setEmoji('🔵').setDefault(communityMode === 'Standard'),
                        new StringSelectMenuOptionBuilder().setLabel('Mature (18+)').setValue('Mature').setDescription('Stronger language, darker humor.').setEmoji('🟣').setDefault(communityMode === 'Mature')
                    )
            ));

            components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('btn_back').setLabel('Back').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_next').setLabel('Next').setStyle(ButtonStyle.Primary)
            ));
        } else if (step === 4) {
            components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('btn_back').setLabel('Back').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_finish').setLabel('✅ I Understand (Complete Setup)').setStyle(ButtonStyle.Success)
            ));
        }
        
        return components;
    };

    const response = await interaction.reply({
        embeds: [generateEmbed()],
        components: getComponents(),
        ephemeral: true,
        fetchReply: true
    });

    const collector = response.createMessageComponentCollector({ time: 300000 });

    collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
            await i.reply({ content: 'Only the command user can interact with this menu.', ephemeral: true });
            return;
        }

        if (i.isButton()) {
            if (i.customId === 'btn_cancel') {
                await i.update({ content: 'Setup cancelled.', embeds: [], components: [] });
                collector.stop();
                return;
            } else if (i.customId === 'btn_next') {
                step++;
            } else if (i.customId === 'btn_back') {
                step--;
            } else if (i.customId === 'btn_mode_anywhere') {
                mode = 'TRIGGER_ONLY_ANYWHERE';
            } else if (i.customId === 'btn_mode_specific') {
                mode = 'SPECIFIC_CHANNELS';
            } else if (i.customId === 'btn_finish') {
                step = 5;
                // Save Everything
                await updateGuildSettings(interaction.guildId!, {
                    setupComplete: true,
                    setupCompletedAt: new Date().toISOString(),
                    setupCompletedBy: interaction.user.tag,
                    mode,
                    allowedChannels,
                    communityMode: communityMode as any
                });
                settingsManager.invalidateCache(interaction.guildId!);
                
                if (interaction.channel) {
                    const onboardEmbed = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setTitle('💬 Start Talking to Your NPCs')
                        .setDescription('Your NPCs are now awake and ready to chat!\n\nSimply mention an NPC by name in any allowed channel and start talking naturally.\nNo special commands are needed.\nTreat them like real members of your server.')
                        .addFields(
                            {
                                name: '🗣️ Conversation Examples',
                                value: '👤 Hello Shade, I\'m bored...\n👤 Greg, what project are you working on today?\n👤 Lila, what\'s your favorite comfort food?\n👤 Dr. Venn, explain black holes like I\'m five.\n👤 Shade, would you survive a zombie apocalypse?\n👤 Greg, who\'s the better mechanic—you or Dr. Venn?'
                            },
                            {
                                name: '💡 Helpful Tips',
                                value: '• Mention an NPC by name to get their attention.\n• Ask questions, joke around, roleplay, or just chat naturally.\n• NPCs remember conversations over time.\n• Different NPCs have different personalities.\n• Some NPCs may occasionally talk to each other.\n• Not every message receives a response—that helps conversations feel natural.'
                            }
                        )
                        .setFooter({ text: 'Kin Chat AI' });

                    const onboardRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder().setCustomId('btn_onboard_npcs').setLabel('📚 Open NPC List').setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId('btn_onboard_help').setLabel('❓ Learn More').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('btn_onboard_chat').setLabel('🚀 Let\'s Chat!').setStyle(ButtonStyle.Success)
                    );

                    await (interaction.channel as any).send({ embeds: [onboardEmbed], components: [onboardRow] }).catch(() => {});
                }
                
                await i.update({ embeds: [generateEmbed()], components: [] });
                collector.stop();
                return;
            }
        } else if (i.isChannelSelectMenu() && i.customId === 'select_channels') {
            allowedChannels = i.values;
        } else if (i.isStringSelectMenu() && i.customId === 'select_community') {
            communityMode = i.values[0] as any;
        }

        await i.update({
            embeds: [generateEmbed()],
            components: getComponents()
        });
    });

    collector.on('end', collected => {
        if (step !== 5) {
            interaction.editReply({ components: [] }).catch(() => {});
        }
    });
}
