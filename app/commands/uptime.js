export const meta = {
  name: 'up',
  aliases: ['uptime', 'ping'],
  version: '1.0.0',
  author: 'ShawnDesu',
  description: "Shows the bot's uptime with a personalized greeting.",
  guide: [''],
  cooldown: 5,
  type: 'anyone',
  category: 'system',
};

export async function onStart({ response, from }) {
  let name = from?.first_name || 'Master';
  if (from?.last_name) name += ` ${from.last_name}`;

  let s = Math.floor(process.uptime());
  const d = Math.floor(s / 86400); s %= 86400;
  const h = Math.floor(s / 3600);  s %= 3600;
  const m = Math.floor(s / 60);    s %= 60;

  const parts = [];
  if (d) parts.push(`${d} day${d !== 1 ? 's' : ''}`);
  if (h || d) parts.push(`${h} hour${h !== 1 ? 's' : ''}`);
  if (m || h || d) parts.push(`${m} minute${m !== 1 ? 's' : ''}`);
  parts.push(`${s} second${s !== 1 ? 's' : ''}`);

  const upStr = parts.join(', ').replace(/, ([^,]*)$/, ' and $1');
  await response.reply(`🟢 Greetings ${name}, I've been running for ${upStr}.`);
}
