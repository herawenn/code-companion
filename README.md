# Code Companion - AI Powered Coding Assistant

Code Companion is an interactive web application designed to assist developers by integrating the power of AI. It provides a chat-based interface to generate, modify, and explain code, alongside other comprehensive including a file explorer, code editor, and live preview panel.

<div align="center">

**[► View a Live Demo ◄](https://mallory.pw)**

</div>

![Code Companion Screenshot](https://i.imgur.com/83PBXmn.png)

## Table of Contents

- [Code Companion - AI Powered Coding Assistant](#code-companion---ai-powered-coding-assistant)
  - [Table of Contents](#table-of-contents)
  - [Key Features](#key-features)
  - [Core Concepts](#core-concepts)
  - [Tech Stack](#tech-stack)
  - [Project Structure](#project-structure)
  - [Setup and Running Locally](#setup-and-running-locally)
    - [Prerequisites](#prerequisites)
    - [API Key Setup](#api-key-setup)
    - [Installation \& Running](#installation--running)
  - [Environment Variables](#environment-variables)
  - [Key Functionalities in Detail](#key-functionalities-in-detail)
    - [AI Interaction (Gemini)](#ai-interaction-gemini)
    - [File Management](#file-management)
    - [Panel System](#panel-system)
    - [Interactive Tutorial](#interactive-tutorial)
    - [Screenshot \& Console Context](#screenshot--console-context)
    - [Error Fixing with AI \& Iterative Debugging](#error-fixing-with-ai--iterative-debugging)
    - [Command Palette](#command-palette)
  - [Limitations](#limitations)
  - [How to Use](#how-to-use)

## Key Features

- **AI-Powered Chat:** Interact with the Gemini AI to:
  - Generate new code snippets or entire files.
  - Modify existing code.
  - Explain complex code sections.
  - Perform file and folder operations (create, update, delete).
  - **Emoji Picker:** Easily insert emojis into your messages.
- **Integrated File Explorer:**
  - View project file and folder structure.
  - Manually create, rename, and delete files/folders.
  - Upload entire project folders.
  - Expand/collapse folders, with state persisted.
- **Code Editor Panel:**
  - **View Mode:** Displays file content with syntax highlighting for readability using `react-syntax-highlighter`.
  - **Edit Mode:** Toggle to a direct text editing mode.
  - **Save Functionality:** Persist changes made in edit mode.
  - Supports multiple open file tabs.
- **Live Preview Panel:**
  - Render HTML files live to see changes instantly.
  - View content of other text-based files.
- **Console Panel:**
  - View application logs, AI operation details, and errors.
  - **"Fix with AI" Button:** For errors, sending context to the AI for a solution.
  - **Iterative Debugging:** "Refine Fix" option in chat to provide feedback on AI's fix attempts.
- **Global Command Palette:**
  - Access various application commands quickly via `Cmd/Ctrl+K`.
  - Search and execute actions like creating files, toggling panels, etc.
- **Project Upload:** Easily upload an existing project folder (text-based files) to work with.
- **Interactive Tutorial:** Guides new users through the main features of the application.
- **Responsive \& Customizable Layout:**
  - Resizable panels for personalized workspace.
  - Toggle visibility of Conversation, Editor, and Preview panels.
  - Layout configuration is saved to `localStorage`.
- **Checkpoint & Restore:** Revert file changes made by the AI to a previous state.
- **Screenshot & Console Context:** Optionally send a screenshot of the current application state and console logs to the AI for more accurate assistance.
- **Customizable App Title:** Personalize the assistant's name.
- **Dark Mode UI:** Sleek and modern user interface.

## Core Concepts

Code Companion works by facilitating a conversation between the user and the Gemini AI model.

1. **User Input:** The user types a request in the chat panel (e.g., "Create an HTML file with a basic layout," "Explain this Python function," "Add a CSS style to `style.css`"). They can optionally attach a screenshot, console logs, or use the emoji picker. Users can also directly edit files in the Editor Panel or use the Command Palette (`Cmd/Ctrl+K`) for quick actions.
2. **Contextualization:** The application gathers relevant context:
    - The user's prompt.
    - The current project file structure (list of files and folders).
    - The content of all files in the project (including any direct user edits).
    - Optional screenshot and console logs.
    - Context from previous AI interactions for features like "Refine Fix".
3. **AI Processing:** This context is sent to the Gemini API. The AI model analyzes the request and the provided context.
4. **Structured Response:** Gemini returns a structured JSON response containing:
    - `explanation`: A textual explanation or answer for the user.
    - `fileOperations`: An optional array of actions to be performed on the project's file system (e.g., create file, update file content, delete folder).
5. **Application Action:**
    - The Code Companion frontend displays the `explanation` in the chat panel (with markdown rendering for code blocks, lists, etc.).
    - If `fileOperations` are present, the application executes them, updating the file explorer, editor (content will refresh in view mode), and preview panel accordingly.
    - User edits saved in the Editor Panel also update the file content directly.
    - Relevant actions are logged in the console panel.

## Tech Stack

- **Frontend:**
  - React 19+ (using functional components and hooks)
  - TypeScript
  - Tailwind CSS (via CDN for styling)
- **AI Integration:**
  - Google Gemini API (`@google/genai` SDK)
- **Build Tool & Development Environment:**
  - Vite
- **Package Manager:**
  - npm
- **Icons:**
  - `react-icons`
- **Syntax Highlighting:**
  - `react-syntax-highlighter` (Used in the editor's view mode)

## Project Structure

```text
code-companion/
├── public/
├── src/
│   ├── components/
│   │   ├── CommandPalette.tsx
│   │   ├── ConversationPanel.tsx
│   │   ├── DeveloperInfo.tsx
│   │   ├── EditorPanel.tsx
│   │   ├── FileExplorerPanel.tsx
│   │   ├── PreviewPanel.tsx
│   │   ├── Splitter.tsx
│   │   ├── TopHeaderBar.tsx
│   │   ├── ConsolePanel.tsx
│   │   └── TutorialGuide.tsx
│   ├── services/
│   │   └── geminiService.ts
│   ├── App.tsx
│   ├── constants.tsx
│   ├── index.tsx
│   └── types.ts
├── .env.example
├── .eslintrc.cjs
├── .gitignore
├── index.html
├── metadata.json
├── package.json
├── README.md
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## Setup and Running Locally

### Prerequisites

- Node.js (v18.x or later recommended)
- npm (usually comes with Node.js)
- A Google Gemini API Key.

### API Key Setup

**This is the most crucial step.** The application requires a Google Gemini API key to function.

1. **Obtain an API Key:**
    - Go to [Google AI Studio (formerly MakerSuite)](https://aistudio.google.com/).
    - Sign in with your Google account.
    - Create a new API key.
2. **Set the Environment Variable:**
    - The application expects the API key to be available as an environment variable named `API_KEY`.
    - **IMPORTANT:** This variable is accessed directly in the code via `process.env.API_KEY`. **Do not hardcode your API key in the source code.** The application is designed *not* to ask the user for the API key through the UI.
    - Create a `.env` file in the root of the project (this file is listed in `.gitignore` and should not be committed).
    - Add your API key to this `.env` file:

        ```env
        API_KEY=YOUR_GEMINI_API_KEY_HERE
        ```

    - Vite will automatically load this `.env` file during development. For production deployments, you'll need to set this environment variable in your hosting environment.

### Installation \& Running

1. **Clone the repository:**
    (If you haven't already or for a fresh setup)

    ```bash
    # git clone https://github.com/herawenn/code-companion.git
    # cd code-companion
    ```

2. **Install dependencies:**

    ```bash
    npm install
    ```

3. **Run the development server:**
    Ensure you have set up your `API_KEY` in the `.env` file as described above.

    ```bash
    npm run dev
    ```

    The application should now be running, typically at `http://localhost:5173`.

4. **Build for production:**

    ```bash
    npm run build
    ```

    This command compiles the TypeScript code and bundles the application for production into the `dist` folder.

5. **Preview the production build locally:**

    ```bash
    npm run preview
    ```

## Environment Variables

- `API_KEY`: **Required.** Your Google Gemini API key. The application will not function without this.

## Key Functionalities in Detail

### AI Interaction (Gemini)

The core of Code Companion lies in its interaction with the Gemini API. The `geminiService.ts` handles communication. It constructs a detailed prompt including:

- The user's specific request.
- Instructions for the AI to return a JSON object with `explanation` and `fileOperations`.
- Guidelines for default project structures if the user is starting a new project.
- The current file structure of the user's project.
- The full content of all files in the project (including any user edits from the editor panel).
- Optionally, a base64 encoded screenshot and recent console logs if provided by the user.
- **Emoji Picker:** Users can use an emoji picker to insert emojis into their chat messages.

The AI is configured to return `application/json` which is then parsed by the frontend to update the UI and file system. AI responses are rendered with basic markdown support (code blocks, lists, bold, italics).

### File Management

- **AI-driven & User-driven:** File operations (create, update, delete files/folders) can be initiated by the AI based on user prompts or by direct user edits (saved in the editor panel).
- **Manual Operations:** The File Explorer panel allows users to:
  - Upload an entire project folder (filters for text-based files, skips common ignored directories like `node_modules`).
  - Create new empty files or folders.
  - Rename existing files or folders (inline editing).
  - Delete files or folders (with confirmation).
  - Expand and collapse folders, with their state persisted in `localStorage`.
- **Path Handling:** Paths are normalized to use forward slashes. Parent folders are automatically created if they don't exist when a file/folder operation targets a nested path.

### Panel System

The UI is divided into several key panels:

- **Top Header Bar:** Contains app title (editable), panel toggle buttons, tutorial toggle, command palette toggle, and developer info.
- **Conversation Panel:** For chat interactions with the AI. Includes message input, screenshot capture, project upload, and emoji picker.
- **File Explorer Panel:** Displays and manages project files in a tree-like structure.
- **Editor Panel:** Displays file content with syntax highlighting (view mode). An "Edit" icon switches to a text area for modifications, which can then be saved using a "Save" icon. Supports multiple tabs.
- **Preview Panel:** Renders HTML files or displays content of other text files.
- **Console Panel:** Shows logs, errors, and provides the "Fix with AI" functionality. Expandable for more details.

These panels (Conversation, Editor group, Preview) can be toggled for visibility. The main vertical panels are resizable using draggable splitters. Layout settings (widths, visibility) are persisted in `localStorage`.

### Interactive Tutorial

For first-time users (or when manually toggled via the school icon 🎓 in the top bar), an interactive tutorial guides them through the main UI elements and functionalities. It highlights specific components and provides a brief explanation of their purpose. The "seen" status of the tutorial is stored in `localStorage`.

### Screenshot \& Console Context

Users can click a "Capture Screenshot" button (camera icon 📸) in the chat input area. This uses the browser's `getDisplayMedia` and `ImageCapture` APIs to take a screenshot. This screenshot (as a base64 Data URL) and the current content of the Console Panel are sent along with the next user prompt to give the AI more visual and runtime context, which can be very helpful for debugging UI issues or understanding dynamic states.

### Error Fixing with AI & Iterative Debugging

- **Fix with AI:** When an error appears in the Console Panel, a "Fix with AI" button (⚡) is displayed next to it. Clicking this button formulates a special prompt to the AI, including the error details, current file context, and project state.
- **Iterative Debugging (Refine Fix):** If the AI's initial attempt to fix an error isn't perfect, a "Refine Fix" button (🔧) will appear on the AI's response message in the chat. Clicking this prompts the user to describe the remaining issue or new error. This feedback, along with the context of the original error and the AI's previous attempt, is sent back to the AI for a more targeted solution. This process can be repeated for a conversational debugging experience.

### Command Palette

- **Access:** Open the Command Palette using the keyboard shortcut `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux), or by clicking the keyboard icon (⌨️) in the Top Header Bar.
- **Functionality:** It provides a quick way to search for and execute various application commands, such as:
  - Creating new files or folders.
  - Toggling the visibility of UI panels (Chat, Editor, Preview).
  - Clearing the console.
  - Uploading a project.
  - Toggling the tutorial.
- **Usage:** Type to filter commands. Use arrow keys to navigate and `Enter` to execute, or click a command. Press `Escape` or click outside to close.

## Limitations

- **Editor Functionality:** While providing syntax highlighting in view mode and a direct editing mode, the editor lacks advanced IDE features like code autocompletion, integrated debugging tools, or rich intellisense beyond basic text editing.
- **No Version Control Integration:** No built-in Git support. File changes are local to the browser session or managed via upload/download.
- **Web-Based Limitations:**
  - File system access is managed virtually by the app.
  - Performance with extremely large projects or numerous large files might degrade.
  - Relies on browser APIs (like `ImageCapture`, `showDirectoryPicker`) which might have varying support or require specific security contexts (e.g., HTTPS for `showDirectoryPicker`).

## How to Use

1. **Setup:** Follow the [Setup and Running Locally](#setup-and-running-locally) instructions, especially the **API Key Setup**.
2. **Launch:** Open the application in your browser.
3. **Tutorial:** If it's your first time, the tutorial will guide you. You can also toggle it from the top bar (school icon 🎓).
4. **Command Palette:** Press `Cmd+K` or `Ctrl+K` to open the Command Palette for quick access to actions like "File: Create New File", "View: Toggle Preview Panel", etc.
5. **Start a Project:**
    - **Ask the AI:** "Create a simple React app" or "Start a new Python project for a command-line tool."
    - **Upload:** Click the "Upload Project Folder" button (folder icon 📁) in the chat panel or use the "Project: Upload Project Folder" command from the Command Palette.
6. **Interact with the AI:**
    - Type your requests in the chat input at the bottom of the Conversation Panel. Use the emoji picker (🙂) for fun!
    - Be specific for better results. For example:
        - "Create a file named `utils.js` and add a function that calculates the factorial of a number."
        - "In `App.tsx`, refactor the `useEffect` hook to use a separate cleanup function."
        - "Explain the purpose of the `Proxy` object in JavaScript."
        - "Delete the `old_styles/` folder."
    - Use the "Capture Screenshot & Console Logs" button (camera icon 📸) to provide more context to the AI if you're facing UI issues or runtime errors.
7. **Manage Files & Edit Code:**
    - Use the File Explorer to browse files or perform manual operations (add, rename, delete via context menu or '...' icon).
    - Select a file to open it in the Editor panel. It will display with syntax highlighting (view mode).
    - To edit, click the "Edit" icon (pencil ✏️) in the sub-header of the editor. The view will change to a text area.
    - Make your changes and click the "Save" icon (floppy disk 💾) to persist them. The view will revert to syntax highlighting.
8. **Preview:** If you're working with HTML, it will render in the Preview panel. Other text files will show their content. Toggle the Preview panel using the eye icon (👁️) in the top bar or via the Command Palette.
9. **Check Console:** Monitor AI operations, application logs, and errors in the Console panel at the bottom of the editor section.
    - If an error occurs, click the "Fix with AI" button (⚡) next to the error log.
    - If the AI's fix isn't complete, click the "Refine Fix" button (🔧) on the AI's message in the chat panel to provide more details.
10. **Restore Checkpoints:** If AI operations don't go as planned, use the "Restore checkpoint" button that appears below AI messages that involved file changes.

---

Happy Coding with Code Companion!
