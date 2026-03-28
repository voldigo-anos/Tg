/**
 * Wiki Command
 * Searches Wikipedia and returns a concise, well-formatted summary.
 * Uses the search API first so partial/misspelled queries still find results.
 */

import axios from 'axios';

export const meta = {
  name: 'wiki',
  version: '2.0.0',
  aliases: ['wikipedia', 'wp', 'search'],
  description: 'Search Wikipedia for a summary of any topic.',
  author: 'AjiroDesu',
  prefix: 'both',
  category: 'utility',
  type: 'anyone',
  cooldown: 5,
  guide: ['<search term>'],
};

const API = 'https://en.wikipedia.org/w/api.php';
const MAX_EXTRACT = 900; // characters to show before "Read more"

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip wiki-style brackets and clean whitespace. */
function cleanExtract(text) {
  return text
    .replace(/\s*\([^)]*\)/g, '')   // strip parenthetical references
    .replace(/\n{3,}/g, '\n\n')     // collapse excess newlines
    .trim();
}

/** Build the Wikipedia article URL from its title. */
function articleUrl(title) {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
}

// ─── onStart ──────────────────────────────────────────────────────────────────

export async function onStart({ event, args, response, usage }) {
  if (!args.length) return usage();

  const query      = args.join(' ').trim();
  const loadingMsg = await response.reply(`\uD83D\uDD0D Searching Wikipedia for *"${query}"*\u2026`);

  try {
    // ── Step 1: Find the best-matching page title via the search API ──────
    const { data: searchData } = await axios.get(API, {
      params: {
        action:  'query',
        list:    'search',
        srsearch: query,
        srlimit: 1,
        format:  'json',
        origin:  '*',
      },
      timeout: 15000,
      headers: { 'User-Agent': 'RezeTelegramBot/2.0' },
    });

    const searchHits = searchData?.query?.search ?? [];
    if (!searchHits.length) {
      return response.edit('text', loadingMsg,
        `\u2753 No Wikipedia results found for *"${query}"*.\nTry a different search term.`
      );
    }

    const pageTitle = searchHits[0].title;

    // ── Step 2: Fetch the intro extract for the matched page ─────────────
    const { data: extractData } = await axios.get(API, {
      params: {
        action:      'query',
        prop:        'extracts|info',
        exintro:     true,
        explaintext: true,
        inprop:      'url',
        redirects:   1,
        titles:      pageTitle,
        format:      'json',
        origin:      '*',
      },
      timeout: 15000,
      headers: { 'User-Agent': 'RezeTelegramBot/2.0' },
    });

    const pages  = extractData?.query?.pages ?? {};
    const pageId = Object.keys(pages)[0];

    if (pageId === '-1' || !pages[pageId]) {
      return response.edit('text', loadingMsg,
        `\u2753 No article found for *"${pageTitle}"*. Try a different search term.`
      );
    }

    const page    = pages[pageId];
    const title   = page.title;
    const rawText = page.extract || '';
    const url     = page.canonicalurl || articleUrl(title);

    if (!rawText) {
      return response.edit('text', loadingMsg,
        `\u2753 Wikipedia has an article for *"${title}"* but no summary is available.\n[Read on Wikipedia](${url})`
      );
    }

    // ── Step 3: Clean and truncate ────────────────────────────────────────
    const cleaned   = cleanExtract(rawText);
    const truncated = cleaned.length > MAX_EXTRACT
      ? cleaned.slice(0, MAX_EXTRACT).trimEnd() + '\u2026'
      : cleaned;

    // ── Step 4: Format and send ───────────────────────────────────────────
    const isTruncated = cleaned.length > MAX_EXTRACT;
    const result =
      `\uD83D\uDCD6 *${title}*\n\n` +
      `${truncated}\n\n` +
      (isTruncated ? `[\uD83D\uDD17 Read full article on Wikipedia](${url})` : `[\uD83D\uDD17 Open on Wikipedia](${url})`);

    await response.edit('text', loadingMsg, result, { disable_web_page_preview: true });

  } catch (err) {
    console.error(`[wiki] Error | user: ${event?.from?.id} | query: "${query}" |`, err.message);

    const errText = err.response
      ? `API error ${err.response.status}: ${err.response.statusText}`
      : err.message;

    try {
      await response.edit('text', loadingMsg,
        `\u26A0\uFE0F *Search failed*\n\`${errText}\`\n\nPlease try again.`
      );
    } catch {
      await response.reply(`\u26A0\uFE0F *Search failed*\n\`${errText}\``);
    }
  }
}
