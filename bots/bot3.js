const { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const cron = require('node-cron');
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
require('dotenv').config({ path: '/root/discord-multi-bot/.env' });

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages] });
const TOKEN = process.env.BOT3_TOKEN;
if (!TOKEN) {
    throw new Error("Token not found in .env file");
}
const SETUP_CHANNEL_ID = '1262171803858636990';
const TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

let setupProcesses = {};

// Definizione dei circuiti, categorie e auto
const circuits = [
    'Barcellona', 'Bathurst', 'Brands Hatch', 'Circuit of the Americas', 'Donington Park', 
    'Hungaroring', 'Imola', 'Indianapolis', 'Kyalami', 'Laguna Seca', 'Misano', 'Monza', 
    'Nurburgring', 'Nurburgring 24h', 'Red Bull Ring', 'Ricardo Tormo', 'Oulton Park', 
    'Paul Ricard', 'Silverstone', 'Spa-Francorchamps', 'Snetterton', 'Suzuka', 'Watkins Glen', 
    'Zandvoort', 'Zolder'
];

const categories = {
    'GT2': ['KTM X-Bow GT2', 'Maserati GT2', 'Audi R8 LMS GT2', 'Mercedes-AMG GT2', 'Porsche 911 GT2 RS CS Evo', 'Porsche 935'],
    'GT3': [
        'Ferrari 296 GT3 (2023)', 'Lamborghini Huracan GT3 EVO2 (2023)', 'Porsche 911 (992) GT3 R (2023)', 'Audi R8 LMS Evo II (2022)', 
        'Ferrari 488 Challenge Evo (2020)', 'Lamborghini Huracan ST EVO2 (2021)', 'Porsche 922 GT3 Cup (2021)', 'BMW M2 CS Racing (2020)', 
        'Ferrari 488 GT3 Evo (2020)', 'Mercedes-AMG GT3 (2023)', 'Aston Martin V8 Vantage (2019)', 'Aston Martin V12 Vantage (2013)', 
        'Audi R8 LMS (2015)', 'Audi R8 LMS Evo (2019)', 'Bentley Continental GT3 (2015)', 'Bentley Continental GT3 (2018)', 
        'BMW M4 GT3 (2022)', 'BMW M6 GT3 (2017)', 'Ferrari 488 GT3 (2018)', 'Ford Mustang GT3 Race Car (2024)', 
        'Honda NSX GT3 (2017)', 'Honda NSX GT3 Evo (2019)', 'Jaguar Emil Frey G3 (2012)', 'Lamborghini Huracan GT3 (2015)', 
        'Lamborghini Huracan GT3 Evo (2019)', 'McLaren 720S GT3 EVO (2023)', 'McLaren 720S GT3 (2019)', 'McLaren 650S GT3 (2015)', 
        'Mercedes-AMG GT3 (2015)', 'Nissan GT-R Nismo GT3 (2015)', 'Nissan GT-R Nismo (2018)', 'Porsche 991 GT3 R (2018)', 
        'Porsche 991II GT3 R (2019)', 'Reiter Engineering R-EX GT3 (2017)'
    ],
    'GT4': [
        'ALpine A110 GT4 (2018)', 'Aston Martin AMR V8 Vantage GT4 (2018)', 'Audi R8 LMS GT4 (2018)', 'BMW M4 GT4 (2018)', 
        'Chevrolet Camaro GT4.R (2017)', 'Ginetta g55 GT4 (2012)', 'KTM X-Bow GT4 (2016)', 'Maserati Gran Turismo MC GT4 (2016)', 
        'McLaren 570S GT4 (2016)', 'Mercedes-AMG GT4 (2016)', 'Porsche718 Cayman GT4 Clubsport (2019)'
    ]
};

// Funzione per generare la mappatura delle immagini
const generateSetupImages = () => {
    const setupImages = {};
    circuits.forEach(circuit => {
        Object.keys(categories).forEach(category => {
            categories[category].forEach(car => {
                const key = `${circuit}_${category}_${car}`;
                setupImages[key] = [];
                for (let i = 1; i <= 3; i++) {
                    const imagePath = path.join(__dirname, 'images', `${circuit}_${category}_${car.replace(/ /g, '_').replace(/\(|\)/g, '')}_${i}.png`);
                    setupImages[key].push(imagePath);
                }
            });
        });
    });
    return setupImages;
};

const setupImages = generateSetupImages();

// Funzione per pulire i messaggi di un processo
const cleanupProcess = async (userId) => {
    const process = setupProcesses[userId];
    if (!process) return;

    const { messages, timeout } = process;
    clearTimeout(timeout);

    for (const message of messages) {
        try {
            await message.delete();
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    }
    delete setupProcesses[userId];
};

// Funzione per avviare il processo di setup
const startSetupProcess = async (message) => {
    const userId = message.author.id;

    // Inizia il processo
    setupProcesses[userId] = {
        messages: [message],
        state: 'circuit',
        choices: {},
        timeout: setTimeout(() => {
            if (setupProcesses[userId]) {
                cleanupProcess(userId);
            }
        }, TIMEOUT)
    };

    // Chiedi il circuito
    const rows = [];
    for (let i = 0; i < circuits.length; i += 25) {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`circuitSelect${i / 25 + 1}`)
            .setPlaceholder('Seleziona il circuito')
            .addOptions(circuits.slice(i, i + 25).map(circuit => ({
                label: circuit,
                value: circuit
            })));
        rows.push(new ActionRowBuilder().addComponents(selectMenu));
    }

    const circuitMessage = await message.channel.send({
        content: 'Seleziona il circuito:',
        components: rows
    });
    setupProcesses[userId].messages.push(circuitMessage);
};

// Gestione del comando !setup e verifica del messaggio di spiegazione
client.on('messageCreate', async (message) => {
    if (message.channel.id !== SETUP_CHANNEL_ID || message.author.bot) return;

    const userId = message.author.id;

    if (message.content === '!setup') {
        // Verifica se esiste il messaggio di spiegazione dei comandi
        const messages = await message.channel.messages.fetch({ limit: 100 });
        const explanationExists = messages.some(msg => msg.content.includes('Ecco i comandi disponibili:'));

        if (!explanationExists) {
            await message.channel.send('Il canale è stato ripulito. Ecco i comandi disponibili:\n\n' +
                '**!setup**: Per avviare il Bot dei Setup.\n' +
                '**!reset**: Annulla il processo corrente e ripulisce tutto.\n' +
                '**!annulla**: Annulla la tua ultima scelta.');
        }

        // Avvia il processo di setup
        if (setupProcesses[userId]) {
            message.reply({ content: 'Hai già un processo di setup in corso.', ephemeral: true });
        } else {
            await startSetupProcess(message);
        }
    } else if (message.content === '!reset') {
        // Annulla il processo corrente e permette di avviarne uno nuovo
        if (setupProcesses[userId]) {
            await cleanupProcess(userId);
            message.reply({ content: 'Il tuo processo di setup è stato annullato. Puoi iniziare un nuovo processo con il comando !setup.', ephemeral: true });
        }
    } else if (message.content === '!annulla') {
        // Torna indietro di una scelta
        if (setupProcesses[userId]) {
            const process = setupProcesses[userId];
            const lastState = process.state;

            if (lastState === 'category') {
                process.state = 'circuit';
                process.choices = { circuit: process.choices.circuit };
            } else if (lastState === 'brand') {
                process.state = 'category';
                process.choices = { circuit: process.choices.circuit, category: process.choices.category };
            } else if (lastState === 'car') {
                process.state = 'brand';
                process.choices = { circuit: process.choices.circuit, category: process.choices.category, brand: process.choices.brand };
            }

            // Resend the appropriate message
            await cleanupProcess(userId);
            await startSetupProcess(message);
            message.reply({ content: 'Tornato indietro di una scelta. Puoi continuare con il setup.', ephemeral: true });
        } else {
            message.reply({ content: 'Non hai alcun processo di setup in corso.', ephemeral: true });
        }
    }
});

// Gestione delle interazioni con i menu a tendina
client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu()) return;

    const userId = interaction.user.id;
    const process = setupProcesses[userId];

    if (!process) {
        interaction.reply({ content: 'Non sei tu che hai avviato questo processo.', ephemeral: true });
        return;
    }

    if ((interaction.customId.startsWith('circuitSelect')) && process.state === 'circuit') {
        // Circuito selezionato
        process.circuit = interaction.values[0];
        process.choices.circuit = process.circuit;
        process.state = 'category';
        clearTimeout(process.timeout);
        process.timeout = setTimeout(() => {
            if (setupProcesses[userId]) {
                cleanupProcess(userId);
            }
        }, TIMEOUT);

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('categorySelect')
            .setPlaceholder('Seleziona la categoria')
            .addOptions([
                { label: 'GT2', value: 'GT2' },
                { label: 'GT3', value: 'GT3' },
                { label: 'GT4', value: 'GT4' }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const categoryMessage = await interaction.reply({
            content: `Circuito selezionato: ${process.choices.circuit}\nSeleziona la categoria:`,
            components: [row],
            fetchReply: true
        });
        process.messages.push(categoryMessage);
    } else if (interaction.customId === 'categorySelect' && process.state === 'category') {
        // Categoria selezionata
        process.category = interaction.values[0];
        process.choices.category = process.category;
        process.state = 'brand';
        clearTimeout(process.timeout);
        process.timeout = setTimeout(() => {
            if (setupProcesses[userId]) {
                cleanupProcess(userId);
            }
        }, TIMEOUT);

        const brands = {
            GT2: ['KTM', 'Maserati', 'Audi', 'Mercedes-AMG', 'Porsche'],
            GT3: [
                'Ferrari', 'Lamborghini', 'Porsche', 'Audi', 'BMW', 'Mercedes-AMG', 'Aston Martin', 
                'Bentley', 'Ford', 'Honda', 'Jaguar', 'McLaren', 'Nissan', 'Reiter Engineering'
            ],
            GT4: [
                'ALpine', 'Aston Martin', 'Audi', 'BMW', 'Chevrolet', 'Ginetta', 'KTM', 'Maserati', 
                'McLaren', 'Mercedes-AMG', 'Porsche'
            ]
        };

        const selectedBrands = brands[process.category];

        const brandOptions = selectedBrands.map(brand => ({
            label: brand,
            value: brand
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('brandSelect')
            .setPlaceholder('Seleziona la marca')
            .addOptions(brandOptions);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const brandMessage = await interaction.reply({
            content: `Circuito selezionato: ${process.choices.circuit}\nCategoria selezionata: ${process.choices.category}\nSeleziona la marca:`,
            components: [row],
            fetchReply: true
        });
        process.messages.push(brandMessage);
    } else if (interaction.customId === 'brandSelect' && process.state === 'brand') {
        // Marca selezionata
        process.brand = interaction.values[0];
        process.choices.brand = process.brand;
        process.state = 'car';
        clearTimeout(process.timeout);
        process.timeout = setTimeout(() => {
            if (setupProcesses[userId]) {
                cleanupProcess(userId);
            }
        }, TIMEOUT);

        const cars = {
            GT2: {
                KTM: ['KTM X-Bow GT2'],
                Maserati: ['Maserati GT2'],
                Audi: ['Audi R8 LMS GT2'],
                'Mercedes-AMG': ['Mercedes-AMG GT2'],
                Porsche: ['Porsche 911 GT2 RS CS Evo', 'Porsche 935']
            },
            GT3: {
                Ferrari: ['Ferrari 296 GT3 (2023)', 'Ferrari 488 Challenge Evo (2020)', 'Ferrari 488 GT3 Evo (2020)', 'Ferrari 488 GT3 (2018)'],
                Lamborghini: ['Lamborghini Huracan GT3 EVO2 (2023)', 'Lamborghini Huracan ST EVO2 (2021)', 'Lamborghini Huracan GT3 (2015)', 'Lamborghini Huracan GT3 Evo (2019)'],
                Porsche: ['Porsche 911 (992) GT3 R (2023)', 'Porsche 922 GT3 Cup (2021)', 'Porsche 991 GT3 R (2018)', 'Porsche 991II GT3 R (2019)'],
                Audi: ['Audi R8 LMS Evo II (2022)', 'Audi R8 LMS (2015)', 'Audi R8 LMS Evo (2019)'],
                BMW: ['BMW M2 CS Racing (2020)', 'BMW M4 GT3 (2022)', 'BMW M6 GT3 (2017)'],
                'Mercedes-AMG': ['Mercedes-AMG GT3 (2023)', 'Mercedes-AMG GT3 (2015)'],
                'Aston Martin': ['Aston Martin V8 Vantage (2019)', 'Aston Martin V12 Vantage (2013)'],
                Bentley: ['Bentley Continental GT3 (2015)', 'Bentley Continental GT3 (2018)'],
                Ford: ['Ford Mustang GT3 Race Car (2024)'],
                Honda: ['Honda NSX GT3 (2017)', 'Honda NSX GT3 Evo (2019)'],
                Jaguar: ['Jaguar Emil Frey G3 (2012)'],
                McLaren: ['McLaren 720S GT3 EVO (2023)', 'McLaren 720S GT3 (2019)', 'McLaren 650S GT3 (2015)'],
                Nissan: ['Nissan GT-R Nismo GT3 (2015)', 'Nissan GT-R Nismo (2018)'],
                'Reiter Engineering': ['Reiter Engineering R-EX GT3 (2017)']
            },
            GT4: {
                ALpine: ['ALpine A110 GT4 (2018)'],
                'Aston Martin': ['Aston Martin AMR V8 Vantage GT4 (2018)'],
                Audi: ['Audi R8 LMS GT4 (2018)'],
                BMW: ['BMW M4 GT4 (2018)'],
                Chevrolet: ['Chevrolet Camaro GT4.R (2017)'],
                Ginetta: ['Ginetta g55 GT4 (2012)'],
                KTM: ['KTM X-Bow GT4 (2016)'],
                Maserati: ['Maserati Gran Turismo MC GT4 (2016)'],
                McLaren: ['McLaren 570S GT4 (2016)'],
                'Mercedes-AMG': ['Mercedes-AMG GT4 (2016)'],
                Porsche: ['Porsche718 Cayman GT4 Clubsport (2019)']
            }
        };

        const selectedCars = cars[process.category][process.brand];

        const carOptions = selectedCars.map(car => ({
            label: car,
            value: car
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('carSelect')
            .setPlaceholder('Seleziona la macchina')
            .addOptions(carOptions);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const carMessage = await interaction.reply({
            content: `Circuito selezionato: ${process.choices.circuit}\nCategoria selezionata: ${process.choices.category}\nMarca selezionata: ${process.choices.brand}\nSeleziona la macchina:`,
            components: [row],
            fetchReply: true
        });
        process.messages.push(carMessage);
    } else if (interaction.customId === 'carSelect' && process.state === 'car') {
        // Macchina selezionata
        process.car = interaction.values[0];
        process.choices.car = process.car;
        clearTimeout(process.timeout);

        // Determina il set di immagini da inviare
        const key = `${process.choices.circuit}_${process.choices.category}_${process.choices.car}`;
        const images = setupImages[key] || [];

        const titles = ['Qualifica', 'Gara', 'Pioggia'];
        let imagesExist = true;

        for (let i = 0; i < images.length; i++) {
            if (!fs.existsSync(images[i])) {
                imagesExist = false;
                break;
            }
        }

        if (imagesExist) {
            for (let i = 0; i < images.length; i++) {
                await interaction.user.send({ content: titles[i], files: [images[i]] });
            }
            await interaction.reply({ content: 'Il setup è stato inviato in DM.', ephemeral: true });
        } else {
            await interaction.reply({ content: 'Il setup per questa configurazione non è momentaneamente disponibile. Stiamo provvedendo ad elaborare tutti i setup mancanti.', ephemeral: true });
        }

        // Pulizia dei messaggi e conclusione del processo
        setTimeout(() => {
            cleanupProcess(userId);
        }, 20000);
    }
});

// Pianificazione della pulizia del canale ogni lunedì alle 01:00
cron.schedule('0 1 * * 1', async () => {
    const channel = await client.channels.fetch(SETUP_CHANNEL_ID);
    const activeProcesses = Object.keys(setupProcesses).length;

    if (activeProcesses === 0) {
        try {
            // Fetch all messages from the channel
            const fetchedMessages = await channel.messages.fetch({ limit: 100 });
            await channel.bulkDelete(fetchedMessages);
            
            // Send message explaining the commands
            await channel.send('Il canale è stato ripulito. Ecco i comandi disponibili:\n\n' +
                '**!setup**: Per avviare il Bot dei Setup.\n' +
                '**!reset**: Annulla il processo corrente e ripulisce tutto.\n' +
                '**!annulla**: Annulla la tua ultima scelta.');
        } catch (error) {
            console.error('Error cleaning the channel:', error);
        }
    } else {
        console.log('Processi attivi presenti, attendere la fine dei processi per la pulizia.');
    }
});

client.login(TOKEN);

// Aggiungi un server HTTP per rispondere ai ping
app.get('/', (req, res) => {
    res.send('Il bot è attivo!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server avviato sulla porta ${PORT}`);
});
