const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { config } = require('dotenv');
const { readdirSync } = require('fs');
const path = require('path');

// Load environment variables
config();

// Create Discord client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Collection to store commands
client.commands = new Collection();

// Load all commands from the commands directory
function loadCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`✓ Loaded command: ${command.data.name}`);
        } else {
            console.log(`⚠ Command at ${filePath} is missing required "data" or "execute" property`);
        }
    }
}

// Handle slash command interactions
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        const errorMessage = { content: 'There was an error executing this command!', ephemeral: true };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
});

// Handle autocomplete interactions
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isAutocomplete()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command || !command.autocomplete) return;

    try {
        await command.autocomplete(interaction);
    } catch (error) {
        console.error(`Error in autocomplete for ${interaction.commandName}:`, error);
    }
});

// Listen for messages containing recipe URLs
const { detectRecipeUrl, parseRecipe } = require('./services/recipeParser');
const { saveRecipe } = require('./services/recipeStorage');
const { formatRecipeEmbed } = require('./utils/formatters');

client.on(Events.MessageCreate, async message => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Check if message contains a recipe URL
    const recipeUrl = detectRecipeUrl(message.content);

    if (recipeUrl) {
        try {
            // React to show we're processing
            try { await message.react('🍳'); } catch (e) { /* ignore */ }

            // Parse the recipe
            const recipe = await parseRecipe(recipeUrl);

            if (recipe) {
                // Save the recipe
                const savedRecipe = await saveRecipe(recipe, message.guild.id, message.author.id);

                // Send formatted recipe
                const embed = formatRecipeEmbed(savedRecipe);
                await message.reply({
                    content: `Recipe saved! Use \`/recipe view ${savedRecipe.id}\` to view it anytime.`,
                    embeds: [embed]
                });

                // Update reaction (ignore permission errors)
                try {
                    await message.reactions.removeAll();
                    await message.react('✅');
                } catch (e) { /* ignore permission errors */ }
            }
        } catch (error) {
            console.error('Error processing recipe URL:', error);
            try {
                await message.reactions.removeAll();
                await message.react('❌');
            } catch (e) { /* ignore */ }
            await message.reply('Sorry, I couldn\'t parse that recipe. The website might not be supported or the link may be invalid.');
        }
    }
});

// When the bot is ready
client.once(Events.ClientReady, c => {
    console.log('═'.repeat(50));
    console.log(`🍽️  Recipe Bot is online!`);
    console.log(`📊 Logged in as ${c.user.tag}`);
    console.log(`🏠 Serving ${c.guilds.cache.size} server(s)`);
    console.log('═'.repeat(50));
});

// Start the bot
async function main() {
    loadCommands();

    if (!process.env.DISCORD_TOKEN) {
        console.error('❌ DISCORD_TOKEN is not set in environment variables!');
        console.error('   Copy .env.example to .env and add your bot token.');
        process.exit(1);
    }

    await client.login(process.env.DISCORD_TOKEN);
}

main().catch(console.error);
