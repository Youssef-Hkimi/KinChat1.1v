class MoodManager {
    private moods = [
        'Happy', 'Sleepy', 'Curious', 'Grumpy', 
        'Energetic', 'Focused', 'Dramatic', 'Chaotic', 'Bored'
    ];

    public getDailyMood(npcId: string): string {
        // Create a pseudo-random seed based on the current day and the NPC's ID
        const daySeed = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
        
        // Simple hash of npcId string
        let idHash = 0;
        for (let i = 0; i < npcId.length; i++) {
            idHash = ((idHash << 5) - idHash) + npcId.charCodeAt(i);
            idHash |= 0;
        }

        const randomSeed = Math.abs(daySeed ^ idHash);
        const index = randomSeed % this.moods.length;
        return this.moods[index];
    }
}

export const moodManager = new MoodManager();
