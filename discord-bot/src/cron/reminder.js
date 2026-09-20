import cron from 'node-cron';
import { EmbedBuilder } from 'discord.js';
import { config } from '../config.js';
import { api } from '../api.js';

/**
 * Setup and start the automated deadline reminder cron job
 * @param {import('discord.js').Client} client 
 */
export function setupReminderCron(client) {
  // Chạy định kỳ mỗi 60 phút (hoặc lúc 09:00 và 20:00 hàng ngày)
  // Biểu thức: "0 * * * *" chạy vào đầu mỗi giờ
  const cronExpression = '0 * * * *';

  cron.schedule(cronExpression, async () => {
    console.log('[Cron Reminder] Checking pending tasks for upcoming deadlines...');
    await checkAndSendReminders(client);
  }, {
    timezone: config.timezone,
  });

  console.log(`[Cron Reminder] Scheduled with pattern "${cronExpression}" (Timezone: ${config.timezone})`);
}

/**
 * Core function to check and send reminders
 * @param {import('discord.js').Client} client 
 */
export async function checkAndSendReminders(client) {
  if (!config.reminderChannelId) {
    console.warn('[Cron Reminder Warning] DISCORD_REMINDER_CHANNEL_ID is not configured.');
    return;
  }

  try {
    const channel = await client.channels.fetch(config.reminderChannelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      console.warn(`[Cron Reminder Warning] Cannot find text channel with ID: ${config.reminderChannelId}`);
      return;
    }

    // 1. Gọi Web API lấy danh sách bài tập sắp đến hạn (<24h)
    const result = await api.getPendingTasks(24);
    const tasks = result.tasks || [];

    if (tasks.length === 0) {
      console.log('[Cron Reminder] No pending tasks approaching deadline.');
      return;
    }

    // 2. Duyệt qua từng bài tập và gửi thông báo nhắc nhở
    for (const task of tasks) {
      const hoursLeft = task.hours_left;
      const isUrgent = hoursLeft <= 4;
      const pendingStudents = task.pending_students || [];

      if (pendingStudents.length === 0) continue;

      // Chuẩn bị danh sách tag Discord của các bạn chưa nộp
      const tags = pendingStudents.map(st => `<@${st.discord_id}>`).join(' ');

      // Format ngày giờ hạn chót
      const deadlineDate = new Date(task.deadline);
      const deadlineStr = deadlineDate.toLocaleString('vi-VN', {
        timeZone: config.timezone,
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      const submissionChannelTag = config.submissionChannelId ? `<#${config.submissionChannelId}>` : 'kênh nộp bài tập';

      const embed = new EmbedBuilder()
        .setTitle(isUrgent ? '🚨 CẢNH BÁO KHẨN CẤP: SẮP HẾT HẠN NỘP BÀI VẼ!' : '⏰ NHẮC NHỞ HẠN CHÓT NỘP BÀI TẬP!')
        .setColor(isUrgent ? 0xef4444 : 0xf59e0b)
        .setDescription(
          `📌 **Bài tập:** ${task.task_title}\n` +
          `⏱️ **Hạn chót:** \`${deadlineStr}\` (còn lại khoảng **${hoursLeft > 0 ? `${hoursLeft} giờ` : 'đã đến giờ'}**)\n\n` +
          `👥 **Danh sách học sinh chưa nộp bài (${pendingStudents.length}):**\n` +
          `${pendingStudents.map((s, idx) => `${idx + 1}. ${s.student_name} (<@${s.discord_id}>)`).join('\n')}\n\n` +
          `🎨 *Lời dặn: Các bạn vui lòng đăng ảnh bài vẽ vào ${submissionChannelTag} trước thời hạn để được tính điểm danh và nhận xét chuyên môn nhé!*`
        )
        .setFooter({ text: 'Student Management Reminder Service • Auto Bot' })
        .setTimestamp();

      await channel.send({
        content: `🔔 Nhắc nhở nộp bài tập: ${tags}`,
        embeds: [embed],
      });
    }
  } catch (error) {
    console.error('[Cron Reminder Error]:', error);
  }
}
