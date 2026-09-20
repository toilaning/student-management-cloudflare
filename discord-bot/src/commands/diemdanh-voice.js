import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { api } from '../api.js';

export const data = new SlashCommandBuilder()
  .setName('diemdanh-voice')
  .setDescription('Điểm danh tự động các học sinh đang có mặt trong phòng Voice Channel')
  .addStringOption(option =>
    option
      .setName('ca_id')
      .setDescription('Mã ca học cần điểm danh (ví dụ: SCH0001 hoặc CA_20260920_01)')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  const caId = interaction.options.getString('ca_id');
  const member = interaction.member;

  // 1. Kiểm tra người gọi lệnh có ở trong voice channel không
  const voiceChannel = member?.voice?.channel;
  if (!voiceChannel) {
    return interaction.reply({
      content: '❌ Bạn phải đang tham gia vào một Voice Channel lớp học để thực hiện điểm danh!',
      ephemeral: true,
    });
  }

  await interaction.deferReply();

  try {
    // 2. Lấy danh sách thành viên trong voice channel (loại bỏ bot)
    const voiceMembers = voiceChannel.members.filter(m => !m.user.bot);
    const presentDiscordIds = voiceMembers.map(m => m.user.id);

    // 3. Chuẩn bị mốc thời gian điểm danh theo format YYYY-MM-DD HH:mm:ss
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const checkinTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    // 4. Gửi batch điểm danh lên Web API
    const result = await api.submitVoiceAttendance({
      ca_id: caId,
      checkin_time: checkinTime,
      method: 'BOT_VOICE',
      present_discord_ids: presentDiscordIds,
    });

    // 5. Soạn Embed kết quả
    const embed = new EmbedBuilder()
      .setTitle(`📋 KẾT QUẢ ĐIỂM DANH VOICE - CA HỌC: ${caId}`)
      .setColor(result.present_count > 0 ? 0x22c55e : 0xeab308)
      .setDescription(`Phòng Voice: **${voiceChannel.name}**\nThời gian quét: **${checkinTime}**`)
      .addFields(
        {
          name: `✅ Có mặt (${result.present_count || 0})`,
          value: result.present_students?.length > 0
            ? result.present_students.map(s => `• ${s.name} ${s.discord_id ? `(<@${s.discord_id}>)` : ''}`).join('\n')
            : '*(Không có)*',
          inline: true,
        },
        {
          name: `❌ Vắng mặt (${result.absent_count || 0})`,
          value: result.absent_students?.length > 0
            ? result.absent_students.map(s => `• ${s.name} ${s.discord_id ? `(<@${s.discord_id}>)` : ''}`).join('\n')
            : '*(Không có)*',
          inline: true,
        }
      )
      .setFooter({ text: 'Student Management Attendance System • Powered by Discord Bot' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[Command diemdanh-voice error]:', error);
    await interaction.editReply({
      content: `❌ Lỗi khi thực hiện điểm danh: ${error.message || 'Không thể kết nối đến Web API'}`,
    });
  }
}
