const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const token = process.env.BOT2_TOKEN;
const channelId = '1258928495929593857';
require('dotenv').config();

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.channel.id !== channelId || message.author.bot) return;

    if (message.content.startsWith('!fuel')) {
        const user = message.author;
        let collectedData = {};
        const messagesToDelete = [message]; // Array to track messages to delete

        const filter = response => response.author.id === user.id;

        try {
            let botMessage = await message.channel.send('Inserisci il tempo sul giro (minuti, secondi, millisecondi) separati da spazi (es. 2 0 314 per 2 minuti 0 secondi e 314 millisecondi, inserisci 0 se non c\'è il dato):');
            messagesToDelete.push(botMessage);

            const lapTimeMsg = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
            messagesToDelete.push(lapTimeMsg.first());

            const lapTime = lapTimeMsg.first().content.split(' ');
            collectedData.lapTime = {
                minutes: parseInt(lapTime[0]),
                seconds: parseInt(lapTime[1]),
                milliseconds: parseInt(lapTime[2])
            };

            botMessage = await message.channel.send('Inserisci il consumo della vettura per giro (in litri, usa il punto per i decimali):');
            messagesToDelete.push(botMessage);

            const fuelConsumptionMsg = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
            messagesToDelete.push(fuelConsumptionMsg.first());

            collectedData.fuelConsumption = parseFloat(fuelConsumptionMsg.first().content.replace(',', '.'));

            botMessage = await message.channel.send('Inserisci la lunghezza della gara (ore e minuti) separati da uno spazio (es. 0 50 per 50 minuti):');
            messagesToDelete.push(botMessage);

            const raceTimeMsg = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
            messagesToDelete.push(raceTimeMsg.first());

            const raceTime = raceTimeMsg.first().content.split(' ');
            collectedData.raceTime = {
                hours: parseInt(raceTime[0]),
                minutes: parseInt(raceTime[1])
            };

            // Calcoli
            const totalRaceTimeMinutes = (collectedData.raceTime.hours * 60) + collectedData.raceTime.minutes;
            const lapTimeMinutes = collectedData.lapTime.minutes + (collectedData.lapTime.seconds / 60) + (collectedData.lapTime.milliseconds / 60000);
            const totalLaps = totalRaceTimeMinutes / lapTimeMinutes;
            const fuelNeeded = Math.ceil(totalLaps * collectedData.fuelConsumption);
            const fuelWithExtraLap = Math.ceil(fuelNeeded + collectedData.fuelConsumption);

            botMessage = await message.channel.send(`Carburante preciso: ${fuelNeeded} litri\nCarburante con giro di ricognizione: ${fuelWithExtraLap} litri\nNumero di giri: ${Math.ceil(totalLaps)}`);
            messagesToDelete.push(botMessage);

            botMessage = await message.channel.send('Questi dati rimarranno visibili per 5 minuti.');
            messagesToDelete.push(botMessage);

            setTimeout(() => {
                messagesToDelete.forEach(msg => msg.delete().catch(console.error));
            }, 300000); // 5 minutes
        } catch (err) {
            console.error(err);
            message.channel.send('Tempo scaduto o si è verificato un errore, riprova.').then(msg => {
                setTimeout(() => msg.delete().catch(console.error), 5000);
            });
        }
    }
});

client.login(token);
