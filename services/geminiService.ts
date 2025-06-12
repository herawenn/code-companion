
import { GoogleGenAI, GenerateContentResponse, Content, Part } from "@google/genai";
import { AIResponseMessage, ScreenshotContext } from "../types";

declare var process: any;

export class GeminiService {
  private static instance: GeminiService;
  private ai: GoogleGenAI;

  private constructor() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API key is missing. This is an environment configuration issue. Ensure API_KEY is set in your environment.");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  public async generateStructuredResponse(
    userPrompt: string,
    currentFileStructure: string,
    allFilesContent: string,
    screenshotContext?: ScreenshotContext
  ): Promise<AIResponseMessage> {

    let imageParts: Part[] = [];
    if (screenshotContext?.screenshotDataUrl) {
      const base64Data = screenshotContext.screenshotDataUrl.split(',')[1];
      if (base64Data) {
        imageParts.push({
          inlineData: {
            mimeType: 'image/png',
            data: base64Data
          }
        });
      }
    }

    const consoleContextText = screenshotContext?.consoleContextForAI
        ? `\n\n--- User's Console Logs at Time of Request ---\n${screenshotContext.consoleContextForAI}\n--- End Console Logs ---`
        : "";

    const fullPromptToAI =
`You are an AI coding assistant. Your goal is to help the user with their coding tasks by providing explanations and generating file operations.
Please respond with a JSON object matching this TypeScript interface:
interface AIResponseMessage {
  explanation: string;
  fileOperations?: Array<{
    action: 'create_file' | 'update_file' | 'delete_file' | 'create_folder';
    path: string;
    content?: string;
  }>;
}
The 'explanation' field should be your textual response to the user.
The 'fileOperations' field should be an array of file operations needed to fulfill the user's request.
Ensure paths are full paths from the project root. For 'create_folder', the 'content' field is not needed.
If no file operations are needed, omit the 'fileOperations' field or provide an empty array.

GENERAL PROJECT STRUCTURE GUIDELINES:
When the user asks to create a new project, or if the project is currently empty and the user's request implies starting a new project (e.g., "create a JavaScript file for a new web app"), please use the following basic project structure as a default, unless the user specifies a different structure:
- A \`README.md\` file in the project root (e.g., \`README.md\`) containing a brief project description.
- A \`src/\` directory for primary source code (e.g., \`src\`).
- An entry point file within the \`src/\` directory. Common names are \`main.js\`, \`app.js\`, \`index.js\`. If the project type is clear from the user's request (e.g., Python, Java), use an appropriate extension (e.g., \`src/main.py\`, \`src/Main.java\`). If not specified, default to \`src/main.js\` with basic placeholder content.
- A \`.gitignore\` file in the project root, with common ignores for the project type if discernible (e.g., node_modules for JS, __pycache__ for Python), or a general set of ignores otherwise (e.g., .env, build/, dist/).
- Optionally, if it appears to be a web project, consider a \`public/\` directory for static assets (e.g., \`public/index.html\`, \`public/style.css\`).
- Optionally, a \`tests/\` directory for test files (e.g., \`tests/\`).
Remember to prioritize the user's explicit instructions for file structure if they provide any. This default structure is a guideline for when the user is less specific about the initial setup.

${currentFileStructure ? `\nCurrent project file structure (list of paths and types):\n${currentFileStructure}` : "\nThe project is currently empty. You can create files and folders following the guidelines above if a new project is implied."}
${allFilesContent}
${consoleContextText}

Based on all the above context (including any provided screenshot), the user's current project state, and their specific request below, provide your explanation and any necessary file operations.

User's request: ${userPrompt}`;

    try {
      const contents: Content[] = [];
      const textPart = { text: fullPromptToAI };

      if (imageParts.length > 0) {
         contents.push({ parts: [...imageParts, textPart] });
      } else {
         contents.push({ parts: [textPart] });
      }

      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: contents,
        config: {
          responseMimeType: "application/json",
        }
      });

      let jsonStr = (response.text ?? '').trim();
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) {
        jsonStr = match[2].trim();
      }

      try {
        const parsedResponse = JSON.parse(jsonStr) as AIResponseMessage;
        if (typeof parsedResponse.explanation !== 'string') {
            return { explanation: "AI response format error: 'explanation' is missing. Raw response: " + jsonStr };
        }
        if (parsedResponse.fileOperations && !Array.isArray(parsedResponse.fileOperations)) {
            return { explanation: "AI response format error: 'fileOperations' is not an array. Raw response: " + jsonStr, fileOperations: [] };
        }
        return parsedResponse;
      } catch (e) {
        return { explanation: `AI returned non-JSON response or malformed JSON. Please try again or rephrase your request. Raw response: ${jsonStr}` };
      }

    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("API key not valid")) {
             throw new Error("The Gemini API key is not valid. Please check server-side configuration.");
        }
         return { explanation: `Gemini API error: ${error.message}` };
      }
       return { explanation: 'An unknown error occurred while communicating with the Gemini API.'};
    }
  }
}
