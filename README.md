# Lesson AI Summary Plugin for BetterSEQTA+
A plugin that uses Gemini AI to generate summaries of course lessons in BetterSEQTA+

## Installation
1. Clone this repo and BetterSEQTA+'s repo
2. Copy everything in `modules.json` to the `package.json` file in BetterSEQTA+
3. Create a new folder in `src/plugins/built-in/` called `course-ai-summary`
4. Copy the contents of the `course-ai-summary` folder from this repo into the newly created folder in BetterSEQTA+
5. Add the following before the Monofile line `...monofile...` in `BetterSEQTA-Plus/src/plugins/index.ts`:
   ```typescript
   import {HandleGeminiSummary} from "./built-in/course-ai-summary/index.ts"
   pluginManager.registerPlugin(HandleGeminiSummary);
   ```
6. Build BetterSEQTA+ following BetterSEQTA+'s `readme.md` file

## Usage
1. Navigate to any course lesson in SEQTA
2. Click the "Generate Summary" button that appears at the top of the page
3. The plugin will analyze the lesson content and generate a concise summary using Gemini AI

## Requirements
- A valid Gemini API key (you'll need to add this to the plugin code, is completely free see https://aistudio.google.com/app/apikey)
- BetterSEQTA+ installed and configured

## Contributions
Please create a pull request to fix issues with the extension. 