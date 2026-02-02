const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const RECIPES_FILE = path.join(DATA_DIR, 'recipes.json');

if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
}

function loadRecipes() {
    if (!existsSync(RECIPES_FILE)) {
        return { recipes: {}, guilds: {} };
    }
    try {
        const data = readFileSync(RECIPES_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading recipes:', error);
        return { recipes: {}, guilds: {} };
    }
}

function saveRecipesData(data) {
    writeFileSync(RECIPES_FILE, JSON.stringify(data, null, 2));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

async function saveRecipe(recipe, guildId, userId) {
    const data = loadRecipes();
    const id = generateId();
    const savedRecipe = {
        id,
        ...recipe,
        guildId,
        savedBy: userId,
        savedAt: new Date().toISOString(),
        tags: [],
        notes: null,
        rating: null,
        timesCooked: 0,
    };

    data.recipes[id] = savedRecipe;

    if (!data.guilds[guildId]) {
        data.guilds[guildId] = { recipes: [], shoppingLists: [] };
    }
    data.guilds[guildId].recipes.push(id);

    saveRecipesData(data);
    return savedRecipe;
}

function getRecipe(id) {
    const data = loadRecipes();
    return data.recipes[id] || null;
}

function getGuildRecipes(guildId) {
    const data = loadRecipes();
    const guildData = data.guilds[guildId];

    if (!guildData) return [];

    return guildData.recipes
        .map(id => data.recipes[id])
        .filter(Boolean)
        .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
}

function searchRecipes(guildId, query) {
    const recipes = getGuildRecipes(guildId);
    const queryLower = query.toLowerCase();

    return recipes.filter(recipe => {
        if (recipe.name.toLowerCase().includes(queryLower)) return true;
        if (recipe.ingredients.some(ing => ing.toLowerCase().includes(queryLower))) return true;
        if (recipe.tags.some(tag => tag.toLowerCase().includes(queryLower))) return true;
        if (recipe.category?.toLowerCase().includes(queryLower)) return true;
        if (recipe.cuisine?.toLowerCase().includes(queryLower)) return true;
        return false;
    });
}

function deleteRecipe(id, guildId) {
    const data = loadRecipes();
    const recipe = data.recipes[id];

    if (!recipe || recipe.guildId !== guildId) return false;

    delete data.recipes[id];

    const guildData = data.guilds[guildId];
    if (guildData) {
        guildData.recipes = guildData.recipes.filter(rid => rid !== id);
    }

    saveRecipesData(data);
    return true;
}

function updateRecipeTags(id, tags) {
    const data = loadRecipes();
    const recipe = data.recipes[id];
    if (!recipe) return null;

    recipe.tags = tags;
    saveRecipesData(data);
    return recipe;
}

function addRecipeNote(id, note) {
    const data = loadRecipes();
    const recipe = data.recipes[id];
    if (!recipe) return null;

    recipe.notes = note;
    saveRecipesData(data);
    return recipe;
}

function rateRecipe(id, rating) {
    const data = loadRecipes();
    const recipe = data.recipes[id];
    if (!recipe) return null;

    recipe.rating = Math.min(5, Math.max(1, rating));
    saveRecipesData(data);
    return recipe;
}

function markAsCooked(id) {
    const data = loadRecipes();
    const recipe = data.recipes[id];
    if (!recipe) return null;

    recipe.timesCooked = (recipe.timesCooked || 0) + 1;
    recipe.lastCooked = new Date().toISOString();
    saveRecipesData(data);
    return recipe;
}

function getGuildStats(guildId) {
    const recipes = getGuildRecipes(guildId);

    return {
        totalRecipes: recipes.length,
        totalCooked: recipes.reduce((sum, r) => sum + (r.timesCooked || 0), 0),
        topRated: recipes.filter(r => r.rating).sort((a, b) => b.rating - a.rating).slice(0, 5),
        mostCooked: recipes.filter(r => r.timesCooked).sort((a, b) => b.timesCooked - a.timesCooked).slice(0, 5),
        recentlyAdded: recipes.slice(0, 5),
        cuisines: [...new Set(recipes.map(r => r.cuisine).filter(Boolean))],
        categories: [...new Set(recipes.map(r => r.category).filter(Boolean))],
    };
}

module.exports = {
    saveRecipe,
    getRecipe,
    getGuildRecipes,
    searchRecipes,
    deleteRecipe,
    updateRecipeTags,
    addRecipeNote,
    rateRecipe,
    markAsCooked,
    getGuildStats
};
