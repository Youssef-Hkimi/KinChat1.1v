import { getGuildSettings, GuildSettings } from '../memory/db';

class SettingsManager {
    private cache: Map<string, GuildSettings> = new Map();

    public async getSettings(guildId: string): Promise<GuildSettings> {
        if (this.cache.has(guildId)) {
            return this.cache.get(guildId)!;
        }
        
        const settings = await getGuildSettings(guildId);
        this.cache.set(guildId, settings);
        return settings;
    }

    public invalidateCache(guildId: string) {
        this.cache.delete(guildId);
    }
}

export const settingsManager = new SettingsManager();
