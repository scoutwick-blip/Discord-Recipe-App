import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

export const data = new SlashCommandBuilder()
    .setName('recipehelp')
    .setDescription('Show help for the Recipe Bot');

export async function execute(interaction) {
    const embed = new EmbedBuilder()
        .setColor(0xE67E22)
        .setTitle('🍽️ Recipe Bot Help')
        .setDescription('Save, organize, and cook recipes from the web!')
        .addFields(
            {
                name: '📥 Adding Recipes',
                value: 'Just paste a recipe URL in any channel and I\'ll automatically save it!\n' +
                    'Supported sites include AllRecipes, Food Network, Epicurious, and many more.',
                inline: false
            },
            {
                name: '📋 Recipe Commands',
                value: '`/recipe view <id>` - View a saved recipe\n' +
                    '`/recipe ingredients <id>` - See full ingredients list\n' +
                    '`/recipe instructions <id>` - Step-by-step instructions\n' +
                    '`/recipe list` - List all saved recipes\n' +
                    '`/recipe search <query>` - Search by name/ingredient\n' +
                    '`/recipe delete <id>` - Delete a recipe\n' +
                    '`/recipe tag <id> <tags>` - Add tags to organize\n' +
                    '`/recipe note <id> <note>` - Add a personal note\n' +
                    '`/recipe rate <id> <1-5>` - Rate a recipe\n' +
                    '`/recipe cooked <id>` - Mark as cooked',
                inline: false
            },
            {
                name: '🛒 Shopping List Commands',
                value: '`/shopping create <recipe-ids>` - Create list from recipes\n' +
                    '`/shopping view <id>` - View a shopping list\n' +
                    '`/shopping list` - List all shopping lists\n' +
                    '`/shopping check <id> <item>` - Check off an item\n' +
                    '`/shopping add <id> <item>` - Add a custom item\n' +
                    '`/shopping remove <id> <item>` - Remove an item\n' +
                    '`/shopping clear <id>` - Clear checked items\n' +
                    '`/shopping export <id>` - Export as text\n' +
                    '`/shopping delete <id>` - Delete a list',
                inline: false
            },
            {
                name: '📊 Other Commands',
                value: '`/recipestats` - View collection statistics\n' +
                    '`/recipehelp` - Show this help message',
                inline: false
            },
            {
                name: '💡 Tips',
                value: '• Recipe IDs are shown in embeds and can be autocompleted\n' +
                    '• Use tags to categorize recipes (e.g., "quick, dinner, vegetarian")\n' +
                    '• Shopping lists auto-combine duplicate ingredients\n' +
                    '• Search works on recipe names, ingredients, and tags',
                inline: false
            }
        )
        .setFooter({ text: 'Happy cooking! 👨‍🍳' });

    return interaction.reply({ embeds: [embed] });
}
