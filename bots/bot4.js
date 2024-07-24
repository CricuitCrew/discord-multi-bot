const { Client, GatewayIntentBits, Partials } = require('discord.js');
const express = require('express');
const app = express();
const port = 3000;
require('dotenv').config({ path: '/root/discord-multi-bot/.env' });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const MODERATOR_ROLE_ID = '1258829784658739220'; // Replace with your Moderator Role ID
const SPECIFIC_CHANNEL_ID = '1264927952362143865'; // Replace with your specific channel ID
const TIMEOUT_DURATION = 600000; // 10 minutes in milliseconds

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.channel.id !== SPECIFIC_CHANNEL_ID) return;
  if (!message.member.roles.cache.has(MODERATOR_ROLE_ID)) return;

  if (message.content.startsWith('!post')) {
    const filter = (response) => response.author.id === message.author.id;

    try {
      const requestChannelMsg = await message.channel.send('In quale canale vuoi pubblicare? (es: #generale)');
      const collectedChannel = await message.channel.awaitMessages({ filter, max: 1, time: TIMEOUT_DURATION, errors: ['time'] });
      const targetChannelName = collectedChannel.first().content.trim().replace('#', '');
      const targetChannel = message.guild.channels.cache.find(channel => channel.name === targetChannelName);

      if (!targetChannel) {
        return message.channel.send('Canale non trovato. Operazione annullata.');
      }

      const requestMessageMsg = await message.channel.send('Qual è il messaggio che vuoi pubblicare? (Può contenere testo, link o immagini)');
      const collectedMessage = await message.channel.awaitMessages({ filter, max: 1, time: TIMEOUT_DURATION, errors: ['time'] });
      const messageContent = collectedMessage.first();

      if (messageContent.attachments.size > 0) {
        for (const attachment of messageContent.attachments.values()) {
          await targetChannel.send({ content: messageContent.content, files: [attachment] });
        }
      } else {
        await targetChannel.send(messageContent.content);
      }

      await message.channel.send('Messaggio pubblicato con successo!');
      await requestChannelMsg.delete();
      await requestMessageMsg.delete();
      await message.delete();
      await collectedChannel.first().delete();
      await collectedMessage.first().delete();

      await message.channel.send(`Messaggio inviato nel canale ${targetChannel} da ${message.author} con successo!`);
    } catch (error) {
      console.error(error);
      await message.channel.send('Tempo scaduto. Operazione annullata.');
    }
  } else if (message.content.startsWith('!annulla')) {
    await message.channel.send('Operazione annullata.');
    await message.channel.send(`Operazione annullata da ${message.author}.`);
  }
});

client.login(process.env.BOT4_TOKEN); // Use the token from environment variables
