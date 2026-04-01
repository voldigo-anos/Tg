/**
 * Shoti Command (Reze Bot)
 * Fetches a random Shoti video from the public API and sends it with metadata.
 * Fully adapted for node-telegram-bot-api + Reze Response wrapper.
 * Reactions removed as requested.
 */
import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';

export const meta = {
  name: 'shoti',
  version: '2.2.0',
  aliases: [],
  description: 'Fetch a random video shoti.',
  author: '𝙺𝚞𝚛𝚊𝚙𝚒𝚔𝚊',
  category: 'media',
  cooldown: 10,
  guide: ['']
};

// ── Main Command ──────────────────────────────────────────────────────────────
export async function onStart({ bot, event, args, response, api }) {
  const cacheDir = path.resolve(process.cwd(), 'app', 'cache');
  const filePath = path.join(cacheDir, `shoti_${Date.now()}.mp4`);

  try {
    await fs.ensureDir(cacheDir);

    // Fetch video data from the same API
    const apiRes = await axios.get(`${api.betadash}/shoti`);
    const data = apiRes.data.result;

    const videoUrl = data.shotiurl;
    const username = data.username || '𝙽/𝙰';
    const nickname = data.nickname || '𝙽/𝙰';
    const duration = data.duration || '𝟶';
    const region   = data.region   || '𝚄𝚗𝚔𝚗𝚘𝚠𝚗';

    // Download the video
    const videoRes = await axios.get(videoUrl, { responseType: 'arraybuffer' });
    await fs.writeFile(filePath, Buffer.from(videoRes.data));

    // Build the same fancy formatted caption
    const msg =
      `╔════════════════╗\n` +
      `      🎬  𝚂𝙷𝙾𝚃𝙸 𝚁𝙴𝙿𝙻𝙰𝚈    \n` +
      `╚════════════════╝\n\n` +
      ` 👤 𝚄𝚜𝚎𝚛  : @${username}\n` +
      ` ✨ 𝙽𝚒𝚌𝚔  : ${nickname}\n` +
      ` ⏳ 𝚃𝚒𝚖𝚎  : ${duration}𝚜\n` +
      ` 📍 𝚁𝚎𝚐𝚒𝚘𝚗 : ${region}\n\n` +
      `━━━━━━━━━━━━━━━━━━`;

    // Send video with caption (Reze wrapper automatically handles reply_to_message_id in groups)
    await response.upload('video', filePath, { caption: msg });

    // Cleanup temporary file
    if (fs.existsSync(filePath)) {
      await fs.unlink(filePath);
    }

  } catch (err) {
    // Error message (same style as original, no reaction)
    const fail =
      `╔════════════════╗\n` +
      `      ⚠️  𝚂𝚈𝚂𝚃𝙴𝙼 𝙴𝚁𝚁𝙾𝚁    \n` +
      `╚════════════════╝\n\n` +
      ` ❌ 𝙸𝚗𝚏𝚘 : 𝚄𝚗𝚊𝚋𝚕𝚎 𝚝𝚘 𝚙𝚛𝚘𝚌𝚎𝚜𝚜 𝚟𝚒𝚍𝚎𝚘\n\n` +
      `━━━━━━━━━━━━━━━━━━`;

    await response.reply(fail);
  }
}