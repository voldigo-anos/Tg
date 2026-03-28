import fs              from 'fs-extra';
import path            from 'path';
import { pathToFileURL } from 'url';
import chalk            from 'chalk';
import log, { header }  from './log.js';

const COMMANDS_PATH = path.join(process.cwd(), 'app', 'commands');
const EVENTS_PATH   = path.join(process.cwd(), 'app', 'events');

/*
 +----------------------------------------------------------+
 |                     LOAD COMMANDS                        |
 +----------------------------------------------------------+
*/
export async function loadCommands() {
	header('SCANNING COMMANDS', chalk.bold.yellow);
	log.reze(`commands path: ${COMMANDS_PATH}`);

	const files = fs.readdirSync(COMMANDS_PATH).filter(f => f.endsWith('.js'));
	for (const f of files) log.commands(`Scanned ${f}`);

	header('DEPLOYING COMMANDS', chalk.bold.yellow);

	for (const f of files) {
		try {
			const mod = await import(pathToFileURL(path.join(COMMANDS_PATH, f)).href);

			if (!mod.meta) { log.warn(`Skipped ${f}: missing "meta" export`); continue; }

			const name = mod.meta.name;
			global.Reze.commands.set(name, mod);
			global.Reze.commandFilesPath.push({ filePath: path.join(COMMANDS_PATH, f), commandName: name });

			// Register aliases
			if (Array.isArray(mod.meta.aliases)) {
				for (const alias of mod.meta.aliases)
					global.Reze.aliases.set(alias, name);
			}

			// Register handler lists
			if (typeof mod.onChat      === 'function') global.Reze.onChat.push(name);
			if (typeof mod.onAnyEvent  === 'function') global.Reze.onAnyEvent.push(name);
			if (typeof mod.onEvent     === 'function') global.Reze.onEvent.push(name);
			if (typeof mod.onFirstChat === 'function')
				global.Reze.onFirstChat.push({ commandName: name, chatIDsChattedFirstTime: [] });

			log.commands(`Deployed ${name}`);
		} catch (e) {
			log.error(`Failed to load ${f}: ${e.message}`);
			console.error(e);
		}
	}
}

/*
 +----------------------------------------------------------+
 |                      LOAD EVENTS                         |
 +----------------------------------------------------------+
*/
export async function loadEvents() {
	if (!fs.existsSync(EVENTS_PATH)) { log.warn('No events directory found.'); return; }

	header('SCANNING EVENTS', chalk.bold.yellow);
	log.reze(`events path: ${EVENTS_PATH}`);

	const files = fs.readdirSync(EVENTS_PATH).filter(f => f.endsWith('.js'));
	for (const f of files) log.events(`Scanned ${f}`);

	header('DEPLOYING EVENTS', chalk.bold.yellow);

	for (const f of files) {
		try {
			const mod = await import(pathToFileURL(path.join(EVENTS_PATH, f)).href);

			if (!mod.meta) { log.warn(`Skipped event ${f}: missing "meta" export`); continue; }

			const name = mod.meta.name;
			global.Reze.eventCommands.set(name, mod);
			global.Reze.eventCommandsFilesPath.push({ filePath: path.join(EVENTS_PATH, f), commandName: name });

			if (typeof mod.onEvent    === 'function') global.Reze.onEvent.push(name);
			if (typeof mod.onAnyEvent === 'function') global.Reze.onAnyEvent.push(name);

			log.events(`Deployed ${name}`);
		} catch (e) {
			log.error(`Failed to load event ${f}: ${e.message}`);
			console.error(e);
		}
	}
}
