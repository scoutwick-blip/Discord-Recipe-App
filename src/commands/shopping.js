const { SlashCommandBuilder } = require('discord.js');
const {
    createShoppingList,
    getShoppingList,
    getGuildShoppingLists,
    toggleItem,
    addItem,
    removeItem,
    clearChecked,
    deleteShoppingList,
    exportAsText
} = require('../services/shoppingList');
const { formatShoppingListEmbed } = require('../utils/formatters');

const data = new SlashCommandBuilder()
    .setName('shopping')
    .setDescription('Manage shopping lists')
    .addSubcommand(subcommand =>
        subcommand
            .setName('create')
            .setDescription('Create a shopping list from recipes')
            .addStringOption(option =>
                option
                    .setName('recipes')
                    .setDescription('Recipe IDs (comma-separated)')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('view')
            .setDescription('View a shopping list')
            .addStringOption(option =>
                option
                    .setName('id')
                    .setDescription('Shopping list ID')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('list')
            .setDescription('List all shopping lists')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('check')
            .setDescription('Check/uncheck an item')
            .addStringOption(option =>
                option
                    .setName('id')
                    .setDescription('Shopping list ID')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
            .addIntegerOption(option =>
                option
                    .setName('item')
                    .setDescription('Item number')
                    .setRequired(true)
                    .setMinValue(1)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('add')
            .setDescription('Add an item to a shopping list')
            .addStringOption(option =>
                option
                    .setName('id')
                    .setDescription('Shopping list ID')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
            .addStringOption(option =>
                option
                    .setName('item')
                    .setDescription('Item to add')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('remove')
            .setDescription('Remove an item from a shopping list')
            .addStringOption(option =>
                option
                    .setName('id')
                    .setDescription('Shopping list ID')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
            .addIntegerOption(option =>
                option
                    .setName('item')
                    .setDescription('Item number')
                    .setRequired(true)
                    .setMinValue(1)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('clear')
            .setDescription('Clear all checked items')
            .addStringOption(option =>
                option
                    .setName('id')
                    .setDescription('Shopping list ID')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('delete')
            .setDescription('Delete a shopping list')
            .addStringOption(option =>
                option
                    .setName('id')
                    .setDescription('Shopping list ID')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('export')
            .setDescription('Export shopping list as text')
            .addStringOption(option =>
                option
                    .setName('id')
                    .setDescription('Shopping list ID')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
    );

async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case 'create': {
            const recipesInput = interaction.options.getString('recipes');
            const recipeIds = recipesInput.split(',').map(id => id.trim()).filter(Boolean);

            if (recipeIds.length === 0) {
                return interaction.reply({
                    content: 'Please provide at least one recipe ID.',
                    ephemeral: true
                });
            }

            try {
                const shoppingList = createShoppingList(
                    recipeIds,
                    interaction.guildId,
                    interaction.user.id
                );

                const embed = formatShoppingListEmbed(shoppingList);
                return interaction.reply({
                    content: `✅ Shopping list created! ID: \`${shoppingList.id}\``,
                    embeds: [embed]
                });
            } catch (error) {
                return interaction.reply({
                    content: `Error creating shopping list: ${error.message}`,
                    ephemeral: true
                });
            }
        }

        case 'view': {
            const id = interaction.options.getString('id');
            const list = getShoppingList(id);

            if (!list || list.guildId !== interaction.guildId) {
                return interaction.reply({ content: 'Shopping list not found.', ephemeral: true });
            }

            const embed = formatShoppingListEmbed(list);
            return interaction.reply({ embeds: [embed] });
        }

        case 'list': {
            const lists = getGuildShoppingLists(interaction.guildId);

            if (lists.length === 0) {
                return interaction.reply({
                    content: 'No shopping lists found. Create one with `/shopping create`.',
                    ephemeral: true
                });
            }

            const listText = lists.slice(0, 10).map((list, i) => {
                const checkedCount = list.items.filter(item => item.checked).length;
                const totalCount = list.items.length;
                const progress = `${checkedCount}/${totalCount}`;
                const recipes = list.recipeNames.slice(0, 2).join(', ');
                return `**${i + 1}.** ${recipes} - ${progress} items\n   \`ID: ${list.id}\``;
            }).join('\n\n');

            return interaction.reply({
                content: `🛒 **Your Shopping Lists**\n\n${listText}`
            });
        }

        case 'check': {
            const id = interaction.options.getString('id');
            const itemNum = interaction.options.getInteger('item') - 1;

            const list = toggleItem(id, itemNum);

            if (!list) {
                return interaction.reply({
                    content: 'Shopping list or item not found.',
                    ephemeral: true
                });
            }

            const item = list.items[itemNum];
            const status = item.checked ? '✅ Checked' : '⬜ Unchecked';

            return interaction.reply({
                content: `${status}: **${item.text}**`
            });
        }

        case 'add': {
            const id = interaction.options.getString('id');
            const item = interaction.options.getString('item');

            const list = addItem(id, item);

            if (!list) {
                return interaction.reply({ content: 'Shopping list not found.', ephemeral: true });
            }

            return interaction.reply({
                content: `✅ Added to shopping list: **${item}**`
            });
        }

        case 'remove': {
            const id = interaction.options.getString('id');
            const itemNum = interaction.options.getInteger('item') - 1;

            const listBefore = getShoppingList(id);
            if (!listBefore || itemNum >= listBefore.items.length) {
                return interaction.reply({
                    content: 'Shopping list or item not found.',
                    ephemeral: true
                });
            }

            const removedItem = listBefore.items[itemNum];
            const list = removeItem(id, itemNum);

            if (!list) {
                return interaction.reply({ content: 'Failed to remove item.', ephemeral: true });
            }

            return interaction.reply({
                content: `🗑️ Removed from shopping list: **${removedItem.text}**`
            });
        }

        case 'clear': {
            const id = interaction.options.getString('id');
            const listBefore = getShoppingList(id);

            if (!listBefore) {
                return interaction.reply({ content: 'Shopping list not found.', ephemeral: true });
            }

            const checkedCount = listBefore.items.filter(item => item.checked).length;

            if (checkedCount === 0) {
                return interaction.reply({
                    content: 'No checked items to clear.',
                    ephemeral: true
                });
            }

            clearChecked(id);

            return interaction.reply({
                content: `🧹 Cleared ${checkedCount} checked item(s) from the shopping list.`
            });
        }

        case 'delete': {
            const id = interaction.options.getString('id');

            const success = deleteShoppingList(id, interaction.guildId);

            if (success) {
                return interaction.reply({ content: '✅ Shopping list deleted.' });
            } else {
                return interaction.reply({ content: 'Shopping list not found.', ephemeral: true });
            }
        }

        case 'export': {
            const id = interaction.options.getString('id');
            const text = exportAsText(id);

            if (!text) {
                return interaction.reply({ content: 'Shopping list not found.', ephemeral: true });
            }

            return interaction.reply({
                content: '```\n' + text + '\n```'
            });
        }

        default:
            return interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
    }
}

async function autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const lists = getGuildShoppingLists(interaction.guildId);

    const filtered = lists
        .filter(list =>
            list.id.toLowerCase().includes(focusedValue) ||
            list.recipeNames.some(name => name.toLowerCase().includes(focusedValue))
        )
        .slice(0, 25);

    await interaction.respond(
        filtered.map(list => ({
            name: `${list.recipeNames.slice(0, 2).join(', ').substring(0, 80)} (${list.id})`,
            value: list.id
        }))
    );
}

module.exports = { data, execute, autocomplete };
