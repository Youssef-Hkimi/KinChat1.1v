import { Message } from 'discord.js';
import { handleMessage } from '../handlers/messageHandler';

class MessageQueueManager {
    // Queues per channelId
    private queues: Map<string, Message[]> = new Map();
    private processing: Map<string, boolean> = new Map();

    public async enqueue(message: Message) {
        const channelId = message.channelId;
        
        if (!this.queues.has(channelId)) {
            this.queues.set(channelId, []);
        }

        this.queues.get(channelId)!.push(message);

        this.processQueue(channelId);
    }

    private async processQueue(channelId: string) {
        if (this.processing.get(channelId)) return;

        const queue = this.queues.get(channelId)!;
        if (queue.length === 0) return;

        this.processing.set(channelId, true);

        while (queue.length > 0) {
            const msg = queue.shift()!;
            try {
                // Ensure there's a slight delay to allow Discord API to propagate messages if needed
                await handleMessage(msg);
            } catch (e) {
                console.error("Error processing queued message:", e);
            }
        }

        this.processing.set(channelId, false);
    }
}

export const messageQueue = new MessageQueueManager();
