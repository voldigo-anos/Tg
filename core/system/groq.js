/**
 * groq.js
 * Groq AI client wrapper for Reze Bot.
 */

import Groq from 'groq-sdk';

let groqClient = null;

export function initGroq(apiKey) {
  groqClient = new Groq({ apiKey });
  return groqClient;
}

export function getGroq() {
  if (!groqClient) throw new Error('Groq client not initialized. Call initGroq(apiKey) first.');
  return groqClient;
}

/**
 * Ask Groq with a system + user message.
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {Object} options - { model, max_tokens, temperature }
 */
export async function askGroq(systemPrompt, userMessage, options = {}) {
  const client = getGroq();
  const config = global.Reze.config;

  const completion = await client.chat.completions.create({
    model: options.model || config.groqModel || 'llama-3.3-70b-versatile',
    max_tokens: options.max_tokens || 1024,
    temperature: options.temperature || 0.7,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() || '';
}

/**
 * Ask Groq with full message history.
 * @param {Array} messages - Array of { role, content }
 * @param {Object} options
 */
export async function askGroqWithHistory(messages, options = {}) {
  const client = getGroq();
  const config = global.Reze.config;

  const completion = await client.chat.completions.create({
    model: options.model || config.groqModel || 'llama-3.3-70b-versatile',
    max_tokens: options.max_tokens || 2048,
    temperature: options.temperature || 0.7,
    messages,
  });

  return completion.choices[0]?.message?.content?.trim() || '';
}
