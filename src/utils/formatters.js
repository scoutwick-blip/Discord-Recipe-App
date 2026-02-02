const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Format a recipe as a Discord embed
 */
function formatRecipeEmbed(recipe, options = {}) {
    const embed = new EmbedBuilder()
        .setColor(0xE67E22)
        .setTitle(truncate(recipe.name, 256))
        .setURL(recipe.sourceUrl || null);

    if (recipe.description) {
        embed.setDescription(truncate(recipe.description, 300));
    }

    if (recipe.image && !options.compact) {
        embed.setThumbnail(recipe.image);
    }

    const timeInfo = [];
    if (recipe.prepTime) timeInfo.push(`Prep: ${recipe.prepTime}`);
    if (recipe.cookTime) timeInfo.push(`Cook: ${recipe.cookTime}`);
    if (recipe.totalTime) timeInfo.push(`Total: ${recipe.totalTime}`);

    if (timeInfo.length > 0) {
        embed.addFields({ name: '⏱️ Time', value: timeInfo.join(' | '), inline: true });
    }

    if (recipe.servings) {
        embed.addFields({ name: '🍽️ Servings', value: String(recipe.servings), inline: true });
    }

    const meta = [];
    if (recipe.cuisine) meta.push(recipe.cuisine);
    if (recipe.category) meta.push(recipe.category);

    if (meta.length > 0) {
        embed.addFields({ name: '🏷️ Category', value: meta.join(', '), inline: true });
    }

    if (recipe.rating) {
        const stars = '⭐'.repeat(recipe.rating) + '☆'.repeat(5 - recipe.rating);
        embed.addFields({ name: 'Rating', value: stars, inline: true });
    }

    if (recipe.ingredients && recipe.ingredients.length > 0 && !options.compact) {
        const ingredientList = recipe.ingredients
            .slice(0, 8)
            .map(ing => `• ${truncate(ing, 50)}`)
            .join('\n');

        const suffix = recipe.ingredients.length > 8
            ? `\n*...and ${recipe.ingredients.length - 8} more*`
            : '';

        embed.addFields({
            name: `📝 Ingredients (${recipe.ingredients.length})`,
            value: ingredientList + suffix,
            inline: false
        });
    }

    if (recipe.tags && recipe.tags.length > 0) {
        embed.addFields({
            name: '🏷️ Tags',
            value: recipe.tags.map(t => `\`${t}\``).join(' '),
            inline: false
        });
    }

    const footerParts = [`ID: ${recipe.id}`];
    if (recipe.author) footerParts.push(`by ${recipe.author}`);

    embed.setFooter({ text: footerParts.join(' | ') });

    if (recipe.savedAt) {
        embed.setTimestamp(new Date(recipe.savedAt));
    }

    return embed;
}

/**
 * Format recipe ingredients as a detailed embed
 */
function formatIngredientsEmbed(recipe) {
    const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle(`📝 ${recipe.name} - Ingredients`)
        .setURL(recipe.sourceUrl || null);

    if (recipe.servings) {
        embed.setDescription(`*Makes ${recipe.servings} servings*`);
    }

    const ingredientList = recipe.ingredients
        .map((ing, i) => `${i + 1}. ${ing}`)
        .join('\n');

    const chunks = splitIntoChunks(ingredientList, 1024);

    chunks.forEach((chunk, index) => {
        embed.addFields({
            name: index === 0 ? 'Ingredients' : '\u200B',
            value: chunk,
            inline: false
        });
    });

    embed.setFooter({ text: `Recipe ID: ${recipe.id}` });

    return embed;
}

/**
 * Format recipe instructions as detailed embeds
 */
function formatInstructionsEmbeds(recipe) {
    const embeds = [];

    const mainEmbed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle(`👨‍🍳 ${recipe.name} - Instructions`)
        .setURL(recipe.sourceUrl || null);

    if (recipe.image) {
        mainEmbed.setThumbnail(recipe.image);
    }

    const timeInfo = [];
    if (recipe.prepTime) timeInfo.push(`Prep: ${recipe.prepTime}`);
    if (recipe.cookTime) timeInfo.push(`Cook: ${recipe.cookTime}`);

    if (timeInfo.length > 0) {
        mainEmbed.setDescription(`*${timeInfo.join(' | ')}*`);
    }

    const instructionList = recipe.instructions
        .map((inst, i) => `**Step ${i + 1}:** ${inst}`)
        .join('\n\n');

    const chunks = splitIntoChunks(instructionList, 1024);

    if (chunks.length <= 3) {
        chunks.forEach((chunk, index) => {
            mainEmbed.addFields({
                name: index === 0 ? 'Steps' : '\u200B',
                value: chunk,
                inline: false
            });
        });
        mainEmbed.setFooter({ text: `Recipe ID: ${recipe.id}` });
        embeds.push(mainEmbed);
    } else {
        mainEmbed.addFields({
            name: 'Steps',
            value: chunks[0],
            inline: false
        });
        embeds.push(mainEmbed);

        for (let i = 1; i < chunks.length; i++) {
            const contEmbed = new EmbedBuilder()
                .setColor(0x2ECC71)
                .addFields({
                    name: '\u200B',
                    value: chunks[i],
                    inline: false
                });

            if (i === chunks.length - 1) {
                contEmbed.setFooter({ text: `Recipe ID: ${recipe.id}` });
            }

            embeds.push(contEmbed);
        }
    }

    return embeds;
}

/**
 * Format a shopping list as an embed
 */
function formatShoppingListEmbed(shoppingList) {
    const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle('🛒 Shopping List')
        .setDescription(`*${shoppingList.recipes.length} recipe(s) | ${shoppingList.items.length} items*`);

    const categories = {};

    for (const item of shoppingList.items) {
        const category = item.category || 'Other';
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push(item);
    }

    for (const [category, items] of Object.entries(categories)) {
        const itemList = items
            .map(item => {
                const checkbox = item.checked ? '☑️' : '⬜';
                return `${checkbox} ${item.text}`;
            })
            .join('\n');

        embed.addFields({
            name: getCategoryEmoji(category) + ' ' + category,
            value: truncate(itemList, 1024),
            inline: false
        });
    }

    if (shoppingList.recipeNames && shoppingList.recipeNames.length > 0) {
        embed.addFields({
            name: '📋 Recipes',
            value: shoppingList.recipeNames.map(n => `• ${n}`).join('\n'),
            inline: false
        });
    }

    embed.setFooter({ text: `List ID: ${shoppingList.id}` });
    embed.setTimestamp(new Date(shoppingList.createdAt));

    return embed;
}

/**
 * Format recipe list as an embed
 */
function formatRecipeListEmbed(recipes, title = 'Recipes') {
    const embed = new EmbedBuilder()
        .setColor(0xE67E22)
        .setTitle(`📚 ${title}`)
        .setDescription(`*${recipes.length} recipe(s) found*`);

    if (recipes.length === 0) {
        embed.setDescription('No recipes found. Post a recipe link to get started!');
        return embed;
    }

    const recipeList = recipes
        .slice(0, 15)
        .map((recipe, i) => {
            const rating = recipe.rating ? ' ⭐'.repeat(recipe.rating) : '';
            const tags = recipe.tags?.length > 0 ? ` [${recipe.tags.join(', ')}]` : '';
            return `**${i + 1}.** ${truncate(recipe.name, 40)}${rating}${tags}\n   \`ID: ${recipe.id}\``;
        })
        .join('\n\n');

    embed.addFields({
        name: 'Recipes',
        value: recipeList,
        inline: false
    });

    if (recipes.length > 15) {
        embed.setFooter({ text: `Showing 15 of ${recipes.length} recipes` });
    }

    return embed;
}

/**
 * Format statistics as an embed
 */
function formatStatsEmbed(stats) {
    const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('📊 Recipe Collection Stats');

    embed.addFields(
        { name: '📚 Total Recipes', value: String(stats.totalRecipes), inline: true },
        { name: '👨‍🍳 Times Cooked', value: String(stats.totalCooked), inline: true },
        { name: '\u200B', value: '\u200B', inline: true }
    );

    if (stats.topRated.length > 0) {
        const topRated = stats.topRated
            .slice(0, 3)
            .map(r => `${r.name} ${'⭐'.repeat(r.rating)}`)
            .join('\n');
        embed.addFields({ name: '🏆 Top Rated', value: topRated, inline: false });
    }

    if (stats.mostCooked.length > 0) {
        const mostCooked = stats.mostCooked
            .slice(0, 3)
            .map(r => `${r.name} (${r.timesCooked}x)`)
            .join('\n');
        embed.addFields({ name: '🔥 Most Cooked', value: mostCooked, inline: false });
    }

    if (stats.cuisines.length > 0) {
        embed.addFields({
            name: '🌍 Cuisines',
            value: stats.cuisines.slice(0, 10).join(', '),
            inline: false
        });
    }

    return embed;
}

function getCategoryEmoji(category) {
    const emojis = {
        'Produce': '🥬',
        'Meat': '🥩',
        'Seafood': '🐟',
        'Dairy': '🧀',
        'Bakery': '🍞',
        'Frozen': '🧊',
        'Canned': '🥫',
        'Pantry': '🫙',
        'Spices': '🧂',
        'Condiments': '🍯',
        'Beverages': '🥤',
        'Other': '📦'
    };
    return emojis[category] || '📦';
}

function truncate(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

function splitIntoChunks(text, maxSize) {
    const chunks = [];
    const lines = text.split('\n');
    let currentChunk = '';

    for (const line of lines) {
        if (currentChunk.length + line.length + 1 > maxSize) {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = line;
        } else {
            currentChunk += (currentChunk ? '\n' : '') + line;
        }
    }

    if (currentChunk) chunks.push(currentChunk.trim());

    return chunks;
}

/**
 * Create action buttons for a recipe
 */
function createRecipeButtons(recipeId) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`recipe_ingredients_${recipeId}`)
                .setLabel('Ingredients')
                .setEmoji('📝')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`recipe_instructions_${recipeId}`)
                .setLabel('Instructions')
                .setEmoji('👨‍🍳')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`recipe_shop_${recipeId}`)
                .setLabel('Shopping List')
                .setEmoji('🛒')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`recipe_cooked_${recipeId}`)
                .setLabel('Cooked It!')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Secondary)
        );
    return row;
}

/**
 * Create back button to return to recipe view
 */
function createBackButton(recipeId) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`recipe_view_${recipeId}`)
                .setLabel('Back to Recipe')
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Secondary)
        );
    return row;
}

module.exports = {
    formatRecipeEmbed,
    formatIngredientsEmbed,
    formatInstructionsEmbeds,
    formatShoppingListEmbed,
    formatRecipeListEmbed,
    formatStatsEmbed,
    createRecipeButtons,
    createBackButton
};
