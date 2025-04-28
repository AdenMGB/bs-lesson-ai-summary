# 📚 Lesson AI Summary Plugin for BetterSEQTA+ 🚀

> **Version: 0.1.0**

A plugin that uses Gemini AI to generate smart, concise summaries of your SEQTA course lessons. Save time, get organized, and never miss the key points again!

---

## ✨ Features
- 🧠 **AI-Powered Summaries:** Instantly generate lesson and course summaries using Google Gemini.
- 📋 **Covers All Content:** Extracts text from lesson content, embedded frames, and more.
- ⚡ **Easy to Use:** One-click summary generation right inside your SEQTA interface.
- 🔒 **Secure:** API key is stored in your BetterSEQTA+ settings.

---

## 🛠️ Installation
1. **Clone this repo** and the BetterSEQTA+ repo.
2. **Copy everything in `modules.json`** to the `package.json` file in BetterSEQTA+.
3. **Create a new folder** in `src/plugins/built-in/` called `course-ai-summary`.
4. **Copy the contents** of the `course-ai-summary` folder from this repo into the new folder in BetterSEQTA+.
5. **Add the following** before the Monofile line `...monofile...` in `BetterSEQTA-Plus/src/plugins/index.ts`:
   ```typescript
   import { HandleGeminiSummary } from "./built-in/course-ai-summary/plugin.ts";
   pluginManager.registerPlugin(HandleGeminiSummary);
   ```
6. **Build BetterSEQTA+** following the instructions in BetterSEQTA+'s `README.md`.

---

## 🚦 Usage
1. Navigate to any course lesson in SEQTA.
2. Click the **"Generate Summary"** button at the top of the page.
3. The plugin will analyze the lesson content and generate a concise summary using Gemini AI.

---

## 🔑 Requirements
- A valid Gemini API key (add this in the plugin settings, claim a free one from https://aistudio.google.com/app/apikey).
- BetterSEQTA+ installed and configured.

---

## ℹ️ About This Plugin
**bs-lesson-ai-summary** is designed to help students quickly understand the most important parts of any lesson. It works by:
- Extracting all visible text from the main lesson area, embedded iframes, and additional content wrappers.
- Sending this content to the Gemini API for summarization.
- Displaying the summary in an appealing, easy-to-read box at the top of your lesson page.

### How it Works
1. The plugin listens for when you open a lesson or course page.
2. It collects all relevant text content, including from embedded HTML frames.
3. When you click **Generate Summary**, it sends the content to Gemini and displays the result.
4. The summary box is automatically removed when you leave the course page.

---

## 🤝 Contributions
Pull requests are welcome! Please create a PR to fix issues or add features.

---

## 📝 License
MIT
