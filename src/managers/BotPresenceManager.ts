import { Client, ActivityType, PresenceStatusData } from 'discord.js';
import { getGlobalSetting, setGlobalSetting } from '../memory/db';

export interface PresenceConfig {
    status: PresenceStatusData;
    type: ActivityType;
    text: string;
    durationMs: number;
}

class BotPresenceManager {
    private client!: Client;
    private playlist: PresenceConfig[] = [];
    private currentIndex: number = 0;
    private timer: NodeJS.Timeout | null = null;

    public init(client: Client) {
        this.client = client;
        this.loadPlaylist().then(() => {
            this.startRotation();
        });
    }

    public async loadPlaylist() {
        try {
            const raw = await getGlobalSetting('presencePlaylist', '[]');
            this.playlist = JSON.parse(raw);
        } catch (e) {
            console.error("Failed to load presence playlist", e);
            this.playlist = [];
        }
    }

    public async savePlaylist(newPlaylist: PresenceConfig[]) {
        this.playlist = newPlaylist;
        await setGlobalSetting('presencePlaylist', JSON.stringify(this.playlist));
        this.currentIndex = 0;
        this.startRotation();
    }

    public startRotation() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        if (this.playlist.length === 0) {
            this.client.user?.setPresence({ activities: [], status: 'online' });
            return;
        }

        this.applyPresence(this.playlist[this.currentIndex]);

        const currentConfig = this.playlist[this.currentIndex];
        
        this.timer = setTimeout(() => {
            this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
            this.startRotation();
        }, currentConfig.durationMs || 30000);
    }

    private applyPresence(config: PresenceConfig) {
        if (!this.client.isReady()) return;
        
        this.client.user?.setPresence({
            activities: [{ name: config.text, type: config.type }],
            status: config.status,
        });
    }
}

export const botPresenceManager = new BotPresenceManager();
