export const meta = {
  name: 'calc',
  aliases: ['calculator', 'math'],
  version: '1.0.0',
  author: 'AjiroDesu',
  description: 'Interactive inline calculator.',
  guide: ['[expression]'],
  cooldown: 3,
  type: 'anyone',
  category: 'utility',
};

const sessions = new Map();

function keyboard() {
  return {
    inline_keyboard: [
      [
        { text: '7', callback_data: JSON.stringify({ command: 'calc', args: ['a', '7'] }) },
        { text: '8', callback_data: JSON.stringify({ command: 'calc', args: ['a', '8'] }) },
        { text: '9', callback_data: JSON.stringify({ command: 'calc', args: ['a', '9'] }) },
        { text: '÷', callback_data: JSON.stringify({ command: 'calc', args: ['a', '/'] }) },
      ],
      [
        { text: '4', callback_data: JSON.stringify({ command: 'calc', args: ['a', '4'] }) },
        { text: '5', callback_data: JSON.stringify({ command: 'calc', args: ['a', '5'] }) },
        { text: '6', callback_data: JSON.stringify({ command: 'calc', args: ['a', '6'] }) },
        { text: '×', callback_data: JSON.stringify({ command: 'calc', args: ['a', '*'] }) },
      ],
      [
        { text: '1', callback_data: JSON.stringify({ command: 'calc', args: ['a', '1'] }) },
        { text: '2', callback_data: JSON.stringify({ command: 'calc', args: ['a', '2'] }) },
        { text: '3', callback_data: JSON.stringify({ command: 'calc', args: ['a', '3'] }) },
        { text: '−', callback_data: JSON.stringify({ command: 'calc', args: ['a', '-'] }) },
      ],
      [
        { text: '0', callback_data: JSON.stringify({ command: 'calc', args: ['a', '0'] }) },
        { text: '.', callback_data: JSON.stringify({ command: 'calc', args: ['a', '.'] }) },
        { text: '⌫', callback_data: JSON.stringify({ command: 'calc', args: ['b'] }) },
        { text: '+', callback_data: JSON.stringify({ command: 'calc', args: ['a', '+'] }) },
      ],
      [
        { text: 'C', callback_data: JSON.stringify({ command: 'calc', args: ['c'] }) },
        { text: '( )', callback_data: JSON.stringify({ command: 'calc', args: ['a', '('] }) },
        { text: '%', callback_data: JSON.stringify({ command: 'calc', args: ['a', '%'] }) },
        { text: '=', callback_data: JSON.stringify({ command: 'calc', args: ['='] }) },
      ],
    ],
  };
}

export async function onStart({ args, response }) {
  if (args.length > 0) {
    const expr = args.join(' ');
    try {
      const result = Function('"use strict"; return (' + expr + ')')();
      return response.reply(`🧮 \`${expr}\` = **${result}**`);
    } catch {
      return response.reply(`❌ Invalid expression: \`${expr}\``);
    }
  }

  const sent = await response.reply('🧮 **Calculator**\n`0`', { reply_markup: keyboard() });
  sessions.set(sent.message_id, '');
}

export async function onCallback({ callbackQuery, response, messageId, args }) {
  const action = args[0];
  const value  = args[1];
  let expr     = sessions.get(messageId) || '';

  if (action === 'a') {
    if (expr === '0' && value !== '.') expr = value;
    else expr += value;
  } else if (action === 'b') {
    expr = expr.slice(0, -1);
  } else if (action === 'c') {
    expr = '';
  } else if (action === '=') {
    try {
      const result = Function('"use strict"; return (' + (expr || '0') + ')')();
      sessions.set(messageId, String(result));
      await response.edit('text', messageId,
        `🧮 **Calculator**\n\`${expr}\` = **${result}**`,
        { reply_markup: keyboard(), parse_mode: 'Markdown' }
      );
      await response.answerCallback(callbackQuery, { text: `= ${result}` });
      return;
    } catch {
      await response.answerCallback(callbackQuery, { text: 'Invalid expression', show_alert: true });
      return;
    }
  }

  sessions.set(messageId, expr);
  await response.edit('text', messageId,
    `🧮 **Calculator**\n\`${expr || '0'}\``,
    { reply_markup: keyboard(), parse_mode: 'Markdown' }
  );
  await response.answerCallback(callbackQuery);
}
