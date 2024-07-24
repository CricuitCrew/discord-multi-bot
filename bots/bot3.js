const { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const cron = require('node-cron');
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
require('dotenv').config({ path: '/root/discord-multi-bot/.env' });

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages] });

const TOKEN = process.env.BOT3_TOKEN;
const SETUP_CHANNEL_ID = '1262171803858636990';
const TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

let setupProcesses = {};

const circuits = [
    'Barcellona', 'Bathurst', 'Brands Hatch', 'Circuit of the Americas', 'Donington Park', 
    'Hungaroring', 'Imola', 'Indianapolis', 'Kyalami', 'Laguna Seca', 'Misano', 'Monza', 
    'Nurburgring', 'Nurburgring 24h', 'Red Bull Ring', 'Ricardo Tormo', 'Oulton Park', 
    'Paul Ricard', 'Silverstone', 'Spa-Francorchamps', 'Snetterton', 'Suzuka', 'Watkins Glen', 
    'Zandvoort', 'Zolder'
];

const categories = ['GT2', 'GT3', 'GT4'];

const brands = [
   { category: 'GT2', brands: ['KTM', 'Maserati', 'Audi', 'Mercedes-AMG', 'Porsche'] },
   { category: 'GT3', brands: ['Ferrari', 'Lamborghini', 'Porsche', 'Audi', 'BMW', 'Mercedes-AMG', 'Aston Martin', 'Bentley', 'Ford', 'Honda', 'Jaguar', 'McLaren', 'Nissan', 'Reiter Engineering'] },
   { category: 'GT4', brands: ['ALpine', 'Aston Martin', 'Audi', 'BMW', 'Chevrolet', 'Ginetta', 'KTM', 'Maserati', 'McLaren', 'Mercedes-AMG', 'Porsche'] }
];

const models = [
   { brand: 'KTM', models: ['KTM X-Bow GT2'] },
   { brand: 'Maserati', models: ['Maserati GT2'] },
   { brand: 'Audi', models: ['Audi R8 LMS GT2', 'Audi R8 LMS Evo II (2022)', 'Audi R8 LMS (2015)', 'Audi R8 LMS Evo (2019)', 'Audi R8 LMS GT4 (2018)'] },
   { brand: 'Mercedes-AMG', models: ['Mercedes-AMG GT2', 'Mercedes-AMG GT3 (2023)', 'Mercedes-AMG GT3 (2015)', 'Mercedes-AMG GT4 (2016)'] },
   { brand: 'Porsche', models: ['Porsche 911 GT2 RS CS Evo', 'Porsche 935', 'Porsche 911 (992) GT3 R (2023)', 'Porsche 922 GT3 Cup (2021)', 'Porsche 991 GT3 R (2018)', 'Porsche 991II GT3 R (2019)', 'Porsche718 Cayman GT4 Clubsport (2019)'] },
   { brand: 'Ferrari', models: ['Ferrari 296 GT3 (2023)', 'Ferrari 488 Challenge Evo (2020)', 'Ferrari 488 GT3 Evo (2020)', 'Ferrari 488 GT3 (2018)'] },
   { brand: 'Lamborghini', models: ['Lamborghini Huracan GT3 EVO2 (2023)', 'Lamborghini Huracan ST EVO2 (2021)', 'Lamborghini Huracan GT3 (2015)', 'Lamborghini Huracan GT3 Evo (2019)'] },
   { brand: 'BMW', models: ['BMW M2 CS Racing (2020)', 'BMW M4 GT3 (2022)', 'BMW M6 GT3 (2017)', 'BMW M4 GT4 (2018)'] },
   { brand: 'Aston Martin', models: ['Aston Martin V8 Vantage (2019)', 'Aston Martin V12 Vantage (2013)', 'Aston Martin AMR V8 Vantage GT4 (2018)'] },
   { brand: 'Bentley', models: ['Bentley Continental GT3 (2015)', 'Bentley Continental GT3 (2018)'] },
   { brand: 'Ford', models: ['Ford Mustang GT3 Race Car (2024)'] },
   { brand: 'Honda', models: ['Honda NSX GT3 (2017)', 'Honda NSX GT3 Evo (2019)'] },
   { brand: 'Jaguar', models: ['Jaguar Emil Frey G3 (2012)'] },
   { brand: 'McLaren', models: ['McLaren 720S GT3 EVO (2023)', 'McLaren 720S GT3 (2019)', 'McLaren 650S GT3 (2015)', 'McLaren 570S GT4 (2016)'] },
   { brand: 'Nissan', models: ['Nissan GT-R Nismo GT3 (2015)', 'Nissan GT-R Nismo (2018)'] },
   { brand: 'Reiter Engineering', models: ['Reiter Engineering R-EX GT3 (2017)'] },
   { brand: 'ALpine', models: ['ALpine A110 GT4 (2018)'] },
   { brand: 'Chevrolet', models: ['Chevrolet Camaro GT4.R (2017)'] },
   { brand: 'Ginetta', models: ['Ginetta g55 GT4 (2012)'] },
   { brand: 'Maserati', models: ['Maserati Gran Turismo MC GT4 (2016)'] }
];

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.channel.id !== SETUP_CHANNEL_ID) return;

    const userId = message.author.id;

    if (message.content === '!setup') {
        setupProcesses[userId] = { state: 'circuit', choices: {}, messages: [] };

        const circuitMenu = new StringSelectMenuBuilder()
            .setCustomId('circuitSelect')
            .setPlaceholder('Seleziona il circuito')
            .addOptions(circuits.map(circuit => ({
                label: circuit,
                value: circuit
            })));

        const setupMessage = await message.reply({
            content: 'Benvenuto nel setup del bot!\nSeleziona il circuito:',
            components: [new ActionRowBuilder().addComponents(circuitMenu)]
        });

        setupProcesses[userId].messages.push(setupMessage);

        setTimeout(() => {
            if (setupProcesses[userId]) {
                cleanupProcess(userId);
                message.reply('Il processo di setup è scaduto. Si prega di riavviare.');
            }
        }, TIMEOUT);

    } else if (message.content === '!annulla') {
        if (setupProcesses[userId]) {
            const process = setupProcesses[userId];
            const lastMessage = process.messages.pop();
            if (lastMessage) {
                try {
                    await lastMessage.delete();
                } catch (error) {
                    console.error('Error deleting message:', error);
                }
            }
            if (process.messages.length === 0) {
                await cleanupProcess(userId);
            }
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;

    const userId = interaction.user.id;
    const process = setupProcesses[userId];
    if (!process) return;

    const { state, choices } = process;

    if (state === 'circuit' && interaction.customId.startsWith('circuitSelect')) {
        const selectedCircuit = interaction.values[0];
        choices.circuit = selectedCircuit;
        process.state = 'category';

        const categoryMenu = new StringSelectMenuBuilder()
            .setCustomId('categorySelect')
            .setPlaceholder('Seleziona la categoria')
            .addOptions(categories.map(category => ({
                label: category,
                value: category
            })));

        const categoryMessage = await interaction.update({
            content: `Hai selezionato il circuito: ${selectedCircuit}\nSeleziona la categoria:`,
            components: [new ActionRowBuilder().addComponents(categoryMenu)]
        });
        process.messages.push(categoryMessage);
    } else if (state === 'category' && interaction.customId === 'categorySelect') {
        const selectedCategory = interaction.values[0];
        choices.category = selectedCategory;
        process.state = 'brand';

        const selectedBrands = brands.find(b => b.category === selectedCategory)?.brands || [];

        const brandMenu = new StringSelectMenuBuilder()
            .setCustomId('brandSelect')
            .setPlaceholder('Seleziona la marca')
            .addOptions(selectedBrands.map(brand => ({
                label: brand,
                value: brand
            })));

        const brandMessage = await interaction.update({
            content: `Hai selezionato la categoria: ${selectedCategory}\nSeleziona la marca:`,
            components: [new ActionRowBuilder().addComponents(brandMenu)]
        });
        process.messages.push(brandMessage);
    } else if (state === 'brand' && interaction.customId === 'brandSelect') {
        const selectedBrand = interaction.values[0];
        choices.brand = selectedBrand;
        process.state = 'model';

        const selectedModels = models.find(m => m.brand === selectedBrand)?.models || [];

        const modelMenu = new StringSelectMenuBuilder()
            .setCustomId('modelSelect')
            .setPlaceholder('Seleziona il modello')
            .addOptions(selectedModels.map(model => ({
                label: model,
                value: model
            })));

        const modelMessage = await interaction.update({
            content: `Hai selezionato la marca: ${selectedBrand}\nSeleziona il modello:`,
            components: [new ActionRowBuilder().addComponents(modelMenu)]
        });
        process.messages.push(modelMessage);
    } else if (state === 'model' && interaction.customId === 'modelSelect') {
        const selectedModel = interaction.values[0];
        choices.model = selectedModel;
        process.state = 'complete';

        const setupKey = `${choices.circuit}_${choices.category}_${choices.model}`;
        const setupImagePaths = setupImages[setupKey] || [];

        const files = setupImagePaths.map(filePath => ({
            attachment: filePath,
            name: path.basename(filePath)
        }));

        if (files.length > 0) {
            await interaction.update({
                content: `Hai selezionato il modello: ${selectedModel}\nEcco i setup disponibili per il circuito ${choices.circuit}, categoria ${choices.category}, marca ${choices.brand}, modello ${selectedModel}:`,
                files
            });
        } else {
            await interaction.update({
                content: `Hai selezionato il modello: ${selectedModel}\nNon ci sono setup disponibili per il circuito ${choices.circuit}, categoria ${choices.category}, marca ${choices.brand}, modello ${selectedModel}.`
            });
        }

        await cleanupProcess(userId);
    }
});

client.login(TOKEN);

app.get('/', (req, res) => {
    res.send('Bot is running!');
});

app.listen(3000, () => {
    console.log('Server avviato sulla porta 3000');
});

async function cleanupProcess(userId) {
    const process = setupProcesses[userId];
    if (process) {
        for (const message of process.messages) {
            try {
                await message.delete();
            } catch (error) {
                console.error('Error deleting message during cleanup:', error);
            }
        }
        delete setupProcesses[userId];
    }
}
