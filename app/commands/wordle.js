// ─────────────────────────────────────────────────────────────────────────────
//   WORDLE — 5-letter word guessing game (onChat state machine)
// ─────────────────────────────────────────────────────────────────────────────

export const meta = {
	name:        'wordle',
	aliases:     ['word'],
	version:     '1.1.0',
	description: 'Play a game of Wordle.',
	author:      'AjiroDesu',
	prefix:      'both',
	category:    'fun',
	type:        'anyone',
	cooldown:    5,
	guide:       ['start'],
};

const WORDS = [
	'apple','beach','chair','dance','eagle','flame','grape','house','ivory','jelly',
	'knife','lemon','mango','novel','ocean','pizza','queen','river','sugar','tiger',
	'uncle','voice','water','yacht','zebra','brick','cloud','drain','earth','focus',
	'glass','horse','index','joker','koala','light','mouse','noise','orbit','paper',
	'quick','smile','table','unity','vivid','whale','yield','arrow','brave','coral',
	'diary','elite','frost','gamer','heart','layer','magic','noble','omega','pearl',
	'quest','steam','train','urban','valve','width','alpha','blaze','delta','glide',
	'hunch','icing','karma','lunar','maple','nerve','pulse','ridge',
];

// Active games per chatId
const activeGames = new Map();

// ── Helpers ───────────────────────────────────────────────────────────────────

function evalGuess(guess, target) {
	const result      = Array(5).fill('⬜');
	const targetChars = target.split('');
	const guessChars  = guess.split('');

	// Green pass — correct position
	for (let i = 0; i < 5; i++) {
		if (guessChars[i] === targetChars[i]) {
			result[i] = '🟩';
			targetChars[i] = null;
		}
	}
	// Yellow pass — wrong position
	for (let i = 0; i < 5; i++) {
		if (result[i] === '⬜') {
			const idx = targetChars.indexOf(guessChars[i]);
			if (idx !== -1) { result[i] = '🟨'; targetChars[idx] = null; }
		}
	}
	return { emoji: result.join(' '), isWin: result.join('') === '🟩🟩🟩🟩🟩' };
}

// ── onStart ───────────────────────────────────────────────────────────────────

export async function onStart({ chatId, args, response }) {
	if (activeGames.has(chatId))
		return response.reply('❌ **Game in Progress**\nA game is already running! Guess the word or type `end` to stop.');

	if (!args[0] || args[0].toLowerCase() !== 'start') {
		return response.reply(
			'🎮 **How to play Wordle:**\n\n' +
			'1. Type `/wordle start` to begin.\n' +
			'2. Guess a 5-letter word.\n' +
			'3. 🟩 Correct letter & position\n' +
			'4. 🟨 Correct letter, wrong position\n' +
			'5. ⬜ Letter not in word\n\n' +
			'Type `end` to give up.'
		);
	}

	const targetWord = WORDS[Math.floor(Math.random() * WORDS.length)];
	activeGames.set(chatId, { word: targetWord, attempts: 0, maxAttempts: 6 });
	await response.reply('🎯 **Wordle Started!**\n\nGuess the **5-letter** word.\nYou have **6** tries.\n\n_Type your guess below..._');
}

// ── onChat ────────────────────────────────────────────────────────────────────

export async function onChat({ chatId, body, response }) {
	if (!activeGames.has(chatId)) return;

	const game  = activeGames.get(chatId);
	const guess = (body || '').toLowerCase().trim();

	if (guess === 'end' || guess === 'stop') {
		activeGames.delete(chatId);
		await response.reply(`🛑 **Game Ended**\nThe word was: **${game.word.toUpperCase()}**`);
		return false;
	}
	if (guess.length !== 5) {
		await response.reply('⚠️ Guess must be exactly **5 letters**.');
		return false;
	}
	if (!/^[a-z]+$/.test(guess)) {
		await response.reply('⚠️ Only **A-Z** letters allowed.');
		return false;
	}

	game.attempts++;
	const { emoji, isWin } = evalGuess(guess, game.word);
	const header = `📝 **Attempt ${game.attempts}/${game.maxAttempts}:** ${guess.toUpperCase()}`;

	if (isWin) {
		activeGames.delete(chatId);
		await response.reply(`🎉 **Correct!**\n\n${emoji}\n\nThe word was **${game.word.toUpperCase()}**!`);
	} else if (game.attempts >= game.maxAttempts) {
		activeGames.delete(chatId);
		await response.reply(`😔 **Game Over!**\n\n${emoji}\n\nThe word was **${game.word.toUpperCase()}**.`);
	} else {
		await response.reply(`${header}\n${emoji}`);
	}
	return false;
}
