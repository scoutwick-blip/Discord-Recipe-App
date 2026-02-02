const { REST, Routes } = require('discord.js');
const { config } = require('dotenv');
const { readdirSync } = require('fs');
const path = require('path');

config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Load all command data
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command) {
        commands.push(command.data.toJSON());
        console.log(`✓ Loaded command: ${command.data.name}`);
    }
}

// Create REST client
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Deploy commands
async function deployCommands() {
    try {
        console.log(`\nStarting deployment of ${commands.length} application commands...`);

        let data;

        if (process.env.GUILD_ID) {
            // Deploy to specific guild (instant)
            data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands },
            );
            console.log(`✅ Successfully deployed ${data.length} commands to guild ${process.env.GUILD_ID}`);
        } else {
            // Deploy globally (takes up to 1 hour)
            data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands },
            );
            console.log(`✅ Successfully deployed ${data.length} commands globally`);
            console.log('   Note: Global commands can take up to 1 hour to appear');
        }
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
    }
}

deployCommands();
