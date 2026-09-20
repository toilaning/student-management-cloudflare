import { NextResponse } from 'next/server';

export function verifyDiscordSecret(request: Request): { authorized: boolean; response?: NextResponse } {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  const configuredSecret = process.env.DISCORD_API_SECRET || 'secret_discord_bot_key_2026';

  if (!authHeader) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'Unauthorized: Missing Authorization header' },
        { status: 401 }
      ),
    };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid Authorization format. Expected Bearer <token>' },
        { status: 401 }
      ),
    };
  }

  const token = parts[1];
  if (token !== configuredSecret) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid DISCORD_API_SECRET' },
        { status: 401 }
      ),
    };
  }

  return { authorized: true };
}
