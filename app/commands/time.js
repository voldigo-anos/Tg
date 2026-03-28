export const meta = {
  name: 'time',
  aliases: ['clock', 'date'],
  version: '1.0.0',
  author: 'AjiroDesu',
  description: 'Shows the current date and time.',
  guide: ['[timezone]'],
  cooldown: 3,
  type: 'anyone',
  category: 'utility',
};

export async function onStart({ args, response, config }) {
  const tz = args[0] || config.timezone || 'UTC';
  try {
    const now    = new Date();
    const date   = now.toLocaleDateString('en-US', { timeZone: tz, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const time   = now.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    await response.reply(`🕐 **Current Time**\n📅 ${date}\n⏰ ${time}\n🌍 Timezone: \`${tz}\``);
  } catch {
    await response.reply(`❌ Invalid timezone: \`${tz}\`\nExample: \`${config.prefix}time Asia/Manila\``);
  }
}
