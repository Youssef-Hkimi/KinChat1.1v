import { Client } from 'discord.js';

export function getCommandMention(client: Client, name: string): string {
    const cmd = client.application?.commands.cache.find(c => c.name === name);
    return cmd ? `</${name}:${cmd.id}>` : `\`/${name}\``;
}
