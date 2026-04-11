import Anthropic from '@anthropic-ai/sdk';
import { config } from 'dotenv';
config({ path: '.env.local' });

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

async function main() {
    try {
        console.log("Testing Claude 4.6 API...");
        const stream = await anthropic.messages.create({
            max_tokens: 1024,
            messages: [{ role: 'user', content: 'Dis un seul mot : bonjour' }],
            model: 'claude-3-5-sonnet-20240620',
        });
        console.log("Response:", stream);
    } catch (e: any) {
        console.error("Anthropic Error:", e.name, e.message);
    }
}
main();
