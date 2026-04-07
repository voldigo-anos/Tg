import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const API_ENDPOINT = "https://shizuai.vercel.app/chat";
const CLEAR_ENDPOINT = "https://shizuai.vercel.app/chat/clear";
const TMP_DIR = path.join(process.cwd(), 'tmp');

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

/* ================= META ================= */

export const meta = {
  name: 'ai',
  aliases: [],
  version: '2.2.0',
  author: 'Christus',
  description: 'Chat with Christus AI (image, audio, video supported)',
  guide: ['<message>'],
  cooldown: 3,
  type: 'anyone',
  category: 'ai',
};

/* ================= URL CHECK ================= */

const isValidUrl = (str) => {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

/* ================= FORMAT TEXT ================= */

const formatCoolText = (text) => {
  if (!text) return "";

  return text
    .replace(/Heck\.ai/gi, "Christus")
    .replace(/Aryan/gi, "Christus")
    .replace(/Shizu AI|Shizuka AI|Shizuka|Shizu/gi, "Christus AI")
    .replace(/\*(.*?)\*/g, (_, p1) => `_${p1}_`);
};

/* ================= DOWNLOAD ================= */

const downloadFile = async (url, ext) => {
  const filePath = path.join(TMP_DIR, `${uuidv4()}.${ext}`);
  const res = await axios.get(url, { responseType: 'arraybuffer' });
  fs.writeFileSync(filePath, Buffer.from(res.data));
  return filePath;
};

/* ================= RESET ================= */

const resetConversation = async (response, senderID) => {
  try {
    await axios.delete(`${CLEAR_ENDPOINT}/${senderID}`);
    return response.reply("✅ Conversation reset.");
  } catch {
    return response.reply("❌ Reset failed.");
  }
};

/* ================= AI HANDLER ================= */

const handleAI = async ({
  args,
  response,
  senderID,
  event
}) => {
  let userInput = args.join(' ').trim();
  let imageUrl = null;

  await response.action('typing');

  /* ===== IMAGE FROM REPLY ===== */
  if (event?.message?.reply_to_message?.photo) {
    const photo = event.message.reply_to_message.photo;
    imageUrl = photo[photo.length - 1]?.file_id;
  }

  /* ===== IMAGE FROM URL ===== */
  const urlMatch = userInput.match(/(https?:\/\/[^\s]+)/)?.[0];
  if (urlMatch && isValidUrl(urlMatch)) {
    imageUrl = urlMatch;
    userInput = userInput.replace(urlMatch, '').trim();
  }

  if (!userInput && !imageUrl) {
    return response.reply("💬 Provide a message or image.");
  }

  try {
    const res = await axios.post(API_ENDPOINT, {
      uid: senderID,
      message: userInput,
      image_url: imageUrl
    }, { timeout: 60000 });

    const {
      reply,
      image_url,
      music_data,
      video_data,
      shotti_data
    } = res.data;

    const finalText = formatCoolText(reply);

    const files = [];

    if (image_url) files.push(await downloadFile(image_url, 'jpg'));
    if (music_data?.downloadUrl) files.push(await downloadFile(music_data.downloadUrl, 'mp3'));
    if (video_data?.downloadUrl) files.push(await downloadFile(video_data.downloadUrl, 'mp4'));
    if (shotti_data?.videoUrl) files.push(await downloadFile(shotti_data.videoUrl, 'mp4'));

    await response.reply({
      text: finalText,
      files: files.length ? files : undefined
    });

  } catch (e) {
    return response.reply("⚠️ AI Error.");
  }
};

/* ================= START ================= */

export async function onStart(ctx) {
  const { args, response, senderID } = ctx;

  if (!args.length) return response.reply("❗ Enter a message.");

  const input = args.join(' ').toLowerCase();

  if (['clear', 'reset'].includes(input)) {
    return resetConversation(response, senderID);
  }

  return handleAI(ctx);
}

/* ================= REPLY ================= */

export async function onReply(ctx) {
  const { senderID, Reply } = ctx;
  if (senderID !== Reply?.author) return;
  return handleAI(ctx);
}

/* ================= NO PREFIX ================= */

export async function onChat(ctx) {
  const { event } = ctx;

  const body = event?.message?.text?.trim();
  if (!body?.toLowerCase().startsWith('ai ')) return;

  const input = body.slice(3).trim();
  if (!input) return;

  ctx.args = input.split(/\s+/);

  if (['clear', 'reset'].includes(input.toLowerCase())) {
    return resetConversation(ctx.response, ctx.senderID);
  }

  return handleAI(ctx);
      }
