/**
 * Say / TTS Command
 * Converts text to speech via Google Translate TTS.
 * Uses an in-memory session store so callback_data stays within Telegram's 64-byte limit.
 */

import axios from 'axios';
import fs    from 'fs';
import path  from 'path';
import os    from 'os';

// ─── In-memory TTS session store ─────────────────────────────────────────────
// Keyed by a short random token so we never put raw text inside callback_data,
// which is capped at 64 bytes by Telegram.
const ttsStore = new Map();

function storeTTS(text) {
  const key = Math.random().toString(36).slice(2, 10);
  ttsStore.set(key, text);
  setTimeout(() => ttsStore.delete(key), 10 * 60 * 1000); // expire in 10 min
  return key;
}

function retrieveTTS(key) {
  return ttsStore.get(key) ?? null;
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

export const meta = {
  name: 'say',
  aliases: ['tts', 'speak'],
  version: '2.0.0',
  author: 'AjiroDesu',
  description: 'Convert text to speech using Google TTS.',
  prefix: 'both',
  guide: ['<text>', '<text> | <lang-code>', '| <lang-code>  (reply to a message)'],
  cooldown: 5,
  type: 'anyone',
  category: 'utility',
};

// ─── Language data ────────────────────────────────────────────────────────────

const SUPPORTED_LANGUAGES = {
  af:'Afrikaans', sq:'Albanian', ar:'Arabic', hy:'Armenian',
  az:'Azerbaijani', eu:'Basque', be:'Belarusian', bn:'Bengali',
  bs:'Bosnian', bg:'Bulgarian', ca:'Catalan',
  zh:'Chinese (Simplified)', 'zh-cn':'Chinese (Simplified)',
  'zh-tw':'Chinese (Traditional)', hr:'Croatian', cs:'Czech',
  da:'Danish', nl:'Dutch', en:'English', eo:'Esperanto',
  et:'Estonian', fil:'Filipino', fi:'Finnish', fr:'French',
  gl:'Galician', ka:'Georgian', de:'German', el:'Greek',
  gu:'Gujarati', ht:'Haitian Creole', ha:'Hausa', he:'Hebrew',
  hi:'Hindi', hu:'Hungarian', id:'Indonesian', ga:'Irish',
  it:'Italian', ja:'Japanese', jv:'Javanese', kn:'Kannada',
  km:'Khmer', ko:'Korean', lo:'Lao', lv:'Latvian',
  lt:'Lithuanian', mk:'Macedonian', ms:'Malay', ml:'Malayalam',
  mt:'Maltese', mr:'Marathi', mn:'Mongolian', ne:'Nepali',
  no:'Norwegian', fa:'Persian', pl:'Polish', pt:'Portuguese',
  pa:'Punjabi', ro:'Romanian', ru:'Russian', sr:'Serbian',
  si:'Sinhala', sk:'Slovak', sl:'Slovenian', so:'Somali',
  es:'Spanish', sw:'Swahili', sv:'Swedish',
  tl:'Tagalog', tg:'Tajik', ta:'Tamil', te:'Telugu',
  th:'Thai', tr:'Turkish', uk:'Ukrainian', ur:'Urdu',
  uz:'Uzbek', vi:'Vietnamese', cy:'Welsh', yi:'Yiddish',
  yo:'Yoruba', zu:'Zulu',
};

const POPULAR_LANGS = [
  { code: 'en', flag: '🇬🇧' }, { code: 'ko', flag: '🇰🇷' },
  { code: 'ja', flag: '🇯🇵' }, { code: 'zh', flag: '🇨🇳' },
  { code: 'es', flag: '🇪🇸' }, { code: 'fr', flag: '🇫🇷' },
  { code: 'de', flag: '🇩🇪' }, { code: 'ru', flag: '🇷🇺' },
  { code: 'tl', flag: '🇵🇭' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidLang(code) {
  return Boolean(code && SUPPORTED_LANGUAGES[code.toLowerCase()]);
}

function getLangName(code) {
  return SUPPORTED_LANGUAGES[code.toLowerCase()] || code.toUpperCase();
}

function parseArgs(args) {
  const raw     = args.join(' ').trim();
  const pipeIdx = raw.lastIndexOf('|');
  if (pipeIdx !== -1) {
    const text = raw.slice(0, pipeIdx).trim() || null;
    const lang = raw.slice(pipeIdx + 1).trim() || 'en';
    return { text, lang };
  }
  return { text: raw || null, lang: 'en' };
}

async function fetchTTS(text, lang) {
  const { data } = await axios.get('https://translate.google.com/translate_tts', {
    params: { ie: 'UTF-8', q: text, tl: lang.toLowerCase(), client: 'tw-ob' },
    responseType: 'arraybuffer',
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Referer: 'https://translate.google.com/',
    },
  });
  if (!data || data.byteLength === 0)
    throw new Error('Empty audio response from TTS service.');
  return Buffer.from(data);
}

async function sendVoice(bot, chatId, replyToId, text, lang) {
  const buf      = await fetchTTS(text, lang);
  const tempFile = path.join(os.tmpdir(), `tts_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`);
  fs.writeFileSync(tempFile, buf);

  const displayText = text.length > 80 ? text.slice(0, 80) + '\u2026' : text;
  const caption     = `\uD83D\uDD0A *"${displayText}"*\n_${getLangName(lang)}_`;

  try {
    await bot.sendVoice(chatId, fs.createReadStream(tempFile), {
      caption,
      parse_mode: 'Markdown',
      ...(replyToId ? { reply_to_message_id: replyToId } : {}),
    });
  } finally {
    try { fs.unlinkSync(tempFile); } catch { /* ignore */ }
  }
}

function buildPicker(storeKey) {
  const rows = [];
  for (let i = 0; i < POPULAR_LANGS.length; i += 3) {
    const row = POPULAR_LANGS.slice(i, i + 3).map(l => ({
      text: `${l.flag} ${l.code.toUpperCase()}`,
      callback_data: JSON.stringify({ command: 'say', args: [storeKey, l.code] }),
    }));
    rows.push(row);
  }
  return { inline_keyboard: rows };
}

// ─── onStart ──────────────────────────────────────────────────────────────────

export async function onStart({ bot, response, event, chatId, messageID, args, usage }) {
  const { text: argText, lang } = parseArgs(args);

  let text = argText;
  if (!text && event?.reply_to_message) {
    text = event.reply_to_message.text || event.reply_to_message.caption || null;
  }

  if (!text) return usage();

  if (text.length > 200) {
    return response.reply(
      `\u26A0\uFE0F Text is too long (${text.length} chars). Maximum is *200* characters.\n\uD83D\uDCA1 Break it into smaller parts.`
    );
  }

  // No pipe separator -> show language picker
  if (!args.join(' ').includes('|')) {
    const preview  = text.length > 50 ? text.slice(0, 50) + '\u2026' : text;
    const storeKey = storeTTS(text);
    return response.reply(
      `\uD83D\uDD0A *Select Voice Language*\n\n\uD83D\uDCDD Text: _"${preview}"_\n\nChoose a language:`,
      { reply_markup: buildPicker(storeKey) }
    );
  }

  if (!isValidLang(lang)) {
    return response.reply(
      `\u26A0\uFE0F Unknown language code: *${lang}*\n\nCommon codes: \`en ko ja zh vi fr de es ru ar hi tl\``
    );
  }

  const statusMsg = await response.reply('\uD83D\uDD04 Generating audio\u2026');
  try {
    await sendVoice(bot, chatId, messageID, text, lang);
  } catch (err) {
    console.error('[say] TTS error:', err.message);
    const msg =
      err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT'
        ? '\u26A0\uFE0F TTS request timed out. Try again.'
        : err.response?.status === 429
        ? '\u26A0\uFE0F Too many TTS requests. Wait a moment.'
        : err.response?.status === 403
        ? '\u26A0\uFE0F TTS service access denied. Try later.'
        : err.message?.includes('Empty audio')
        ? '\u26A0\uFE0F Could not generate audio. Try different text or language.'
        : '\u274C Failed to generate audio. Please try again.';
    await response.reply(msg);
  } finally {
    try { await response.delete(statusMsg); } catch { /* ignore */ }
  }
}

// ─── onCallback ───────────────────────────────────────────────────────────────

export async function onCallback({ bot, callbackQuery, chatId, messageId, args, response }) {
  const [storeKey, lang] = args;

  if (!storeKey || !lang) {
    return response.answerCallback(callbackQuery, { text: '\u26A0\uFE0F Missing parameters.', show_alert: true });
  }

  const text = retrieveTTS(storeKey);
  if (!text) {
    return response.answerCallback(callbackQuery, {
      text: '\u23F0 Session expired. Run the command again.',
      show_alert: true,
    });
  }

  if (!isValidLang(lang)) {
    return response.answerCallback(callbackQuery, { text: `\u26A0\uFE0F Unknown language: ${lang}`, show_alert: true });
  }

  await response.answerCallback(callbackQuery, { text: `\uD83D\uDD04 Generating ${getLangName(lang)} audio\u2026` });
  try { await response.edit('text', messageId, '\uD83D\uDD04 Generating audio\u2026'); } catch { /* may already be gone */ }

  try {
    const replyToId = callbackQuery.message?.reply_to_message?.message_id ?? null;
    await sendVoice(bot, chatId, replyToId, text, lang);
    try { await response.delete(messageId); } catch { /* ignore */ }
  } catch (err) {
    console.error('[say] onCallback error:', err.message);
    try {
      await response.edit('text', messageId, '\u274C Failed to generate audio. Please try again.');
    } catch { /* best-effort */ }
  }
}
