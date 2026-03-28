/**
 * Developer Management Command
 * Manage bot developers (list/add/remove) — persists to json/config.json.
 */
import fs   from 'fs-extra';
import path from 'path';

const CONFIG_PATH = path.resolve(process.cwd(), 'json', 'config.json');

export const meta = {
  name: 'dev',
  version: '2.1.0',
  description: 'Manage bot developers.',
  author: 'AjiroDesu',
  prefix: 'both',
  category: 'system',
  type: 'developer',
  cooldown: 2,
  guide: [
    '(no args) - List developers',
    'add <uid/reply> - Add developer',
    'remove <uid/reply> - Remove developer'
  ]
};

// --- Helpers ---

const normalizeId = (id) => {
  if (!id) return null;
  const match = String(id).match(/-?\d+/);
  return match ? match[0] : null;
};

const resolveTarget = (event, args) => {
  if (event.reply_to_message?.from?.id) return String(event.reply_to_message.from.id);
  if (args[1]) return normalizeId(args[1]);
  return null;
};

const getUserDisplay = async (bot, userId) => {
  try {
    const chat = await bot.getChat(userId);
    const name = [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.title || 'Unknown';
    const user = chat.username ? `@${chat.username}` : null;
    return user ? `${name} (${user})` : name;
  } catch {
    return 'Unknown User';
  }
};

/** Write devID back to config.json and update in-memory config. */
async function saveDevList(list) {
  global.Reze.config.devID = list;
  const raw = await fs.readFile(CONFIG_PATH, 'utf8');
  const cfg = JSON.parse(raw);
  cfg.devID = list;
  await fs.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

// --- Handlers ---

async function handleList(bot, response) {
  const devs = global.Reze.config.devID || [];

  if (!devs.length) {
    return response.reply('👑 **Developer List**\n\n_No developers configured._');
  }

  const loading = await response.reply('🔄 **Fetching developer list...**');

  const entries = await Promise.all(devs.map(async (id, index) => {
    const name = await getUserDisplay(bot, id);
    return `${index + 1}. **${name}** \`[${id}]\``;
  }));

  await response.edit('text', loading, `👑 **Developer List**\n\n${entries.join('\n')}`);
}

async function handleModify(bot, event, args, response, action) {
  const devs    = global.Reze.config.devID || [];
  const senderId = String(event.from.id);

  if (devs.length > 0 && !devs.includes(senderId)) {
    return response.reply('⛔ **Access Denied**\nOnly existing developers can manage this list.');
  }

  const targetId = resolveTarget(event, args);
  if (!targetId) {
    return response.reply(`⚠️ **Missing Target**\nReply to a user or provide an ID.\nUsage: \`/dev ${action} <id>\``);
  }

  let updated = [...devs];
  let message = '';

  if (action === 'add') {
    if (updated.includes(targetId)) return response.reply(`ℹ️ User \`${targetId}\` is already a developer.`);
    updated.push(targetId);
    message = `✅ **Developer Added**\nUser \`${targetId}\` has been granted developer privileges.`;
  } else if (action === 'remove') {
    if (!updated.includes(targetId)) return response.reply(`ℹ️ User \`${targetId}\` is not in the developer list.`);
    updated = updated.filter(id => id !== targetId);
    message = `🗑️ **Developer Removed**\nUser \`${targetId}\` has been removed.`;
  }

  try {
    await saveDevList(updated);
    await response.reply(message);
  } catch (err) {
    await response.reply(`⚠️ **System Error**\nFailed to save: ${err.message}`);
  }
}

// --- Main ---

export async function onStart({ bot, event, args, response, usage }) {
  if (!args.length) return handleList(bot, response);

  switch (args[0].toLowerCase()) {
    case 'list': case 'ls':
      return handleList(bot, response);
    case 'add': case 'prom':
      return handleModify(bot, event, args, response, 'add');
    case 'remove': case 'rm': case 'demote':
      return handleModify(bot, event, args, response, 'remove');
    default:
      return usage();
  }
}
