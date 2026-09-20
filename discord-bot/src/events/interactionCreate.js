import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { api } from '../api.js';
import { config } from '../config.js';
import { execute as executeDinhHuong } from '../commands/dinh-huong.js';
import { execute as executeLopHoc } from '../commands/lop-hoc.js';
import { execute as executeVaoHoc } from '../commands/vao-hoc.js';

export async function handleInteraction(interaction) {
  // 1. Xử lý Slash Command
  if (interaction.isChatInputCommand()) {
    const command = interaction.client.commands?.get(interaction.commandName);
    if (!command) {
      console.warn(`[Command Warning] No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`[Command Error] Error executing ${interaction.commandName}:`, error);
      const replyOptions = {
        content: '❌ Đã xảy ra lỗi khi thực thi lệnh này!',
        ephemeral: true,
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(replyOptions);
      } else {
        await interaction.reply(replyOptions);
      }
    }
    return;
  }

  // 2. Xử lý các Button tương tác
  if (interaction.isButton()) {
    const customId = interaction.customId;

    // 2.1 Nút xem cẩm nang định hướng
    if (customId === 'btn_mo_dinh_huong') {
      return executeDinhHuong(interaction);
    }

    // 2.2 Nút xem danh sách lớp học của học viên
    if (customId === 'btn_xem_lop_hoc') {
      return executeLopHoc(interaction);
    }

    // 2.3 Nút vào phòng học nhanh
    if (customId === 'btn_vao_hoc_nhanh') {
      return executeVaoHoc(interaction);
    }

    // 2.4 Nút bấm Điểm danh 1-Click
    if (customId.startsWith('btn_checkin_')) {
      const parts = customId.split('_');
      const expiredAtTimestamp = parseInt(parts[parts.length - 1], 10);
      const caId = parts.slice(2, parts.length - 1).join('_');

      if (Date.now() > expiredAtTimestamp) {
        return interaction.reply({
          content: '❌ Phiên điểm danh này đã kết thúc!',
          ephemeral: true,
        });
      }

      const discordId = interaction.user.id;
      const now = new Date();
      const pad = n => n.toString().padStart(2, '0');
      const checkinTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      try {
        const result = await api.submitSingleAttendance({
          ca_id: caId,
          discord_id: discordId,
          checkin_time: checkinTime,
          method: 'BOT_BUTTON',
        });

        if (result.already_checked_in) {
          return interaction.reply({
            content: `ℹ️ Bạn đã điểm danh ca này rồi lúc **${result.previous_checkin_time || result.checkin_time}**. Đã cập nhật thành công!`,
            ephemeral: true,
          });
        }

        return interaction.reply({
          content: `✅ Bạn đã điểm danh thành công lúc **${checkinTime}**! (Học sinh: **${result.student_name || interaction.user.username}**)`,
          ephemeral: true,
        });
      } catch (error) {
        console.error('[Button Checkin Error]:', error);
        if (error.message && error.message.includes('liên kết')) {
          return interaction.reply({
            content: '⚠️ Tài khoản Discord của bạn chưa được liên kết với hồ sơ học sinh. Vui lòng liên hệ giảng viên!',
            ephemeral: true,
          });
        }
        return interaction.reply({
          content: `❌ Lỗi khi điểm danh: ${error.message || 'Hệ thống bận, vui lòng thử lại sau.'}`,
          ephemeral: true,
        });
      }
    }
  }
}
