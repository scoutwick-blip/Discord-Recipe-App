import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getRecipe } from './recipeStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', 'data');
const LISTS_FILE = join(DATA_DIR, 'shopping-lists.json');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
}

// Ingredient categories for organization
const CATEGORY_KEYWORDS = {
    'Produce': [
        'lettuce', 'tomato', 'onion', 'garlic', 'pepper', 'carrot', 'celery',
        'potato', 'spinach', 'kale', 'broccoli', 'cucumber', 'zucchini',
        'mushroom', 'avocado', 'lemon', 'lime', 'orange', 'apple', 'banana',
        'berry', 'berries', 'strawberry', 'blueberry', 'grape', 'mango',
        'cilantro', 'parsley', 'basil', 'mint', 'rosemary', 'thyme', 'ginger',
        'scallion', 'shallot', 'leek', 'cabbage', 'corn', 'peas', 'beans',
        'asparagus', 'eggplant', 'squash', 'pumpkin', 'beet', 'radish',
        'fresh', 'vegetable', 'fruit', 'salad', 'greens', 'herb'
    ],
    'Meat': [
        'chicken', 'beef', 'pork', 'lamb', 'turkey', 'bacon', 'sausage',
        'ham', 'steak', 'ground', 'breast', 'thigh', 'wing', 'drumstick',
        'roast', 'chop', 'ribs', 'meatball', 'meat'
    ],
    'Seafood': [
        'fish', 'salmon', 'tuna', 'shrimp', 'crab', 'lobster', 'scallop',
        'cod', 'tilapia', 'halibut', 'mahi', 'snapper', 'trout', 'bass',
        'clam', 'mussel', 'oyster', 'squid', 'calamari', 'anchovy', 'seafood'
    ],
    'Dairy': [
        'milk', 'cheese', 'butter', 'cream', 'yogurt', 'egg', 'sour cream',
        'cottage cheese', 'ricotta', 'mozzarella', 'parmesan', 'cheddar',
        'feta', 'goat cheese', 'cream cheese', 'whipped cream', 'half and half',
        'buttermilk', 'ghee'
    ],
    'Bakery': [
        'bread', 'bun', 'roll', 'bagel', 'tortilla', 'pita', 'naan',
        'croissant', 'muffin', 'baguette', 'ciabatta', 'sourdough'
    ],
    'Frozen': [
        'frozen', 'ice cream', 'popsicle', 'sorbet'
    ],
    'Canned': [
        'canned', 'diced tomatoes', 'tomato paste', 'tomato sauce', 'broth',
        'stock', 'coconut milk', 'beans', 'chickpeas', 'olives', 'artichoke'
    ],
    'Pantry': [
        'flour', 'sugar', 'rice', 'pasta', 'noodle', 'quinoa', 'oat',
        'cereal', 'granola', 'breadcrumb', 'panko', 'crackers', 'chips',
        'nuts', 'almond', 'walnut', 'pecan', 'peanut', 'cashew', 'seed',
        'oil', 'olive oil', 'vegetable oil', 'coconut oil', 'vinegar',
        'honey', 'maple syrup', 'molasses', 'baking', 'yeast', 'cornstarch',
        'baking powder', 'baking soda', 'vanilla', 'chocolate', 'cocoa'
    ],
    'Spices': [
        'salt', 'pepper', 'paprika', 'cumin', 'coriander', 'turmeric',
        'cinnamon', 'nutmeg', 'clove', 'ginger', 'cayenne', 'chili',
        'oregano', 'basil', 'thyme', 'rosemary', 'sage', 'bay leaf',
        'curry', 'garam masala', 'za\'atar', 'sumac', 'saffron', 'spice'
    ],
    'Condiments': [
        'ketchup', 'mustard', 'mayonnaise', 'soy sauce', 'worcestershire',
        'hot sauce', 'sriracha', 'bbq sauce', 'teriyaki', 'salsa',
        'dressing', 'marinade', 'relish', 'pesto', 'hummus'
    ],
    'Beverages': [
        'water', 'juice', 'soda', 'coffee', 'tea', 'wine', 'beer', 'liquor'
    ]
};

/**
 * Load all shopping lists from storage
 */
function loadLists() {
    if (!existsSync(LISTS_FILE)) {
        return { lists: {}, guilds: {} };
    }

    try {
        const data = readFileSync(LISTS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading shopping lists:', error);
        return { lists: {}, guilds: {} };
    }
}

/**
 * Save shopping lists to storage
 */
function saveLists(data) {
    writeFileSync(LISTS_FILE, JSON.stringify(data, null, 2));
}

/**
 * Generate a unique list ID
 */
function generateId() {
    return 'sl_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Categorize an ingredient
 */
function categorizeIngredient(ingredient) {
    const lower = ingredient.toLowerCase();

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        for (const keyword of keywords) {
            if (lower.includes(keyword)) {
                return category;
            }
        }
    }

    return 'Other';
}

/**
 * Parse ingredient to extract quantity and item
 */
function parseIngredient(ingredient) {
    // Common measurement patterns
    const measurementPattern = /^([\d½¼¾⅓⅔⅛⅜⅝⅞\s\/\-\.]+)?\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|liters?|quarts?|pints?|gallons?|pinch|dash|bunch|cloves?|cans?|packages?|sticks?|slices?|pieces?|small|medium|large)?\s*(.+)/i;

    const match = ingredient.match(measurementPattern);

    if (match) {
        return {
            quantity: match[1]?.trim() || null,
            unit: match[2]?.trim() || null,
            item: match[3]?.trim() || ingredient,
            original: ingredient
        };
    }

    return {
        quantity: null,
        unit: null,
        item: ingredient,
        original: ingredient
    };
}

/**
 * Combine similar ingredients
 */
function combineIngredients(ingredients) {
    const combined = new Map();

    for (const ing of ingredients) {
        const parsed = parseIngredient(ing);
        const key = parsed.item.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (combined.has(key)) {
            const existing = combined.get(key);
            existing.sources.push(ing);
            // Keep the most detailed version
            if (ing.length > existing.text.length) {
                existing.text = ing;
            }
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

/**
 * Create a shopping list from recipes
 * @param {Array<string>} recipeIds - Array of recipe IDs
 * @param {string} guildId - Guild ID
 * @param {string} userId - User who created the list
 * @returns {Object} - The created shopping list
 */
export function createShoppingList(recipeIds, guildId, userId) {
    const data = loadLists();

    // Collect all ingredients from recipes
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

    // Combine and categorize ingredients
    const items = combineIngredients(allIngredients);

    // Sort items by category
    items.sort((a, b) => {
        if (a.category === b.category) {
            return a.text.localeCompare(b.text);
        }
        return a.category.localeCompare(b.category);
    });

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

    // Save list
    data.lists[id] = shoppingList;

    // Index by guild
    if (!data.guilds[guildId]) {
        data.guilds[guildId] = [];
    }
    data.guilds[guildId].push(id);

    saveLists(data);

    return shoppingList;
}

/**
 * Get a shopping list by ID
 * @param {string} id - List ID
 * @returns {Object|null} - The shopping list or null
 */
export function getShoppingList(id) {
    const data = loadLists();
    return data.lists[id] || null;
}

/**
 * Get all shopping lists for a guild
 * @param {string} guildId - Guild ID
 * @returns {Array} - Array of shopping lists
 */
export function getGuildShoppingLists(guildId) {
    const data = loadLists();
    const listIds = data.guilds[guildId] || [];

    return listIds
        .map(id => data.lists[id])
        .filter(Boolean)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Toggle an item's checked status
 * @param {string} listId - List ID
 * @param {number} itemIndex - Index of the item
 * @returns {Object|null} - Updated list or null
 */
export function toggleItem(listId, itemIndex) {
    const data = loadLists();
    const list = data.lists[listId];

    if (!list || itemIndex < 0 || itemIndex >= list.items.length) {
        return null;
    }

    list.items[itemIndex].checked = !list.items[itemIndex].checked;
    saveLists(data);

    return list;
}

/**
 * Add a custom item to a shopping list
 * @param {string} listId - List ID
 * @param {string} item - Item to add
 * @returns {Object|null} - Updated list or null
 */
export function addItem(listId, item) {
    const data = loadLists();
    const list = data.lists[listId];

    if (!list) return null;

    list.items.push({
        text: item,
        sources: ['Manual'],
        category: categorizeIngredient(item),
        checked: false
    });

    saveLists(data);
    return list;
}

/**
 * Remove an item from a shopping list
 * @param {string} listId - List ID
 * @param {number} itemIndex - Index of the item
 * @returns {Object|null} - Updated list or null
 */
export function removeItem(listId, itemIndex) {
    const data = loadLists();
    const list = data.lists[listId];

    if (!list || itemIndex < 0 || itemIndex >= list.items.length) {
        return null;
    }

    list.items.splice(itemIndex, 1);
    saveLists(data);

    return list;
}

/**
 * Clear all checked items from a list
 * @param {string} listId - List ID
 * @returns {Object|null} - Updated list or null
 */
export function clearChecked(listId) {
    const data = loadLists();
    const list = data.lists[listId];

    if (!list) return null;

    list.items = list.items.filter(item => !item.checked);
    saveLists(data);

    return list;
}

/**
 * Delete a shopping list
 * @param {string} listId - List ID
 * @param {string} guildId - Guild ID for validation
 * @returns {boolean} - True if deleted
 */
export function deleteShoppingList(listId, guildId) {
    const data = loadLists();
    const list = data.lists[listId];

    if (!list || list.guildId !== guildId) return false;

    delete data.lists[listId];

    const guildLists = data.guilds[guildId];
    if (guildLists) {
        data.guilds[guildId] = guildLists.filter(id => id !== listId);
    }

    saveLists(data);
    return true;
}

/**
 * Export shopping list as plain text
 * @param {string} listId - List ID
 * @returns {string|null} - Plain text list or null
 */
export function exportAsText(listId) {
    const list = getShoppingList(listId);
    if (!list) return null;

    let text = '🛒 SHOPPING LIST\n';
    text += '═'.repeat(30) + '\n';
    text += `Recipes: ${list.recipeNames.join(', ')}\n\n`;

    // Group by category
    const categories = {};
    for (const item of list.items) {
        const cat = item.category || 'Other';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(item);
    }

    for (const [category, items] of Object.entries(categories)) {
        text += `\n📌 ${category.toUpperCase()}\n`;
        for (const item of items) {
            const check = item.checked ? '✓' : '○';
            text += `  ${check} ${item.text}\n`;
        }
    }

    return text;
}
