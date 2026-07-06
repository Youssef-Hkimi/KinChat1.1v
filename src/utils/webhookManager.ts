import { TextChannel, WebhookClient } from 'discord.js';
import { NPC } from '../npcs';

export async function sendAsNPC(channel: TextChannel, npc: NPC, content: string) {
    try {
        // Fetch webhooks in the current channel
        const webhooks = await channel.fetchWebhooks();
        // Look for any existing webhook created by the bot
        let webhook = webhooks.find(wh => wh.owner?.id === channel.client.user?.id);

        if (!webhook) {
            // Create a new webhook for this channel if none exists
            webhook = await channel.createWebhook({
                name: 'NPC System Webhook',
                reason: 'Dynamic NPC response system'
            });
        }

        const isValidAvatar = npc.avatarUrl && npc.avatarUrl.startsWith('http');

        // We removed webhook.edit here to prevent massive Discord API latency caused by strict Webhook Edit rate limits.
        // We will rely purely on overriding the username/avatar inside webhook.send() below.

        await webhook.send({
            content,
            username: npc.name,
            avatarURL: isValidAvatar ? npc.avatarUrl : undefined
        });

    } catch (error) {
        console.error(`Failed to send dynamic webhook message for ${npc.id} in channel ${channel.id}:`, error);
        // Fallback if webhooks are disabled or fail
        await channel.send(`**${npc.name}:** ${content}`);
    }
}
