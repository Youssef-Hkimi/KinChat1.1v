import { Response } from 'express';

class SSEManager {
    private clients: Response[] = [];

    public addClient(res: Response) {
        this.clients.push(res);
        
        res.on('close', () => {
            this.clients = this.clients.filter(client => client !== res);
        });
    }

    public broadcast(event: string, data: any) {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        for (const client of this.clients) {
            client.write(payload);
        }
    }
}

export const sseManager = new SSEManager();
