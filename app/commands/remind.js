// ─────────────────────────────────────────────────────────────────────────────
//   REMIND — Timed reminders with natural language support
// ─────────────────────────────────────────────────────────────────────────────

export const meta = {
	name:        'remind',
	aliases:     ['reminder', 'remindme'],
	version:     '1.0.0',
	author:      'AjiroDesu',
	description: 'Set a reminder. Supports natural language too.',
	guide:       ['<5s|10m|2h|1d> <message>'],
	cooldown:    3,
	type:        'anyone',
	category:    'utility',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseTime(str) {
	const m = str.match(/^(\d+)(s|m|h|d)$/i);
	if (!m) return null;
	return parseInt(m[1]) * { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2].toLowerCase()];
}

function scheduleReminder(bot, chatId, text, ms) {
	setTimeout(async () => {
		try {
			await bot.sendMessage(chatId, `⏰ **Reminder!**\n📝 ${text}`, { parse_mode: 'Markdown' });
		} catch (e) {
			console.error('[remind] Failed to deliver:', e.message);
		}
	}, ms);
}

// ── onStart ───────────────────────────────────────────────────────────────────

export async function onStart({ args, response, bot, chatId, usage }) {
	if (args.length < 2) return usage();

	const ms   = parseTime(args[0]);
	const text = args.slice(1).join(' ');

	if (!ms)                      return response.reply('❌ Invalid time format.\nExamples: `5s`, `10m`, `2h`, `1d`');
	if (ms > 86400000 * 7)        return response.reply('❌ Maximum reminder duration is **7 days**.');
	if (!text.trim())              return response.reply('❌ Please provide a reminder message.');

	await response.reply(`✅ Reminder set for **${args[0]}**!\n📝 *${text}*`);
	scheduleReminder(bot, chatId, text, ms);
}

// ── onChat — natural language: "remind me to X in N minutes" ─────────────────

export async function onChat({ body, response, bot, chatId, isUserCallCommand }) {
	if (isUserCallCommand || !body) return;

	const m = body.match(/remind me (?:to )?(.*?) in (\d+)\s*(second|minute|hour|day)s?/i);
	if (!m) return;

	const text  = m[1].trim();
	const value = parseInt(m[2]);
	const unit  = m[3].toLowerCase();
	const ms    = value * { second: 1000, minute: 60000, hour: 3600000, day: 86400000 }[unit];

	if (!ms || ms > 86400000 * 7) return;

	await response.reply(`✅ Got it! Reminding you to *${text}* in **${value} ${unit}${value !== 1 ? 's' : ''}**.`);
	scheduleReminder(bot, chatId, text, ms);
}
