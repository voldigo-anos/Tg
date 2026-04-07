import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_ENDPOINT = "https://shizuai.vercel.app/chat";
const CLEAR_ENDPOINT = "https://shizuai.vercel.app/chat/clear";
const TMP_DIR = path.join(__dirname, 'cache');

export const meta = {
    name: 'ai',
    aliases: ['shizu', 'ask'],
    version: '3.0.1',
    author: 'Christus',
    description: 'Advanced AI (text, image, music, video, lyrics)',
    guide: ['{pn} <message | image>', '{pn} reset'],
    cooldown: 5,
    type: 'anyone',
    category: 'ai',
};

async function download(url, ext) {
    await fs.ensureDir(TMP_DIR);
    const filePath = path.join(TMP_DIR, `${uuidv4()}.${ext}`);
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    await fs.writeFile(filePath, res.data);
    return filePath;
}

function normalizeText(text) {
    if (!text) return text;
    return text
        .replace(/Aryan\s*Chauchan/gi, "Christus")
        .replace(/Aryan\s*Chauhan/gi, "Christus")
        .replace(/A\.?\s*Chauchan/gi, "Christus")
        .replace(/\*/g, ""); // Supprime les astérisques comme dans ton code original
}

export async function onStart({ args, response, senderID, bot, chatId, event, usage }) {
    const input = args.join(" ").trim();
    const createdFiles = [];

    // Gestion du Reset
    if (["reset", "clear"].includes(input.toLowerCase())) {
        try {
            await axios.delete(`${CLEAR_ENDPOINT}/${encodeURIComponent(senderID)}`);
            return response.reply("♻️ Conversation reset successfully.");
        } catch {
            return response.reply("❌ Failed to reset conversation.");
        }
    }

    // Extraction de l'image (Telegram style)
    let imageUrl = null;
    const msg = event.message;
    const photo = msg.photo || (msg.reply_to_message && msg.reply_to_message.photo);

    if (photo) {
        const fileId = photo[photo.length - 1].file_id;
        const fileLink = await bot.getFileLink(fileId);
        imageUrl = fileLink;
    }

    if (!input && !imageUrl) return usage();

    await response.action('typing');

    try {
        const res = await axios.post(API_ENDPOINT, {
            uid: senderID,
            message: input || "",
            image_url: imageUrl || null,
        });

        const { reply, image_url, music_data, video_data, shoti_data, lyrics_data } = res.data;

        let text = normalizeText(reply || "✅ AI Response");
        
        // Note: J'ai retiré l'appel à fonts.js car il n'est pas standard dans Reze, 
        // mais tu peux le rajouter si tu as le fichier func/fonts.js dans ton nouveau bot.

        const attachments = [];

        // Traitement des médias
        if (image_url) {
            const file = await download(image_url, "jpg");
            attachments.push({ type: 'photo', path: file });
            createdFiles.push(file);
        }

        if (music_data?.downloadUrl) {
            const file = await download(music_data.downloadUrl, "mp3");
            attachments.push({ type: 'audio', path: file });
            createdFiles.push(file);
        }

        if (video_data?.downloadUrl || shoti_data?.downloadUrl) {
            const url = video_data?.downloadUrl || shoti_data?.downloadUrl;
            const file = await download(url, "mp4");
            attachments.push({ type: 'video', path: file });
            createdFiles.push(file);
        }

        if (lyrics_data?.lyrics) {
            const lyrics = normalizeText(lyrics_data.lyrics.slice(0, 1000));
            text += `\n\n🎵 ${lyrics_data.track_name}\n${lyrics}`;
        }

        // Envoi des résultats
        if (attachments.length > 0) {
            for (const media of attachments) {
                const stream = fs.createReadStream(media.path);
                if (media.type === 'photo') await bot.sendPhoto(chatId, stream, { caption: text });
                else if (media.type === 'audio') await bot.sendAudio(chatId, stream, { caption: text });
                else if (media.type === 'video') await bot.sendVideo(chatId, stream, { caption: text });
            }
        } else {
            await response.reply(text);
        }

    } catch (e) {
        console.error(e);
        await response.reply(`⚠️ Error: ${e.message}`);
    } finally {
        // Nettoyage du cache
        for (const file of createdFiles) {
            if (fs.existsSync(file)) await fs.remove(file);
        }
    }
}
