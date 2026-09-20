import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { api } from '../api.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('lop-hoc')
  .setDescription('Tra cứu thông tin lớp học vẽ của bạn');

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
          `Chào **${interaction.user.username}**, tài khoản Discord của bạn chưa được liên kết với hồ sơ học sinh trong hệ thống đào tạo.\n\n` +
          `👉 **Cách liên kết:**\n` +
          `1. Đăng nhập vào Web Dashboard: [${webUrl}](${webUrl})\n` +
          `2. Vào mục Hồ sơ cá nhân và nhập Discord ID của bạn: \`${discordId}\`\n` +
          `3. Hoặc liên hệ quản trị viên/giáo viên để được hỗ trợ gắn mã.`
        )
        .setFooter({ text: 'Trung tâm Mỹ thuật • Hỗ trợ học viên' })
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
      const embedNoClass = new EmbedBuilder()
        .setTitle(`📚 Thông Tin Học Viên: ${student.name}`)
        .setColor(0x5865F2)
        .setDescription(`Bạn hiện chưa được xếp vào lớp học vẽ nào đang hoạt động. Vui lòng liên hệ trung tâm để kiểm tra lịch khai giảng!`)
        .setFooter({ text: `Mã học sinh: ${student.id}` })
        .setTimestamp();

      return interaction.editReply({ embeds: [embedNoClass] });
    }

    const embed = new EmbedBuilder()
      .setTitle(`🎨 LỚP HỌC CỦA ${student.name.toUpperCase()}`)
      .setColor(0x57F287) // Green
      .setDescription(`Dưới đây là danh sách các lớp học vẽ bạn đang tham gia tại trung tâm:`)
      .setFooter({ text: `Mã học sinh: ${student.id} • Trạng thái: ${student.status}` })
      .setTimestamp();

    const actionRows = [];
    const buttons = [];

    classes.forEach((cls, idx) => {
      embed.addFields({
        name: `📌 ${idx + 1}. [${cls.class_code || cls.class_id}] ${cls.class_name}`,
        value: 
          `• **Môn học:** ${cls.course_name}\n` +
          `• **Giáo viên:** ${cls.teacher_name}\n` +
          `• **Lịch học:** ${cls.schedule_days} (${cls.shift_time})\n` +
          `• **Phòng trực tiếp:** ${cls.room_id}\n` +
          `• **Phòng Discord:** [Bấm vào phòng học](${cls.meeting_link})`,
      });

      if (buttons.length < 5 && cls.meeting_link && cls.meeting_link.startsWith('http')) {
        buttons.push(
          new ButtonBuilder()
            .setLabel(`Phòng ${cls.class_code || cls.class_id}`)
            .setStyle(ButtonStyle.Link)
            .setURL(cls.meeting_link)
            .setEmoji('🔊')
        );
      }
    });

    if (buttons.length > 0) {
      actionRows.push(new ActionRowBuilder().addComponents(buttons));
    }

    return interaction.editReply({
      embeds: [embed],
      components: actionRows,
    });
  } catch (error) {
    console.error('[Command lop-hoc error]:', error);
    return interaction.editReply({
      content: `❌ Lỗi khi tra cứu lớp học: ${error.message || 'Không thể kết nối đến máy chủ API'}`,
    });
  }
}
