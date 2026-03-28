export const meta = {
  name: 'spotify',
  aliases: ['sp', 'music', 'shazam'],
  version: '1.0.0',
  author: 'AjiroDesu',
  description: 'Search for a song and get its details and preview.',
  guide: ['<song title>'],
  cooldown: 5,
  type: 'anyone',
  category: 'music',
};

export async function onStart({ args, response, usedPrefix, usage }) {
  if (!args.length)
    return usage();

  const title = args.join(' ');

  await response.action('typing');

  let data;
  try {
    const url = `https://betadash-api-swordslush-production.up.railway.app/shazam?title=${encodeURIComponent(title)}&limit=1`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`API responded with status ${res.status}`);
    data = await res.json();
  } catch (err) {
    return response.reply(`❌ Failed to reach the music API.\n\`${err.message}\``);
  }

  if (!data?.results?.length)
    return response.reply(`🔍 No results found for **${title}**.`);

  const song = data.results[0];

  const duration = song.durationInMillis
    ? (() => {
        const totalSec = Math.floor(song.durationInMillis / 1000);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
      })()
    : 'N/A';

  const releaseYear = song.releaseDate
    ? new Date(song.releaseDate).getFullYear()
    : 'N/A';

  const genres = song.genreNames?.filter(g => g !== 'Music').join(', ') || 'N/A';

  const caption =
    `🎵 **${song.title}**\n` +
    `👤 Artist: ${song.artistName}\n` +
    `💿 Album: ${song.albumName}\n` +
    `🎭 Genre: ${genres}\n` +
    `⏱ Duration: ${duration}\n` +
    `📅 Released: ${releaseYear}`;

  const keyboardRows = [];
  if (song.appleMusicUrl) keyboardRows.push([{ text: '🍎 Apple Music', url: song.appleMusicUrl }]);

  const reply_markup = keyboardRows.length
    ? { inline_keyboard: keyboardRows }
    : undefined;

  // Send album art with song details
  if (song.thumbnail) {
    try {
      await response.upload('photo', song.thumbnail, { caption, ...(reply_markup && { reply_markup }) });
    } catch {
      await response.reply(caption, { ...(reply_markup && { reply_markup }) });
    }
  } else {
    await response.reply(caption, { ...(reply_markup && { reply_markup }) });
  }

  // Fetch and send preview as an MP3 file
  if (song.previewUrl) {
    try {
      await response.action('upload_voice');

      const audioRes = await fetch(song.previewUrl);
      if (!audioRes.ok) throw new Error(`Failed to fetch audio: ${audioRes.status}`);

      const arrayBuffer = await audioRes.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);
      const fileName    = `${song.title} - ${song.artistName}.mp3`
        .replace(/[/\\?%*:|"<>]/g, '-'); // sanitize filename

      await response.upload('audio', audioBuffer, {
        filename:    fileName,
        contentType: 'audio/mpeg',
        caption:     `🎵 ${song.title} — ${song.artistName}`,
        noReply:     true,
      });
    } catch (err) {
      await response.reply(`⚠️ Could not send audio preview.\n\`${err.message}\``);
    }
  }
}