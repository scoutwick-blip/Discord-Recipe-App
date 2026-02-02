const { SlashCommandBuilder } = require('discord.js');
const {
    getRecipe,
    getGuildRecipes,
    searchRecipes,
    deleteRecipe,
    updateRecipeTags,
    addRecipeNote,
    rateRecipe,
    markAsCooked
} = require('../services/recipeStorage');
const {
    formatRecipeEmbed,
    formatIngredientsEmbed,
    formatInstructionsEmbeds,
    formatRecipeListEmbed,
    createRecipeButtons,
    createBackButton,
    createPaginationButtons
} = require('../utils/formatters');

const data = new SlashCommandBuilder()
    .setName('recipe')
    .setDescription('Manage your saved recipes')
    .addSubcommand(subcommand =>
        subcommand
            .setName('view')
            .setDescription('View a saved recipe')
            .addStringOption(option =>
                option
                    .setName('id')
                    .setDescription('Recipe ID')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('ingredients')
            .setDescription('View recipe ingredients')
            .addStringOption(option =>
                option
                    .setName('id')
                    .setDescription('Recipe ID')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('instructions')
            .setDescription('View recipe instructions')
            .addStringOption(option =>
                option
                    .setName('id')
                    .setDescription('Recipe ID')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('list')
            .setDescription('List all saved recipes')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('search')
            .setDescription('Search recipes by name or ingredient')
            .addStringOption(option =>
                option
                    .setName('query')
                    .setDescription('Search query')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('delete')
            .setDescription('Delete a saved recipe')
            .addStringOption(option =>
                option
                    .setName('id')
                    .setDescription('Recipe ID')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('tag')
            .setDescription('Add tags to a recipe')
            .addStringOption(option =>
                option
                    .setName('id')
                    .setDescription('Recipe ID')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
            .addStringOption(option =>
                option
                    .setName('tags')
                    .setDescription('Tags (comma-separated)')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('note')
            .setDescription('Add a note to a recipe')
            .addStringOption(option =>
                option
                    .setName('id')
                    .setDescription('Recipe ID')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
            .addStringOption(option =>
                option
                    .setName('note')
                    .setDescription('Your note')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('rate')
            .setDescription('Rate a recipe')
            .addStringOption(option =>
                option
                    .setName('id')
                    .setDescription('Recipe ID')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
            .addIntegerOption(option =>
                option
                    .setName('rating')
                    .setDescription('Rating (1-5 stars)')
                    .setRequired(true)
                    .setMinValue(1)
                    .setMaxValue(5)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('cooked')
            .setDescription('Mark a recipe as cooked')
            .addStringOption(option =>
                option
                    .setName('id')
                    .setDescription('Recipe ID')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
    );

async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case 'view': {
            const id = interaction.options.getString('id');
            const recipe = getRecipe(id);

            if (!recipe || recipe.guildId !== interaction.guildId) {
                return interaction.reply({ content: 'Recipe not found.', ephemeral: true });
            }

            const embed = formatRecipeEmbed(recipe);
            const buttons = createRecipeButtons(id);
            return interaction.reply({ embeds: [embed], components: [buttons] });
        }

        case 'ingredients': {
            const id = interaction.options.getString('id');
            const recipe = getRecipe(id);

            if (!recipe || recipe.guildId !== interaction.guildId) {
                return interaction.reply({ content: 'Recipe not found.', ephemeral: true });
            }

            const embed = formatIngredientsEmbed(recipe);
            const backBtn = createBackButton(id);
            return interaction.reply({ embeds: [embed], components: [backBtn] });
        }

        case 'instructions': {
            const id = interaction.options.getString('id');
            const recipe = getRecipe(id);

            if (!recipe || recipe.guildId !== interaction.guildId) {
                return interaction.reply({ content: 'Recipe not found.', ephemeral: true });
            }

            const embeds = formatInstructionsEmbeds(recipe);
            const backBtn = createBackButton(id);
            return interaction.reply({ embeds: embeds.slice(0, 10), components: [backBtn] });
        }

        case 'list': {
            const recipes = getGuildRecipes(interaction.guildId);
            const { embed, totalPages, page } = formatRecipeListEmbed(recipes, 'Your Recipes', 0);
            const components = totalPages > 1 ? [createPaginationButtons(page, totalPages, 'recipelist')] : [];
            return interaction.reply({ embeds: [embed], components });
        }

        case 'search': {
            const query = interaction.options.getString('query');
            const recipes = searchRecipes(interaction.guildId, query);
            const { embed, totalPages, page } = formatRecipeListEmbed(recipes, `Search: "${query}"`, 0);
            const components = totalPages > 1 ? [createPaginationButtons(page, totalPages, 'searchlist')] : [];
            return interaction.reply({ embeds: [embed], components });
        }

        case 'delete': {
            const id = interaction.options.getString('id');
            const recipe = getRecipe(id);

            if (!recipe || recipe.guildId !== interaction.guildId) {
                return interaction.reply({ content: 'Recipe not found.', ephemeral: true });
            }

            const success = deleteRecipe(id, interaction.guildId);

            if (success) {
                return interaction.reply({ content: `✅ Deleted recipe: **${recipe.name}**` });
            } else {
                return interaction.reply({ content: 'Failed to delete recipe.', ephemeral: true });
            }
        }

        case 'tag': {
            const id = interaction.options.getString('id');
            const tagsInput = interaction.options.getString('tags');
            const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

            const recipe = updateRecipeTags(id, tags);

            if (!recipe) {
                return interaction.reply({ content: 'Recipe not found.', ephemeral: true });
            }

            return interaction.reply({
                content: `✅ Updated tags for **${recipe.name}**: ${tags.map(t => `\`${t}\``).join(' ')}`
            });
        }

        case 'note': {
            const id = interaction.options.getString('id');
            const note = interaction.options.getString('note');

            const recipe = addRecipeNote(id, note);

            if (!recipe) {
                return interaction.reply({ content: 'Recipe not found.', ephemeral: true });
            }

            return interaction.reply({
                content: `✅ Added note to **${recipe.name}**:\n> ${note}`
            });
        }

        case 'rate': {
            const id = interaction.options.getString('id');
            const rating = interaction.options.getInteger('rating');

            const recipe = rateRecipe(id, rating);

            if (!recipe) {
                return interaction.reply({ content: 'Recipe not found.', ephemeral: true });
            }

            const stars = '⭐'.repeat(rating);
            return interaction.reply({
                content: `✅ Rated **${recipe.name}**: ${stars}`
            });
        }

        case 'cooked': {
            const id = interaction.options.getString('id');
            const recipe = markAsCooked(id);

            if (!recipe) {
                return interaction.reply({ content: 'Recipe not found.', ephemeral: true });
            }

            return interaction.reply({
                content: `👨‍🍳 Marked **${recipe.name}** as cooked! (Total: ${recipe.timesCooked} times)`
            });
        }

        default:
            return interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
    }
}

async function autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const recipes = getGuildRecipes(interaction.guildId);

    const filtered = recipes
        .filter(recipe =>
            recipe.name.toLowerCase().includes(focusedValue) ||
            recipe.id.toLowerCase().includes(focusedValue)
        )
        .slice(0, 25);

    await interaction.respond(
        filtered.map(recipe => ({
            name: `${recipe.name.substring(0, 80)} (${recipe.id})`,
            value: recipe.id
        }))
    );
}

module.exports = { data, execute, autocomplete };
