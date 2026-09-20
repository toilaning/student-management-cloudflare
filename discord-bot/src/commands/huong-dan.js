import { SlashCommandBuilder } from 'discord.js';
import { execute as executeDinhHuong } from './dinh-huong.js';

export const data = new SlashCommandBuilder()
  .setName('huong-dan')
  .setDescription('Cẩm nang hướng dẫn học viên lớp vẽ và sử dụng Discord (alias của /dinh-huong)');

export async function execute(interaction) {
  return executeDinhHuong(interaction);
}
