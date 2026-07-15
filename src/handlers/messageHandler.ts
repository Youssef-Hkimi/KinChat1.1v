import { Message, TextChannel, Webhook, EmbedBuilder } from 'discord.js';
import { NPC, NPCS } from '../npcs/index';
import { getAffinity, updateAffinity, getGuildSettings, hasUserInteracted, getUserHintStatus, updateUserHintStatus } from '../memory/db';
import { generateNPCResponse, ChatMessage } from '../llm/groq';
import { sendAsNPC } from '../utils/webhookManager';
import { settingsManager } from '../managers/SettingsManager';
import { cooldownManager } from '../managers/CooldownManager';
import { getCommandMention } from '../utils/commandHelper';
import { statisticsManager } from '../managers/StatisticsManager';
import { moodManager } from '../managers/MoodManager';
import { sseManager } from '../server/sse';

export async function handleMessage(message: Message) {
    if (message.author.id === message.client.user?.id) return;
    if (!(message.channel instanceof TextChannel)) return;
    if (!message.guildId) return; 

    const guildSettings = await settingsManager.getSettings(message.guildId);

    if (!guildSettings.setupComplete) {
        const lowerContent = message.content.toLowerCase();
        const isMentioned = message.mentions.users.has(message.client.user!.id) || NPCS.some(npc => lowerContent.includes(npc.name.toLowerCase()) || npc.triggerKeywords.some(kw => lowerContent.includes(kw.toLowerCase())));
        
        if (isMentioned) {
            const hasPerms = message.member?.permissions.has('Administrator') || message.member?.permissions.has('ManageGuild');
            if (hasPerms) {
                const embed = new EmbedBuilder()
                    .setColor('#facc15')
                    .setTitle('🚧 Setup Required')
                    .setDescription(`This server hasn't completed setup yet.\n\nAn administrator can finish setup using the ${getCommandMention(message.client, 'setup')} command.`);
                    
                message.reply({ embeds: [embed] })
                    .then(m => setTimeout(() => m.delete().catch(()=>null), 10000))
                    .catch(()=>null);
            }
        }
        return;
    }

    if (guildSettings.mode === 'SPECIFIC_CHANNELS') {
        if (guildSettings.allowedChannels.length > 0 && !guildSettings.allowedChannels.includes(message.channelId)) {
            return;
        }
    }

    if (guildSettings.ignoredChannels.includes(message.channelId)) return;

    // Check Quiet Hours
    const nowHour = new Date().getHours();
    const nowMin = new Date().getMinutes();
    const nowTime = nowHour + nowMin / 60;
    
    const [startH, startM] = guildSettings.quietHoursStart.split(':').map(Number);
    const [endH, endM] = guildSettings.quietHoursEnd.split(':').map(Number);
    const startTime = startH + startM / 60;
    const endTime = endH + endM / 60;
    
    let isQuietHours = false;
    if (startTime > endTime) {
        if (nowTime >= startTime || nowTime <= endTime) isQuietHours = true;
    } else {
        if (nowTime >= startTime && nowTime <= endTime) isQuietHours = true;
    }

    if (guildSettings.npcSleepSchedule && isQuietHours) {
        const lowerContent = message.content.toLowerCase();
        const isMentioned = message.mentions.users.has(message.client.user!.id) || NPCS.some(npc => lowerContent.includes(npc.name.toLowerCase()) || npc.triggerKeywords.some(kw => lowerContent.includes(kw.toLowerCase())));
        if (isMentioned) {
            message.reply('The NPCs are currently in a sleep schedule set by the admin and cannot be engaged with right now. 💤')
                .then(m => setTimeout(() => m.delete().catch(()=>null), 5000))
                .catch(()=>null);
        }
        return;
    }

    const content = message.content.toLowerCase();
    let chosenNpc: NPC | null = null;
    let explicitlyTriggered = false;
    const isBotMessage = message.author.bot;

    // Adjust probability based on Response Frequency
    let probabilityModifier = 1.0;
    switch (guildSettings.responseFrequency) {
        case 'Silent': probabilityModifier = 0; break;
        case 'Low': probabilityModifier = 0.3; break;
        case 'Normal': probabilityModifier = 1.0; break;
        case 'Active': probabilityModifier = 1.5; break;
        case 'Chaotic': probabilityModifier = 3.0; break;
    }

    const shuffledNpcs = [...NPCS].sort(() => 0.5 - Math.random());

    let cooldownWarningSent = false;

    // Loop 1: Find all explicit mentions/keywords
    for (const npc of shuffledNpcs) {
        const isOnCooldown = !cooldownManager.checkUserCooldown(message.guildId, npc.id, guildSettings.cooldownMin, guildSettings.repliesPerHour);
        const isMentioned = message.mentions.users.has(message.client.user!.id) && content.includes(npc.name.toLowerCase());
        
        if (isMentioned && guildSettings.mentionBehavior === 'Ignore') continue;
        
        if (isMentioned && guildSettings.mentionBehavior === 'Always') {
            if (isOnCooldown) {
                if (!isBotMessage && !cooldownWarningSent) {
                    cooldownWarningSent = true;
                    message.reply(`Whoa there! The NPCs are currently on cooldown. Please wait a bit before chatting again! ⏱️`)
                        .then(m => setTimeout(() => m.delete().catch(()=>null), 5000))
                        .catch(()=>null);
                }
                continue;
            }
            chosenNpc = npc;
            explicitlyTriggered = true;
            break;
        }

        if (npc.triggerKeywords.some(kw => content.includes(kw))) {
            const isSelfTrigger = isBotMessage && (message.author.username === npc.name || message.content.startsWith(`**${npc.name}:**`));
            if (!isSelfTrigger) {
                if (isOnCooldown) {
                    if (!isBotMessage && !cooldownWarningSent) {
                        cooldownWarningSent = true;
                        message.reply(`Whoa there! The NPCs are currently on cooldown. Please wait a bit before chatting again! ⏱️`)
                            .then(m => setTimeout(() => m.delete().catch(()=>null), 5000))
                            .catch(()=>null);
                    }
                    continue; // Enforce cooldown for all users
                }
                chosenNpc = npc;
                explicitlyTriggered = true;
                break;
            }
        }
    }

    // Loop 2: If no explicit trigger, roll random chances
    if (!chosenNpc) {
        for (const npc of shuffledNpcs) {
            const isOnCooldown = !cooldownManager.checkUserCooldown(message.guildId, npc.id, guildSettings.cooldownMin, guildSettings.repliesPerHour);
            if (isOnCooldown) continue;
            if (probabilityModifier === 0) continue; // Silent

            let chance = npc.responseProbability * probabilityModifier;
            if (isBotMessage) chance *= 0.1; 

            if (guildSettings.mode !== 'TRIGGER_ONLY_ANYWHERE' && Math.random() < chance) {
                chosenNpc = npc;
                break;
            }
        }
    }

    if (!chosenNpc) {
        if (guildSettings.setupCompletedAt) {
            const setupDate = new Date(guildSettings.setupCompletedAt).getTime();
            const now = Date.now();
            const hoursSinceSetup = (now - setupDate) / (1000 * 60 * 60);

            if (hoursSinceSetup <= 24 && !isBotMessage) {
                const interacted = await hasUserInteracted(message.author.id);
                if (!interacted) {
                    const hintStatus = await getUserHintStatus(message.author.id);
                    const isGreeting = /^(hello|hi\b|hey|anyone here\?|how are you\?|who is here\?|sup\b|what's up)/i.test(content);
                    
                    if (isGreeting && !hintStatus.hasReceivedSmartHint) {
                        await message.reply("Looks like you're trying to chat with an NPC!\n\nMention their name first, like:\n'Hello Shade!'\nor\n'Greg, what's up?'")
                            .then(m => setTimeout(() => m.delete().catch(()=>null), 15000))
                            .catch(()=>null);
                        await updateUserHintStatus(message.author.id, { hasReceivedSmartHint: true });
                    } else if (!isGreeting && !hintStatus.hasReceivedReminder && Math.random() < 0.20) {
                        await message.reply("💡 Tip: Mention an NPC by name to start a conversation.\nExample: 'Hey Shade, I'm bored.' or 'Greg, got any advice?'")
                            .then(m => setTimeout(() => m.delete().catch(()=>null), 10000))
                            .catch(()=>null);
                        await updateUserHintStatus(message.author.id, { hasReceivedReminder: true });
                    }
                }
            }
        }
        return;
    }

    // Record stats
    await statisticsManager.recordInteraction(message.guildId, message.author.id, chosenNpc.id);
    sseManager.broadcast('activity', { type: 'message', message: `${message.author.username} invoked ${chosenNpc.name} in ${message.guild?.name}` });

    const recentMessages = await message.channel.messages.fetch({ limit: 7 });
    const history: ChatMessage[] = recentMessages.reverse().map(m => {
        let authorName = m.author.username;
        if (m.author.id === m.client.user?.id || m.author.bot) {
            const match = m.content.match(/^\*\*([^:]+):\*\*/);
            if (match) authorName = match[1];
        }
        return {
            role: m.author.bot ? 'assistant' : 'user',
            content: `${authorName}: ${m.content}`
        };
    });

    const hour = new Date().getHours();
    let timeOfDay = 'night';
    let currentStatus = chosenNpc.schedule.night;
    if (hour >= 6 && hour < 12) {
        timeOfDay = 'morning';
        currentStatus = chosenNpc.schedule.morning;
    } else if (hour >= 12 && hour < 18) {
        timeOfDay = 'afternoon';
        currentStatus = chosenNpc.schedule.afternoon;
    } else if (hour >= 18 && hour < 22) {
        timeOfDay = 'evening';
        currentStatus = chosenNpc.schedule.evening;
    }


    const currentAffinity = await getAffinity(message.author.id, chosenNpc.id);
    const dailyMood = moodManager.getDailyMood(chosenNpc.id);

    let nicknameContext = '';
    if (currentAffinity.favoriteNickname) {
        nicknameContext = `You call this user "${currentAffinity.favoriteNickname}". Use this nickname occasionally!`;
    }

    let dossierContext = '';
    if (chosenNpc.id === 'dani' && message.mentions.members && message.mentions.members.size > 0) {
        const targetMember = message.mentions.members.first()!;
        
        const fakeOffenses = [
            "Started beef in general chat",
            "Cursed at a moderator",
            "Lurks way too suspiciously",
            "Posted a meme in general instead of #memes",
            "Is secretly an FBI informant",
            "Stole the last slice of pizza",
            "Failed a vibe check in 2023"
        ];
        const randomOffense = fakeOffenses[Math.floor(Math.random() * fakeOffenses.length)];
        
        const isMuted = targetMember.isCommunicationDisabled() ? 'YES (Currently silenced by authorities)' : 'NO (Currently roaming free)';
        const joinDate = targetMember.joinedAt ? targetMember.joinedAt.toDateString() : 'Unknown';

        dossierContext = `
--- DETECTIVE DOSSIER ---
You pulled the files on the mentioned suspect: ${targetMember.user.username}
- Joined Server: ${joinDate}
- Muted/Timeout Status: ${isMuted}
- Known Offense: ${randomOffense}

Instruction: Analyze this dossier and expose their crimes to the user! Make fun of them in a court/detective tone.`;
    }

    const globalLengthRules = `
--- GLOBAL CONVERSATION RULES ---
You are chatting on Discord. Act like a real human texting.
Response Length Rules:
- 80% of the time: Write ONLY 1 short sentence (10-35 words).
- 15% of the time: Write 2-3 short sentences if the conversation naturally requires more detail.
- 5% of the time: Write longer responses ONLY IF the user explicitly asks for advice, stories, explanations, lore, or initiates deep emotional/roleplay events.
- NEVER write long paragraphs for simple greetings, casual chat, or short questions.
- Note: If your personality is highly chaotic or overly verbose by nature, you may lean into the 15% or 5% categories slightly more often, but always stay concise by default.
- Keep formatting minimal. Do not talk like an AI assistant.`;

    let communityContext = '';
    if (guildSettings.communityMode === 'Family Friendly') {
        communityContext = 'COMMUNITY TONE: Family Friendly. Keep responses very safe, wholesome, and completely avoid dark humor, profanity, or heavy sarcasm.';
    } else if (guildSettings.communityMode === 'Mature') {
        communityContext = 'COMMUNITY TONE: Mature (18+). You may use stronger language, darker humor, and more mature themes if it fits your character. No explicit sexual content or illegal content.';
    } else {
        communityContext = 'COMMUNITY TONE: Standard. Balanced humor, normal conversations. Sarcasm and mild edginess are okay if it fits your character.';
    }
    const isBlackjackChallenge = content.match(/\b(play|wanna play|let's play|lets play)\b.*\b(blackjack|bj|cards)\b/i) || content.match(/\b(blackjack|bj)\b/i);
    let gameContext = '';
    if (isBlackjackChallenge) {
        gameContext = 'The user has challenged you to a game of blackjack. Enthusiastically accept their challenge in 1 short sentence! Do NOT decline. DO NOT offer a counter-offer. Just say YES and show your excitement!';
    }

    const systemPrompt = `${chosenNpc.basePrompt}
${globalLengthRules}
${communityContext}
${dossierContext}
${gameContext}

--- WORLD CONTEXT ---
Your Current Activity: ${currentStatus.activity}
Your Mood Today: ${dailyMood} (You feel ${dailyMood.toLowerCase()})

--- USER CONTEXT ---
Talking To: ${message.author.username}
Your Bond: ${currentAffinity.bondRank} (Friendship: ${currentAffinity.friendship}/100, Annoyance: ${currentAffinity.annoyance}/100)
${nicknameContext}

--- BEHAVIOR INSTRUCTIONS ---
- Always stay in character. Do NOT break character.
- Adapt your tone based on your Mood and your Bond Rank.
- If Annoyance is high, be short, sarcastic, or dismissive. If Friendship is high, be warm and helpful.
- Keep responses concise and natural.
- CRITICAL NAME RULE: If Bond is 'Stranger' or 'Acquaintance', you do not know them well. Do NOT use their name. If Bond is 'Friend' or higher, you may casually use their name.
- CRITICAL: DO NOT repeat yourself. DO NOT reuse the same catchphrases over and over (e.g. back pain). Be highly creative and varied in your responses.
- Answer the user or chime into the conversation seamlessly.
- DO NOT prefix your message with your name.`;

    const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...history
    ];

    message.channel.sendTyping();

    let response = await generateNPCResponse(chosenNpc, messages);

    if (response) {
        if (response.includes('NO_REPLY')) return;

        const namePrefixRegex = new RegExp(`^\\*?\\*?${chosenNpc.name}\\*?\\*?:\\s*`, 'i');
        response = response.replace(namePrefixRegex, '');

        // Visually simulate a Discord reply using Markdown blockquotes, 
        // because Discord Webhooks do not natively support the actual "Reply" feature.
        // We truncate the original message to 60 chars so it doesn't look messy.
        let quotedText = message.content.replace(/\n/g, ' ');
        if (quotedText.length > 60) {
            quotedText = quotedText.substring(0, 57) + '...';
        }
        
        const finalResponse = `> **${message.author.username}:** ${quotedText}\n${response}`;

        try {
            await sendAsNPC(message.channel as TextChannel, chosenNpc, finalResponse);
        } catch (error) {
            console.error(`Failed to send webhook message for ${chosenNpc.name}:`, error);
            return;
        }

        if (isBlackjackChallenge) {
            const { startBlackjackGame } = require('../commands/blackjack');
            await startBlackjackGame(message, message.author, chosenNpc);
        }

        cooldownManager.recordReply(message.guildId, chosenNpc.id, message.channelId);
        await statisticsManager.recordNpcReply(message.guildId, chosenNpc.id);

        let friendshipChange = 0;
        let annoyanceChange = 0;
        
        // Very basic semantic heuristic for sentiment (expandable via another LLM call later)
        if (content.match(/\b(stupid|idiot|hate|shut up|annoying)\b/i)) {
            annoyanceChange = 5;
            friendshipChange = -2;
        } else if (content.match(/\b(love|amazing|thanks|thank you|cool|awesome)\b/i)) {
            friendshipChange = 3;
            annoyanceChange = -1;
        } else {
            friendshipChange = 1; // Passive gain
        }

        await updateAffinity(message.author.id, chosenNpc.id, { 
            score: currentAffinity.score + 1,
            friendship: Math.max(0, Math.min(100, currentAffinity.friendship + friendshipChange)),
            annoyance: Math.max(0, Math.min(100, currentAffinity.annoyance + annoyanceChange))
        });
    }
}
