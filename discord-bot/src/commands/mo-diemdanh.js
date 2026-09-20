import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('mo-diemdanh')
  .setDescription('Mở phiên điểm danh 1-Click bằng nút bấm cho ca học')
  .addStringOption(option =>
    option
      .setName('ca_id')
      .setDescription('Mã ca học (ví dụ: SCH0001 hoặc CA_20260920_01)')
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option
      .setName('phut')
      .setDescription('Thời gian mở điểm danh (phút, mặc định 15 phút)')
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  const caId = interaction.options.getString('ca_id');
  const durationMinutes = interaction.options.getInteger('phut') || 15;
  const expiredAtTimestamp = Date.now() + durationMinutes * 60 * 1000;
  const expiredTimeStr = new Date(expiredAtTimestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  // 1. Tạo Nút bấm Điểm danh
  const checkinButton = new ButtonBuilder()
    .setCustomId(`btn_checkin_${caId}_${expiredAtTimestamp}`)
    .setLabel('✅ Điểm Danh Ca Học')
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder().addComponents(checkinButton);

  // 2. Tạo Embed thông báo
  const embed = new EmbedBuilder()
    .setTitle(`📢 MỞ PHIÊN ĐIỂM DANH: ${caId}`)
    .setColor(0x3b82f6)
    .setDescription(
      `Phiên điểm danh cho Ca học **${caId}** đã được mở!\n\n` +
      `👉 Vui lòng nhấn vào nút **"✅ Điểm Danh Ca Học"** bên dưới để ghi nhận có mặt.\n` +
      `⏱️ Thời hạn điểm danh: **${durationMinutes} phút** (hết hạn lúc **${expiredTimeStr}**).`
    )
    .setFooter({ text: 'Hệ thống điểm danh tự động • Vui lòng không spam nút bấm' })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    components: [row],
  });
}
