const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: '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' });

async function main() {
    const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: 'system', content: 'You are Sali. If the conversation isn\'t relevant, respond with exactly NO_REPLY.' }, { role: 'user', content: 'hello' }],
        model: "llama-3.1-8b-instant",
        temperature: 0.9,
    });
    console.log("RESPONSE:", chatCompletion.choices[0]?.message?.content);
}
main().catch(console.error);
