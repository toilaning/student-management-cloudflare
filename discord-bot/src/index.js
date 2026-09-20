import { Client, GatewayIntentBits, Collection, Partials, REST, Routes } from 'discord.js';
import { config, validateConfig } from './config.js';
import * as diemdanhVoiceCmd from './commands/diemdanh-voice.js';
import * as moDiemdanhCmd from './commands/mo-diemdanh.js';
import * as dinhHuongCmd from './commands/dinh-huong.js';
import * as huongDanCmd from './commands/huong-dan.js';
import * as lopHocCmd from './commands/lop-hoc.js';
import * as vaoHocCmd from './commands/vao-hoc.js';
import { handleInteraction } from './events/interactionCreate.js';
import { handleMessageCreate } from './events/messageCreate.js';
import { handleGuildMemberAdd } from './events/guildMemberAdd.js';
import { setupReminderCron } from './cron/reminder.js';

console.log('--- KHỞI ĐỘNG STUDENT MANAGEMENT DISCORD BOT ---');
validateConfig();

// Khởi tạo Discord Client với đầy đủ Intents cần thiết
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Đăng ký Commands
client.commands = new Collection();
const commands = [
  diemdanhVoiceCmd,
  moDiemdanhCmd,
  dinhHuongCmd,
  huongDanCmd,
  lopHocCmd,
  vaoHocCmd,
];

commands.forEach(cmd => {
  client.commands.set(cmd.data.name, cmd);
});

// Sự kiện Ready
client.once('ready', async () => {
  console.log(`✅ Discord Bot đã đăng nhập thành công với tài khoản: ${client.user.tag}`);
  client.user.setActivity('Định hướng & Quản lý lớp học', { type: 3 }); // Watching

  // Đăng ký Slash Commands với Discord API nếu có thông tin clientId & token
  if (config.token && config.clientId) {
    try {
      const rest = new REST({ version: '10' }).setToken(config.token);
      const slashCommandsData = commands.map(c => c.data.toJSON());

      if (config.guildId) {
        // Guild commands (cập nhật tức thì cho test server)
        await rest.put(
          Routes.applicationGuildCommands(config.clientId, config.guildId),
          { body: slashCommandsData }
        );
        console.log(`✅ Đã đồng bộ ${slashCommandsData.length} Slash Commands cho Guild: ${config.guildId}`);
      } else {
        // Global commands
        await rest.put(
          Routes.applicationCommands(config.clientId),
          { body: slashCommandsData }
        );
        console.log(`✅ Đã đồng bộ ${slashCommandsData.length} Slash Commands toàn hệ thống`);
      }
    } catch (err) {
      console.error('❌ Lỗi khi đồng bộ Slash Commands:', err.message);
    }
  }

  // Khởi chạy cron job nhắc nhở hạn nộp bài tập
  setupReminderCron(client);
});

// Sự kiện Interaction (Slash commands & Button 1-Click / Orientation)
client.on('interactionCreate', async interaction => {
  await handleInteraction(interaction);
});

// Sự kiện Message (Lắng nghe bài tập vẽ nộp tại kênh #nop-bai-tap)
client.on('messageCreate', async message => {
  await handleMessageCreate(message);
});

// Sự kiện Thành viên mới tham gia Guild (Chào mừng & Cẩm nang định hướng)
client.on('guildMemberAdd', async member => {
  await handleGuildMemberAdd(member);
});

// Đăng nhập Bot
if (config.token) {
  client.login(config.token).catch(err => {
    console.error('❌ Không thể kết nối tới Discord Gateway:', err.message);
  });
} else {
  console.warn('⚠️ DISCORD_BOT_TOKEN chưa được cấu hình. Vui lòng cấu hình file discord-bot/.env để chạy bot thật.');
}

export { client };
