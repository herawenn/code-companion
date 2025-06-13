
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ConversationPanel } from './components/ConversationPanel';
import { FileExplorerPanel } from './components/FileExplorerPanel';
import { EditorPanel } from './components/EditorPanel';
import { TopHeaderBar } from './components/TopHeaderBar';
import { Splitter } from './components/Splitter';
import { ConsolePanel } from './components/ConsolePanel';
import { PreviewPanel } from './components/PreviewPanel';
import { TutorialGuide } from './components/TutorialGuide';
import { Message, FileItem, AIFileOperation, ConsoleMessage, LayoutConfig, ScreenshotContext, TutorialStep } from './types';
import { initialFiles, initialMessages, initialSelectedFileId } from './constants';
import { GeminiService } from './services/geminiService';

const MIN_PANEL_WIDTH = 150;
const LAYOUT_CONFIG_KEY = 'aiCodingAssistantLayoutConfig_v1';
const TUTORIAL_SEEN_KEY = 'codeCompanionTutorialSeen_v1';
const HIGHLIGHT_CLASS = 'tutorial-highlight';

const normalizePath = (path: string): string => {
  return path.replace(/^\/+|\/+$/g, '').replace(/\\/g, '/');
};

const generateUniqueId = (prefix: string) => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const ALLOWED_EXTENSIONS = ['.txt', '.md', '.js', '.jsx', '.ts', '.tsx', '.json', '.css', '.html', '.htm', '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.php', '.rb', '.rs', '.swift', '.kt', '.sh', '.xml', '.yaml', '.yml', '.env', '.gitignore', '.dockerignore', 'dockerfile', '.sql', '.svg', '.text', '.log', '.cfg', '.ini', '.toml', '.rtf', '.tex', '.bib', '.csv', '.tsv', '.ps1', '.bat', '.cmd', '.less', '.scss', '.sass', '.styl', '.vue', '.svelte', '.pl', '.pm', '.cgi', '.fcgi', '.lua', '.r', '.dart', '.f', '.f90', '.for', '.pas', '.pp', '.inc', '.asm', '.s', '.erb', '.haml', '.slim', '.jade', '.pug', '.hbs', '.mustache', '.properties', '.conf', '.config', '.settings', '.xsd', '.xsl', '.xslt', '.dtd', '.mod', '.sum', '.work'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const App: React.FC = () => {
  const [appName, setAppName] = useState<string>(() => {
    const storedName = localStorage.getItem('codeCompanionAppName');
    return storedName || "Code Companion";
  });
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [files, setFiles] = useState<FileItem[]>(initialFiles);
  const [openFileIds, setOpenFileIds] = useState<string[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(initialSelectedFileId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleMessage[]>([
    { id: generateUniqueId('log'), type: 'info', message: 'Application initialized. Welcome!', timestamp: new Date() }
  ]);
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(() => {
    const savedConfig = localStorage.getItem(LAYOUT_CONFIG_KEY);
    if (savedConfig) {
      try {
        return JSON.parse(savedConfig);
      } catch (e) {
        // Handle error or return default config
      }
    }
    const defaultConversationWidth = 300;
    const defaultFileExplorerWidth = 220;
    const defaultPreviewPanelTargetWidth = 450;
    const defaultShowPreviewPanel = true;
    const defaultIsFileExplorerVisibleInMiddle = true;

    return {
      conversationWidth: defaultConversationWidth,
      middleSectionGroupWidth: Math.max(
        MIN_PANEL_WIDTH * (defaultIsFileExplorerVisibleInMiddle ? 2 : 1),
        window.innerWidth - defaultConversationWidth - (defaultShowPreviewPanel ? defaultPreviewPanelTargetWidth : 0)
      ),
      fileExplorerWidth: defaultFileExplorerWidth,
      showConversationPanel: true,
      showEditorSection: true,
      showPreviewPanel: defaultShowPreviewPanel,
      isFileExplorerVisibleInMiddle: defaultIsFileExplorerVisibleInMiddle,
    };
  });
  const [isTutorialVisible, setIsTutorialVisible] = useState(false);
  const [currentTutorialStepIndex, setCurrentTutorialStepIndex] = useState(0);

  const geminiService = useMemo(() => GeminiService.getInstance(), []);

  const tutorialSteps: TutorialStep[] = [
    {
      id: 'welcome',
      title: 'Welcome!',
      content: <p>Welcome to Code Companion! 🎉 Let's take a quick tour to explore how this AI-powered assistant can supercharge your coding workflow. Click 'Next' to discover its features.</p>,
      position: 'center',
    },
    {
      id: 'conversation-panel',
      title: 'AI Chat',
      content: <p>This is your AI Chat panel. Interact with your Gemini-powered assistant to generate code, refactor existing files, get explanations for complex snippets, or even ask it to plan entire project structures. Use the camera icon 📸 to send a screenshot for visual context or the folder icon 📁 to upload an existing project.</p>,
      targetId: 'conversation-panel-main', // Assuming ConversationPanel has an id
      position: 'right',
      highlightTarget: true,
      requireVisible: true,
      onBeforeShow: () => setLayoutConfig(prev => ({ ...prev, showConversationPanel: true })),
    },
    {
      id: 'file-explorer',
      title: 'File Explorer',
      content: <p>Here's the File Explorer. It displays your project's structure. You can create new files and folders using the (+) icons at the top, or right-click (or click the '...' icon) on items for options like rename and delete. Keep your project organized from here!</p>,
      targetId: 'file-explorer-panel', // Assuming FileExplorerPanel has an id
      position: 'right',
      highlightTarget: true,
      requireVisible: true,
      onBeforeShow: () => setLayoutConfig(prev => ({ ...prev, showEditorSection: true, isFileExplorerVisibleInMiddle: true })),
    },
    {
      id: 'editor-panel',
      title: 'Code Editor',
      content: <p>The Code Editor is where you'll view and modify your files. It features syntax highlighting for readability and supports multiple open tabs. Click the pencil icon ✏️ to switch to edit mode, make your changes, and then click the save icon 💾 to apply them.</p>,
      targetId: 'editor-panel-main', // Assuming EditorPanel has an id
      position: 'left',
      highlightTarget: true,
      requireVisible: true,
      onBeforeShow: () => {
        setLayoutConfig(prev => ({ ...prev, showEditorSection: true }));
        if (files.length === 0) {
          const newFileId = handleAddFile(undefined, 'example.js', 'console.log("Hello from example!");', false);
          if (newFileId) handleSelectFile(newFileId);
        } else if (!selectedFileId && openFileIds.length > 0) {
          handleSelectFile(openFileIds[0]);
        } else if (!selectedFileId && files.length > 0) {
          handleSelectFile(files[0].id)
        }
      }
    },
    {
      id: 'preview-panel',
      title: 'Preview Panel',
      content: <p>The Preview Panel shows live updates of your HTML files as you or the AI modifies them. For other text-based files like CSS, JavaScript, or Markdown, it displays their raw content. Great for instant feedback on web projects!</p>,
      targetId: 'preview-panel-main', // Assuming PreviewPanel has an id
      position: 'left',
      highlightTarget: true,
      requireVisible: true,
      onBeforeShow: () => setLayoutConfig(prev => ({ ...prev, showPreviewPanel: true })),
    },
    {
      id: 'console-panel',
      title: 'Console',
      content: <p>The Console Panel, located below the editor, logs important application events, details of AI file operations, and any errors encountered. If you see an error, try the 'Fix with AI' ⚡ button to let your assistant attempt a solution!</p>,
      targetId: 'console-panel-main', // Assuming ConsolePanel has an id
      position: 'top',
      highlightTarget: true,
      requireVisible: true,
      onBeforeShow: () => setLayoutConfig(prev => ({ ...prev, showEditorSection: true })),
    },
    {
      id: 'panel-toggles',
      title: 'Toggle Panels',
      content: <p>These buttons in the Top Bar control the visibility of the main workspace panels: Chat 💬, Editor/Explorer 💻, and Preview 👁️. Customize your layout by toggling them to focus on what you need.</p>,
      targetId: 'top-header-bar-panel-toggles',
      position: 'bottom',
      highlightTarget: true,
    },
    {
      id: 'finish-tutorial',
      title: 'You\'re All Set!',
      content: <p>You're all set! We hope this tour helps you get started. Experiment with the AI, explore the tools, and happy coding! Remember, you can revisit this tutorial anytime by clicking the school icon 🎓 in the top bar.</p>,
      position: 'center',
    },
  ];

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem(TUTORIAL_SEEN_KEY);
    if (!hasSeenTutorial) {
      setIsTutorialVisible(true);
    }
  }, []);

  const executeTutorialStepSideEffects = (stepIndex: number) => {
    const step = tutorialSteps[stepIndex];
    if (step.onBeforeShow) {
      step.onBeforeShow();
    }

    if (step.targetId && step.highlightTarget) {
      const targetElement = document.getElementById(step.targetId);
      if (targetElement) {
        document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach(el => el.classList.remove(HIGHLIGHT_CLASS));
        targetElement.classList.add(HIGHLIGHT_CLASS);
      }
    } else {
      document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach(el => el.classList.remove(HIGHLIGHT_CLASS));
    }

    if (step.onAfterShow) {
      const timer = setTimeout(() => step.onAfterShow && step.onAfterShow(), 50); // Small delay for layout changes
      return () => clearTimeout(timer);
    }
  };


  useEffect(() => {
    if (isTutorialVisible && tutorialSteps[currentTutorialStepIndex]) {
      const cleanup = executeTutorialStepSideEffects(currentTutorialStepIndex);
      return cleanup;
    } else {
      document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach(el => el.classList.remove(HIGHLIGHT_CLASS));
    }
  }, [isTutorialVisible, currentTutorialStepIndex, files, selectedFileId, openFileIds, layoutConfig]); // Added dependencies to re-evaluate if target visibility changes

  const handleNextTutorialStep = () => {
    if (currentTutorialStepIndex < tutorialSteps.length - 1) {
      setCurrentTutorialStepIndex(prev => prev + 1);
    } else {
      handleSkipTutorial();
    }
  };

  const handleSkipTutorial = () => {
    setIsTutorialVisible(false);
    setCurrentTutorialStepIndex(0);
    localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
    document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach(el => el.classList.remove(HIGHLIGHT_CLASS));
  };

  const toggleTutorial = () => {
    if(isTutorialVisible) {
      handleSkipTutorial();
    } else {
      setCurrentTutorialStepIndex(0); // Reset to first step
      setIsTutorialVisible(true);
    }
  };

  useEffect(() => {
    localStorage.setItem(LAYOUT_CONFIG_KEY, JSON.stringify(layoutConfig));
  }, [layoutConfig]);

  const addConsoleLog = useCallback((type: ConsoleMessage['type'], message: string) => {
    setConsoleLogs(prev => [...prev, { id: generateUniqueId('log'), type, message, timestamp: new Date() }]);
  }, []);

  const handleClearConsole = useCallback(() => {
    setConsoleLogs([{ id: generateUniqueId('log'), type: 'info', message: 'Console cleared by user.', timestamp: new Date() }]);
  }, []);

  const handleFileContentChange = useCallback((fileId: string, newContent: string) => {
    const fileToChange = files.find(f => f.id === fileId);
    if (fileToChange) {
      addConsoleLog('success', `User edited: ${fileToChange.name}`);
    }
    setFiles(prevFiles => prevFiles.map(f => f.id === fileId ? { ...f, content: newContent } : f));
    setPreviewRefreshKey(prev => prev + 1);
  }, [files, addConsoleLog]);


  const handleFixErrorWithAI = useCallback(async (errorLog: ConsoleMessage) => {
    addConsoleLog('info', `Attempting to fix error with AI: ${errorLog.message}`);
    const currentEditorFile = files.find(f => f.id === selectedFileId);
    let promptText = `The following error occurred in the application:
Timestamp: ${errorLog.timestamp.toISOString()}
Type: ${errorLog.type}
Message: ${errorLog.message}

`;
    if (currentEditorFile) {
      promptText += `The currently open file is "${currentEditorFile.name}" and its content is:\n\`\`\`\n${currentEditorFile.content}\n\`\`\`\n\n`;
    }
    promptText += `Please analyze this error and the project context. Provide an explanation of the likely cause and suggest file operations to fix it. If the error is related to CSS or UI, consider the visual aspects.`;

    const fileStructure = files.map(f => `${f.type === 'folder' ? 'D' : 'F'} ${f.name}`).join('\n');
    const allFilesContent = files.filter(f => f.type === 'file').map(f => `\n\n--- File: ${f.name} ---\n${f.content}`).join('');

    setIsLoading(true);
    setError(null);
    setMessages(prev => [...prev, {
      id: generateUniqueId('user-fix'),
      sender: 'user',
      text: `Attempting to fix error: ${errorLog.message}`,
      timestamp: new Date(),
      isFixAttempt: true,
    }]);

    try {
      const startTime = performance.now();
      const aiResponse = await geminiService.generateStructuredResponse(promptText, fileStructure, allFilesContent);
      const endTime = performance.now();
      const processingTime = (endTime - startTime) / 1000;

      const assistantMessageId = generateUniqueId('assistant-fix');
      let newMessages: Message[] = [{
        id: assistantMessageId,
        sender: 'assistant',
        text: aiResponse.explanation,
        timestamp: new Date(),
        processingTime: processingTime,
      }];

      if (aiResponse.fileOperations && aiResponse.fileOperations.length > 0) {
        const checkpointFiles = JSON.parse(JSON.stringify(files)) as FileItem[];
        newMessages[0].checkpoint = { files: checkpointFiles };
        newMessages[0].fileOperationsApplied = aiResponse.fileOperations;
        applyFileOperations(aiResponse.fileOperations, "AI (error fix)");
      }
      setMessages(prev => [...prev, ...newMessages]);

    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred.";
      setError(errorMessage);
      addConsoleLog('error', `Error during AI fix attempt: ${errorMessage}`);
      setMessages(prev => [...prev, {
        id: generateUniqueId('assistant-error'),
        sender: 'assistant',
        text: `Sorry, I encountered an error trying to help with that: ${errorMessage}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [files, selectedFileId, geminiService, addConsoleLog]);


  const applyFileOperations = (operations: AIFileOperation[], source: string = "AI") => {
    let currentFiles = [...files];
    let newSelectedFileId = selectedFileId;
    let newOpenFileIds = [...openFileIds];
    let operationsAppliedDetails: string[] = [];

    operations.forEach(op => {
      const normalizedPath = normalizePath(op.path);
      operationsAppliedDetails.push(`${op.action}: ${op.path}`);

      if (op.action === 'create_folder') {
        if (!currentFiles.some(f => f.name === normalizedPath && f.type === 'folder')) {
          currentFiles.push({ id: generateUniqueId('folder'), name: normalizedPath, type: 'folder', content: '' });
          addConsoleLog('success', `${source} created folder: ${normalizedPath}`);
        }
      } else if (op.action === 'create_file') {
        const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
        if (parentPath && !currentFiles.some(f => f.name === parentPath && f.type === 'folder')) {
          currentFiles.push({ id: generateUniqueId('folder'), name: parentPath, type: 'folder', content: '' });
          addConsoleLog('info', `${source} implicitly created parent folder: ${parentPath} for ${normalizedPath}`);
        }
        const existingFileIndex = currentFiles.findIndex(f => f.name === normalizedPath && f.type === 'file');
        if (existingFileIndex > -1) {
             addConsoleLog('warn', `${source} tried to create existing file: ${normalizedPath}. Updating instead.`);
             currentFiles[existingFileIndex].content = op.content || '';
        } else {
            const newFileId = generateUniqueId('file');
            currentFiles.push({ id: newFileId, name: normalizedPath, type: 'file', content: op.content || '' });
            newOpenFileIds = [...new Set([...newOpenFileIds, newFileId])];
            newSelectedFileId = newFileId;
            addConsoleLog('success', `${source} created file: ${normalizedPath}`);
        }
      } else if (op.action === 'update_file') {
        const fileIndex = currentFiles.findIndex(f => f.name === normalizedPath && f.type === 'file');
        if (fileIndex !== -1) {
          currentFiles[fileIndex].content = op.content || '';
          addConsoleLog('success', `${source} updated file: ${normalizedPath}`);
          if (!newOpenFileIds.includes(currentFiles[fileIndex].id)) {
            newOpenFileIds = [...newOpenFileIds, currentFiles[fileIndex].id];
          }
          newSelectedFileId = currentFiles[fileIndex].id;
        } else {
          addConsoleLog('warn', `${source} tried to update non-existent file: ${normalizedPath}. Creating instead.`);
           const newFileId = generateUniqueId('file');
            currentFiles.push({ id: newFileId, name: normalizedPath, type: 'file', content: op.content || '' });
            newOpenFileIds = [...new Set([...newOpenFileIds, newFileId])];
            newSelectedFileId = newFileId;
        }
      } else if (op.action === 'delete_file') {
        const fileToDelete = currentFiles.find(f => f.name === normalizedPath);
        if (fileToDelete) {
          currentFiles = currentFiles.filter(f => !(f.name === normalizedPath || (f.type === 'file' && fileToDelete.type === 'folder' && f.name.startsWith(normalizedPath + '/'))));
          newOpenFileIds = newOpenFileIds.filter(id => id !== fileToDelete.id && !currentFiles.find(f => f.id === id)?.name.startsWith(normalizedPath + '/'));
          if (newSelectedFileId === fileToDelete.id || currentFiles.find(f => f.id === newSelectedFileId)?.name.startsWith(normalizedPath + '/')) {
            newSelectedFileId = newOpenFileIds.length > 0 ? newOpenFileIds[0] : null;
          }
          addConsoleLog('success', `${source} deleted: ${normalizedPath}`);
        } else {
            addConsoleLog('warn', `${source} tried to delete non-existent item: ${normalizedPath}.`);
        }
      }
    });

    setFiles(currentFiles);
    setOpenFileIds(newOpenFileIds);
    setSelectedFileId(newSelectedFileId);
    setPreviewRefreshKey(prev => prev + 1);
    addConsoleLog('info', `Applied ${operations.length} file operation(s) from ${source}. Details: ${operationsAppliedDetails.join(', ')}`);
  };

  const handleSendMessage = useCallback(async (input: string, screenshotContext?: ScreenshotContext) => {
    setIsLoading(true);
    setError(null);
    const userMessage: Message = {
      id: generateUniqueId('user'),
      sender: 'user',
      text: input,
      timestamp: new Date(),
      screenshotDataUrl: screenshotContext?.screenshotDataUrl,
      consoleContextForAI: screenshotContext?.consoleContextForAI,
    };
    setMessages(prev => [...prev, userMessage]);

    const fileStructure = files.map(f => `${f.type === 'folder' ? 'D' : 'F'} ${f.name}`).join('\n');
    const allFilesContent = files.filter(f => f.type === 'file').map(f => `\n\n--- File: ${f.name} ---\n${f.content}`).join('');

    try {
      const startTime = performance.now();
      const aiResponse = await geminiService.generateStructuredResponse(input, fileStructure, allFilesContent, screenshotContext);
      const endTime = performance.now();
      const processingTime = (endTime - startTime) / 1000;

      const assistantMessageId = generateUniqueId('assistant');
      let newAssistantMessages: Message[] = [{
        id: assistantMessageId,
        sender: 'assistant',
        text: aiResponse.explanation,
        timestamp: new Date(),
        processingTime: processingTime,
      }];

      if (aiResponse.fileOperations && aiResponse.fileOperations.length > 0) {
        const checkpointFiles = JSON.parse(JSON.stringify(files)) as FileItem[]; // Deep copy for checkpoint
        newAssistantMessages[0].checkpoint = { files: checkpointFiles };
        newAssistantMessages[0].fileOperationsApplied = aiResponse.fileOperations;
        applyFileOperations(aiResponse.fileOperations);
      }
      setMessages(prev => [...prev, ...newAssistantMessages]);

    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred.";
      setError(errorMessage);
      addConsoleLog('error', `Error sending message to AI: ${errorMessage}`);
      setMessages(prev => [...prev, {
        id: generateUniqueId('assistant-error'),
        sender: 'assistant',
        text: `Sorry, I encountered an error: ${errorMessage}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [files, geminiService, addConsoleLog, applyFileOperations]);

  const handleRestoreCheckpoint = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message?.checkpoint) {
      setFiles(message.checkpoint.files);
      setOpenFileIds(prevOpen => prevOpen.filter(id => message.checkpoint!.files.some(f => f.id === id)));
      setSelectedFileId(prevSelected => message.checkpoint!.files.some(f => f.id === prevSelected) ? prevSelected : null);
      addConsoleLog('success', `Restored files to checkpoint from message ID: ${messageId}`);
      setPreviewRefreshKey(prev => prev + 1);
    }
  }, [messages, addConsoleLog]);

  const handleSelectFile = useCallback((fileId: string) => {
    setSelectedFileId(fileId);
    if (!openFileIds.includes(fileId)) {
      setOpenFileIds(prev => [...prev, fileId]);
    }
  }, [openFileIds]);

  const handleUploadCodebase = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    addConsoleLog('info', 'Attempting to upload project folder...');

    const specificErrorMessage = "Folder Upload Failed: The File System Access API (showDirectoryPicker) is not available. This might be due to an unsupported browser, an insecure (non-HTTPS) connection, or if you denied permission.";
    const userCancelledMessage = "Folder selection was cancelled by the user.";

    const readFileAsText = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (e) => reject(reader.error || new Error(`Error reading file: ${e}`));
            reader.readAsText(file);
        });
    };

    const processAndSetFiles = (uploadedFiles: FileItem[], sourceMsg: string) => {
        if (uploadedFiles.length > 0) {
            setFiles(uploadedFiles);
            setOpenFileIds([]);
            setSelectedFileId(null);
            const fileCount = uploadedFiles.filter(f => f.type === 'file').length;
            const folderCount = uploadedFiles.filter(f => f.type === 'folder').length;
            addConsoleLog('success', `${sourceMsg} processed with ${fileCount} file(s) and ${folderCount} folder(s).`);

            const readmeFile = uploadedFiles.find(f => f.type === 'file' && f.name.toLowerCase().endsWith('readme.md'));
            if (readmeFile) {
                handleSelectFile(readmeFile.id);
            } else {
                const firstFile = uploadedFiles.find(f => f.type === 'file');
                if (firstFile) handleSelectFile(firstFile.id);
            }
        } else {
            addConsoleLog('warn', `${sourceMsg}: No processable files found or selection was empty.`);
            setFiles([]);
            setOpenFileIds([]);
            setSelectedFileId(null);
        }
    };


    if (typeof window.showDirectoryPicker === 'function') {
      try {
        const directoryHandle = await window.showDirectoryPicker();
        addConsoleLog('info', `User selected folder: ${directoryHandle.name}. Processing with showDirectoryPicker...`);

        const newFiles: FileItem[] = [];
        const collectedPaths: Set<string> = new Set();

        async function processDirectory(handle: FileSystemDirectoryHandle, currentPath: string) {
          for await (const entry of handle.values()) {
            const entryPath = normalizePath(currentPath ? `${currentPath}/${entry.name}` : entry.name);

            if (collectedPaths.has(entryPath)) continue;

            const skippableDirs = ['.git', 'node_modules', 'dist', 'build', 'coverage', '__pycache__', '.ds_store', 'target', 'bin', 'obj', '.svn', '.hg', 'bower_components', 'vendor'];
            if (entry.kind === 'directory' && skippableDirs.includes(entry.name.toLowerCase())) {
              addConsoleLog('info', `Skipping directory: ${entryPath}`);
              continue;
            }

            collectedPaths.add(entryPath);

            if (entry.kind === 'directory') {
              newFiles.push({
                id: generateUniqueId('folder-upload'), name: entryPath, type: 'folder', content: ''
              });
              await processDirectory(entry as FileSystemDirectoryHandle, entryPath);
            } else if (entry.kind === 'file') {
              const fileHandle = entry as FileSystemFileHandle;
              const fileNameLower = fileHandle.name.toLowerCase();

              const fileExtension = `.${fileNameLower.split('.').pop() || ''}`;
              const isAllowedExtension = ALLOWED_EXTENSIONS.includes(fileExtension) || ALLOWED_EXTENSIONS.includes(fileNameLower);

              if (!isAllowedExtension) {
                addConsoleLog('info', `Skipping non-text or binary file by extension: ${entryPath}`);
                continue;
              }

              try {
                const file = await fileHandle.getFile();
                if (file.size > MAX_FILE_SIZE_BYTES) {
                  addConsoleLog('warn', `Skipping large file (> ${MAX_FILE_SIZE_BYTES / (1024*1024)}MB): ${entryPath}`);
                  continue;
                }
                const content = await file.text();
                newFiles.push({
                  id: generateUniqueId('file-upload'), name: entryPath, type: 'file', content: content
                });
              } catch (fileReadError: any) {
                if (fileReadError.message && (fileReadError.message.includes("invalid byte sequence") || fileReadError.message.includes("UTF-8"))) {
                   addConsoleLog('warn', `Skipping binary file (could not decode as text): ${entryPath}.`);
                } else {
                   addConsoleLog('warn', `Could not read file ${entryPath}: ${fileReadError.message}. Skipping.`);
                }
              }
            }
          }
        }

        await processDirectory(directoryHandle, '');
        processAndSetFiles(newFiles, `Project folder "${directoryHandle.name}" (modern API)`);

      } catch (err: any) {
        let messageToDisplay = `Error uploading folder: ${err.message || 'An unknown error occurred.'}`;
        let consoleMessage = `Error during folder upload: ${err.message || 'Unknown error'}`;

        if (err.name === 'AbortError' || (err.message && err.message.toLowerCase().includes('user cancelled')) || (err.message && err.message.toLowerCase().includes('the user aborted a request'))) {
          messageToDisplay = userCancelledMessage;
          consoleMessage = "User cancelled folder selection.";
        } else if (err.message && typeof err.message === 'string') {
          const lowerCaseError = err.message.toLowerCase();
          if ((lowerCaseError.includes('showdirectorypicker') || lowerCaseError.includes('showdirectorypicker is not a function')) &&
              (lowerCaseError.includes('not a function') || lowerCaseError.includes('is undefined'))) {
            messageToDisplay = specificErrorMessage;
            consoleMessage = 'Upload failed: showDirectoryPicker API error (not a function / undefined). Ensure browser support and HTTPS.';
          } else if (lowerCaseError.includes('must be handling a user gesture')) {
            messageToDisplay = "Folder Upload Failed: Action must be initiated by a user gesture (e.g., a click).";
            consoleMessage = "Upload failed: showDirectoryPicker not called from user gesture.";
          } else if (lowerCaseError.includes('access to the directory was denied') || lowerCaseError.includes('permission denied')) {
            messageToDisplay = "Folder Upload Failed: Access to the selected directory was denied.";
            consoleMessage = "Upload failed: Permission denied for directory access.";
          }
        }
        alert(messageToDisplay);
        addConsoleLog('error', consoleMessage);
        setError(messageToDisplay);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Fallback using <input type="file" webkitdirectory>
      addConsoleLog('info', 'Using fallback (input element) for folder upload. Please select a folder.');
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.webkitdirectory = true;
      fileInput.multiple = true;

      fileInput.onchange = async (event) => {
        setIsLoading(true); // Redundant if already true, but safe
        setError(null);
        const inputElement = event.target as HTMLInputElement;
        const selectedHtmlFiles = inputElement.files;

        if (!selectedHtmlFiles || selectedHtmlFiles.length === 0) {
          addConsoleLog('warn', 'No folder/files selected in fallback mode.');
          setIsLoading(false);
          return;
        }

        addConsoleLog('info', `Processing ${selectedHtmlFiles.length} items via fallback...`);
        const newFileItems: FileItem[] = [];
        const processedPaths = new Set<string>();

        for (const file of Array.from(selectedHtmlFiles)) {
          const relativePath = normalizePath(file.webkitRelativePath);
          if (!relativePath) {
            addConsoleLog('warn', `Skipping file with no relative path (fallback): ${file.name}`);
            continue;
          }

          const pathSegments = relativePath.split('/');
          let currentPath = '';
          for (let i = 0; i < pathSegments.length - 1; i++) {
            currentPath = currentPath ? `${currentPath}/${pathSegments[i]}` : pathSegments[i];
            if (!processedPaths.has(currentPath)) {
              newFileItems.push({
                id: generateUniqueId('folder-fb'), name: currentPath, type: 'folder', content: ''
              });
              processedPaths.add(currentPath);
            }
          }

          const fileNameLower = file.name.toLowerCase();
          const fileExtension = `.${fileNameLower.split('.').pop() || ''}`;
          const isAllowedExtension = ALLOWED_EXTENSIONS.includes(fileExtension) || ALLOWED_EXTENSIONS.includes(fileNameLower);

          const skippablePathFragments = ['node_modules/', '.git/', 'dist/', 'build/', '__pycache__/', '.DS_Store/'];
          if (skippablePathFragments.some(frag => relativePath.toLowerCase().includes(frag.toLowerCase()))) {
              addConsoleLog('info', `Skipping file in excluded path (fallback): ${relativePath}`);
              continue;
          }

          if (!isAllowedExtension) {
            addConsoleLog('info', `Skipping non-text file by extension (fallback): ${relativePath}`);
            continue;
          }
          if (file.size > MAX_FILE_SIZE_BYTES) {
            addConsoleLog('warn', `Skipping large file (> ${MAX_FILE_SIZE_BYTES / (1024*1024)}MB) (fallback): ${relativePath}`);
            continue;
          }

          try {
            const content = await readFileAsText(file);
            if (!processedPaths.has(relativePath)) {
              newFileItems.push({
                id: generateUniqueId('file-fb'), name: relativePath, type: 'file', content: content
              });
              processedPaths.add(relativePath);
            }
          } catch (readError: any) {
            addConsoleLog('warn', `Could not read file ${relativePath} (fallback): ${readError.message}. Skipping.`);
          }
        }

        processAndSetFiles(newFileItems, "Project (fallback API)");
        setIsLoading(false);
      };

      fileInput.onerror = (errEvent) => {
        const errMessage = errEvent instanceof ErrorEvent ? errEvent.message : 'Unknown file input error';
        addConsoleLog('error', `Fallback file input error: ${errMessage}`);
        setError('Folder upload via fallback failed.');
        setIsLoading(false);
      };

      document.body.appendChild(fileInput);
      fileInput.click();
      document.body.removeChild(fileInput);
      // Note: setIsLoading(false) for this path is handled within onchange/onerror
      // If user cancels, onchange might not fire. Add a small timeout to reset loading if no files.
      setTimeout(() => {
        if (isLoading && (!fileInput.files || fileInput.files.length === 0)) {
            // Check if onchange has already set new files or if it's still loading without files.
            // This is tricky because cancellation doesn't fire an error.
            // A more robust way might be to attach a window focus listener.
            // For now, if still loading after a short delay and no files, assume cancellation/empty.
            const currentSelectedFiles = files; // files from component state
            if(currentSelectedFiles.length === 0 && !error) { // if still loading and no files processed and no error yet
                addConsoleLog('info', 'Fallback folder selection timed out or was cancelled by user.');
                setIsLoading(false);
            }
        }
      }, 3000); // 3 seconds timeout
    }
  }, [addConsoleLog, files, selectedFileId, openFileIds, geminiService, applyFileOperations, handleSelectFile, isLoading, error]);


  const handleCloseTab = useCallback((fileIdToClose: string) => {
    setOpenFileIds(prevOpen => prevOpen.filter(id => id !== fileIdToClose));
    if (selectedFileId === fileIdToClose) {
      const remainingOpenFiles = openFileIds.filter(id => id !== fileIdToClose);
      setSelectedFileId(remainingOpenFiles.length > 0 ? remainingOpenFiles[remainingOpenFiles.length - 1] : null);
    }
  }, [selectedFileId, openFileIds]);

  const handleAddFile = useCallback((parentId?: string, name?: string, content: string = '', shouldSelect: boolean = true): string | null => {
    const fileName = name || prompt("Enter new file name (e.g., component.tsx or path/to/file.js):", "new-file.js");
    if (!fileName) return null;

    const parentFolder = parentId ? files.find(f => f.id === parentId && f.type === 'folder') : null;
    const fullPath = parentFolder ? normalizePath(`${parentFolder.name}/${fileName}`) : normalizePath(fileName);

    if (files.some(f => f.name === fullPath)) {
      alert(`A file or folder with the name "${fullPath}" already exists.`);
      addConsoleLog('warn', `User tried to create duplicate item: ${fullPath}`);
      return null;
    }

    const newFileId = generateUniqueId('file-user');
    const newFile: FileItem = { id: newFileId, name: fullPath, type: 'file', content };
    setFiles(prev => [...prev, newFile]);
    if (shouldSelect) {
      handleSelectFile(newFileId);
    }
    addConsoleLog('success', `User created file: ${fullPath}`);
    return newFileId;
  }, [files, addConsoleLog, handleSelectFile]);

  const handleAddFolder = useCallback((parentId?: string) => {
    const folderName = prompt("Enter new folder name (e.g., components or path/to/folder):", "new-folder");
    if (!folderName) return;

    const parentFolder = parentId ? files.find(f => f.id === parentId && f.type === 'folder') : null;
    const fullPath = parentFolder ? normalizePath(`${parentFolder.name}/${folderName}`) : normalizePath(folderName);

    if (files.some(f => f.name === fullPath)) {
      alert(`A file or folder with the name "${fullPath}" already exists.`);
      addConsoleLog('warn', `User tried to create duplicate item: ${fullPath}`);
      return;
    }

    const newFolder: FileItem = { id: generateUniqueId('folder-user'), name: fullPath, type: 'folder', content: '' };
    setFiles(prev => [...prev, newFolder]);
    addConsoleLog('success', `User created folder: ${fullPath}`);
  }, [files, addConsoleLog]);

  const handleRenameFile = useCallback((fileId: string, newFullPath: string) => {
    const normalizedNewPath = normalizePath(newFullPath);
    const oldFile = files.find(f => f.id === fileId);
    if (!oldFile) return;

    if (files.some(f => f.name === normalizedNewPath && f.id !== fileId)) {
      alert(`A file or folder with the name "${normalizedNewPath}" already exists.`);
      addConsoleLog('warn', `User rename conflict for: ${normalizedNewPath}`);
      return;
    }

    setFiles(prevFiles => prevFiles.map(f => {
      if (f.id === fileId) {
        addConsoleLog('success', `User renamed ${oldFile.name} to ${normalizedNewPath}`);
        return { ...f, name: normalizedNewPath };
      }
      // If it was a folder, rename paths of children
      if (oldFile.type === 'folder' && f.name.startsWith(oldFile.name + '/')) {
        const childRelativePath = f.name.substring(oldFile.name.length);
        return { ...f, name: normalizedNewPath + childRelativePath };
      }
      return f;
    }));
    setPreviewRefreshKey(prev => prev + 1);
  }, [files, addConsoleLog]);

  const handleDeleteFile = useCallback((fileId: string) => {
    const fileToDelete = files.find(f => f.id === fileId);
    if (!fileToDelete) return;

    setFiles(prevFiles => prevFiles.filter(f => {
      if (f.id === fileId) return false; // Delete the item itself
      // If deleting a folder, delete all its children
      if (fileToDelete.type === 'folder' && f.name.startsWith(fileToDelete.name + '/')) return false;
      return true;
    }));

    setOpenFileIds(prevOpen => prevOpen.filter(id => {
        if (id === fileId) return false;
        if (fileToDelete.type === 'folder') {
            const openFile = files.find(f => f.id === id);
            if (openFile && openFile.name.startsWith(fileToDelete.name + '/')) return false;
        }
        return true;
    }));

    if (selectedFileId === fileId || (fileToDelete.type === 'folder' && files.find(f=>f.id === selectedFileId)?.name.startsWith(fileToDelete.name + '/'))) {
        const newOpenIds = openFileIds.filter(id => id !== fileId && !(fileToDelete.type === 'folder' && files.find(f=>f.id === id)?.name.startsWith(fileToDelete.name + '/')));
        setSelectedFileId(newOpenIds.length > 0 ? newOpenIds[newOpenIds.length - 1] : null);
    }
    addConsoleLog('success', `User deleted: ${fileToDelete.name}`);
    setPreviewRefreshKey(prev => prev + 1);
  }, [files, selectedFileId, openFileIds, addConsoleLog]);


  const openFilesData = useMemo(() => openFileIds.map(id => files.find(f => f.id === id)).filter(Boolean) as FileItem[], [openFileIds, files]);
  const selectedFileData = useMemo(() => files.find(f => f.id === selectedFileId) || null, [selectedFileId, files]);

  const currentTutorialTargetRect = useMemo(() => {
    if (!isTutorialVisible) return null;
    const step = tutorialSteps[currentTutorialStepIndex];
    if (step?.targetId) {
      return document.getElementById(step.targetId)?.getBoundingClientRect() || null;
    }
    return null;
  }, [isTutorialVisible, currentTutorialStepIndex, tutorialSteps, layoutConfig]); // layoutConfig can affect target positions


  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopHeaderBar
        appTitle={appName}
        onEditTitle={() => {
          const newName = prompt("Enter new assistant name:", appName);
          if (newName) {
            setAppName(newName);
            localStorage.setItem('codeCompanionAppName', newName);
          }
        }}
        showConversationPanel={layoutConfig.showConversationPanel}
        setShowConversationPanel={(show) => setLayoutConfig(p => ({ ...p, showConversationPanel: show }))}
        showEditorSection={layoutConfig.showEditorSection}
        setShowEditorSection={(show) => setLayoutConfig(p => ({ ...p, showEditorSection: show }))}
        showPreviewPanel={layoutConfig.showPreviewPanel}
        setShowPreviewPanel={(show) => setLayoutConfig(p => ({ ...p, showPreviewPanel: show }))}
        isTutorialVisible={isTutorialVisible}
        onToggleTutorial={toggleTutorial}
      />
      <div className="flex flex-grow overflow-hidden">
        {layoutConfig.showConversationPanel && (
          <>
            <div style={{ width: layoutConfig.conversationWidth }} className="flex-shrink-0 h-full" id="conversation-panel-main">
              <ConversationPanel
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                error={error}
                onResetConversation={() => {
                  setMessages(initialMessages);
                  setError(null);
                  addConsoleLog('info', 'Conversation reset by user.');
                }}
                onRestoreCheckpoint={handleRestoreCheckpoint}
                onUploadCodebase={handleUploadCodebase}
                uploadButtonId="upload-codebase-button"
                consoleLogs={consoleLogs}
              />
            </div>
            <Splitter
              ariaLabel="Resize conversation panel"
              onDrag={(deltaX) => {
                setLayoutConfig(p => {
                  const newConversationWidth = Math.max(MIN_PANEL_WIDTH, p.conversationWidth + deltaX);
                  const newMiddleGroupWidth = Math.max(MIN_PANEL_WIDTH, p.middleSectionGroupWidth - deltaX);
                  return { ...p, conversationWidth: newConversationWidth, middleSectionGroupWidth: newMiddleGroupWidth };
                });
              }}
            />
          </>
        )}

        {layoutConfig.showEditorSection && (
          <>
            <div style={{ width: layoutConfig.middleSectionGroupWidth }} className="flex-shrink-0 flex flex-col h-full overflow-hidden">
              <div className="flex flex-grow overflow-hidden">
                {layoutConfig.isFileExplorerVisibleInMiddle && (
                  <>
                    <div style={{ width: layoutConfig.fileExplorerWidth }} className="flex-shrink-0 h-full overflow-y-auto" id="file-explorer-panel">
                      <FileExplorerPanel
                        files={files}
                        selectedFileId={selectedFileId}
                        onSelectFile={handleSelectFile}
                        onAddFile={() => handleAddFile()}
                        onAddFolder={() => handleAddFolder()}
                        onRenameFile={handleRenameFile}
                        onDeleteFile={handleDeleteFile}
                        onToggleVisibility={() => setLayoutConfig(p => ({ ...p, isFileExplorerVisibleInMiddle: false }))}
                        onUploadFile={() => { /* TODO: Single file upload */ }}
                      />
                    </div>
                     <Splitter
                        ariaLabel="Resize file explorer panel"
                        onDrag={(deltaX) => {
                           setLayoutConfig(p => {
                            const newFileExplorerWidth = Math.max(MIN_PANEL_WIDTH / 2, p.fileExplorerWidth + deltaX);
                            return { ...p, fileExplorerWidth: newFileExplorerWidth };
                           });
                        }}
                        />
                  </>
                )}
                <div className="flex-grow h-full" id="editor-panel-main">
                  <EditorPanel
                    openFiles={openFilesData}
                    selectedFile={selectedFileData}
                    onSelectFile={handleSelectFile}
                    onCloseTab={handleCloseTab}
                    onFileContentChange={handleFileContentChange}
                  />
                </div>
              </div>
              <div className="flex-shrink-0" id="console-panel-main">
                 <ConsolePanel consoleLogs={consoleLogs} onClearConsole={handleClearConsole} onFixErrorWithAI={handleFixErrorWithAI} />
              </div>
            </div>
             <Splitter
                ariaLabel="Resize editor/preview panels"
                onDrag={(deltaX) => {
                    setLayoutConfig(p => {
                        const newMiddleGroupWidth = Math.max(MIN_PANEL_WIDTH, p.middleSectionGroupWidth + deltaX);
                        return { ...p, middleSectionGroupWidth: newMiddleGroupWidth };
                    });
                }}
            />
          </>
        )}

        {layoutConfig.showPreviewPanel && (
          <div className="flex-grow h-full" id="preview-panel-main">
            <PreviewPanel file={selectedFileData} refreshKey={previewRefreshKey} />
          </div>
        )}
      </div>
      {isTutorialVisible && tutorialSteps[currentTutorialStepIndex] && (
        <TutorialGuide
          step={tutorialSteps[currentTutorialStepIndex]}
          currentStepIndex={currentTutorialStepIndex}
          totalSteps={tutorialSteps.length}
          onNext={handleNextTutorialStep}
          onSkip={handleSkipTutorial}
          targetRect={currentTutorialTargetRect}
        />
      )}
    </div>
  );
};
