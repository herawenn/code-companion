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
      targetId: 'conversation-panel-main',
      position: 'right',
      highlightTarget: true,
      requireVisible: true,
      onBeforeShow: () => setLayoutConfig(prev => ({ ...prev, showConversationPanel: true })),
    },
    {
      id: 'file-explorer',
      title: 'File Explorer',
      content: <p>Here's the File Explorer. It displays your project's structure. You can create new files and folders using the (+) icons at the top, or right-click (or click the '...' icon) on items for options like rename and delete. Keep your project organized from here!</p>,
      targetId: 'file-explorer-panel',
      position: 'right',
      highlightTarget: true,
      requireVisible: true,
      onBeforeShow: () => setLayoutConfig(prev => ({ ...prev, showEditorSection: true, isFileExplorerVisibleInMiddle: true })),
    },
    {
      id: 'editor-panel',
      title: 'Code Editor',
      content: <p>The Code Editor is where you'll view and modify your files. It features syntax highlighting for readability and supports multiple open tabs. Click the pencil icon ✏️ to switch to edit mode, make your changes, and then click the save icon 💾 to apply them.</p>,
      targetId: 'editor-panel-main',
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
      targetId: 'preview-panel-main',
      position: 'left',
      highlightTarget: true,
      requireVisible: true,
      onBeforeShow: () => setLayoutConfig(prev => ({ ...prev, showPreviewPanel: true })),
    },
    {
      id: 'console-panel',
      title: 'Console',
      content: <p>The Console Panel, located below the editor, logs important application events, details of AI file operations, and any errors encountered. If you see an error, try the 'Fix with AI' ⚡ button to let your assistant attempt a solution!</p>,
      targetId: 'console-panel-main',
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
        
        if(step.requireVisible && (targetElement.offsetWidth === 0 || targetElement.offsetHeight === 0)) {
           
        }

      }
    } else {
        document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach(el => el.classList.remove(HIGHLIGHT_CLASS));
    }
    
    if (step.onAfterShow) {
      
      const timer = setTimeout(() => step.onAfterShow!(), 50); 
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
  }, [isTutorialVisible, currentTutorialStepIndex]);


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
        setCurrentTutorialStepIndex(0); 
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
        const fileId = existingFileIndex > -1 ? currentFiles[existingFileIndex].id : generateUniqueId('file');
        const newFile: FileItem = { id: fileId, name: normalizedPath, type: 'file', content: op.content || '' };
        
        if (existingFileIndex > -1) {
          currentFiles[existingFileIndex] = newFile;
          addConsoleLog('success', `${source} updated (via create_file) file: ${normalizedPath}`);
        } else {
          currentFiles.push(newFile);
          addConsoleLog('success', `${source} created file: ${normalizedPath}`);
        }
        if (!newOpenFileIds.includes(newFile.id)) newOpenFileIds.push(newFile.id);
        newSelectedFileId = newFile.id;

      } else if (op.action === 'update_file') {
        const fileIndex = currentFiles.findIndex(f => f.name === normalizedPath && f.type === 'file');
        if (fileIndex !== -1) {
          currentFiles[fileIndex].content = op.content || '';
          addConsoleLog('success', `${source} updated file: ${normalizedPath}`);
          if (!newOpenFileIds.includes(currentFiles[fileIndex].id)) newOpenFileIds.push(currentFiles[fileIndex].id);
          newSelectedFileId = currentFiles[fileIndex].id;
        } else {
          addConsoleLog('warn', `${source} tried to update non-existent file: ${normalizedPath}. Creating it instead.`);
          const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
            if (parentPath && !currentFiles.some(f => f.name === parentPath && f.type === 'folder')) {
              currentFiles.push({ id: generateUniqueId('folder'), name: parentPath, type: 'folder', content: '' });
              addConsoleLog('info', `${source} implicitly created parent folder: ${parentPath} for ${normalizedPath}`);
            }
          const newFile: FileItem = { id: generateUniqueId('file'), name: normalizedPath, type: 'file', content: op.content || '' };
          currentFiles.push(newFile);
          if (!newOpenFileIds.includes(newFile.id)) newOpenFileIds.push(newFile.id);
          newSelectedFileId = newFile.id;
        }
      } else if (op.action === 'delete_file') {
        const fileToDelete = currentFiles.find(f => f.name === normalizedPath && f.type === 'file');
        if (fileToDelete) {
          currentFiles = currentFiles.filter(f => f.id !== fileToDelete.id);
          newOpenFileIds = newOpenFileIds.filter(id => id !== fileToDelete.id);
          if (newSelectedFileId === fileToDelete.id) {
            newSelectedFileId = newOpenFileIds.length > 0 ? newOpenFileIds[0] : (currentFiles.find(f => f.type === 'file')?.id || null);
          }
          addConsoleLog('success', `${source} deleted file: ${normalizedPath}`);
        } else {
          addConsoleLog('warn', `${source} tried to delete non-existent file: ${normalizedPath}`);
        }
      } else if (op.action === 'delete_folder') {
        const folderPathPrefix = normalizedPath + '/';
        const filesInFolder = currentFiles.filter(f => f.name === normalizedPath || f.name.startsWith(folderPathPrefix));
        
        if (filesInFolder.length > 0) {
            filesInFolder.forEach(file => {
                newOpenFileIds = newOpenFileIds.filter(id => id !== file.id);
                if (newSelectedFileId === file.id) newSelectedFileId = null;
            });
            currentFiles = currentFiles.filter(f => !filesInFolder.some(deletedFile => deletedFile.id === f.id));

            if (newSelectedFileId === null) {
                 newSelectedFileId = newOpenFileIds.length > 0 ? newOpenFileIds[0] : (currentFiles.find(f => f.type === 'file')?.id || null);
            }
            addConsoleLog('success', `${source} deleted folder and its contents: ${normalizedPath}`);
        } else {
            addConsoleLog('warn', `${source} tried to delete non-existent or empty folder: ${normalizedPath}`);
        }
      }
    });
    setFiles(currentFiles);
    setOpenFileIds(newOpenFileIds);
    setSelectedFileId(newSelectedFileId);
    setPreviewRefreshKey(prev => prev + 1); 
    addConsoleLog('info', `File operations by ${source} completed. Affected: ${operationsAppliedDetails.join(', ')}`);
  };

  const handleSendMessage = async (input: string, screenshotContext?: ScreenshotContext) => {
    setError(null);
    setIsLoading(true);
    const userMessage: Message = { id: generateUniqueId('user'), text: input, sender: 'user', timestamp: new Date(), screenshotDataUrl: screenshotContext?.screenshotDataUrl, consoleContextForAI: screenshotContext?.consoleContextForAI };
    setMessages(prev => [...prev, userMessage]);
    addConsoleLog('info', `User query: "${input}" ${screenshotContext ? '(with screenshot/console context)' : ''}`);

    const fileStructure = files.map(f => `${f.type === 'folder' ? 'D' : 'F'} ${f.name}`).join('\n');
    const allFilesContent = files.filter(f => f.type === 'file').map(f => `\n\n--- File: ${f.name} ---\n${f.content}`).join('');

    try {
      const startTime = performance.now();
      const aiResponse = await geminiService.generateStructuredResponse(input, fileStructure, allFilesContent, screenshotContext);
      const endTime = performance.now();
      const processingTime = (endTime - startTime) / 1000;

      const assistantMessageId = generateUniqueId('assistant');
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
        applyFileOperations(aiResponse.fileOperations);
      }
      setMessages(prev => [...prev, ...newMessages]);

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
  };
  
  const handleSelectFile = useCallback((fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file && file.type === 'file') {
      setSelectedFileId(fileId);
      if (!openFileIds.includes(fileId)) {
        setOpenFileIds(prev => [...prev, fileId]);
      }
      addConsoleLog('info', `Selected file: ${file.name}`);
    } else if (file && file.type === 'folder') {
      
    }
  }, [files, openFileIds, addConsoleLog]);

  const handleCloseTab = useCallback((fileIdToClose: string) => {
    setOpenFileIds(prev => prev.filter(id => id !== fileIdToClose));
    const closedFileName = files.find(f => f.id === fileIdToClose)?.name || 'Unknown file';
    addConsoleLog('info', `Closed tab: ${closedFileName}`);
    if (selectedFileId === fileIdToClose) {
      setSelectedFileId(_prevSelectedFileId => {
        const remainingOpenFileIds = openFileIds.filter(id => id !== fileIdToClose);
        return remainingOpenFileIds.length > 0 ? remainingOpenFileIds[remainingOpenFileIds.length - 1] : null;
      });
    }
  }, [selectedFileId, openFileIds, files, addConsoleLog]);
  
  const handleFileContentChange = useCallback((fileId: string, newContent: string) => {
    setFiles(prevFiles => prevFiles.map(f => f.id === fileId ? { ...f, content: newContent } : f));
    const changedFile = files.find(f => f.id === fileId);
    if (changedFile) {
        addConsoleLog('success', `User edited: ${changedFile.name}`);
    }
    setPreviewRefreshKey(prev => prev + 1);
  }, [files, addConsoleLog]);


  const handleAddFile = useCallback((parentId?: string, fileName?: string, fileContent: string = '', shouldLog: boolean = true) => {
    const baseName = fileName || prompt("Enter new file name (e.g., script.js or folder/file.txt):");
    if (!baseName) return null;

    const fullPath = parentId ? `${files.find(f => f.id === parentId)?.name}/${baseName}` : baseName;
    const normalizedFullPath = normalizePath(fullPath);

    if (files.some(f => f.name === normalizedFullPath && f.type === 'file')) {
      alert(`File "${normalizedFullPath}" already exists.`);
      return null;
    }
    
    const parentPath = normalizedFullPath.substring(0, normalizedFullPath.lastIndexOf('/'));
    if (parentPath && !files.some(f => f.name === parentPath && f.type === 'folder')) {
        const newParentFolder: FileItem = { id: generateUniqueId('folder'), name: parentPath, type: 'folder', content: '' };
        setFiles(prev => [...prev, newParentFolder]);
        if (shouldLog) addConsoleLog('info', `User implicitly created parent folder: ${parentPath} for ${normalizedFullPath}`);
    }

    const newFile: FileItem = { id: generateUniqueId('file'), name: normalizedFullPath, type: 'file', content: fileContent };
    setFiles(prev => [...prev, newFile]);
    setOpenFileIds(prev => [...prev, newFile.id]);
    setSelectedFileId(newFile.id);
    if (shouldLog) addConsoleLog('success', `User created file: ${normalizedFullPath}`);
    return newFile.id;
  }, [files, addConsoleLog]);

  const handleAddFolder = useCallback((parentId?: string) => {
    const baseName = prompt("Enter new folder name (e.g., myFolder or parent/newFolder):");
    if (!baseName) return;

    const fullPath = parentId ? `${files.find(f => f.id === parentId)?.name}/${baseName}` : baseName;
    const normalizedFullPath = normalizePath(fullPath);

    if (files.some(f => f.name === normalizedFullPath)) {
      alert(`A file or folder named "${normalizedFullPath}" already exists.`);
      return;
    }

    const parentPath = normalizedFullPath.substring(0, normalizedFullPath.lastIndexOf('/'));
    if (parentPath && !files.some(f => f.name === parentPath && f.type === 'folder')) {
        const newParentFolder: FileItem = { id: generateUniqueId('folder'), name: parentPath, type: 'folder', content: '' };
        setFiles(prev => [...prev, newParentFolder]);
        addConsoleLog('info', `User implicitly created parent folder: ${parentPath} for ${normalizedFullPath}`);
    }
    
    const newFolder: FileItem = { id: generateUniqueId('folder'), name: normalizedFullPath, type: 'folder', content: '' };
    setFiles(prev => [...prev, newFolder]);
    addConsoleLog('success', `User created folder: ${normalizedFullPath}`);
  }, [files, addConsoleLog]);

  const handleRenameFile = useCallback((fileId: string, newFullPath: string) => {
    const normalizedNewPath = normalizePath(newFullPath);
    const oldFile = files.find(f => f.id === fileId);
    if (!oldFile) return;

    if (files.some(f => f.name === normalizedNewPath && f.id !== fileId)) {
      alert(`A file or folder named "${normalizedNewPath}" already exists.`);
      return;
    }
    
    setFiles(prevFiles => prevFiles.map(f => {
      if (f.id === fileId) {
        addConsoleLog('success', `User renamed ${f.type}: ${f.name} to ${normalizedNewPath}`);
        return { ...f, name: normalizedNewPath };
      }
      if (oldFile.type === 'folder' && f.name.startsWith(oldFile.name + '/')) {
        const newSubPath = normalizedNewPath + f.name.substring(oldFile.name.length);
        addConsoleLog('info', `User implicitly renamed sub-item: ${f.name} to ${newSubPath}`);
        return { ...f, name: newSubPath };
      }
      return f;
    }));
    setPreviewRefreshKey(prev => prev + 1);
  }, [files, addConsoleLog]);

  const handleDeleteFile = useCallback((fileId: string) => {
    const fileToDelete = files.find(f => f.id === fileId);
    if (!fileToDelete) return;

    let filesToKeep = [...files];
    let openIdsToKeep = [...openFileIds];
    let newSelectedId = selectedFileId;

    if (fileToDelete.type === 'file') {
      filesToKeep = filesToKeep.filter(f => f.id !== fileId);
      openIdsToKeep = openIdsToKeep.filter(id => id !== fileId);
      if (newSelectedId === fileId) {
        newSelectedId = openIdsToKeep.length > 0 ? openIdsToKeep[openIdsToKeep.length - 1] : null;
      }
      addConsoleLog('success', `User deleted file: ${fileToDelete.name}`);
    } else if (fileToDelete.type === 'folder') {
      const pathPrefix = fileToDelete.name + '/';
      const idsToDelete = files.filter(f => f.name === fileToDelete.name || f.name.startsWith(pathPrefix)).map(f => f.id);
      
      filesToKeep = files.filter(f => !idsToDelete.includes(f.id));
      openIdsToKeep = openFileIds.filter(id => !idsToDelete.includes(id));
      
      if (idsToDelete.includes(newSelectedId || '')) {
        newSelectedId = openIdsToKeep.length > 0 ? openIdsToKeep[openIdsToKeep.length - 1] : null;
      }
      addConsoleLog('success', `User deleted folder and its contents: ${fileToDelete.name}`);
    }
    
    setFiles(filesToKeep);
    setOpenFileIds(openIdsToKeep);
    setSelectedFileId(newSelectedId);
    setPreviewRefreshKey(prev => prev + 1);
  }, [files, openFileIds, selectedFileId, addConsoleLog]);

  const handleResetConversation = useCallback(() => {
    if (confirm("Are you sure you want to reset the conversation? This cannot be undone.")) {
      setMessages(initialMessages);
      setError(null);
      addConsoleLog('warn', 'Conversation reset by user.');
    }
  }, [addConsoleLog]);

  const handleRestoreCheckpoint = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message && message.checkpoint) {
      if (confirm("Are you sure you want to restore this checkpoint? Current file changes after this point will be lost.")) {
        setFiles(JSON.parse(JSON.stringify(message.checkpoint.files))); 
        const newOpenFileIds = message.checkpoint.files.filter(f => openFileIds.includes(f.id)).map(f=>f.id);
        setOpenFileIds(newOpenFileIds);
        if(selectedFileId && !newOpenFileIds.includes(selectedFileId)){
            setSelectedFileId(newOpenFileIds.length > 0 ? newOpenFileIds[0] : null);
        }
        setMessages(prevMessages => prevMessages.map(msg => 
            msg.id === messageId ? { ...msg, text: `${msg.text}\n\n**Restored to this checkpoint.**` } : msg
        ));
        addConsoleLog('success', `Restored to checkpoint from message ID: ${messageId}`);
        setPreviewRefreshKey(prev => prev + 1);
      }
    }
  }, [messages, openFileIds, selectedFileId, addConsoleLog]);

  const handleUploadCodebase = async () => {
    try {
      const dirHandle = await (window as any).showDirectoryPicker();
      addConsoleLog('info', 'Processing uploaded project folder...');
      const newFiles: FileItem[] = [];
      const newOpenFileIdsSet = new Set<string>();
      let firstFileId: string | null = null;
      
      const ignoredNames = ['.git', 'node_modules', '.vscode', 'dist', 'build', '__pycache__', '.DS_Store', '.env'];
      const textFileExtensions = [
        '.txt', '.md', '.html', '.css', '.js', '.jsx', '.ts', '.tsx', '.json', 
        '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.rb', '.php', '.go', 
        '.rs', '.swift', '.kt', '.lua', '.pl', '.sh', '.xml', '.yml', '.yaml', 
        '.svg', '.gitignore', '.env', '.babelrc', '.eslintrc', '.prettierrc'
      ];


      async function processEntry(entry: any, currentPath: string) {
        if (ignoredNames.includes(entry.name)) return;

        const fullPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
        if (entry.kind === 'file') {
          const fileExtension = '.' + entry.name.split('.').pop()?.toLowerCase();
          if (textFileExtensions.includes(fileExtension) || entry.name.startsWith('.')) {
             try {
                const fileHandle = await entry.getFile();
                const content = await fileHandle.text();
                const fileId = generateUniqueId('file');
                newFiles.push({ id: fileId, name: fullPath, type: 'file', content });
                if (!firstFileId) firstFileId = fileId;
                if(newOpenFileIdsSet.size < 10) newOpenFileIdsSet.add(fileId); 
             } catch (e) {
                addConsoleLog('warn', `Skipped non-text or unreadable file: ${fullPath} (Error: ${(e as Error).message})`);
             }
          } else {
             addConsoleLog('info', `Skipped binary or non-text file: ${fullPath}`);
          }
        } else if (entry.kind === 'directory') {
          newFiles.push({ id: generateUniqueId('folder'), name: fullPath, type: 'folder', content: '' });
          for await (const subEntry of entry.values()) {
            await processEntry(subEntry, fullPath);
          }
        }
      }

      for await (const entry of dirHandle.values()) {
        await processEntry(entry, '');
      }

      setFiles(newFiles);
      const newOpenIdsArray = Array.from(newOpenFileIdsSet);
      setOpenFileIds(newOpenIdsArray);
      setSelectedFileId(firstFileId || (newOpenIdsArray.length > 0 ? newOpenIdsArray[0] : null) );
      setMessages(initialMessages); 
      setConsoleLogs([{ id: generateUniqueId('log'), type: 'success', message: `Successfully uploaded ${newFiles.length} files/folders. Project reset.`, timestamp: new Date() }]);
      setPreviewRefreshKey(prev => prev + 1);

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        addConsoleLog('error', `Error uploading folder: ${err.message}`);
        alert(`Error uploading folder: ${err.message}`);
      } else {
        addConsoleLog('info', 'Folder upload cancelled by user.');
      }
    }
  };
  
  const handleEditAppName = () => {
    const newName = prompt("Enter new assistant name:", appName);
    if (newName && newName.trim() !== "") {
      const trimmedName = newName.trim();
      setAppName(trimmedName);
      localStorage.setItem('codeCompanionAppName', trimmedName);
      addConsoleLog('info', `App name changed to: ${trimmedName}`);
    }
  };

  const selectedFileObject = useMemo(() => files.find(f => f.id === selectedFileId) || null, [files, selectedFileId]);
  const openFileObjects = useMemo(() => openFileIds.map(id => files.find(f => f.id === id)).filter(Boolean) as FileItem[], [files, openFileIds]);

  const handleLayoutChange = (type: keyof LayoutConfig, value: number | boolean) => {
    setLayoutConfig(prev => ({...prev, [type]: value}));
  };
  
  const handleFileExplorerResize = (deltaX: number) => {
    setLayoutConfig(prev => ({
      ...prev,
      fileExplorerWidth: Math.max(MIN_PANEL_WIDTH, Math.min(prev.fileExplorerWidth + deltaX, prev.middleSectionGroupWidth - MIN_PANEL_WIDTH)),
    }));
  };

  const handleConversationResize = (deltaX: number) => {
    setLayoutConfig(prev => ({
      ...prev,
      conversationWidth: Math.max(MIN_PANEL_WIDTH, prev.conversationWidth + deltaX),
    }));
  };

  const handleMiddleSectionGroupResize = (deltaX: number) => {
    setLayoutConfig(prev => ({
      ...prev,
      middleSectionGroupWidth: Math.max(MIN_PANEL_WIDTH * (prev.isFileExplorerVisibleInMiddle ? 2 : 1), prev.middleSectionGroupWidth + deltaX),
    }));
  };
  
  const effectiveEditorWidth = layoutConfig.isFileExplorerVisibleInMiddle ? layoutConfig.middleSectionGroupWidth - layoutConfig.fileExplorerWidth - 8 : layoutConfig.middleSectionGroupWidth;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0a0a] text-neutral-300 overflow-hidden">
      <TopHeaderBar
        appTitle={appName}
        onEditTitle={handleEditAppName}
        showConversationPanel={layoutConfig.showConversationPanel}
        setShowConversationPanel={(show) => handleLayoutChange('showConversationPanel', show)}
        showEditorSection={layoutConfig.showEditorSection}
        setShowEditorSection={(show) => handleLayoutChange('showEditorSection', show)}
        showPreviewPanel={layoutConfig.showPreviewPanel}
        setShowPreviewPanel={(show) => handleLayoutChange('showPreviewPanel', show)}
        isTutorialVisible={isTutorialVisible}
        onToggleTutorial={toggleTutorial}
        previewToggleButtonId="preview-toggle-button"
      />
      <div className="flex-grow flex overflow-hidden">
        {layoutConfig.showConversationPanel && (
          <>
            <div style={{ width: `${layoutConfig.conversationWidth}px` }} className="flex-shrink-0 h-full" id="conversation-panel-main">
              <ConversationPanel
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                error={error}
                onResetConversation={handleResetConversation}
                onRestoreCheckpoint={handleRestoreCheckpoint}
                onUploadCodebase={handleUploadCodebase}
                uploadButtonId="upload-codebase-button"
                consoleLogs={consoleLogs}
              />
            </div>
            <Splitter onDrag={handleConversationResize} ariaLabel="Resize Conversation Panel" />
          </>
        )}
        
        {layoutConfig.showEditorSection && (
          <>
            <div 
                style={{ width: `${layoutConfig.middleSectionGroupWidth}px`}} 
                className="flex-shrink-0 h-full flex flex-col"
                id="editor-section-main"
            >
              <div className="flex-grow flex h-[calc(100%-40px)]"> 
                {layoutConfig.isFileExplorerVisibleInMiddle && (
                  <>
                    <div style={{ width: `${layoutConfig.fileExplorerWidth}px` }} className="flex-shrink-0 h-full" id="file-explorer-panel">
                        <FileExplorerPanel
                            files={files}
                            selectedFileId={selectedFileId}
                            onSelectFile={handleSelectFile}
                            onAddFile={() => handleAddFile()}
                            onAddFolder={() => handleAddFolder()}
                            onRenameFile={handleRenameFile}
                            onDeleteFile={handleDeleteFile}
                            onToggleVisibility={() => handleLayoutChange('isFileExplorerVisibleInMiddle', !layoutConfig.isFileExplorerVisibleInMiddle)}
                            onUploadFile={handleUploadCodebase}
                        />
                    </div>
                    <Splitter onDrag={handleFileExplorerResize} ariaLabel="Resize File Explorer Panel" />
                  </>
                )}
                <div style={{ width: `${effectiveEditorWidth}px` }} className="flex-shrink-0 h-full" id="editor-panel-main">
                  <EditorPanel
                    openFiles={openFileObjects}
                    selectedFile={selectedFileObject}
                    onSelectFile={handleSelectFile}
                    onCloseTab={handleCloseTab}
                    onFileContentChange={handleFileContentChange}
                  />
                </div>
              </div>
              <div id="console-panel-main" className="flex-shrink-0">
                <ConsolePanel consoleLogs={consoleLogs} onClearConsole={handleClearConsole} onFixErrorWithAI={handleFixErrorWithAI} />
              </div>
            </div>
            <Splitter onDrag={handleMiddleSectionGroupResize} ariaLabel="Resize Middle Section" />
          </>
        )}

        {layoutConfig.showPreviewPanel && (
          <div className="flex-grow h-full" id="preview-panel-main">
            <PreviewPanel file={selectedFileObject} allFiles={files} refreshKey={previewRefreshKey}/>
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
          targetRect={
            tutorialSteps[currentTutorialStepIndex].targetId && tutorialSteps[currentTutorialStepIndex].highlightTarget ? 
            document.getElementById(tutorialSteps[currentTutorialStepIndex].targetId!)?.getBoundingClientRect() : null
          }
        />
      )}
    </div>
  );
};
