/**
 * UID Command
 * Retrieves the Telegram User ID of the sender or the replied-to user.
 */
export const meta = {
  name: 'uid',
  version: '1.1.0',
  aliases: ['id', 'userid', 'whoami'],
  description: 'Get your user ID or the ID of the replied user.',
  author: 'AjiroDesu',
  prefix: 'both',
  category: 'utility',
  type: 'anyone',
  cooldown: 3,
  guide: []
};

export async function onStart({ event, response }) {
  try {
    // 1. Determine Target (Reply or Self)
    const target = event.reply_to_message?.from || event.from;

    // 2. Format Name (First + Last)
    const name = [target.first_name, target.last_name].filter(Boolean).join(' ') || 'Unknown User';

    // 3. Send Response
    await response.reply(
      `🆔 **User ID Lookup**\n\n` +
      `👤 **User:** ${name}\n` +
      `🔢 **ID:** \`${target.id}\``
    );

  } catch (err) {
    console.error('[UID] Error:', err);
    await response.reply('⚠️ **Error:** An error occurred while fetching the user ID.');
  }
}