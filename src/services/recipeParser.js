const cheerio = require('cheerio');

// Common recipe website URL patterns
const RECIPE_URL_PATTERNS = [
    /allrecipes\.com/i,
    /foodnetwork\.com/i,
    /epicurious\.com/i,
    /bonappetit\.com/i,
    /seriouseats\.com/i,
    /food52\.com/i,
    /tasty\.co/i,
    /delish\.com/i,
    /simplyrecipes\.com/i,
    /budgetbytes\.com/i,
    /minimalistbaker\.com/i,
    /cookieandkate\.com/i,
    /skinnytaste\.com/i,
    /halfbakedharvest\.com/i,
    /pinchofyum\.com/i,
    /thepioneerwoman\.com/i,
    /bettycrocker\.com/i,
    /pillsbury\.com/i,
    /marthastewart\.com/i,
    /myrecipes\.com/i,
    /eatingwell\.com/i,
    /cooking\.nytimes\.com/i,
    /recipes\.com/i,
    /yummly\.com/i,
    /spoonacular\.com/i,
    /hellofresh\.com/i,
    /blueapron\.com/i,
];

function detectRecipeUrl(content) {
    const urlRegex = /(https?:\/\/[^\s<]+)/gi;
    const urls = content.match(urlRegex);

    if (!urls) return null;

    for (const url of urls) {
        for (const pattern of RECIPE_URL_PATTERNS) {
            if (pattern.test(url)) {
                return url;
            }
        }
        if (/recipe/i.test(url)) {
            return url;
        }
    }

    return null;
}

async function parseRecipe(url) {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch recipe: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let recipe = parseJsonLd($);
    if (!recipe) recipe = parseMetaTags($);
    if (!recipe) recipe = parseHeuristic($, url);

    if (!recipe) {
        throw new Error('Could not parse recipe from page');
    }

    return normalizeRecipe(recipe, url);
}

function parseJsonLd($) {
    const scripts = $('script[type="application/ld+json"]');

    for (let i = 0; i < scripts.length; i++) {
        try {
            const content = $(scripts[i]).html();
            const data = JSON.parse(content);
            const schemas = Array.isArray(data) ? data : [data];

            for (const schema of schemas) {
                if (schema['@graph']) {
                    for (const item of schema['@graph']) {
                        if (item['@type'] === 'Recipe' || item['@type']?.includes?.('Recipe')) {
                            return extractFromSchema(item);
                        }
                    }
                }
                if (schema['@type'] === 'Recipe' || schema['@type']?.includes?.('Recipe')) {
                    return extractFromSchema(schema);
                }
            }
        } catch (e) { /* continue */ }
    }
    return null;
}

function extractFromSchema(schema) {
    return {
        name: schema.name,
        description: schema.description,
        image: extractImage(schema.image),
        prepTime: parseDuration(schema.prepTime),
        cookTime: parseDuration(schema.cookTime),
        totalTime: parseDuration(schema.totalTime),
        servings: extractServings(schema.recipeYield),
        ingredients: extractIngredients(schema.recipeIngredient),
        instructions: extractInstructions(schema.recipeInstructions),
        cuisine: schema.recipeCuisine,
        category: schema.recipeCategory,
        author: extractAuthor(schema.author),
    };
}

function extractImage(image) {
    if (!image) return null;
    if (typeof image === 'string') return image;
    if (Array.isArray(image)) return image[0]?.url || image[0];
    return image.url || null;
}

function extractAuthor(author) {
    if (!author) return null;
    if (typeof author === 'string') return author;
    if (Array.isArray(author)) return author[0]?.name || author[0];
    return author.name || null;
}

function extractServings(recipeYield) {
    if (!recipeYield) return null;
    if (typeof recipeYield === 'number') return recipeYield;
    const yieldStr = Array.isArray(recipeYield) ? recipeYield[0] : recipeYield;
    const match = yieldStr?.toString().match(/\d+/);
    return match ? parseInt(match[0]) : null;
}

function extractIngredients(ingredients) {
    if (!ingredients) return [];
    if (!Array.isArray(ingredients)) return [ingredients];
    return ingredients.map(ing => {
        if (typeof ing === 'string') return ing.trim();
        return ing.text || ing.name || String(ing);
    }).filter(Boolean);
}

function extractInstructions(instructions) {
    if (!instructions) return [];
    if (typeof instructions === 'string') {
        return instructions.split(/\n+/).map(s => s.trim()).filter(Boolean);
    }
    if (!Array.isArray(instructions)) instructions = [instructions];

    const steps = [];
    for (const inst of instructions) {
        if (typeof inst === 'string') {
            steps.push(inst.trim());
        } else if (inst['@type'] === 'HowToSection' && inst.itemListElement) {
            for (const step of inst.itemListElement) {
                steps.push(step.text || step.name || String(step));
            }
        } else if (inst['@type'] === 'HowToStep') {
            steps.push(inst.text || inst.name);
        } else if (inst.text) {
            steps.push(inst.text);
        }
    }
    return steps.filter(Boolean);
}

function parseDuration(duration) {
    if (!duration) return null;
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return duration;
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const parts = [];
    if (hours) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (minutes) parts.push(`${minutes} min${minutes > 1 ? 's' : ''}`);
    return parts.join(' ') || null;
}

function parseMetaTags($) {
    const title = $('meta[property="og:title"]').attr('content') ||
        $('meta[name="title"]').attr('content') || $('title').text();
    const description = $('meta[property="og:description"]').attr('content');
    const image = $('meta[property="og:image"]').attr('content');

    if (!title) return null;

    const ingredients = [];
    $('[class*="ingredient"], [itemprop="recipeIngredient"]').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length < 200) ingredients.push(text);
    });

    const instructions = [];
    $('[class*="instruction"], [class*="direction"], [itemprop="recipeInstructions"]').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length < 1000) instructions.push(text);
    });

    if (ingredients.length === 0 && instructions.length === 0) return null;

    return { name: title, description, image, ingredients, instructions };
}

function parseHeuristic($, url) {
    const title = $('h1').first().text().trim() || $('title').text().trim();
    if (!title) return null;

    const ingredients = [];
    $('ul li').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length < 150 && /\d|cup|tbsp|tsp|oz|lb|g|ml/i.test(text)) {
            ingredients.push(text);
        }
    });

    const instructions = [];
    $('ol li').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 20 && text.length < 1000) instructions.push(text);
    });

    if (ingredients.length === 0) return null;

    return {
        name: title,
        description: null,
        image: $('img').first().attr('src'),
        ingredients,
        instructions,
    };
}

function normalizeRecipe(recipe, sourceUrl) {
    return {
        name: cleanText(recipe.name) || 'Untitled Recipe',
        description: cleanText(recipe.description),
        image: recipe.image,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        totalTime: recipe.totalTime,
        servings: recipe.servings,
        ingredients: (recipe.ingredients || []).map(cleanText).filter(Boolean),
        instructions: (recipe.instructions || []).map(cleanText).filter(Boolean),
        cuisine: recipe.cuisine,
        category: recipe.category,
        author: recipe.author,
        sourceUrl: sourceUrl,
        parsedAt: new Date().toISOString(),
    };
}

function cleanText(text) {
    if (!text) return null;
    return text.replace(/\s+/g, ' ').replace(/&amp;/g, '&').trim();
}

module.exports = { detectRecipeUrl, parseRecipe };
