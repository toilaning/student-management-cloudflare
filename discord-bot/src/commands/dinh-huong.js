import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('dinh-huong')
  .setDescription('Cẩm nang hướng dẫn học viên lớp vẽ và sử dụng Discord');

export async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🎨 CẨM NANG DÀNH CHO HỌC VIÊN LỚP VẼ')
    .setColor(0x5865F2) // Discord Blurple
    .setDescription('Chào mừng bạn đến với Trung tâm Mỹ thuật & Luyện vẽ trực tuyến! Dưới đây là 5 bước quan trọng giúp bạn học tập và tương tác hiệu quả nhất qua Discord:')
    .addFields(
      {
        name: '1️⃣ 🆔 Liên kết tài khoản',
        value: 'Gửi mã học sinh để bot kết nối tài khoản hệ thống (hoặc cập nhật Discord ID trên Web Dashboard cá nhân).\n👉 Cú pháp: `/lien-ket ma_hs:STxxx` hoặc bấm nút **"Xem Lớp Của Tôi"** bên dưới để kiểm tra.',
      },
      {
        name: '2️⃣ 🔊 Tham gia phòng Voice học vẽ',
        value: 'Trước giờ học 5-10 phút, học viên vào đúng phòng Voice lớp học tương ứng để xem Giáo viên livestream chia sẻ màn hình vẽ mẫu, bật mic trao đổi trực tiếp với thầy cô và các bạn.',
      },
      {
        name: '3️⃣ ⏱️ Điểm danh ca học',
        value: '• **Tự động**: Hệ thống tự động điểm danh khi bạn có mặt trong Voice Channel ca học đúng giờ (`/diemdanh-voice`).\n• **1-Click**: Bấm nút điểm danh nhanh khi giáo viên kích hoạt phiên (`/mo-diemdanh`).',
      },
      {
        name: '4️⃣ 🎨 Nộp bài tập vẽ (#nop-bai-tap)',
        value: 'Chụp hoặc xuất ảnh vẽ chất lượng cao, đính kèm vào kênh `#nop-bai-tap` kèm mã học sinh hoặc tên bài tập. Bot sẽ tự động quét, đẩy bài vẽ lên Web Dashboard và chuyển trạng thái **`ĐÃ NỘP`** cho bạn.',
      },
      {
        name: '5️⃣ 📅 Theo dõi deadline & Lịch học',
        value: 'Theo dõi hạn nộp đếm ngược, nhận xét chi tiết và thang điểm bài vẽ từ giáo viên trực tiếp trên Web Dashboard hoặc nhận thông báo nhắc nhở tự động từ Bot trước 24h và 4h.',
      }
    )
    .setFooter({ text: 'Hệ thống Quản lý Đào tạo Mỹ thuật • Hỗ trợ học viên 24/7' })
    .setTimestamp();

  const webUrl = config.webApiUrl || 'http://localhost:3000';

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_xem_lop_hoc')
      .setLabel('🔗 Xem Lớp Của Tôi')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📚'),
    new ButtonBuilder()
      .setCustomId('btn_vao_hoc_nhanh')
      .setLabel('🔊 Vào Phòng Học')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🎨'),
    new ButtonBuilder()
      .setLabel('🌐 Mở Web Dashboard')
      .setStyle(ButtonStyle.Link)
      .setURL(`${webUrl}/student/dashboard`)
  );

  return interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: false,
  });
}
