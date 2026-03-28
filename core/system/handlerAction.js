import createHandlerEvent from './handlerEvent.js';

/*
 +----------------------------------------------------------+
 |                    HANDLER ACTION                        |
 |   Routes every incoming Telegram update to the correct  |
 |   handler function (onStart, onChat, onEvent, etc.)     |
 +----------------------------------------------------------+
*/
export default function createHandlerAction(bot, groq) {
	const handleEvent = createHandlerEvent(bot, groq);

	return async function handlerAction(update) {
		try {
			const handlers = await handleEvent(update);
			if (!handlers) return;

			const {
				onAnyEvent, onFirstChat, onChat,
				onStart, onReply, onEvent, onReaction, onCallback,
			} = handlers;

			await onAnyEvent();

			if (update.message || update.edited_message) {
				const msg = update.message || update.edited_message;

				// Group membership / service events — route to onEvent only
				const isChatEvent =
					msg.new_chat_members   || msg.left_chat_member    ||
					msg.new_chat_title     || msg.new_chat_photo      ||
					msg.delete_chat_photo  || msg.group_chat_created  ||
					msg.supergroup_chat_created || msg.channel_chat_created ||
					msg.migrate_to_chat_id || msg.migrate_from_chat_id || msg.pinned_message;

				if (isChatEvent) {
					await onEvent();
					return;
				}

				await onFirstChat();
				await onChat();
				await onStart();
				await onReply();

			} else if (update.callback_query) {
				await onCallback();

			} else if (update.message_reaction || update.message_reaction_count) {
				await onReaction();
			}

		} catch (e) {
			console.error('[handlerAction]', e.message);
		}
	};
}
