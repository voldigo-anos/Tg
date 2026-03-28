export const meta = {
  name: 'welcome',
  version: '2.0.0',
  author: 'AjiroDesu',
  description: 'Welcomes new members to the group with a rich greeting.',
  category: 'events',
};

export async function onEvent({ event, response, config }) {
  // NOTE: In onEvent callbacks, `event` is the resolved Telegram message object.
  // Do NOT use event.message — that property is undefined here.
  if (!event?.new_chat_members?.length) return;

  for (const member of event.new_chat_members) {
    if (member.is_bot) continue;

    const firstName = member.first_name || '';
    const lastName  = member.last_name  ? ` ${member.last_name}` : '';
    const fullName  = `${firstName}${lastName}`.trim() || 'there';
    const mention   = member.username ? `@${member.username}` : `**${fullName}**`;
    const group     = event.chat?.title || 'this group';
    const prefix    = config?.prefix || '/';

    const lines = [
      `🎉 **Welcome to ${group}!**`,
      ``,
      `Hey ${mention}, we're glad you're here! 👋`,
      ``,
      `🤖 **I'm Reze** — your multipurpose AI assistant.`,
      `Type \`${prefix}help\` to explore everything I can do.`,
      ``,
      `Feel free to introduce yourself and enjoy your stay! 🌟`,
    ];

    try {
      await response.send(lines.join('\n'));
    } catch (e) {
      console.error('[welcome] Failed to send welcome message:', e.message);
    }
  }
}
