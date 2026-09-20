import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from discord-bot folder or fallback to root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  token: process.env.DISCORD_BOT_TOKEN || '',
  clientId: process.env.DISCORD_CLIENT_ID || '',
  guildId: process.env.DISCORD_GUILD_ID || '',
  webApiUrl: (process.env.WEB_API_URL || 'http://localhost:3000').replace(/\/$/, ''),
  discordApiSecret: process.env.DISCORD_API_SECRET || 'secret_discord_bot_key_2026',
  submissionChannelId: process.env.DISCORD_SUBMISSION_CHANNEL_ID || process.env.HOMEWORK_CHANNEL_ID || '',
  reminderChannelId: process.env.DISCORD_REMINDER_CHANNEL_ID || process.env.REMINDER_CHANNEL_ID || '',
  timezone: process.env.TIMEZONE || 'Asia/Ho_Chi_Minh',
};

export function validateConfig() {
  const missing = [];
  if (!config.token) missing.push('DISCORD_BOT_TOKEN');
  if (!config.webApiUrl) missing.push('WEB_API_URL');
  if (!config.discordApiSecret) missing.push('DISCORD_API_SECRET');

  if (missing.length > 0) {
    console.warn(`[Config Warning] Missing environment variables: ${missing.join(', ')}`);
  }
  return missing.length === 0;
}
