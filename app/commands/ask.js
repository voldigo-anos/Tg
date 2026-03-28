export const meta = {
  name: 'ask',
  aliases: ['ai', 'chat'],
  version: '1.0.0',
  author: 'AjiroDesu',
  description: 'Chat directly with Reze AI.',
  guide: ['<message>'],
  cooldown: 3,
  type: 'anyone',
  category: 'ai',
};

export async function onStart({ args, response, config, groq, senderID, from, bot, chatId, usage }) {
  if (!args.length) return usage();
  if (!groq) return response.reply('⚠️ Groq API key not configured. Add `groqKey` to `json/config.json`.');

  const userMessage = args.join(' ');

  if (!global.Reze.aiConversations.has(senderID)) global.Reze.aiConversations.set(senderID, []);
  const history = global.Reze.aiConversations.get(senderID);

  history.push({ role: 'user', content: userMessage });
  if (history.length > 20) history.splice(0, history.length - 20);

  await response.action('typing');

  try {
    const systemPrompt = global.Reze.buildSystemPrompt
      ? global.Reze.buildSystemPrompt()
      : `You are Reze, a helpful Telegram bot assistant. Developer: ${config.developer || 'AjiroDesu'}. Current time: ${new Date().toLocaleString('en-US', { timeZone: config.timezone || 'UTC' })}.`;

    const res = await groq.chat.completions.create({
      model: config.groqModel || 'llama-3.3-70b-versatile',
      max_tokens: 512,
      messages: [{ role: 'system', content: systemPrompt }, ...history],
    });
    const reply = res.choices[0]?.message?.content?.trim() || '🤔 I had trouble generating a response.';
    history.push({ role: 'assistant', content: reply });

    const execMatch = reply.match(/^EXECUTE:\s*(.+)$/mi);
    const msgMatch  = reply.match(/^MESSAGE:\s*([\s\S]+?)(?=EXECUTE:|$)/mi);

    if (execMatch) {
      const cmdStr  = execMatch[1].trim();
      const userMsg = msgMatch ? msgMatch[1].trim() : `Running \`${cmdStr}\` for you...`;
      await response.reply(userMsg);
      await global.Reze.processWithReze({
        bot,
        chatId,
        senderID,
        from,
        body: cmdStr,
        response,
        event: { message: { text: cmdStr, from, chat: { id: chatId, type: 'private' } } },
      });
      return;
    }

    const clean = reply.replace(/^EXECUTE:[^\n]*\n?/gmi, '').replace(/^MESSAGE:\s*/gmi, '').trim();
    await response.reply(clean || '🤔 I had trouble generating a response. Please try again.');
  } catch (e) {
    await response.reply(`⚠️ Groq AI error: ${e.message}`);
  }
}
