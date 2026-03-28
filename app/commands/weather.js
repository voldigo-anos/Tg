export const meta = {
  name: 'weather',
  aliases: ['w', 'forecast'],
  version: '1.0.0',
  author: 'AjiroDesu',
  description: 'Get current weather for a location.',
  guide: ['<city>'],
  cooldown: 5,
  type: 'anyone',
  category: 'utility',
};

export async function onStart({ args, response, config, groq, usage }) {
  if (!args.length) return usage();

  const city    = args.join(' ');
  const loading = await response.reply(`🌤️ Fetching weather for *${city}*...`);
  const tz      = config.timezone || 'UTC';
  const now     = new Date().toLocaleString('en-US', { timeZone: tz });

  if (!groq) {
    return response.edit('text', loading, '⚠️ Groq API key not configured. Add `groqKey` to `json/config.json`.');
  }

  try {
    const res = await groq.chat.completions.create({
      model: config.groqModel || 'llama-3.3-70b-versatile',
      max_tokens: 400,
      messages: [
        {
          role: 'system',
          content: `You are a weather assistant. Give a realistic weather summary for the city based on its typical climate for this season. Current time: ${now}. Mark clearly this is AI-estimated, not live data. Format for Telegram Markdown.`
        },
        { role: 'user', content: `What's the weather like in ${city}?` }
      ],
    });
    const info = res.choices[0]?.message?.content?.trim() || 'No data.';
    await response.edit('text', loading,
      `🌤️ **Weather: ${city}** *(AI Estimated)*\n${info}\n\n_⚠️ For live data, add an OpenWeatherMap key to \`json/api.json\`_`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {
    await response.edit('text', loading, `⚠️ Could not fetch weather: ${e.message}`);
  }
}
