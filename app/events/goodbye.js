export const meta = {
  name: 'goodbye',
  version: '2.0.0',
  author: 'AjiroDesu',
  description: 'Sends a farewell message when a member leaves the group.',
  category: 'events',
};

export async function onEvent({ event, response }) {
  // NOTE: In onEvent callbacks, `event` is the resolved Telegram message object.
  // Do NOT use event.message — that property is undefined here.
  if (!event?.left_chat_member) return;

  const m = event.left_chat_member;
  if (m.is_bot) return;

  const firstName = m.first_name || '';
  const lastName  = m.last_name  ? ` ${m.last_name}` : '';
  const fullName  = `${firstName}${lastName}`.trim() || 'Someone';
  const mention   = m.username ? `@${m.username}` : `**${fullName}**`;

  const lines = [
    `👋 **Goodbye, ${mention}!**`,
    ``,
    `Thanks for being part of the group. We'll miss you! 💙`,
    `You're always welcome back anytime. 🚪✨`,
  ];

  try {
    await response.send(lines.join('\n'));
  } catch (e) {
    console.error('[goodbye] Failed to send goodbye message:', e.message);
  }
}
