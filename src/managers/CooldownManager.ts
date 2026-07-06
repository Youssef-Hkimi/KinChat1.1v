interface CooldownEntry {
    lastReplyTime: number;
    repliesThisHour: number;
    hourStart: number;
}

class CooldownManager {
    private userCooldowns: Map<string, CooldownEntry> = new Map();
    private channelCooldowns: Map<string, CooldownEntry> = new Map();

    private getEntry(map: Map<string, CooldownEntry>, key: string): CooldownEntry {
        const now = Date.now();
        let entry = map.get(key);
        if (!entry) {
            entry = { lastReplyTime: 0, repliesThisHour: 0, hourStart: now };
            map.set(key, entry);
        }
        
        // Reset hourly counter if an hour has passed
        if (now - entry.hourStart > 3600000) {
            entry.repliesThisHour = 0;
            entry.hourStart = now;
        }
        
        return entry;
    }

    public checkUserCooldown(guildId: string, userId: string, minCooldownMs: number, maxRepliesPerHour: number): boolean {
        const key = `${guildId}-${userId}`;
        const entry = this.getEntry(this.userCooldowns, key);
        const now = Date.now();

        if (now - entry.lastReplyTime < minCooldownMs) return false;
        if (maxRepliesPerHour > 0 && entry.repliesThisHour >= maxRepliesPerHour) return false;

        return true;
    }

    public checkChannelCooldown(guildId: string, channelId: string, minCooldownMs: number, maxRepliesPerHour: number): boolean {
        const key = `${guildId}-${channelId}`;
        const entry = this.getEntry(this.channelCooldowns, key);
        const now = Date.now();

        if (now - entry.lastReplyTime < minCooldownMs) return false;
        if (maxRepliesPerHour > 0 && entry.repliesThisHour >= maxRepliesPerHour) return false;

        return true;
    }

    public recordReply(guildId: string, userId: string, channelId: string) {
        const now = Date.now();
        const userKey = `${guildId}-${userId}`;
        const channelKey = `${guildId}-${channelId}`;

        const userEntry = this.getEntry(this.userCooldowns, userKey);
        userEntry.lastReplyTime = now;
        userEntry.repliesThisHour++;

        const channelEntry = this.getEntry(this.channelCooldowns, channelKey);
        channelEntry.lastReplyTime = now;
        channelEntry.repliesThisHour++;
    }
}

export const cooldownManager = new CooldownManager();
