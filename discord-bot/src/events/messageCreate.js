import { config } from '../config.js';
import { api } from '../api.js';

export async function handleMessageCreate(message) {
  // 1. Bỏ qua tin nhắn từ Bot
  if (message.author.bot) return;

  // 2. Kiểm tra kênh gửi tin nhắn (theo Channel ID hoặc tên kênh có chứa 'nop-bai-tap')
  const isTargetChannel =
    (config.submissionChannelId && message.channel.id === config.submissionChannelId) ||
    (message.channel.name && message.channel.name.includes('nop-bai-tap'));

  if (!isTargetChannel) return;

  // 3. Kiểm tra xem tin nhắn có đính kèm ảnh không
  const imageAttachments = message.attachments.filter(att =>
    att.contentType ? att.contentType.startsWith('image/') : /\.(jpg|jpeg|png|webp|gif)$/i.test(att.name || '')
  );

  if (imageAttachments.size === 0) {
    // Không có file ảnh đính kèm thì bỏ qua
    return;
  }

  try {
    const discordId = message.author.id;
    const messageUrl = message.url;
    const imageUrls = imageAttachments.map(att => att.url);
    const content = message.content || '';
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const submittedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    // 4. Gọi Web API nộp bài tập
    const result = await api.submitHomework({
      discord_id: discordId,
      message_url: messageUrl,
      image_urls: imageUrls,
      content: content,
      submitted_at: submittedAt,
    });

    // 5. Thả reaction xác nhận
    await message.react('🎨').catch(e => console.warn('Cannot react 🎨:', e.message));
    await message.react('✅').catch(e => console.warn('Cannot react ✅:', e.message));

    // 6. Gửi phản hồi gắn tag học sinh và xác nhận trạng thái ĐÃ NỘP trên Web Dashboard
    await message.reply({
      content: `🎉 Chúc mừng <@${discordId}> đã nộp bài tập **"${result.task_title || 'Bài tập vẽ'}"** thành công!\n` +
               `📌 Trạng thái bài tập đã được cập nhật thành **ĐÃ NỘP** trên Web Dashboard lúc **${submittedAt}**.\n` +
               `🖼️ Số lượng bài vẽ ghi nhận: **${imageUrls.length} ảnh**. Giảng viên sẽ sớm nhận xét chuyên môn cho bạn!`,
    });
  } catch (error) {
    console.error('[Error handling homework messageCreate]:', error);
    await message.react('⚠️').catch(() => {});
    if (error.message && error.message.includes('liên kết')) {
      await message.reply({
        content: `⚠️ <@${message.author.id}> Tài khoản Discord của bạn chưa được liên kết với hồ sơ học sinh trên hệ thống. Vui lòng liên hệ giảng viên/quản trị viên để được hỗ trợ!`,
      });
    } else {
      await message.reply({
        content: `❌ Gặp lỗi khi đồng bộ bài nộp lên hệ thống: ${error.message}`,
      });
    }
  }
}
