/**
 * Request Premium Command
 * Allows users to submit a request for premium access to the bot developers.
 */
export const meta = {
  name: 'requestpremium',
  version: '2.0.0',
  aliases: ['reqpremium', 'premiumrequest'],
  description: 'Submit a request for Premium access to the developers.',
  author: 'AjiroDesu',
  category: 'system',
  type: 'anyone',
  cooldown: 120,
  guide: ['<reason / message>'],
  prefix: 'both',
};

export async function onStart({ event, args, response, usage }) {
  if (!args.length) return usage();

  const text = args.join(' ').trim();
  const devs = global.Reze.config.devID || [];

  if (!devs.length) {
    return response.reply(
      '\u26A0\uFE0F *System Error*\nNo developers are configured to receive this request.'
    );
  }

  const from     = event.from;
  const name     = [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Unknown';
  const username = from.username ? `@${from.username}` : 'No username';
  const userId   = from.id;

  const notification =
    `\uD83D\uDCE9 *Premium Access Request*\n\n` +
    `\uD83D\uDC64 *User:* ${name}\n` +
    `\uD83C\uDFF7\uFE0F *Username:* ${username}\n` +
    `\uD83C\uDD94 *ID:* \`${userId}\`\n\n` +
    `\uD83D\uDCDD *Message:*\n_${text}_`;

  try {
    await response.forDev(notification);
    await response.reply(
      '\u2705 *Request Sent!*\n' +
      'Your request for Premium access has been forwarded to the developers for review.\n\n' +
      '_We will get back to you soon. Please be patient!_ \uD83D\uDE4F'
    );
  } catch (err) {
    console.error('[requestpremium] Error:', err.message);
    await response.reply(`\u26A0\uFE0F *Error:* Failed to send request.\n\`${err.message}\``);
  }
}
