export const meta = {
  name: 'imagine',
  aliases: ['describe', 'draw'],
  version: '1.0.0',
  author: 'AjiroDesu',
  description: 'Let Reze paint a vivid picture of your prompt using words.',
  guide: ['<prompt>'],
  cooldown: 5,
  type: 'anyone',
  category: 'ai',
};

export async function onStart({ args, response, config, groq, usage }) {
  if (!args.length) return usage();

  const prompt  = args.join(' ');
  const loading = await response.reply(`🎨 Imagining: *${prompt}*...`);

  if (!groq) {
    return response.edit('text', loading, '⚠️ Groq API key not configured.');
  }

  try {
    const res = await groq.chat.completions.create({
      model: config.groqModel || 'llama-3.3-70b-versatile',
      max_tokens: 300,
      messages: [
        {
          role: 'system',
          content: 'You are a creative visual artist. Paint a vivid, imaginative picture using words for whatever prompt is given. 3-4 rich, evocative sentences. Format for Telegram Markdown.'
        },
        { role: 'user', content: prompt }
      ],
    });
    const desc = res.choices[0]?.message?.content?.trim() || 'No description.';
    await response.edit('text', loading,
      `🎨 **Imagination: ${prompt}**\n${desc}`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {
    await response.edit('text', loading, `⚠️ Failed to imagine: ${e.message}`);
  }
}
