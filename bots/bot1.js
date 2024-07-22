const { Client, GatewayIntentBits } = require('discord.js');
const RSSParser = require('rss-parser');
const cron = require('node-cron');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
const parser = new RSSParser();

// Sostituisci con il tuo token Discord
const DISCORD_TOKEN = process.env.BOT1_TOKEN;

// Mappa dei canali Discord per ciascun feed RSS
const RSS_FEEDS = {
    'https://www.formula1.it/rss.asp': '1259637001444134972',
    'https://it.motorsport.com/rss/wec/news/': '1259672154493161664',
    'https://it.motorsport.com/rss/motogp/news/': '1259672239704510565',
    'https://it.motorsport.com/rss/category/endurance/news/': '1259672430138621972'
};

// Parole chiave da filtrare per l'ultimo feed
const FILTER_WORDS = ['WEC', 'IMSA'];

// Set per memorizzare gli ID delle notizie già pubblicate
const publishedNews = new Set();

// Funzione per controllare un singolo feed RSS e inviare le notizie
async function checkFeed(feedUrl, channelId) {
    const channel = await client.channels.fetch(channelId);
    if (channel) {
        const feed = await parser.parseURL(feedUrl);
        const items = feed.items.slice(0, 5); // Limita alle 5 notizie più recenti
        for (const item of items) {
            // Filtra le notizie per l'ultimo feed
            if (feedUrl === 'https://it.motorsport.com/rss/category/endurance/news/') {
                const containsFilterWord = FILTER_WORDS.some(word => item.title.includes(word) || item.content.includes(word));
                if (containsFilterWord) {
                    continue; // Salta questa notizia se contiene una parola chiave
                }
            }

            // Verifica se la notizia è già stata pubblicata
            if (publishedNews.has(item.link)) {
                continue; // Salta questa notizia se è già stata pubblicata
            }

            // Pubblica la notizia e memorizza l'ID
            channel.send(`**${item.title}**\n${item.link}`);
            publishedNews.add(item.link);
        }
    }
}

// Funzione per controllare i feed RSS alternando le chiamate
async function checkFeeds() {
    const feedUrls = Object.keys(RSS_FEEDS);
    for (let i = 0; i < feedUrls.length; i++) {
        const feedUrl = feedUrls[i];
        const channelId = RSS_FEEDS[feedUrl];
        await checkFeed(feedUrl, channelId);
        // Attendi 1 minuto prima di controllare il prossimo feed
        await new Promise(resolve => setTimeout(resolve, 60000));
    }
}

// Esegui il controllo dei feed ogni 10 minuti
cron.schedule('*/10 * * * *', checkFeeds);

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    checkFeeds(); // Esegui subito al primo avvio
});

client.login(DISCORD_TOKEN);
