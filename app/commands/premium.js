/**
 * Premium Management Command
 * Manage premium users (list / add / remove) — persists to json/config.json.
 * Developer-only command.
 */
import fs   from 'fs-extra';
import path from 'path';

const CONFIG_PATH = path.resolve(process.cwd(), 'json', 'config.json');

export const meta = {
  name: 'premium',
  version: '2.0.0',
  aliases: ['prem'],
  description: 'Manage premium users — list, add, or remove.',
  author: 'AjiroDesu',
  prefix: 'both',
  category: 'system',
  type: 'developer',
  cooldown: 2,
  guide: [
    '(no args) — List all premium users',
    'add <user-id | reply> — Grant premium',
    'remove <user-id | reply> — Revoke premium',
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeId(id) {
  if (!id) return null;
  const m = String(id).match(/-?\d+/);
  return m ? m[0] : null;
}

function resolveTarget(event, args) {
  if (event.reply_to_message?.from?.id) return String(event.reply_to_message.from.id);
  if (args[1]) return normalizeId(args[1]);
  return null;
}

async function getUserDisplay(bot, userId) {
  try {
    const chat = await bot.getChat(userId);
    const name = [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.title || 'Unknown';
    return chat.username ? `${name} (@${chat.username})` : name;
  } catch {
    return `User ${userId}`;
  }
}

async function savePremiumList(list) {
  global.Reze.config.premium = list;
  const raw = await fs.readFile(CONFIG_PATH, 'utf8');
  const cfg = JSON.parse(raw);
  cfg.premium = list;
  await fs.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

// ─── Sub-handlers ─────────────────────────────────────────────────────────────

async function handleList(bot, response) {
  const list = global.Reze.config.premium || [];

  if (!list.length) {
    return response.reply('\uD83D\uDC51 *Premium Users*\n\n_No premium users configured._');
  }

  const loading = await response.reply('\uD83D\uDD04 Fetching premium list\u2026');

  const entries = await Promise.all(
    list.map(async (id, i) => {
      const display = await getUserDisplay(bot, id);
      return `${i + 1}. *${display}* \`[${id}]\``;
    })
  );

  await response.edit('text', loading,
    `\uD83D\uDC51 *Premium Users* (${list.length})\n\n${entries.join('\n')}`
  );
}

async function handleModify(bot, event, args, response, action) {
  const list     = [...(global.Reze.config.premium || [])];
  const targetId = resolveTarget(event, args);

  if (!targetId) {
    return response.reply(
      `\u26A0\uFE0F *Missing Target*\nReply to a user or provide a user ID.\n` +
      `Usage: \`/premium ${action} <id>\``
    );
  }

  if (action === 'add') {
    if (list.includes(targetId))
      return response.reply(`\u2139\uFE0F User \`${targetId}\` already has Premium.`);
    list.push(targetId);
    await savePremiumList(list);
    const display = await getUserDisplay(bot, targetId);
    return response.reply(
      `\u2705 *Premium Granted*\n*${display}* \`[${targetId}]\` now has premium privileges. \uD83D\uDC51`
    );
  }

  if (action === 'remove') {
    if (!list.includes(targetId))
      return response.reply(`\u2139\uFE0F User \`${targetId}\` is not in the premium list.`);
    const updated = list.filter(id => id !== targetId);
    await savePremiumList(updated);
    const display = await getUserDisplay(bot, targetId);
    return response.reply(
      `\uD83D\uDDD1\uFE0F *Premium Revoked*\n*${display}* \`[${targetId}]\` has been removed from premium.`
    );
  }
}

// ─── onStart ──────────────────────────────────────────────────────────────────

export async function onStart({ bot, event, args, response, usage }) {
  if (!args.length) return handleList(bot, response);

  switch (args[0].toLowerCase()) {
    case 'list': case 'ls':
      return handleList(bot, response);
    case 'add': case 'grant':
      return handleModify(bot, event, args, response, 'add');
    case 'remove': case 'rm': case 'del': case 'revoke':
      return handleModify(bot, event, args, response, 'remove');
    default:
      return usage();
  }
}
