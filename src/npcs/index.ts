export interface NPCStatus {
    activity: string;
    emoji: string;
}

export interface NPCSchedule {
    morning: NPCStatus;
    afternoon: NPCStatus;
    evening: NPCStatus;
    night: NPCStatus;
}

export interface NPCBadge {
    id: string;
    name: string;
    icon: string;
    emoji: string;
    backgroundColor: string;
    borderColor?: string;
    glow?: string;
    description: string;
}

export interface NPCStatistic {
    id: string;
    name: string;
    value: string | number;
    icon: string;
    color: string;
}

export interface NPCLore {
    backstory: string;
    secrets: string;
    rumors: string;
}

export interface NPCPromptConfig {
    verbosity: number;
    humorLevel: number;
    sarcasm: number;
    curiosity: number;
    randomness: number;
}

export interface NPC {
    id: string;
    name: string;
    avatarUrl: string;
    triggerKeywords: string[];
    responseProbability: number;
    cooldownMs: number;
    basePrompt: string;
    occupation: string;
    age: string;
    personalitySummary: string;
    likes: string[];
    dislikes: string[];
    favoriteQuote: string;
    favoriteFood: string;
    schedule: NPCSchedule;
    defaultMood: string;
    webhookUrl: string;
    bannerUrl?: string;
    embedColor?: string;
    
    // NPC Studio Fields
    nickname?: string;
    pronouns?: string;
    tagline?: string;
    embedDesigner?: any;
    typography?: any;
    sectionsManager?: any;
    relationshipConfig?: any;
    badges?: NPCBadge[];
    statistics?: NPCStatistic[];
    lore?: NPCLore;
    promptConfig?: NPCPromptConfig;
    customFavorites?: Record<string, string>;
}

import fs from 'fs';
import path from 'path';

const npcsFilePath = path.join(__dirname, '../data/npcs.json');

export let NPCS: NPC[] = [];

export function loadNPCs() {
    try {
        const data = fs.readFileSync(npcsFilePath, 'utf8');
        NPCS = JSON.parse(data);
    } catch (e) {
        console.error("Failed to load NPCs:", e);
        NPCS = [];
    }
}

export function saveNPCs() {
    try {
        fs.writeFileSync(npcsFilePath, JSON.stringify(NPCS, null, 4), 'utf8');
    } catch (e) {
        console.error("Failed to save NPCs:", e);
    }
}

// Initial load
loadNPCs();
