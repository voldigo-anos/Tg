export const meta = {
  name: 'poll',
  aliases: ['vote'],
  version: '1.0.0',
  author: 'AjiroDesu',
  description: 'Create a Telegram poll. Separate question and options with |.',
  guide: ['<question> | <option1> | <option2> ...'],
  cooldown: 5,
  type: 'anyone',
  category: 'utility',
};

export async function onStart({ args, response, senderID, usage }) {
  if (!args.length) return usage();

  const full  = args.join(' ');
  const parts = full.split('|').map(p => p.trim()).filter(Boolean);

  if (parts.length < 3) {
    const sent = await response.reply(
      `📊 Got your question: *${full}*\n\nReply to this message with your options, one per line.`
    );
    global.Reze.onReply.set(sent.message_id, { commandName: 'poll', senderID, question: full });
    return;
  }

  const [question, ...options] = parts;
  if (options.length < 2) return response.reply('❌ Need at least **2 options**.\nExample: `/poll Best fruit? | Apple | Mango`');
  if (options.length > 10) return response.reply('❌ Maximum **10 options** allowed.');

  await response.poll(question, options, { is_anonymous: true });
}

export async function onReply({ Reply, event, response }) {
  const body    = event.message?.body || event.message?.text || '';
  const options = body.split('\n').map(o => o.trim()).filter(Boolean);

  if (options.length < 2) return response.reply('❌ Need at least **2 options**, one per line.');
  if (options.length > 10) return response.reply('❌ Maximum **10 options** allowed.');

  Reply.delete();
  await response.poll(Reply.question, options, { is_anonymous: true });
}
