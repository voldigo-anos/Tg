/**
 * Developer Mode (Maintenance)
 * Toggles global maintenance mode — only developers can use the bot when active.
 * State is persisted to json/config.json and hot-reloaded by Reze's watcher.
 */
import fs   from 'fs-extra';
import path from 'path';

const CONFIG_PATH = path.resolve(process.cwd(), 'json', 'config.json');

export const meta = {
  name: 'devmode',
  version: '1.1.0',
  aliases: ['maintenance', 'maintenancemode'],
  description: 'Toggle Global Maintenance Mode.',
  author: 'AjiroDesu',
  prefix: 'both',
  category: 'system',
  type: 'developer',
  cooldown: 5,
  guide: ['[on | off]']
};

async function setMaintenance(value) {
  global.Reze.config.maintenance = value;
  const raw = await fs.readFile(CONFIG_PATH, 'utf8');
  const cfg = JSON.parse(raw);
  cfg.maintenance = value;
  await fs.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

export async function onStart({ args, response }) {
  const state = args[0]?.toLowerCase();
  const current = !!global.Reze.config.maintenance;

  if (state === 'on' || state === 'enable') {
    if (current) return response.reply('🚧 **Maintenance is already ACTIVE.**');
    await setMaintenance(true);
    return response.reply(
      '🚧 **Maintenance Mode Enabled**\n\n' +
      'The bot is now locked for regular users.\n' +
      'Only developers can execute commands.'
    );
  }

  if (state === 'off' || state === 'disable') {
    if (!current) return response.reply('🟢 **System is already ONLINE.**');
    await setMaintenance(false);
    return response.reply(
      '🟢 **Maintenance Mode Disabled**\n\n' +
      'The bot is now available for all users.'
    );
  }

  const status = current ? '🚧 ACTIVE' : '🟢 INACTIVE';
  return response.reply(`🛠️ **Maintenance Status:** ${status}`);
}
