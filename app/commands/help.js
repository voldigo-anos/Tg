const PAGE_SIZE = 8;

// ─── Access Filter ────────────────────────────────────────────────────────────
// Mirrors the role system in handlerEvent.js:
//   role 2 = developer, role 1 = premium, role 0 = anyone
//
// meta.type rules:
//   "hidden"        — never shown in help/menu (but still executable)
//   "private"       — only shown & accessible in private chat
//   "group"         — only shown & accessible in group chats
//   "administrator" — shown & accessible to group admins + developers
//   "admin"         — alias for "administrator"
//   "developer"     — developer only
//   "premium"       — premium + developer
//   "anyone"        — no restriction
function hasAccess(cmd, { role, isGroup, isAdmin = false }) {
  const type = (cmd.meta?.type     || 'anyone').toLowerCase();
  const cat  = (cmd.meta?.category || 'system').toLowerCase();

  // Always hide "hidden" type — never appears in help or menu
  if (type === 'hidden' || cat === 'hidden') return false;

  // Context filtering — strict for everyone including devs
  if ((type === 'group' || cat === 'group') && !isGroup) return false;
  if ((type === 'private' || cat === 'private') && isGroup) return false;

  // Administrator / admin — group admins and developers
  // In groups: visible to admins + devs. In private: visible to devs only.
  if (type === 'administrator' || type === 'admin') {
    if (!isGroup) return role >= 2;         // private: developer only
    return isAdmin || role >= 2;            // group: admin or developer
  }

  // Role filtering
  if (type === 'developer' || cat === 'developer') return role >= 2;
  if (type === 'premium'   || cat === 'premium')   return role >= 1;

  return true;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getRole(senderID) {
  const { devID = [], premium = [] } = global.Reze.config;
  const id = String(senderID);
  if (devID.includes(id))   return 2;
  if (premium.includes(id)) return 1;
  return 0;
}

// Check if the user is a group admin/creator via Telegram API
async function isGroupAdmin(bot, chatId, userId) {
  try {
    const member = await bot.getChatMember(chatId, userId);
    return ['administrator', 'creator'].includes(member.status);
  } catch {
    return false;
  }
}

// ─── Views ────────────────────────────────────────────────────────────────────
function buildCommandInfo(cmd, prefix) {
  const m      = cmd.meta;
  const guides = Array.isArray(m.guide) ? m.guide : [m.guide || ''];
  const usage  = guides.map(g => g ? `${prefix}${m.name} ${g}` : `${prefix}${m.name}`).join('\n');
  const aliases = m.aliases?.length ? m.aliases.map(a => `\`${a}\``).join(', ') : 'None';

  return (
    `🛠️ **COMMAND INTERFACE**\n\n` +
    `▫️ **Name:** \`${m.name}\`\n` +
    `▫️ **Version:** \`v${m.version || '1.0.0'}\`\n` +
    `▫️ **Category:** \`${(m.category || 'system').toUpperCase()}\`\n` +
    `▫️ **Type:** \`${(m.type || 'anyone').toUpperCase()}\`\n` +
    `▫️ **Cooldown:** ${m.cooldown ?? 1}s\n` +
    `▫️ **Aliases:** ${aliases}\n\n` +
    `📝 **Description:**\n${m.description || 'No description available.'}\n\n` +
    `🕹️ **Usage:**\n\`\`\`\n${usage}\n\`\`\``
  );
}

function buildTreeView(commands, prefix) {
  const cats = {};
  for (const cmd of commands) {
    const cat = (cmd.meta?.category || 'uncategorized').toUpperCase();
    if (!cats[cat]) cats[cat] = [];
    cats[cat].push(cmd.meta.name);
  }

  const sorted = Object.keys(cats).sort();
  let tree = '📂 ROOT_SYSTEM\n';

  sorted.forEach((cat, ci) => {
    const isLastCat = ci === sorted.length - 1;
    tree += `${isLastCat ? '└──' : '├──'} 📁 ${cat}\n`;

    const cmds = [...cats[cat]].sort();
    const pad  = isLastCat ? '    ' : '│   ';

    cmds.forEach((name, ni) => {
      const isLastCmd = ni === cmds.length - 1;
      tree += `${pad}${isLastCmd ? '└──' : '├──'} ${prefix}${name}\n`;
    });

    if (!isLastCat) tree += '│\n';
  });

  return (
    `🤖 **REZE SYSTEM TREE**\n\n` +
    `\`\`\`\n${tree}\n[ Total: ${commands.length} modules ]\n\`\`\``
  );
}

function buildPaginatedList(commands, page, prefix) {
  const sorted     = [...commands].sort((a, b) => a.meta.name.localeCompare(b.meta.name));
  const total      = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current    = Math.min(Math.max(page, 1), totalPages);
  const slice      = sorted.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const items = slice
    .map(c => `▫️ \`${prefix}${c.meta.name}\`\n  ↳ ${c.meta.description || 'No description.'}`)
    .join('\n\n');

  const text = (
    `🤖 **REZE COMMAND CENTER**\n\n` +
    `${items}\n\n` +
    `📄 Page **${current}** of **${totalPages}** · ${total} commands total\n` +
    `💡 \`${prefix}help <command>\` for details · \`${prefix}help all\` for tree view`
  );

  return { text, current, totalPages };
}

function buildNavKeyboard(instanceId, current, totalPages) {
  const buttons = [];
  if (current > 1)          buttons.push({ text: '◀️ Prev', callback_data: JSON.stringify({ command: 'help', i: instanceId, p: current - 1 }) });
  if (current < totalPages) buttons.push({ text: 'Next ▶️', callback_data: JSON.stringify({ command: 'help', i: instanceId, p: current + 1 }) });
  return buttons.length ? { inline_keyboard: [buttons] } : undefined;
}

// ─── Session store — keyed by instanceId ─────────────────────────────────────
const sessions = new Map();

// ─── Meta ─────────────────────────────────────────────────────────────────────
export const meta = {
  name: 'help',
  version: '2.0.0',
  aliases: ['h', 'menu', 'cmds', 'commands', '?'],
  description: 'Browse and search available commands.',
  author: 'AjiroDesu',
  category: 'system',
  type: 'anyone',
  cooldown: 3,
  guide: ['[command | page | all]'],
};

// ─── onStart ──────────────────────────────────────────────────────────────────
export async function onStart({ args, response, config, bot, senderID, chatId, isGroup, role, usedPrefix }) {
  const { commands } = global.Reze;
  const prefix       = usedPrefix || config.prefix;
  const query        = args[0]?.toLowerCase();

  // Compute group-admin status once for this request
  let isAdmin = false;
  if (isGroup && role < 2) {
    isAdmin = await isGroupAdmin(bot, chatId, senderID);
  }

  const ctx = { role, isGroup, isAdmin };

  // 1. Specific command details
  if (query && !['all', '-all'].includes(query) && isNaN(query)) {
    let cmd = commands.get(query);
    if (!cmd) cmd = [...commands.values()].find(c => c.meta?.aliases?.includes(query));

    if (cmd && hasAccess(cmd, ctx)) {
      return response.reply(buildCommandInfo(cmd, prefix));
    }
    return response.reply(`❌ Command \`${query}\` not found or not available here.`);
  }

  // Filter commands by access
  const visible = [...commands.values()].filter(c => hasAccess(c, ctx));

  // 2. Tree view
  if (['all', '-all'].includes(query)) {
    return response.reply(buildTreeView(visible, prefix));
  }

  // 3. Paginated list
  const page = parseInt(query) || 1;
  const data  = buildPaginatedList(visible, page, prefix);

  const instanceId = `h_${Date.now()}_${senderID}`;
  const markup     = buildNavKeyboard(instanceId, data.current, data.totalPages);

  if (markup) {
    sessions.set(instanceId, { uid: senderID, prefix });
    // Auto-expire session after 10 minutes
    setTimeout(() => sessions.delete(instanceId), 10 * 60 * 1000);
  }

  await response.reply(data.text, markup ? { reply_markup: markup } : {});
}

// ─── onCallback ───────────────────────────────────────────────────────────────
export async function onCallback({ bot, callbackQuery, payload, response, chatId, messageId, senderID, isGroup, role }) {
  const { commands } = global.Reze;

  if (!payload?.i) {
    return response.answerCallback(callbackQuery, { text: '❌ Invalid request.', show_alert: true });
  }

  const session = sessions.get(payload.i);
  if (!session) {
    return response.answerCallback(callbackQuery, { text: '⏰ Session expired. Use /help again.', show_alert: true });
  }

  // Only the original requester can navigate pages
  if (String(senderID) !== String(session.uid)) {
    return response.answerCallback(callbackQuery, { text: '⛔ Only the requester can navigate.', show_alert: true });
  }

  // Re-evaluate role and admin status for the clicking user in current context
  let isAdmin = false;
  if (isGroup && role < 2) {
    isAdmin = await isGroupAdmin(bot, chatId, senderID);
  }

  const ctx     = { role, isGroup, isAdmin };
  const visible = [...commands.values()].filter(c => hasAccess(c, ctx));
  const data    = buildPaginatedList(visible, payload.p || 1, session.prefix);
  const markup  = buildNavKeyboard(payload.i, data.current, data.totalPages);

  try {
    await response.edit('text', messageId, data.text, {
      reply_markup: markup || { inline_keyboard: [] },
      parse_mode: 'Markdown',
    });
    await response.answerCallback(callbackQuery, { text: `Page ${data.current} of ${data.totalPages}` });
  } catch {
    await response.answerCallback(callbackQuery);
  }
}