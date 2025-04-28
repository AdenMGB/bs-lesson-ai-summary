import { type Plugin, type PluginSettings } from "@/plugins/core/types";
import { HandleGeminiSummary } from "./index";

// Define plugin settings
export const settings = {
  enabled: {
    type: 'boolean',
    default: true,
    title: 'Enable Gemini Summary',
    description: 'Enable or disable the Gemini-powered course summary feature'
  },
  geminiApiKey: {
    type: 'string',
    default: '',
    title: 'Gemini API Key',
    description: 'Your Gemini API key from Google AI Studio (https://aistudio.google.com/app/apikey)'
  }
} as const satisfies PluginSettings;

export const geminiSummaryPlugin: Plugin<typeof settings> = {
  id: "gemini-summary",
  name: "Gemini Course Summary",
  description: "Uses Google's Gemini AI to generate summaries of course content",
  version: "1.0.0",
  settings,
  disableToggle: true, // Always enabled

  run: async (api) => {
    console.log("[Gemini Summary] Plugin started");
    
    // Listen for page changes
    api.seqta.onPageChange(async (page) => {
      console.log("[Gemini Summary] Page changed to:", page);
      
      // Check if we're on a course page
      if (page === 'courses' || page.includes('/courses/')) {
        console.log("[Gemini Summary] On courses page, waiting for content");
        
        // Wait for the content to be loaded
        const checkContent = setInterval(async () => {
          // Try multiple selectors for the content
          const content = document.querySelector('#content');
          if (content) {
            clearInterval(checkContent);
            console.log("[Gemini Summary] Content found:", content);
            
            // Mount the summary regardless of course elements
            console.log("[Gemini Summary] Mounting summary");
            const handler = await HandleGeminiSummary(api);
            handler(content);

            // Add click handler to #content for dynamic mounting
            content.addEventListener('click', async () => {
              if (!content.querySelector('.gemini-summary-container')) {
                console.log("[Gemini Summary] Click detected, remounting summary if needed");
                const handler = await HandleGeminiSummary(api);
                handler(content);
              }
            });
          }
        }, 100);
        
        // Stop checking after 5 seconds
        setTimeout(() => clearInterval(checkContent), 5000);
      } else {
        // Remove summary container if it exists
        const existingContainer = document.querySelector('.gemini-summary-container');
        if (existingContainer) {
          console.log("[Gemini Summary] Removing summary container from non-courses page");
          existingContainer.remove();
        }
      }
    });
  }
}; 