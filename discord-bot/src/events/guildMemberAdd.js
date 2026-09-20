import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { config } from '../config.js';

export async function handleGuildMemberAdd(member) {
  try {
    const webUrl = config.webApiUrl || 'http://localhost:3000';

    const embed = new EmbedBuilder()
      .setTitle('🎨 CHÀO MỪNG ĐẾN VỚI TRUNG TÂM MỸ THUẬT & LUYỆN VẼ!')
      .setColor(0x5865F2)
      .setDescription(
        `Xin chào **${member.user.username}**, chào mừng bạn đã gia nhập máy chủ Discord của Trung tâm Mỹ thuật & Luyện vẽ trực tuyến!\n\n` +
        `Để bắt đầu buổi học thuận lợi nhất, bạn vui lòng hoàn thành 2 bước khởi đầu:\n` +
        `1. **Liên kết tài khoản**: Cập nhật Discord ID của bạn (\`${member.id}\`) trên Web Dashboard hoặc dùng lệnh \`/dinh-huong\`.\n` +
        `2. **Xem cẩm nang học vẽ**: Nắm rõ cách điểm danh tự động qua Voice channel và cách nộp bài tập vẽ tại kênh \`#nop-bai-tap\`.\n\n` +
        `Bấm các nút thao tác nhanh bên dưới để bắt đầu ngay nhé!`
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setFooter({ text: 'Chúc bạn có những trải nghiệm học tập và sáng tạo tuyệt vời!' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_mo_dinh_huong')
        .setLabel('📖 Cẩm Nang Học Vẽ')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎨'),
      new ButtonBuilder()
        .setLabel('🔗 Liên Kết Tài Khoản')
        .setStyle(ButtonStyle.Link)
        .setURL(`${webUrl}/login`),
      new ButtonBuilder()
        .setCustomId('btn_vao_hoc_nhanh')
        .setLabel('🔊 Vào Phòng Học')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🎧')
    );

    // 1. Thử tìm kênh chào mừng trong Guild (#chao-mung, #welcome, #general)
    let welcomeChannel = member.guild.channels.cache.find(
      ch => ch.isTextBased() && (ch.name.includes('chao-mung') || ch.name.includes('welcome') || ch.name.includes('chung'))
    );

    if (welcomeChannel) {
      await welcomeChannel.send({
        content: `Chào đón thành viên mới <@${member.id}>! 🎉`,
        embeds: [embed],
        components: [row],
      });
    } else {
      // 2. Gửi Direct Message cho thành viên nếu không tìm thấy kênh chào mừng
      await member.send({
        embeds: [embed],
        components: [row],
      }).catch(err => {
        console.warn(`[guildMemberAdd] Không thể gửi DM cho ${member.user.tag}:`, err.message);
      });
    }
  } catch (error) {
    console.error('[guildMemberAdd Error]:', error);
  }
}
