module.exports = {
    apps: [
      {
        name: 'bot1',
        script: './bots/bot1.js',
        env: {
          TOKEN: process.env.BOT1_TOKEN
        }
      },
      {
        name: 'bot2',
        script: './bots/bot2.js',
        env: {
          TOKEN: process.env.BOT2_TOKEN
        }
      },
      {
        name: 'bot3',
        script: './bots/bot3.js',
        env: {
          TOKEN: process.env.BOT3_TOKEN
        }
      },
      {
        name: 'bot4',
        script: './bots/bot4.js',
        env: {
          TOKEN: process.env.BOT4_TOKEN
        }
      },
      {
        name: 'bot5',
        script: './bots/bot5.js',
        env: {
          TOKEN: process.env.BOT5_TOKEN
        }
      }
    ]
  };
  