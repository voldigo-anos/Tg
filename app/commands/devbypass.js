/**
 * Maintenance Bypass (Dev Whitelist)
 * Allows specific commands to be used by everyone during Global Maintenance.
 * State is persisted to json/config.json.
 */
import fs   from 'fs-extra';
import path from 'path';

const CONFIG_PATH = path.resolve(process.cwd(), 'json', 'config.json');

export const meta = {
  name: 'devbypass',
  version: '1.0.0',
  aliases: ['ignoremaintenance', 'devwhitelist', 'ignoredev'],
  description: 'Whitelist commands to bypass Maintenance Mode.',
  author: 'AjiroDesu',
  prefix: 'both',
  category: 'developer',
  type: 'developer',
  cooldown: 3,
  guide: [
    'add <command> — Allow a command during maintenance',
    'del <command> — Remove a command from the whitelist',
    'list — View whitelisted commands'
  ]
};

async function saveIgnoreList(list) {
  global.Reze.config.maintenanceIgnore = list;
  const raw = await fs.readFile(CONFIG_PATH, 'utf8');
  const cfg = JSON.parse(raw);
  cfg.maintenanceIgnore = list;
  await fs.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

export async function onStart({ args, response, usedPrefix }) {
  const subCommand = args[0]?.toLowerCase();
  const targetCmd  = args[1]?.toLowerCase();
  const ignoreList = global.Reze.config.maintenanceIgnore || [];

  // --- ADD ---
  if (subCommand === 'add' || subCommand === 'allow') {
    if (!targetCmd) return response.reply('⚠️ **Missing Argument**\nPlease specify the command name to whitelist.');

    const commandExists =
      global.Reze.commands.has(targetCmd) ||
      [...global.Reze.commands.values()].some(c => c.meta?.aliases?.includes(targetCmd));

    if (!commandExists) return response.reply(`⚠️ **Unknown Command**\n\`${targetCmd}\` does not exist in the bot's system.`);
    if (ignoreList.includes(targetCmd)) return response.reply(`ℹ️ \`${targetCmd}\` is already whitelisted.`);

    await saveIgnoreList([...ignoreList, targetCmd]);
    return response.reply(`✅ **Whitelisted**\nEveryone can now use \`${targetCmd}\` during Maintenance.`);
  }

  // --- DELETE ---
  if (subCommand === 'del' || subCommand === 'remove' || subCommand === 'rm') {
    if (!targetCmd) return response.reply('⚠️ **Missing Argument**\nPlease specify the command name to remove.');
    if (!ignoreList.includes(targetCmd)) return response.reply(`ℹ️ \`${targetCmd}\` is not in the whitelist.`);

    await saveIgnoreList(ignoreList.filter(cmd => cmd !== targetCmd));
    return response.reply(`🗑️ **Removed**\n\`${targetCmd}\` is now blocked during Maintenance.`);
  }

  // --- LIST ---
  if (subCommand === 'list' || subCommand === 'show') {
    if (!ignoreList.length) {
      return response.reply('📂 **Whitelist Empty**\nNo exceptions set. Maintenance Mode blocks everything.');
    }
    return response.reply(
      '🚧 **Maintenance Exceptions**\n' +
      'These commands work even when Maintenance is ON:\n\n' +
      ignoreList.map(c => `• \`${c}\``).join('\n')
    );
  }

  return response.reply(`❓ **Usage:** \`${usedPrefix}devbypass [add | del | list]\``);
}
