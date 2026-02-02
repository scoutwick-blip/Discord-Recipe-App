import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', 'data');
const RECIPES_FILE = join(DATA_DIR, 'recipes.json');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Load all recipes from storage
 */
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

/**
 * Save recipes to storage
 */
function saveRecipes(data) {
    writeFileSync(RECIPES_FILE, JSON.stringify(data, null, 2));
}

/**
 * Generate a unique recipe ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Save a new recipe
 * @param {Object} recipe - The parsed recipe data
 * @param {string} guildId - The Discord guild ID
 * @param {string} userId - The user who saved the recipe
 * @returns {Object} - The saved recipe with ID
 */
export async function saveRecipe(recipe, guildId, userId) {
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

    // Store recipe
    data.recipes[id] = savedRecipe;

    // Index by guild
    if (!data.guilds[guildId]) {
        data.guilds[guildId] = { recipes: [], shoppingLists: [] };
    }
    data.guilds[guildId].recipes.push(id);

    saveRecipes(data);

    return savedRecipe;
}

/**
 * Get a recipe by ID
 * @param {string} id - Recipe ID
 * @returns {Object|null} - The recipe or null if not found
 */
export function getRecipe(id) {
    const data = loadRecipes();
    return data.recipes[id] || null;
}

/**
 * Get all recipes for a guild
 * @param {string} guildId - The Discord guild ID
 * @returns {Array} - Array of recipes
 */
export function getGuildRecipes(guildId) {
    const data = loadRecipes();
    const guildData = data.guilds[guildId];

    if (!guildData) return [];

    return guildData.recipes
        .map(id => data.recipes[id])
        .filter(Boolean)
        .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
}

/**
 * Search recipes by name or ingredients
 * @param {string} guildId - The Discord guild ID
 * @param {string} query - Search query
 * @returns {Array} - Matching recipes
 */
export function searchRecipes(guildId, query) {
    const recipes = getGuildRecipes(guildId);
    const queryLower = query.toLowerCase();

    return recipes.filter(recipe => {
        // Search in name
        if (recipe.name.toLowerCase().includes(queryLower)) return true;

        // Search in ingredients
        if (recipe.ingredients.some(ing => ing.toLowerCase().includes(queryLower))) return true;

        // Search in tags
        if (recipe.tags.some(tag => tag.toLowerCase().includes(queryLower))) return true;

        // Search in category
        if (recipe.category?.toLowerCase().includes(queryLower)) return true;

        // Search in cuisine
        if (recipe.cuisine?.toLowerCase().includes(queryLower)) return true;

        return false;
    });
}

/**
 * Delete a recipe
 * @param {string} id - Recipe ID
 * @param {string} guildId - Guild ID for validation
 * @returns {boolean} - True if deleted
 */
export function deleteRecipe(id, guildId) {
    const data = loadRecipes();
    const recipe = data.recipes[id];

    if (!recipe || recipe.guildId !== guildId) return false;

    // Remove from recipes
    delete data.recipes[id];

    // Remove from guild index
    const guildData = data.guilds[guildId];
    if (guildData) {
        guildData.recipes = guildData.recipes.filter(rid => rid !== id);
    }

    saveRecipes(data);
    return true;
}

/**
 * Update recipe tags
 * @param {string} id - Recipe ID
 * @param {Array} tags - New tags array
 * @returns {Object|null} - Updated recipe or null
 */
export function updateRecipeTags(id, tags) {
    const data = loadRecipes();
    const recipe = data.recipes[id];

    if (!recipe) return null;

    recipe.tags = tags;
    saveRecipes(data);

    return recipe;
}

/**
 * Add a note to a recipe
 * @param {string} id - Recipe ID
 * @param {string} note - Note text
 * @returns {Object|null} - Updated recipe or null
 */
export function addRecipeNote(id, note) {
    const data = loadRecipes();
    const recipe = data.recipes[id];

    if (!recipe) return null;

    recipe.notes = note;
    saveRecipes(data);

    return recipe;
}

/**
 * Rate a recipe
 * @param {string} id - Recipe ID
 * @param {number} rating - Rating (1-5)
 * @returns {Object|null} - Updated recipe or null
 */
export function rateRecipe(id, rating) {
    const data = loadRecipes();
    const recipe = data.recipes[id];

    if (!recipe) return null;

    recipe.rating = Math.min(5, Math.max(1, rating));
    saveRecipes(data);

    return recipe;
}

/**
 * Mark recipe as cooked
 * @param {string} id - Recipe ID
 * @returns {Object|null} - Updated recipe or null
 */
export function markAsCooked(id) {
    const data = loadRecipes();
    const recipe = data.recipes[id];

    if (!recipe) return null;

    recipe.timesCooked = (recipe.timesCooked || 0) + 1;
    recipe.lastCooked = new Date().toISOString();
    saveRecipes(data);

    return recipe;
}

/**
 * Get recipe statistics for a guild
 * @param {string} guildId - Guild ID
 * @returns {Object} - Statistics
 */
export function getGuildStats(guildId) {
    const recipes = getGuildRecipes(guildId);

    const stats = {
        totalRecipes: recipes.length,
        totalCooked: recipes.reduce((sum, r) => sum + (r.timesCooked || 0), 0),
        topRated: recipes.filter(r => r.rating).sort((a, b) => b.rating - a.rating).slice(0, 5),
        mostCooked: recipes.filter(r => r.timesCooked).sort((a, b) => b.timesCooked - a.timesCooked).slice(0, 5),
        recentlyAdded: recipes.slice(0, 5),
        cuisines: [...new Set(recipes.map(r => r.cuisine).filter(Boolean))],
        categories: [...new Set(recipes.map(r => r.category).filter(Boolean))],
    };

    return stats;
}
