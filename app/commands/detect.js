export const meta = {
  name: 'detect',
  version: '1.1.0',
  aliases: [],
  description: 'Passively detects keywords and notifies developers.',
  author: 'AjiroDesu',
  category: 'hidden',
  // onStart requires developer; onChat is passive and open to all senders
  role: { onStart: 2, onChat: 0 },
  cooldown: 0,
  keywords: ['lance'],
};

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Escape Telegram Markdown v1 special characters so raw user text
 * never accidentally breaks the bot's formatted alert message.
 */
function escapeMd(text) {
  return String(text ?? '').replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

/**
 * Build a whole-word, case-insensitive RegExp for a keyword.
 * Falls back to a simple includes-match if the keyword contains
 * characters that would make the regex invalid.
 */
function makePattern(kw) {
  try {
    return new RegExp(`\\b${kw}\\b`, 'i');
  } catch {
    return null;
  }
}

// PATTERNS is built lazily after meta is defined
let PATTERNS = null;
function getPatterns() {
	if (!PATTERNS) PATTERNS = Object.fromEntries(
		(meta.keywords || []).map(kw => [kw, makePattern(kw)])
	);
	return PATTERNS;
}

// ── Developer alert ────────────────────────────────────────────────────────

/**
 * Send an alert directly to every devID in config.
 * Uses `bot` instead of `response.forDev` so that the message is always
 * sent regardless of which chat `response` was constructed for.
 */
async function notifyDevs(bot, report) {
  const devs = global.Reze?.config?.devID ?? [];

  if (!devs.length) {
    console.warn('[detect] No devID configured — keyword alert not sent.');
    return;
  }

  for (const devId of devs) {
    try {
      await bot.sendMessage(devId, report, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error(`[detect] Failed to notify dev ${devId}: ${err.message}`);
    }
  }
}

// ── Exported handlers ──────────────────────────────────────────────────────

/** /detect — developer-only status command */
export async function onStart({ response }) {
  await response.reply(
    `🛡️ *Detection System Online*\n` +
    `Watching for: _${meta.keywords.map(escapeMd).join(', ')}_`
  );
}

/**
 * Passive listener — runs on every incoming message.
 * Does NOT return a function, so it never marks the message as "consumed"
 * and never blocks Reze AI, commands, or any other handler.
 */
export async function onChat({ body, from, chatId, messageID, isGroup, senderID, bot }) {
  // Skip empty / non-text messages
  if (!body) return;

  // Skip messages from bots (avoids bot-to-bot feedback loops)
  if (from?.is_bot) return;

  // Never alert on developers' own messages
  const devID = global.Reze?.config?.devID ?? [];
  if (devID.includes(String(senderID))) return;

  // Find every keyword that appears in the message
  const detected = meta.keywords.filter(kw => {
    const pattern = PATTERNS[kw];
    return pattern ? pattern.test(body) : body.toLowerCase().includes(kw.toLowerCase());
  });

  if (!detected.length) return;

  // Build user / chat info strings
  const chatLabel  = isGroup ? `Group \`${chatId}\`` : `Private Chat \`${chatId}\``;
  const firstName  = from?.first_name ?? '';
  const lastName   = from?.last_name  ?? '';
  const fullName   = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown';
  const username   = from?.username ? ` (@${escapeMd(from.username)})` : '';
  const keywords   = detected.map(k => `\`${k}\``).join(', ');

  // Escape the raw message body so Markdown stays valid
  const safeBody = escapeMd(body);

  const report =
    `🚨 *Keyword Detected: ${keywords}*\n\n` +
    `*Chat Details:*\n` +
    `• Type: ${chatLabel}\n\n` +
    `*User Details:*\n` +
    `• Name: *${escapeMd(fullName)}*${username}\n` +
    `• User ID: \`${senderID}\`\n\n` +
    `*Message Details:*\n` +
    `• Message ID: \`${messageID ?? 'N/A'}\`\n` +
    `• Content:\n\n` +
    `_${safeBody}_`;

  try {
    await notifyDevs(bot, report);
  } catch (err) {
    console.error(`[detect] Unexpected error building report: ${err.message}`);
  }
}