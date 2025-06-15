# Code Companion - AI Powered Coding Assistant

Code Companion is an interactive web application designed to assist developers by integrating the power of Google's Gemini AI. It provides a chat-based interface to generate, modify, and explain code, alongside comprehensive tools including a file explorer, code editor, and live preview panel.

<div align="center">

**[Live Demo](https://mallory.pw)**

</div>

![Code Companion Screenshot](https://i.imgur.com/83PBXmn.png)

---

## Table of Contents

- [Code Companion - AI Powered Coding Assistant](#code-companion---ai-powered-coding-assistant)
  - [Table of Contents](#table-of-contents)
  - [Key Features](#key-features)
  - [Core Concepts](#core-concepts)
  - [Tech Stack](#tech-stack)
  - [Setup and Running Locally](#setup-and-running-locally)
    - [Prerequisites](#prerequisites)
    - [Installation \& Running](#installation--running)
    - [Key Functionalities](#key-functionalities)
      - [**File Management**](#file-management)
      - [**Error Fixing with AI \& Iterative Debugging**](#error-fixing-with-ai--iterative-debugging)
      - [**Command Palette**](#command-palette)

---

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
  - Expand/collapse folders, with their state persisted in `localStorage`.
- **Code Editor Panel:**
  - **View Mode:** Displays file content with syntax highlighting for readability using `react-syntax-highlighter`.
  - **Edit Mode:** Toggle to a direct text editing mode using an "Edit" icon (pencil).
  - **Save Functionality:** Click the "Save" icon (floppy disk) to persist changes made in edit mode. Unsaved changes are not automatically saved when switching tabs or closing the editor/application.
  - Supports multiple open file tabs.
- **Live Preview Panel:**
  - Render HTML files live to see changes instantly.
  - View content of other text-based files.
  - **Python Execution:** Run Python scripts and view their output.
- **Console Panel:**
  - View application logs, AI operation details, and errors.
  - **"Fix with AI" Button:** For errors, sending context to the AI for a solution.
  - **Iterative Debugging:** "Refine Fix" option in chat to provide feedback on AI's fix attempts.
- **Global Command Palette:**
  - Access various application commands quickly via `Cmd/Ctrl+K`.
  - Search and execute actions like creating files, toggling panels, etc.
- **Project Upload:** Easily upload an existing project folder (text-based files) to work with.
- **Interactive Tutorial:** Guides new users through the main features of the application.
- **Responsive & Customizable Layout:**
  - Resizable panels for personalized workspace.
  - Toggle visibility of Conversation, Editor, and Preview panels.
  - Layout configuration is saved to `localStorage`.
- **Checkpoint & Restore:** Revert file changes made by the AI to a previous state.
- **Screenshot & Console Context:** Optionally send a screenshot of the current application state and console logs to the AI for more accurate assistance.
- **Customizable App Title:** Personalize the assistant's name.
- **Dark Mode UI:** Sleek and modern user interface.

---

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

---

## Tech Stack

- **Frontend:**
  - React 18+
  - TypeScript
  - Tailwind CSS (via CDN)
- **Backend (for Python Execution):**
  - Flask (Python)
- **AI Integration:**
  - Google Gemini API (`@google/generative-ai` SDK)
- **Build Tool & Development Environment:**
  - Vite
- **Package Manager:**
  - npm
- **Icons:**
  - `react-icons`
- **Syntax Highlighting:**
  - `react-syntax-highlighter`

---

## Project Structure
```text
code-companion/
├── components/
│   ├── CommandPalette.tsx
│   ├── ConversationPanel.tsx
│   ├── DeveloperInfo.tsx
│   ├── EditorPanel.tsx
│   ├── FileExplorerPanel.tsx
│   ├── PreviewPanel.tsx
│   ├── Splitter.tsx
│   ├── TopHeaderBar.tsx
│   ├── ConsolePanel.tsx
│   └── TutorialGuide.tsx
├── services/
│   └── geminiService.ts
├── App.tsx
├── backend_app.py
├── constants.tsx
├── index.tsx
├── types.ts
├── example.env
├── index.html
├── metadata.json
├── package.json
├── README.md
├── tsconfig.json
└── vite.config.ts
```

## Setup and Running Locally

### Prerequisites

- Node.js (v18.x or later recommended)
- npm (usually comes with Node.js)
- A Google Gemini API Key.

**The application requires a Google Gemini API key to function.**

**Set the Environment Variable:**
    - The application expects the API key to be available as an environment variable named `API_KEY`.
    - **IMPORTANT:** This variable is accessed directly in the code via `process.env.API_KEY`. **Do not hardcode your API key in the source code.**
    - Create a `.env` file in the root of the project
    - Add your API key to this `.env` file:
      ```bash
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

3. **Run the Python backend** *(optional, in a separate terminal)*:

    ```bash
    python backend_app.py
    ```

4. **Run the development server:**
    Ensure you have set up your `API_KEY` in the `.env` file as described above.

    ```bash
    npm run dev
    ```

    The application should now be running, typically at `http://localhost:5173`.

5. **Build for production:** *(optional)*

    ```bash
    npm run build
    ```

    This command compiles the TypeScript code and bundles the application for production into the `dist` folder.

---

### Key Functionalities

**AI Interaction (Gemini)**
The core of Code Companion lies in its interaction with the Gemini API. The `geminiService.ts` handles communication. It constructs a detailed prompt including:

- The user's specific request.
- Instructions for the AI to return a JSON object with explanation and fileOperations.
- Guidelines for default project structures if the user is starting a new project.
- The current file structure of the user's project.
- The full content of all files in the project (including any user edits from the editor panel).
- Optionally, a base64 encoded screenshot and recent console logs if provided by the user.
- **Emoji Picker:** Users can use an emoji picker to insert emojis into their chat messages.

The AI is configured to return `application/json` which is then parsed by the frontend to update the UI and file system. AI responses are rendered with basic markdown support (code blocks, lists, bold, italics).

#### **File Management**

- **AI-driven & User-driven:** File operations (create, update, delete files/folders) can be initiated by the AI based on user prompts or by direct user edits (saved in the editor panel).
- **Manual Operations:** The File Explorer panel allows users to:
  - Upload an entire project folder (filters for text-based files, skips common ignored directories like `node_modules`).
  - Create new empty files or folders.
  - Rename existing files or folders (inline editing).
  - Delete files or folders (with confirmation).
  - Expand and collapse folders, with their state persisted in `localStorage`.
- **Path Handling:** Paths are normalized to use forward slashes. Parent folders are automatically created if they don't exist when a file/folder operation targets a nested path.

**Panel System**
The UI is divided into several key panels:

- **Top Header Bar:** Contains app title (editable), panel toggle buttons, tutorial toggle, command palette toggle, and developer info.
- **Conversation Panel:** For chat interactions with the AI. Includes message input, screenshot capture, project upload, and emoji picker.
- **File Explorer Panel:** Displays and manages project files in a tree-like structure.
- **Editor Panel:** Displays file content with syntax highlighting (view mode). An "Edit" icon switches to a text area for modifications, which can then be saved using a "Save" icon. Supports multiple tabs.
- **Preview Panel:** Renders HTML files or displays content of other text files. Also supports Python code preview and execution output.
- **Console Panel:** Shows logs, errors, and provides the "Fix with AI" functionality. Expandable for more details.

These panels (Conversation, Editor group, Preview) can be toggled for visibility. The main vertical panels are resizable using draggable splitters. Layout settings (widths, visibility) are persisted in `localStorage`.

**Interactive Tutorial**
For first-time users (or when manually toggled via the school icon 🎓 in the top bar), an interactive tutorial guides them through the main UI elements and functionalities. It highlights specific components and provides a brief explanation of their purpose. The "seen" status of the tutorial is stored in `localStorage`.
The tutorial includes guided steps such as:

- Asking the AI to create a Python file (`hello.py`).
- Demonstrating the File Explorer and Editor panels with the newly created file.
- Automatically introducing a simulated error in `hello.py`.
- Guiding the user to use the "Fix with AI" button in the Console Panel.
- Showing the Preview Panel and instructing on Python code execution.
- Highlighting the panel toggle buttons.

**Screenshot & Console Context**
Users can click a "Capture Screenshot" button (camera icon 📸) in the chat input area. This uses the browser's `getDisplayMedia` and `ImageCapture` APIs to take a screenshot. This screenshot (as a base64 Data URL) and the current content of the Console Panel are sent along with the next user prompt to give the AI more visual and runtime context, which can be very helpful for debugging UI issues or understanding dynamic states.

#### **Error Fixing with AI & Iterative Debugging**

- **Fix with AI:** When an error appears in the Console Panel, a "Fix with AI" button (⚡) is displayed next to it. Clicking this button formulates a special prompt to the AI, including the error details, current file context, and project state.
- **Iterative Debugging (Refine Fix):** If the AI's initial attempt to fix an error isn't perfect, a "Refine Fix" button (🔧) will appear on the AI's response message in the chat. Clicking this prompts the user to describe the remaining issue or new error. This feedback, along with the context of the original error and the AI's previous attempt, is sent back to the AI for a more targeted solution. This process can be repeated for a conversational debugging experience.

#### **Command Palette**

- **Access:** Open the Command Palette using the keyboard shortcut `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux), or by clicking the keyboard icon (⌨️) in the Top Header Bar.
- **Functionality:** It provides a quick way to search for and execute various application commands, such as:
  - Creating new files or folders.
  - Toggling the visibility of UI panels (Chat, Editor, Preview).
  - Clearing the console.
  - Uploading a project.
  - Toggling the tutorial.
- **Usage:** Type to filter commands. Use arrow keys to navigate and Enter to execute, or click a command. Press Escape or click outside to close.

---

❤️ From PortLords w Love
