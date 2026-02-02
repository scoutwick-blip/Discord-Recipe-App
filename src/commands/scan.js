const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { detectRecipeUrl, parseRecipe } = require('../services/recipeParser');
const { saveRecipe, getGuildRecipes } = require('../services/recipeStorage');
const { setRecipeChannel } = require('../services/guildConfig');

const data = new SlashCommandBuilder()
    .setName('scan')
    .setDescription('Scan channel history for recipe links')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(option =>
        option
            .setName('limit')
            .setDescription('Number of messages to scan (default: 100, max: 500)')
            .setMinValue(10)
            .setMaxValue(500)
    );

async function execute(interaction) {
    const limit = interaction.options.getInteger('limit') || 100;

    await interaction.deferReply();

    // Get existing recipe URLs to avoid duplicates
    const existingRecipes = getGuildRecipes(interaction.guildId);
    const existingUrls = new Set(existingRecipes.map(r => r.sourceUrl));

    let scanned = 0;
    let found = 0;
    let saved = 0;
    let failed = 0;
    let skipped = 0;

    try {
        // Fetch messages in batches
        let lastId;
        let remaining = limit;

        while (remaining > 0) {
            const fetchLimit = Math.min(remaining, 100);
            const messages = await interaction.channel.messages.fetch({
                limit: fetchLimit,
                ...(lastId && { before: lastId })
            });

            if (messages.size === 0) break;

            for (const [, message] of messages) {
                scanned++;
                if (message.author.bot) continue;

                const recipeUrl = detectRecipeUrl(message.content);
                if (!recipeUrl) continue;

                found++;

                // Skip if already saved
                if (existingUrls.has(recipeUrl)) {
                    skipped++;
                    continue;
                }

                try {
                    const recipe = await parseRecipe(recipeUrl);
                    if (recipe) {
                        await saveRecipe(recipe, interaction.guildId, message.author.id);
                        existingUrls.add(recipeUrl);
                        saved++;
                    }
                } catch (e) {
                    failed++;
                }

                // Small delay to avoid rate limits
                await new Promise(r => setTimeout(r, 500));
            }

            lastId = messages.last()?.id;
            remaining -= messages.size;

            // Update progress
            if (scanned % 50 === 0) {
                await interaction.editReply({
                    content: `Scanning... ${scanned}/${limit} messages checked, ${saved} recipes saved so far...`
                });
            }
        }

        // Also set this channel as a recipe channel
        setRecipeChannel(interaction.guildId, interaction.channelId);

        await interaction.editReply({
            content: [
                `**Scan complete!**`,
                `Messages scanned: ${scanned}`,
                `Recipe links found: ${found}`,
                `New recipes saved: ${saved}`,
                `Already saved: ${skipped}`,
                `Failed to parse: ${failed}`,
                ``,
                `This channel has been set as a recipe channel.`
            ].join('\n')
        });

    } catch (error) {
        console.error('Scan error:', error);
        await interaction.editReply({
            content: `Scan stopped after ${scanned} messages. Saved ${saved} recipes. Error: ${error.message}`
        });
    }
}

module.exports = { data, execute };
