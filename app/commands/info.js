export const meta = {
  name: 'info',
  aliases: ['about', 'botinfo'],
  version: '1.0.0',
  author: 'AjiroDesu',
  description: 'Shows information about Reze Bot.',
  guide: [''],
  cooldown: 5,
  type: 'anyone',
  category: 'system',
};

export async function onStart({ response, config }) {
  const { commands } = global.Reze;
  const tz  = config.timezone || 'UTC';
  const now = new Date().toLocaleString('en-US', { timeZone: tz });

  let s = Math.floor(process.uptime());
  const h = Math.floor(s / 3600); s %= 3600;
  const m = Math.floor(s / 60);   s %= 60;
  const upStr = `${h}h ${m}m ${s}s`;

  const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

  await response.reply(
    `🤖 **Reze Bot**\n` +
    `👨‍💻 **Developer:** ${config.developer || 'AjiroDesu'}\n` +
    `📦 **Commands:** ${commands.size} loaded\n` +
    `⏱️ **Uptime:** ${upStr}\n` +
    `🧠 **Memory:** ${mem} MB\n` +
    `🕐 **Server Time:** ${now}\n` +
    `🌍 **Timezone:** ${tz}\n` +
    `⚙️ **AI Engine:** Groq (${config.groqModel || 'llama-3.3-70b-versatile'})\n\n` +
    `Type \`${config.prefix}help\` to see all commands.`
  );
}
