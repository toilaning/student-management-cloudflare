import { config } from './config.js';

/**
 * Generic fetch wrapper for Web API with Bearer token authentication
 */
async function request(endpoint, options = {}) {
  const url = `${config.webApiUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.discordApiSecret}`,
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.error || data.message || `HTTP ${response.status} ${response.statusText}`;
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * API Client methods matching Giai đoạn 3 & Orientation specification
 */
export const api = {
  /**
   * Batch voice attendance
   */
  async submitVoiceAttendance({ ca_id, checkin_time, method = 'BOT_VOICE', present_discord_ids }) {
    return request('/api/discord/attendance', {
      method: 'POST',
      body: JSON.stringify({
        ca_id,
        checkin_time,
        method,
        present_discord_ids,
      }),
    });
  },

  /**
   * Single button 1-Click attendance
   */
  async submitSingleAttendance({ ca_id, discord_id, checkin_time, method = 'BOT_BUTTON' }) {
    return request('/api/discord/attendance/single', {
      method: 'POST',
      body: JSON.stringify({
        ca_id,
        discord_id,
        checkin_time,
        method,
      }),
    });
  },

  /**
   * Submit homework art piece
   */
  async submitHomework({ discord_id, student_id, message_url, image_urls, content, submitted_at }) {
    return request('/api/discord/homework-submit', {
      method: 'POST',
      body: JSON.stringify({
        discord_id,
        student_id,
        message_url,
        image_urls,
        content,
        submitted_at,
      }),
    });
  },

  /**
   * Fetch pending tasks (<24h and <4h)
   */
  async getPendingTasks(hours = 24) {
    return request(`/api/discord/pending-tasks?hours=${hours}`, {
      method: 'GET',
    });
  },

  /**
   * Get student classes and orientation room info by discord_id or student_id
   */
  async getStudentClass(discordId, studentId) {
    const params = new URLSearchParams();
    if (discordId) params.append('discord_id', discordId);
    if (studentId) params.append('student_id', studentId);
    return request(`/api/discord/student-class?${params.toString()}`, {
      method: 'GET',
    });
  },
};
