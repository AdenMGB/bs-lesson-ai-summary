import { type PluginAPI } from "@/plugins/core/types";
import { settings } from "./plugin";

// Get API key from settings
let GEMINI_API_KEY = "";

// Helper function to get content from a lesson
function getLessonContent(lessonElement: Element): string {
    const content = [];
    
    // Get the lesson title
    const titleElement = lessonElement.querySelector('.meta .topic');
    if (titleElement) {
        content.push(`Lesson: ${titleElement.textContent?.trim()}`);
    }

    // Get the lesson date and period
    const sequenceElement = lessonElement.querySelector('.meta .sequence');
    if (sequenceElement) {
        const date = sequenceElement.querySelector('.date')?.textContent?.trim();
        const period = sequenceElement.querySelector('.period')?.textContent?.trim();
        if (date || period) {
            content.push(`Date: ${date || 'N/A'}, Period: ${period || 'N/A'}`);
        }
    }

    // Get the main lesson content from the data-contents div
    const mainContent = document.querySelector('div[data-contents="true"]');
    if (mainContent) {
        // Get all visible text, including headings, paragraphs, and links
        const walker = document.createTreeWalker(mainContent, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                // Only include non-empty, visible text
                if (node.textContent && node.textContent.trim().length > 0) {
                    return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_REJECT;
            }
        });
        let node;
        const lessonTexts = [];
        while ((node = walker.nextNode())) {
            if (node.textContent) {
                lessonTexts.push(node.textContent.trim());
            }
        }
        if (lessonTexts.length > 0) {
            content.push(lessonTexts.join('\n'));
        }
    }

    // Get content from iframeWrapper and its child divs
    const iframeWrapper = document.querySelector('.iframeWrapper');
    if (iframeWrapper) {
        const wrapperDivs = iframeWrapper.querySelectorAll('div');
        const wrapperTexts: string[] = [];
        wrapperDivs.forEach(div => {
            const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT, {
                acceptNode: (node) => {
                    if (node.textContent && node.textContent.trim().length > 0) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_REJECT;
                }
            });
            let node;
            while ((node = walker.nextNode())) {
                if (node.textContent) {
                    wrapperTexts.push(node.textContent.trim());
                }
            }
        });
        if (wrapperTexts.length > 0) {
            content.push('Additional Content:');
            content.push(wrapperTexts.join('\n'));
        }
    }

    // Get all iframes with class="userHTML" and all iframes under .iframeWrapper
    const userHtmlIframes = Array.from(document.querySelectorAll('iframe.userHTML'));
    const wrapperIframes = Array.from(document.querySelectorAll('.iframeWrapper iframe'));
    // Combine and deduplicate
    const allIframes = Array.from(new Set([...userHtmlIframes, ...wrapperIframes])) as HTMLIFrameElement[];
    allIframes.forEach((iframe) => {
        try {
            const doc = iframe.contentDocument;
            if (doc && doc.body) {
                const iframeTexts: string[] = [];
                const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
                    acceptNode: (node) => {
                        if (node.textContent && node.textContent.trim().length > 0) {
                            return NodeFilter.FILTER_ACCEPT;
                        }
                        return NodeFilter.FILTER_REJECT;
                    }
                });
                let node;
                while ((node = walker.nextNode())) {
                    if (node.textContent) {
                        iframeTexts.push(node.textContent.trim());
                    }
                }
                // If no text but there are child elements, add a placeholder
                if (iframeTexts.length > 0) {
                    content.push('Embedded Frame Content:');
                    content.push(iframeTexts.join('\n'));
                } else if (doc.body.children.length > 0) {
                    content.push('Embedded Frame Content:');
                    content.push('[Embedded lesson content present]');
                }
            }
        } catch (e) {
            // Ignore cross-origin iframes
        }
    });

    return content.join('\n\n');
}

// Helper function to get course overview content
function getCourseOverviewContent(): string {
    const content = [];
    
    // Get the course title
    const titleElement = document.querySelector('#title span');
    if (titleElement) {
        content.push(`Course: ${titleElement.textContent?.trim()}`);
    }

    // Get the course description if available
    const descriptionElement = document.querySelector('.course .description');
    if (descriptionElement) {
        content.push(descriptionElement.textContent?.trim());
    }

    return content.join('\n\n');
}

// Main function to get content based on current view
function getContent(): string {
    // Check if we're in a lesson view
    const lessonElement = document.querySelector('.lesson.selected');
    if (lessonElement) {
        return getLessonContent(lessonElement);
    }

    // If not in a lesson view, get course overview
    return getCourseOverviewContent();
}

// Simple markdown-to-HTML parser for Gemini summaries
function parseGeminiMarkdown(text: string): string {
    // Convert **bold** to <strong>
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Convert *italic* to <em>
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Convert numbered lists
    text = text.replace(/\n\s*\d+\. (.*?)(?=\n|$)/g, '<li>$1</li>');
    // Convert bullet lists
    text = text.replace(/\n\s*[-*] (.*?)(?=\n|$)/g, '<li>$1</li>');
    // Wrap consecutive <li> in <ul> or <ol>
    text = text.replace(/(<li>.*?<\/li>)+/gs, match => {
        // If it looks like a numbered list, use <ol>
        if (/\d+\./.test(match)) return `<ol>${match}</ol>`;
        return `<ul>${match}</ul>`;
    });
    // Convert headings (e.g., **1. Topics Covered:**)
    text = text.replace(/<strong>(\d+\..*?:)<\/strong>/g, '<h4>$1</h4>');
    // Convert newlines to <br> (for anything not handled above)
    text = text.replace(/\n/g, '<br>');
    return text;
}

// Inject CSS for summary box styling and scrollable content
(function addGeminiSummaryStyles() {
    if (document.getElementById('gemini-summary-styles')) return;
    const style = document.createElement('style');
    style.id = 'gemini-summary-styles';
    style.textContent = `
      .gemini-summary-content {
        max-height: 300px;
        overflow-y: auto;
        padding-right: 8px;
        height: 0;
        transition: height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .gemini-summary-content.expanded {
        height: 300px;
      }
    `;
    document.head.appendChild(style);
})();

export async function HandleGeminiSummary(api: PluginAPI<typeof settings>): Promise<(element: Element) => void> {
  // Get API key from settings
  GEMINI_API_KEY = api.settings.geminiApiKey;
  
  return (element: Element) => {
    console.log("[Gemini Summary] Found content element:", element);
    
    // Check if summary container already exists
    const existingContainer = element.querySelector('.gemini-summary-container');
    if (existingContainer) {
      console.log("[Gemini Summary] Summary container already exists, skipping creation");
      return;
    }
    
    // Create summary container
    const summaryContainer = document.createElement('div');
    summaryContainer.className = 'gemini-summary-container';
    summaryContainer.innerHTML = `
      <div class="gemini-summary-box">
        <h3>Course Summary</h3>
        <div class="gemini-summary-content"></div>
        <button class="gemini-summary-button">Generate Summary</button>
      </div>
    `;

    try {
      // Try to find the best place to insert the summary
      const courseHeader = element.querySelector('#title');
      const mainContent = element.querySelector('#main');
      
      if (courseHeader) {
        console.log("[Gemini Summary] Found course header, inserting after it");
        courseHeader.parentNode?.insertBefore(summaryContainer, courseHeader.nextSibling);
      } else if (mainContent) {
        console.log("[Gemini Summary] Found main content, inserting before it");
        mainContent.parentNode?.insertBefore(summaryContainer, mainContent);
      } else {
        console.log("[Gemini Summary] No specific location found, inserting at top");
        element.insertBefore(summaryContainer, element.firstChild);
      }
      
      console.log("[Gemini Summary] Summary container inserted");
    } catch (error) {
      console.error("[Gemini Summary] Error inserting container:", error);
      return;
    }

    // Add event listener to the button
    const summaryButton = summaryContainer.querySelector('.gemini-summary-button');
    if (summaryButton) {
      summaryButton.addEventListener('click', async () => {
        try {
          console.log("[Gemini Summary] Generate button clicked");
          const summaryContent = summaryContainer.querySelector('.gemini-summary-content');
          if (summaryContent) {
            summaryContent.innerHTML = `<div class="gemini-summary-loading"><span class="gemini-summary-shimmer"></span> Summarizing…</div>`;
          }
          // Get content using our new getContent function
          const courseText = getContent();
          if (!courseText) {
            throw new Error("No course content found");
          }
          console.log("[Gemini Summary] Sending content to Gemini API");

          // Determine if this is a lesson or course overview
          const isLesson = !!document.querySelector('.lesson.selected');
          let prompt = '';
          if (isLesson) {
            prompt = `Given the following lesson content, return:\n1. The topics covered in the lesson.\n2. The things that need to be completed (and when, if applicable).\nFormat your response clearly.\n\nLesson Content:\n${courseText}`;
          } else {
            prompt = `Please provide a concise summary of the following course content:\n\n${courseText}`;
          }

          // Call Gemini API with correct model name and endpoint
          const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: prompt }]
              }],
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
              },
              safetySettings: [
                {
                  category: "HARM_CATEGORY_HARASSMENT",
                  threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                  category: "HARM_CATEGORY_HATE_SPEECH",
                  threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                  category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                  threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                  category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                  threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
              ]
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("[Gemini Summary] API Error Response:", errorData);
            throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
          }

          const data = await response.json();
          if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error("Invalid response format from Gemini API");
          }

          const summary = data.candidates[0].content.parts[0].text;
          console.log("[Gemini Summary] Received summary from API");

          // Display the summary
          if (summaryContent) {
            // Animate expansion
            const summaryContentDiv = summaryContent as HTMLElement;
            summaryContentDiv.innerHTML = parseGeminiMarkdown(summary);
            summaryContentDiv.style.height = '0px'; // Start collapsed
            void summaryContentDiv.offsetWidth; // Force reflow
            const targetHeight = Math.min(summaryContentDiv.scrollHeight, 300);
            summaryContentDiv.style.height = targetHeight + 'px';
            setTimeout(() => {
              summaryContentDiv.style.height = 'auto';
            }, 400);
          }
        } catch (error) {
          console.error('[Gemini Summary] Error generating summary:', error);
          const summaryContent = summaryContainer.querySelector('.gemini-summary-content');
          if (summaryContent) {
            summaryContent.textContent = `Error generating summary: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`;
          }
        }
      });
    }

    // Inject custom CSS for Gemini Summary
    if (!document.getElementById('gemini-summary-style')) {
      const style = document.createElement('style');
      style.id = 'gemini-summary-style';
      style.textContent = `
        .gemini-summary-container {
          width: 100%;
          display: flex;
          justify-content: center;
          margin: 32px 0 24px 0;
          z-index: 1000;
        }
        .gemini-summary-box {
          width: 90vw;
          max-width: 900px;
          min-width: 320px;
          border-radius: 48px;
          background: #23242a;
          color: #fff;
          font-family: 'Segoe UI', 'Roboto', Arial, sans-serif;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 32px 40px 28px 40px;
          box-shadow: 0 0 24px 4px rgba(255, 0, 64, 0.18), 0 2px 16px 0 rgba(0,0,0,0.10);
          border: 4px solid transparent;
          background-clip: padding-box;
        }
        .gemini-summary-box::before {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 52px;
          padding: 0;
          z-index: -1;
          background: linear-gradient(270deg, #4f8cff, #a259ff, #ff6b81, #4f8cff);
          background-size: 300% 300%;
          animation: gemini-border-animate 4s linear infinite;
        }
        @keyframes gemini-border-animate {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .gemini-summary-box h3 {
          margin: 0 0 16px 0;
          font-size: 2rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: #fff;
          text-shadow: 0 2px 8px rgba(80,0,80,0.12);
        }
        .gemini-summary-content {
          margin-bottom: 20px;
          font-size: 1.1rem;
          line-height: 1.6;
          color: #f3f6fa;
          word-break: break-word;
        }
        .gemini-summary-loading {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .gemini-summary-shimmer {
          height: 1.2em;
          width: 120px;
          border-radius: 12px;
          background: linear-gradient(90deg, #444 25%, #666 50%, #444 75%);
          background-size: 200% 100%;
          animation: shimmer 1.2s infinite linear;
          display: inline-block;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .gemini-summary-button {
          align-self: flex-end;
          background: linear-gradient(90deg, #4f8cff 0%, #a259ff 100%);
          color: #fff;
          border: none;
          border-radius: 24px;
          padding: 10px 32px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 0 8px 2px rgba(255, 0, 64, 0.18);
          transition: background 0.2s, box-shadow 0.2s, transform 0.1s;
        }
        .gemini-summary-button:hover {
          background: linear-gradient(90deg, #a259ff 0%, #4f8cff 100%);
          box-shadow: 0 0 16px 4px rgba(255, 0, 64, 0.32);
          transform: translateY(-2px) scale(1.04);
        }
      `;
      document.head.appendChild(style);
    }
  };
} 