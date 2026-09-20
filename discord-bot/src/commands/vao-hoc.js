import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { api } from '../api.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('vao-hoc')
  .setDescription('Vào phòng học Discord của lớp bạn nhanh chóng');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const discordId = interaction.user.id;

  try {
    const res = await api.getStudentClass(discordId);

    if (!res.linked || !res.student) {
      const webUrl = config.webApiUrl || 'http://localhost:3000';
      const embedUnlinked = new EmbedBuilder()
        .setTitle('⚠️ Chưa Liên Kết Tài Khoản')
        .setColor(0xFEE75C) // Yellow
        .setDescription(
          `Chào **${interaction.user.username}**, bạn chưa liên kết tài khoản Discord với hồ sơ học sinh nên bot chưa xác định được lớp học của bạn.\n\n` +
          `👉 Hãy đăng nhập Web Dashboard để liên kết Discord ID: \`${discordId}\``
        )
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('🌐 Mở Web Đăng Nhập')
          .setStyle(ButtonStyle.Link)
          .setURL(`${webUrl}/login`)
      );

      return interaction.editReply({
        embeds: [embedUnlinked],
        components: [row],
      });
    }

    const { student, classes } = res;

    if (!classes || classes.length === 0) {
      return interaction.editReply({
        content: `Chào **${student.name}**, hiện tại bạn chưa có lớp học nào được xếp lịch. Vui lòng liên hệ quản trị viên!`,
      });
    }

    // Ưu tiên lớp đầu tiên hoặc lớp đang mở
    const primaryClass = classes.find(c => c.status === 'Đang mở') || classes[0];
    const meetingLink = primaryClass.meeting_link || `https://discord.com/channels/edu-center/room-${primaryClass.class_id.toLowerCase()}`;

    const embed = new EmbedBuilder()
      .setTitle(`🎨 VÀO PHÒNG HỌC: ${primaryClass.class_name}`)
      .setColor(0x57F287) // Green
      .setDescription(
        `Chào **${student.name}**, phòng học của bạn đã sẵn sàng!\n\n` +
        `• **Môn học:** ${primaryClass.course_name}\n` +
        `• **Giáo viên:** ${primaryClass.teacher_name}\n` +
        `• **Lịch học:** ${primaryClass.schedule_days} (${primaryClass.shift_time})\n\n` +
        `👉 Bấm nút xanh **"🔊 Vào Phòng Voice Học Vẽ"** bên dưới để tham gia trực tiếp ca học.`
      )
      .setFooter({ text: 'Chúc bạn có một buổi học vẽ tràn đầy cảm hứng!' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel(`🔊 Vào Phòng Voice (${primaryClass.class_code || primaryClass.class_id})`)
        .setStyle(ButtonStyle.Link)
        .setURL(meetingLink),
      new ButtonBuilder()
        .setCustomId('btn_xem_lop_hoc')
        .setLabel('📚 Xem Tất Cả Lớp')
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.editReply({
      embeds: [embed],
      components: [row],
    });
  } catch (error) {
    console.error('[Command vao-hoc error]:', error);
    return interaction.editReply({
      content: `❌ Lỗi khi lấy thông tin phòng học: ${error.message || 'Hệ thống bận'}`,
    });
  }
}
