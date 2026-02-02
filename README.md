# Discord Recipe Bot

A Discord bot that automatically saves recipes from links, organizes them, and generates shopping lists.

## Features

- **Automatic Recipe Detection**: Paste a recipe URL and the bot automatically parses and saves it
- **Recipe Organization**: Tag, rate, and add notes to your recipes
- **Clean Recipe Display**: View ingredients and instructions in easy-to-read Discord embeds
- **Shopping Lists**: Generate combined shopping lists from multiple recipes
- **Smart Ingredient Handling**: Automatically categorizes and combines duplicate ingredients
- **Search & Filter**: Find recipes by name, ingredients, tags, or cuisine

## Supported Recipe Sites

The bot supports most major recipe websites including:
- AllRecipes
- Food Network
- Epicurious
- Bon Appetit
- Serious Eats
- NY Times Cooking
- And many more...

Any site using standard recipe schema markup (JSON-LD) should work automatically.

## Setup

### Prerequisites

- Node.js 18.0.0 or higher
- A Discord account and server

### 1. Create a Discord Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section and click "Add Bot"
4. Enable these Privileged Gateway Intents:
   - Message Content Intent
5. Copy the bot token for later

### 2. Get Your Application ID

1. In the Developer Portal, go to "General Information"
2. Copy the Application ID

### 3. Invite the Bot to Your Server

1. Go to "OAuth2" > "URL Generator"
2. Select scopes: `bot`, `applications.commands`
3. Select bot permissions:
   - Send Messages
   - Embed Links
   - Add Reactions
   - Read Message History
   - Use Slash Commands
4. Copy the generated URL and open it to invite the bot

### 4. Configure the Bot

```bash
# Clone the repository
git clone <repo-url>
cd Discord-Recipe-App

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Edit `.env` with your credentials:
```
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_id_here
GUILD_ID=your_test_server_id_here  # Optional, for faster command deployment
```

### 5. Deploy Commands and Start

```bash
# Register slash commands with Discord
npm run register-commands

# Start the bot
npm start

# Or for development with auto-reload
npm run dev
```

## Usage

### Adding Recipes

Simply paste a recipe URL in any channel:
```
https://www.allrecipes.com/recipe/12345/delicious-pasta/
```

The bot will automatically:
1. React with 🍳 while processing
2. Parse the recipe from the page
3. Save it with a unique ID
4. Reply with a formatted recipe card

### Commands

#### Recipe Management
| Command | Description |
|---------|-------------|
| `/recipe view <id>` | View a saved recipe |
| `/recipe ingredients <id>` | View full ingredients list |
| `/recipe instructions <id>` | Step-by-step cooking instructions |
| `/recipe list` | List all saved recipes |
| `/recipe search <query>` | Search by name, ingredient, or tag |
| `/recipe delete <id>` | Delete a recipe |
| `/recipe tag <id> <tags>` | Add comma-separated tags |
| `/recipe note <id> <note>` | Add a personal note |
| `/recipe rate <id> <1-5>` | Rate a recipe (1-5 stars) |
| `/recipe cooked <id>` | Mark as cooked (tracks count) |

#### Shopping Lists
| Command | Description |
|---------|-------------|
| `/shopping create <recipe-ids>` | Create list from comma-separated recipe IDs |
| `/shopping view <id>` | View a shopping list |
| `/shopping list` | List all shopping lists |
| `/shopping check <id> <item#>` | Check/uncheck an item |
| `/shopping add <id> <item>` | Add a custom item |
| `/shopping remove <id> <item#>` | Remove an item |
| `/shopping clear <id>` | Remove all checked items |
| `/shopping export <id>` | Export as plain text |
| `/shopping delete <id>` | Delete a shopping list |

#### Other
| Command | Description |
|---------|-------------|
| `/recipestats` | View collection statistics |
| `/recipehelp` | Show help information |

## Data Storage

Recipes and shopping lists are stored locally in JSON files:
- `src/data/recipes.json` - All saved recipes
- `src/data/shopping-lists.json` - Shopping lists

For production use, consider replacing the storage layer with a database.

## Project Structure

```
Discord-Recipe-App/
├── src/
│   ├── commands/          # Slash command handlers
│   │   ├── help.js
│   │   ├── recipe.js
│   │   ├── shopping.js
│   │   └── stats.js
│   ├── services/          # Business logic
│   │   ├── recipeParser.js    # URL parsing & extraction
│   │   ├── recipeStorage.js   # Recipe CRUD operations
│   │   └── shoppingList.js    # Shopping list management
│   ├── utils/
│   │   └── formatters.js      # Discord embed formatting
│   ├── data/              # Local JSON storage
│   ├── index.js           # Main bot entry point
│   └── deploy-commands.js # Command registration script
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## License

MIT
