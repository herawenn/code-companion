
# Code Companion - AI Powered Coding Assistant

Code Companion is an interactive web application designed to assist developers by integrating the power of Google's Gemini AI. It provides a chat-based interface to generate, modify, and explain code, alongside a comprehensive suite of tools including a file explorer, code editor, and live preview panel.

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
    - [Error Fixing with AI](#error-fixing-with-ai)
  - [Limitations](#limitations)
  - [Potential Future Enhancements](#potential-future-enhancements)
  - [How to Use](#how-to-use)

## Key Features

- **AI-Powered Chat:** Interact with the Gemini AI to:
  - Generate new code snippets or entire files.
  - Modify existing code.
  - Explain complex code sections.
  - Perform file and folder operations (create, update, delete).
- **Integrated File Explorer:**
  - View project file and folder structure.
  - Manually create, rename, and delete files/folders.
  - Upload entire project folders.
- **Code Editor Panel:**
  - **View Mode:** Displays file content with syntax highlighting for readability using `react-syntax-highlighter`.
  - **Edit Mode:** Toggle to a direct text editing mode using an "Edit" icon (pencil). Make changes in the textarea.
  - **Save Functionality:** Click the "Save" icon (floppy disk) to persist changes made in edit mode.
  - Supports multiple open file tabs; changes are auto-saved if you switch tabs or close an edited tab.
- **Live Preview Panel:**
  - Render HTML files live to see changes instantly.
  - View content of other text-based files.
- **Console Panel:**
  - View application logs, AI operation details, and errors.
  - "Fix with AI" button for errors, sending context to the AI for a solution.
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

1. **User Input:** The user types a request in the chat panel (e.g., "Create an HTML file with a basic layout," "Explain this Python function," "Add a CSS style to `style.css`"). They can optionally attach a screenshot and console logs. User can also directly edit files in the Editor Panel by toggling edit mode and saving.
2. **Contextualization:** The application gathers relevant context:
    - The user's prompt.
    - The current project file structure (list of files and folders).
    - The content of all files in the project (including any direct user edits).
    - Optional screenshot and console logs.
3. **AI Processing:** This context is sent to the Gemini API. The AI model analyzes the request and the provided context.
4. **Structured Response:** Gemini returns a structured JSON response containing:
    - `explanation`: A textual explanation or answer for the user.
    - `fileOperations`: An optional array of actions to be performed on the project's file system (e.g., create file, update file content, delete folder).
5. **Application Action:**
    - The Code Companion frontend displays the `explanation` in the chat panel.
    - If `fileOperations` are present, the application executes them, updating the file explorer, editor (content will refresh in view mode), and preview panel accordingly.
    - User edits saved in the Editor Panel also update the file content directly.
    - Relevant actions are logged in the console panel.

## Tech Stack

- **Frontend:**
  - React 18+ (using functional components and hooks)
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

    ```bash
    git clone https://github.com/herawenn/code-companion.git
    cd code-companion
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

The AI is configured to return `application/json` which is then parsed by the frontend to update the UI and file system.

### File Management

- **AI-driven & User-driven:** File operations (create, update, delete files/folders) can be initiated by the AI based on user prompts or by direct user edits (saved in the editor panel).
- **Manual Operations:** The File Explorer panel allows users to:
  - Upload an entire project folder (filters for text-based files, skips common ignored directories like `node_modules`).
  - Create new empty files or folders.
  - Rename existing files or folders.
  - Delete files or folders (with confirmation).
- **Path Handling:** Paths are normalized to use forward slashes. Parent folders are automatically created if they don't exist when a file/folder operation targets a nested path.

### Panel System

The UI is divided into several key panels:

- **Top Header Bar:** Contains app title, panel toggle buttons, and developer info.
- **Conversation Panel:** For chat interactions with the AI.
- **File Explorer Panel:** Displays and manages project files.
- **Editor Panel:** Displays file content with syntax highlighting (view mode). An "Edit" icon switches to a text area for modifications, which can then be saved using a "Save" icon. Supports multiple tabs.
- **Preview Panel:** Renders HTML files or displays content of other text files.
- **Console Panel:** Shows logs and errors.

These panels (Conversation, Editor group, Preview) can be toggled for visibility. The main vertical panels are resizable using draggable splitters. Layout settings (widths, visibility) are persisted in `localStorage`.

### Interactive Tutorial

For first-time users (or when manually toggled), an interactive tutorial guides them through the main UI elements and functionalities. It highlights specific components and provides a brief explanation of their purpose. The "seen" status of the tutorial is stored in `localStorage`.

### Screenshot \& Console Context

Users can click a "Capture Screenshot" button in the chat input area. This uses the browser's `getDisplayMedia` and `ImageCapture` APIs to take a screenshot (ideally of the current tab). This screenshot (as a base64 Data URL) and the current content of the Console Panel are sent along with the next user prompt to give the AI more visual and runtime context, which can be very helpful for debugging UI issues or understanding dynamic states.

### Error Fixing with AI

When an error appears in the Console Panel, a "Fix with AI" button is displayed next to it. Clicking this button formulates a special prompt to the AI, including:

- The error message and timestamp.
- The content of the currently selected file in the editor (if any).
- Recent console logs.
- The overall project structure and file contents.
This allows the AI to attempt a diagnosis and propose a fix.

## Limitations

- **Editor Functionality:** While providing syntax highlighting in view mode and a direct editing mode, the editor lacks advanced IDE features like code autocompletion, integrated debugging tools, or rich intellisense beyond basic text editing.
- **No Version Control Integration:** No built-in Git support. File changes are local to the browser session or managed via upload/download.
- **Web-Based Limitations:**
  - File system access is managed virtually by the app.
  - Performance with extremely large projects or numerous large files might degrade.
  - Relies on browser APIs (like `ImageCapture`) which might have varying support.
- **AI Reliability:** The quality of code and explanations depends on the Gemini model's capabilities and the clarity of user prompts.
- **Tailwind CSS via CDN:** For simplicity in this project, Tailwind CSS is loaded via a CDN script in `index.html`. For more robust production deployments, integrating Tailwind as part of the build process (e.g., via PostCSS) would be preferable.

## How to Use

1. **Setup:** Follow the [Setup and Running Locally](#setup-and-running-locally) instructions, especially the **API Key Setup**.
2. **Launch:** Open the application in your browser.
3. **Tutorial:** If it's your first time, the tutorial will guide you. You can also toggle it from the top bar (school icon).
4. **Start a Project:**
    - **Ask the AI:** "Create a simple React app" or "Start a new Python project for a command-line tool."
    - **Upload:** Click the "Upload Project Folder" button (folder icon) in the chat panel to upload an existing project.
5. **Interact with the AI:**
    - Type your requests in the chat input at the bottom of the Conversation Panel.
    - Be specific for better results. For example:
        - "Create a file named `utils.js` and add a function that calculates the factorial of a number."
        - "In `App.tsx`, refactor the `useEffect` hook to use a separate cleanup function."
        - "Explain the purpose of the `Proxy` object in JavaScript."
        - "Delete the `old_styles/` folder."
    - Use the "Capture Screenshot & Console Logs" button (camera icon) to provide more context to the AI if you're facing UI issues or runtime errors.
6. **Manage Files & Edit Code:**
    - Use the File Explorer to browse files or perform manual operations (add, rename, delete).
    - Select a file to open it in the Editor panel. It will display with syntax highlighting (view mode).
    - To edit, click the "Edit" icon (pencil) in the sub-header of the editor. The view will change to a text area.
    - Make your changes and click the "Save" icon (floppy disk) to persist them. The view will revert to syntax highlighting.
    - Changes are also auto-saved if you switch tabs or close an edited tab.
7. **Preview:** If you're working with HTML, it will render in the Preview panel. Other text files will show their content. Toggle the Preview panel using the eye icon in the top bar.
8. **Check Console:** Monitor AI operations, application logs, and errors in the Console panel at the bottom of the editor section. Use "Fix with AI" for errors.
9. **Restore Checkpoints:** If AI operations don't go as planned, use the "Restore checkpoint" button that appears below AI messages that involved file changes.

---

Happy Coding with Code Companion!

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
