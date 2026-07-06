import { Client, TextChannel } from 'discord.js';
import { getDb } from '../memory/db';
import { NPCS } from '../npcs';
import { sendAsNPC } from '../utils/webhookManager';
import { settingsManager } from './SettingsManager';

class PresenceManager {
    private client!: Client;

    public init(client: Client) {
        this.client = client;
        // Run every 30 minutes
        setInterval(() => this.runPresenceRoutine(), 30 * 60 * 1000);
    }

    private async runPresenceRoutine() {
        if (!this.client || !this.client.isReady()) return;

        const db = getDb();
        // Get all guilds where botChatter is enabled
        const rows = await db.all('SELECT guildId FROM GuildSettings WHERE botChatter = 1 AND eventEnabled = 1');
        
        for (const row of rows) {
            try {
                const guild = this.client.guilds.cache.get(row.guildId);
                if (!guild) continue;

                const settings = await settingsManager.getSettings(row.guildId);
                
                // Only a small chance per guild per cycle to prevent spam
                let probability = 0.1; 
                switch (settings.responseFrequency) {
                    case 'Silent': probability = 0; break;
                    case 'Low': probability = 0.05; break;
                    case 'Normal': probability = 0.1; break;
                    case 'Active': probability = 0.25; break;
                    case 'Chaotic': probability = 0.5; break;
                }

                if (Math.random() > probability) continue;

                // Pick a random NPC
                const npc = NPCS[Math.floor(Math.random() * NPCS.length)];
                if (!npc) continue;

                // Pick an active text channel (from allowed channels or a random one)
                let targetChannel: TextChannel | null = null;
                if (settings.mode === 'SPECIFIC_CHANNELS' && settings.allowedChannels.length > 0) {
                    const channelId = settings.allowedChannels[Math.floor(Math.random() * settings.allowedChannels.length)];
                    const channel = guild.channels.cache.get(channelId);
                    if (channel && channel instanceof TextChannel) targetChannel = channel;
                } else {
                    const textChannels = guild.channels.cache.filter(c => c instanceof TextChannel) as any;
                    if (textChannels.size > 0) {
                        targetChannel = textChannels.random();
                    }
                }

                if (!targetChannel) continue;

                const presenceMessages = [
                    "*stretches* I'm making coffee, anyone want some?",
                    "I'll be back later, going for a walk.",
                    "Just finished reading a really good book.",
                    "Is it just me, or is it really quiet in here today?",
                    "I'm going to take a nap. See you all later.",
                    "*yawns*",
                    "Does anyone know how to fix a broken script? Asking for a friend.",
                    "I'm back! Did I miss anything?"
                ];

                const message = presenceMessages[Math.floor(Math.random() * presenceMessages.length)];
                
                // Send without calling LLM to save money/tokens on random chatter
                await sendAsNPC(targetChannel, npc, message);

            } catch (e) {
                console.error("Error in PresenceManager:", e);
            }
        }
    }
}

export const presenceManager = new PresenceManager();
