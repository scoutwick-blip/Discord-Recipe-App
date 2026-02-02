const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
const path = require('path');
const { getRecipe } = require('./recipeStorage');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LISTS_FILE = path.join(DATA_DIR, 'shopping-lists.json');

if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
}

const CATEGORY_KEYWORDS = {
    'Produce': ['lettuce', 'tomato', 'onion', 'garlic', 'pepper', 'carrot', 'celery', 'potato', 'spinach', 'kale', 'broccoli', 'cucumber', 'zucchini', 'mushroom', 'avocado', 'lemon', 'lime', 'orange', 'apple', 'banana', 'berry', 'cilantro', 'parsley', 'basil', 'mint', 'ginger', 'scallion', 'fresh', 'vegetable', 'fruit'],
    'Meat': ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'bacon', 'sausage', 'ham', 'steak', 'ground', 'breast', 'thigh', 'meat'],
    'Seafood': ['fish', 'salmon', 'tuna', 'shrimp', 'crab', 'lobster', 'scallop', 'cod', 'tilapia', 'seafood'],
    'Dairy': ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'egg', 'mozzarella', 'parmesan', 'cheddar', 'feta'],
    'Bakery': ['bread', 'bun', 'roll', 'bagel', 'tortilla', 'pita', 'naan'],
    'Frozen': ['frozen', 'ice cream'],
    'Canned': ['canned', 'tomato paste', 'tomato sauce', 'broth', 'stock', 'coconut milk', 'beans', 'chickpeas'],
    'Pantry': ['flour', 'sugar', 'rice', 'pasta', 'noodle', 'quinoa', 'oat', 'nuts', 'oil', 'olive oil', 'vinegar', 'honey', 'vanilla'],
    'Spices': ['salt', 'pepper', 'paprika', 'cumin', 'coriander', 'turmeric', 'cinnamon', 'oregano', 'thyme', 'curry', 'spice'],
    'Condiments': ['ketchup', 'mustard', 'mayonnaise', 'soy sauce', 'hot sauce', 'sriracha', 'salsa', 'pesto'],
    'Beverages': ['water', 'juice', 'soda', 'coffee', 'tea', 'wine', 'beer']
};

function loadLists() {
    if (!existsSync(LISTS_FILE)) {
        return { lists: {}, guilds: {} };
    }
    try {
        const data = readFileSync(LISTS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return { lists: {}, guilds: {} };
    }
}

function saveLists(data) {
    writeFileSync(LISTS_FILE, JSON.stringify(data, null, 2));
}

function generateId() {
    return 'sl_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function categorizeIngredient(ingredient) {
    const lower = ingredient.toLowerCase();
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        for (const keyword of keywords) {
            if (lower.includes(keyword)) return category;
        }
    }
    return 'Other';
}

function combineIngredients(ingredients) {
    const combined = new Map();
    for (const ing of ingredients) {
        const key = ing.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (combined.has(key)) {
            const existing = combined.get(key);
            existing.sources.push(ing);
            if (ing.length > existing.text.length) existing.text = ing;
        } else {
            combined.set(key, {
                text: ing,
                sources: [ing],
                category: categorizeIngredient(ing),
                checked: false
            });
        }
    }
    return Array.from(combined.values());
}

function createShoppingList(recipeIds, guildId, userId) {
    const data = loadLists();
    const allIngredients = [];
    const recipeNames = [];

    for (const recipeId of recipeIds) {
        const recipe = getRecipe(recipeId);
        if (recipe && recipe.guildId === guildId) {
            allIngredients.push(...recipe.ingredients);
            recipeNames.push(recipe.name);
        }
    }

    if (allIngredients.length === 0) {
        throw new Error('No valid recipes found');
    }

    const items = combineIngredients(allIngredients);
    items.sort((a, b) => a.category === b.category ? a.text.localeCompare(b.text) : a.category.localeCompare(b.category));

    const id = generateId();
    const shoppingList = {
        id,
        guildId,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        recipes: recipeIds,
        recipeNames,
        items,
    };

    data.lists[id] = shoppingList;
    if (!data.guilds[guildId]) data.guilds[guildId] = [];
    data.guilds[guildId].push(id);
    saveLists(data);

    return shoppingList;
}

function getShoppingList(id) {
    const data = loadLists();
    return data.lists[id] || null;
}

function getGuildShoppingLists(guildId) {
    const data = loadLists();
    const listIds = data.guilds[guildId] || [];
    return listIds.map(id => data.lists[id]).filter(Boolean).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function toggleItem(listId, itemIndex) {
    const data = loadLists();
    const list = data.lists[listId];
    if (!list || itemIndex < 0 || itemIndex >= list.items.length) return null;
    list.items[itemIndex].checked = !list.items[itemIndex].checked;
    saveLists(data);
    return list;
}

function addItem(listId, item) {
    const data = loadLists();
    const list = data.lists[listId];
    if (!list) return null;
    list.items.push({ text: item, sources: ['Manual'], category: categorizeIngredient(item), checked: false });
    saveLists(data);
    return list;
}

function removeItem(listId, itemIndex) {
    const data = loadLists();
    const list = data.lists[listId];
    if (!list || itemIndex < 0 || itemIndex >= list.items.length) return null;
    list.items.splice(itemIndex, 1);
    saveLists(data);
    return list;
}

function clearChecked(listId) {
    const data = loadLists();
    const list = data.lists[listId];
    if (!list) return null;
    list.items = list.items.filter(item => !item.checked);
    saveLists(data);
    return list;
}

function deleteShoppingList(listId, guildId) {
    const data = loadLists();
    const list = data.lists[listId];
    if (!list || list.guildId !== guildId) return false;
    delete data.lists[listId];
    const guildLists = data.guilds[guildId];
    if (guildLists) data.guilds[guildId] = guildLists.filter(id => id !== listId);
    saveLists(data);
    return true;
}

function exportAsText(listId) {
    const list = getShoppingList(listId);
    if (!list) return null;

    let text = 'SHOPPING LIST\n' + '='.repeat(30) + '\n';
    text += `Recipes: ${list.recipeNames.join(', ')}\n\n`;

    const categories = {};
    for (const item of list.items) {
        const cat = item.category || 'Other';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(item);
    }

    for (const [category, items] of Object.entries(categories)) {
        text += `\n${category.toUpperCase()}\n`;
        for (const item of items) {
            const check = item.checked ? '[x]' : '[ ]';
            text += `  ${check} ${item.text}\n`;
        }
    }

    return text;
}

module.exports = {
    createShoppingList,
    getShoppingList,
    getGuildShoppingLists,
    toggleItem,
    addItem,
    removeItem,
    clearChecked,
    deleteShoppingList,
    exportAsText
};
