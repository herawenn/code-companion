
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ConversationPanel } from './components/ConversationPanel';
import { FileExplorerPanel } from './components/FileExplorerPanel';
import { EditorPanel } from './components/EditorPanel';
import { TopHeaderBar } from './components/TopHeaderBar';
import { Splitter } from './components/Splitter';
import { ConsolePanel } from './components/ConsolePanel';
import { PreviewPanel } from './components/PreviewPanel';
import { TutorialGuide } from './components/TutorialGuide';
import { Message, FileItem, AIFileOperation, AIResponseMessage, ConsoleMessage, LayoutConfig, ScreenshotContext, TutorialStep } from './types';
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

const resolveRelativePath = (basePath: string, relativePath: string): string => {
  const baseSegments = basePath.split('/').slice(0, -1);
  const relativeSegments = relativePath.split('/');
  const combinedSegments = [...baseSegments];

  for (const segment of relativeSegments) {
    if (segment === '..') {
      combinedSegments.pop();
    } else if (segment !== '.' && segment !== '') {
      combinedSegments.push(segment);
    }
  }
  return combinedSegments.join('/');
};

const getLinkedResources = (htmlContent: string, htmlFilePath: string, allFiles: FileItem[]): string[] => {
  const resources: string[] = [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('http:') && !href.startsWith('https:') && !href.startsWith('//')) {
        const resolvedPath = normalizePath(resolveRelativePath(htmlFilePath, href));
        if (allFiles.some(f => f.name === resolvedPath && f.type === 'file')) {
          resources.push(resolvedPath);
        }
      }
    });

    doc.querySelectorAll('script[src]').forEach(script => {
      const src = script.getAttribute('src');
      if (src && !src.startsWith('http:') && !src.startsWith('https:') && !src.startsWith('//')) {
        const resolvedPath = normalizePath(resolveRelativePath(htmlFilePath, src));
         if (allFiles.some(f => f.name === resolvedPath && f.type === 'file')) {
          resources.push(resolvedPath);
        }
      }
    });
  } catch (e) {
  }
  return resources;
};


const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [files, setFiles] = useState<FileItem[]>(initialFiles);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(initialSelectedFileId);
  const [openFileIds, setOpenFileIds] = useState<string[]>(initialSelectedFileId ? [initialSelectedFileId] : []);
  const [activePreviewFileId, setActivePreviewFileId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [appTitle, setAppTitle] = useState<string>("Code Companion");

  const [showConversationPanelState, setShowConversationPanelState] = useState(true);
  const [showEditorSectionState, setShowEditorSectionState] = useState(true);
  const [showPreviewPanelState, setShowPreviewPanelState] = useState(false);
  const [isFileExplorerVisibleInMiddleState, setIsFileExplorerVisibleInMiddleState] = useState(true);
  const [conversationWidth, setConversationWidth] = useState(330);
  const [middleSectionGroupWidth, setMiddleSectionGroupWidth] = useState(600);
  const [fileExplorerWidth, setFileExplorerWidth] = useState(200);


  const [consoleLogs, setConsoleLogs] = useState<ConsoleMessage[]>([
    { id: generateUniqueId('log'), type: 'info', message: 'Console initialized. Welcome!', timestamp: new Date() }
  ]);

  const [previewRefreshKey, setPreviewRefreshKey] = useState<number>(0);
  const [linkedResourcesForPreview, setLinkedResourcesForPreview] = useState<string[]>([]);
  const prevFilesRef = useRef<FileItem[]>(files);

  const geminiService = GeminiService.getInstance();
  const appContainerRef = useRef<HTMLDivElement>(null);

  const [showTutorial, setShowTutorial] = useState(false);
  const [currentTutorialStep, setCurrentTutorialStep] = useState(0);
  const [tutorialTargetRect, setTutorialTargetRect] = useState<DOMRect | null>(null);
  const highlightedElementRef = useRef<HTMLElement | null>(null);

  const addConsoleLog = useCallback((type: ConsoleMessage['type'], message: string) => {
    setConsoleLogs(prev => [...prev, { id: generateUniqueId('log'), type, message, timestamp: new Date() }]);
  }, []);

  const tutorialSteps: TutorialStep[] = useMemo(() => [
    {
      id: 'step1-conversation', title: 'Chat Panel',
      content: <>This is the <strong>Chat Panel</strong>. Type your requests in the input area below. For example: <code className="text-xs p-0.5 bg-neutral-700 rounded">Create a file named app.js</code></>,
      targetId: 'tutorial-target-conversation-panel', position: 'right', highlightTarget: true,
      onBeforeShow: () => setShowConversationPanelState(true),
    },
    {
      id: 'step2-file-explorer', title: 'File Explorer',
      content: 'Your project\'s files and folders appear in the File Explorer. The AI can / will manage these for you based on your requests.',
      targetId: 'tutorial-target-file-explorer', position: 'right', highlightTarget: true,
      onBeforeShow: () => {
        setShowEditorSectionState(true);
        setIsFileExplorerVisibleInMiddleState(true);
      }
    },
    {
      id: 'step3-editor', title: 'Code Editor',
      content: 'The Editor Panel displays the content of your selected file. You can view your code here after the AI creates or modifies files.',
      targetId: 'tutorial-target-editor-panel', position: 'bottom', highlightTarget: true,
      onBeforeShow: () => setShowEditorSectionState(true),
    },
    {
      id: 'step4-preview-toggle', title: 'Preview Panel Toggle',
      content: 'Use this button to toggle the Preview Panel. It\'s great for seeing live HTML/CSS changes or viewing other text files!',
      targetId: 'tutorial-target-preview-toggle-button', position: 'bottom', highlightTarget: true,
    },
    {
      id: 'step5-console', title: 'Console Output',
      content: 'The Console shows important messages, logs, and errors. If an error occurs, look for a "Fix with AI" button next to it.',
      targetId: 'tutorial-target-console-panel', position: 'top', highlightTarget: true,
      onBeforeShow: () => setShowEditorSectionState(true),
    },
    {
      id: 'step6-upload', title: 'Upload Project',
      content: 'To work with existing code, use this button to upload an entire project folder.',
      targetId: 'tutorial-target-upload-button', position: 'top-left', highlightTarget: true,
    },
    {
      id: 'step7-finish', title: 'You\'re All Set!',
      content: 'You\'re ready to start with Code-Companion. Experiment with commands and explore the features.\n - From PortLords w Love ❤️',
      position: 'center',
    },
  ], []);

  const clearHighlight = () => {
    if (highlightedElementRef.current) {
      highlightedElementRef.current.classList.remove(HIGHLIGHT_CLASS);
      highlightedElementRef.current = null;
    }
  };

  const completeTutorialActions = useCallback(() => {
    setShowTutorial(false);
    setCurrentTutorialStep(0);
    clearHighlight();
    try {
      localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      addConsoleLog('warn', `Failed to save tutorial seen status to localStorage: "${errorMessage}".`);
    }
  }, [addConsoleLog]);


  const handleNextTutorialStep = useCallback(() => {
    clearHighlight();
    if (currentTutorialStep < tutorialSteps.length - 1) {
      setCurrentTutorialStep(prev => prev + 1);
    } else {
      completeTutorialActions();
      addConsoleLog('info', 'Tutorial finished.');
    }
  }, [currentTutorialStep, tutorialSteps.length, completeTutorialActions, addConsoleLog]);

  const handleSkipTutorial = useCallback(() => {
    completeTutorialActions();
    addConsoleLog('info', 'Tutorial skipped.');
  }, [completeTutorialActions, addConsoleLog]);

  const handleToggleTutorial = useCallback(() => {
    const newShowState = !showTutorial;
    setShowTutorial(newShowState);
    if (newShowState) {
      setCurrentTutorialStep(0);
      try {
        localStorage.removeItem(TUTORIAL_SEEN_KEY);
        addConsoleLog('info', 'Tutorial manually enabled.');
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        addConsoleLog('warn', `Failed to update tutorial status in localStorage: "${errorMessage}".`);
      }
    } else {
      completeTutorialActions();
      addConsoleLog('info', 'Tutorial manually disabled.');
    }
  }, [showTutorial, completeTutorialActions, addConsoleLog]);


  useEffect(() => {
    try {
      const tutorialSeenInStorage = localStorage.getItem(TUTORIAL_SEEN_KEY);
      if (!tutorialSeenInStorage) {
        addConsoleLog('info', 'Tutorial not previously seen or was reset. Showing tutorial.');
        setShowTutorial(true);
        setCurrentTutorialStep(0);
      } else {
        addConsoleLog('info', 'Tutorial previously seen. Hidden by default.');
        setShowTutorial(false);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      addConsoleLog('warn', `Failed to access localStorage for tutorial status: "${errorMessage}". Defaulting to show tutorial.`);
      setShowTutorial(true);
      setCurrentTutorialStep(0);
    }
  }, [addConsoleLog]);


  useEffect(() => {
    if (showTutorial && currentTutorialStep < tutorialSteps.length) {
      const step = tutorialSteps[currentTutorialStep];
      step.onBeforeShow?.();

      requestAnimationFrame(() => {
        if (step.targetId) {
          const targetElement = document.getElementById(step.targetId);
          if (targetElement) {
            setTutorialTargetRect(targetElement.getBoundingClientRect());
            if (step.highlightTarget) {
              targetElement.classList.add(HIGHLIGHT_CLASS);
              highlightedElementRef.current = targetElement;
            }
          } else {
            setTutorialTargetRect(null);
            addConsoleLog('warn', `Tutorial target element not found: ${step.targetId}`);
          }
        } else {
          setTutorialTargetRect(null);
        }
         step.onAfterShow?.();
      });
    } else if (!showTutorial) {
      clearHighlight();
    }
    return () => clearHighlight();
  }, [showTutorial, currentTutorialStep, tutorialSteps, addConsoleLog]);


  useEffect(() => {
    const savedConfigRaw = localStorage.getItem(LAYOUT_CONFIG_KEY);
    if (savedConfigRaw) {
      try {
        const config: LayoutConfig = JSON.parse(savedConfigRaw);
        if (typeof config.conversationWidth === 'number') setConversationWidth(config.conversationWidth);
        if (typeof config.middleSectionGroupWidth === 'number') setMiddleSectionGroupWidth(config.middleSectionGroupWidth);
        if (typeof config.fileExplorerWidth === 'number') setFileExplorerWidth(config.fileExplorerWidth);
        if (typeof config.showConversationPanel === 'boolean') setShowConversationPanelState(config.showConversationPanel);
        if (typeof config.showEditorSection === 'boolean') setShowEditorSectionState(config.showEditorSection);
        if (typeof config.showPreviewPanel === 'boolean') {
          setShowPreviewPanelState(config.showPreviewPanel);
          if (config.showPreviewPanel && !activePreviewFileId) {
            const firstHtmlFile = files.find(f => f.type === 'file' && f.name.match(/\.(html|htm)$/i));
            if (firstHtmlFile) setActivePreviewFileId(firstHtmlFile.id);
          }
        }
        if (typeof config.isFileExplorerVisibleInMiddle === 'boolean') setIsFileExplorerVisibleInMiddleState(config.isFileExplorerVisibleInMiddle);
        addConsoleLog('info', 'Layout configuration loaded from previous session.');
      } catch (err) {
        addConsoleLog('warn', 'Could not load layout configuration. Using defaults.');
      }
    }
  }, [addConsoleLog, files, activePreviewFileId]);

  useEffect(() => {
    const configToSave: LayoutConfig = {
      conversationWidth,
      middleSectionGroupWidth,
      fileExplorerWidth,
      showConversationPanel: showConversationPanelState,
      showEditorSection: showEditorSectionState,
      showPreviewPanel: showPreviewPanelState,
      isFileExplorerVisibleInMiddle: isFileExplorerVisibleInMiddleState,
    };
    try {
      localStorage.setItem(LAYOUT_CONFIG_KEY, JSON.stringify(configToSave));
    } catch (e) {
        addConsoleLog('warn', `Failed to save layout configuration to localStorage: ${(e as Error).message}`);
    }
  }, [
    conversationWidth,
    middleSectionGroupWidth,
    fileExplorerWidth,
    showConversationPanelState,
    showEditorSectionState,
    showPreviewPanelState,
    isFileExplorerVisibleInMiddleState,
    addConsoleLog,
  ]);

  useEffect(() => {
    if (showPreviewPanelState && !activePreviewFileId) {
        const firstHtmlFile = files.find(f => f.type === 'file' && f.name.match(/\.(html|htm)$/i));
        if (firstHtmlFile) {
            setActivePreviewFileId(firstHtmlFile.id);
        }
    }
  }, [showPreviewPanelState, files, activePreviewFileId]);

  useEffect(() => {
    const currentActivePreviewFile = files.find(f => f.id === activePreviewFileId);

    if (currentActivePreviewFile && currentActivePreviewFile.type === 'file' && currentActivePreviewFile.name.match(/\.(html|htm)$/i)) {
      const newLinkedResources = getLinkedResources(currentActivePreviewFile.content, currentActivePreviewFile.name, files);
      if (JSON.stringify(newLinkedResources) !== JSON.stringify(linkedResourcesForPreview)) {
        setLinkedResourcesForPreview(newLinkedResources);
      }

      const prevActivePreviewFile = prevFilesRef.current.find(f => f.id === activePreviewFileId);
      if (prevActivePreviewFile && prevActivePreviewFile.content !== currentActivePreviewFile.content) {
        setPreviewRefreshKey(prev => prev + 1);
        addConsoleLog('info', `Preview auto-refreshed: ${currentActivePreviewFile.name} content changed.`);
      } else {
        let dependencyChanged = false;
        for (const resourcePath of newLinkedResources) {
          const currentResourceFile = files.find(f => f.name === resourcePath);
          const prevResourceFile = prevFilesRef.current.find(f => f.name === resourcePath);
          if (currentResourceFile && prevResourceFile && currentResourceFile.content !== prevResourceFile.content) {
            dependencyChanged = true;
            addConsoleLog('info', `Preview auto-refreshed: Linked resource ${resourcePath} changed.`);
            break;
          }
        }
        if (dependencyChanged) {
          setPreviewRefreshKey(prev => prev + 1);
        }
      }
    } else {
      setLinkedResourcesForPreview([]);
    }
    prevFilesRef.current = files;
  }, [files, activePreviewFileId, addConsoleLog, linkedResourcesForPreview]);


  const handleSelectFile = useCallback((fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    setSelectedFileId(fileId);
    if (file.type === 'file' && !openFileIds.includes(fileId)) {
        setOpenFileIds(prev => [...prev, fileId]);
    }

    if (showPreviewPanelState && file && file.type === 'file' && file.name.match(/\.(html|htm)$/i)) {
      setActivePreviewFileId(fileId);
    }
  }, [files, showPreviewPanelState, openFileIds]);

  const handleClearConsole = useCallback(() => {
    setConsoleLogs([{ id: generateUniqueId('log'), type: 'info', message: 'Console cleared.', timestamp: new Date() }]);
  }, []);

  const effectiveSetShowEditorSection = (show: boolean) => {
    setShowEditorSectionState(show);
    if (show && !isFileExplorerVisibleInMiddleState) {
        setIsFileExplorerVisibleInMiddleState(true);
    }
  };

  const handleEditAppTitle = () => {
    const newTitle = prompt("Enter new assistant name:", appTitle);
    if (newTitle !== null && newTitle.trim() !== "") {
        setAppTitle(newTitle.trim());
        addConsoleLog('info', `App title changed to: ${newTitle.trim()}`);
    }
  };

  const handleConversationDrag = useCallback((deltaX: number) => { setConversationWidth(prev => Math.max(MIN_PANEL_WIDTH, prev + deltaX))}, []);
  const handleMiddleSectionDrag = useCallback((deltaX: number) => { setMiddleSectionGroupWidth(prev => Math.max(MIN_PANEL_WIDTH * 1.5, prev + deltaX))}, []);
  const handleFileExplorerDrag = useCallback((deltaX: number) => { setFileExplorerWidth(prev => Math.max(MIN_PANEL_WIDTH, prev + deltaX))}, []);

  const ensureParentFoldersExist = useCallback((filePath: string, currentFiles: FileItem[]): FileItem[] => {
    const normalizedFilePath = normalizePath(filePath);
    const pathSegments = normalizedFilePath.split('/');
    let currentPath = '';
    const updatedFiles = [...currentFiles];
    const loopLength = normalizedFilePath.endsWith('/') ? pathSegments.length : pathSegments.length -1;

    for (let i = 0; i < loopLength; i++) {
        const segment = pathSegments[i];
        if(!segment) continue;
        currentPath = currentPath ? `${currentPath}/${segment}` : segment;

        if (!updatedFiles.some(f => normalizePath(f.name) === currentPath && f.type === 'folder')) {
            const newFolder: FileItem = {
                id: generateUniqueId('folder'),
                name: currentPath,
                type: 'folder',
                content: ''
            };
            updatedFiles.push(newFolder);
        }
    }
    return updatedFiles;
  }, []);


  const applyAIFileOperations = useCallback((operations: AIFileOperation[]): void => {
    setFiles(currentFiles => {
      let newFilesState = [...currentFiles];
      let newSelectedFileIdForEditor = selectedFileId;
      let newActivePreviewFileIdForPreview = activePreviewFileId;
      let newOpenFileIdsState = [...openFileIds];

      operations.forEach(op => {
        const opPath = normalizePath(op.path);

        if (op.action === 'create_folder') {
          newFilesState = ensureParentFoldersExist(opPath + '/', newFilesState);
          if (!newFilesState.some(f => normalizePath(f.name) === opPath && f.type === 'folder')) {
            newFilesState.push({ id: generateUniqueId('folder'), name: opPath, type: 'folder', content: '' });
            addConsoleLog('success', `Folder created: ${opPath}`);
          } else {
            addConsoleLog('info', `Folder already exists: ${opPath}`);
          }
        } else if (op.action === 'create_file') {
          newFilesState = ensureParentFoldersExist(opPath, newFilesState);
          const existingFileIndex = newFilesState.findIndex(f => normalizePath(f.name) === opPath && f.type === 'file');
          const newFile: FileItem = { id: generateUniqueId('file'), name: opPath, type: 'file', content: op.content || '' };
          if (existingFileIndex !== -1) {
            newFilesState[existingFileIndex] = newFile;
            addConsoleLog('success', `File updated (create op): ${opPath}`);
          } else {
            newFilesState.push(newFile);
            addConsoleLog('success', `File created: ${opPath}`);
          }
          newSelectedFileIdForEditor = newFile.id;
          if (!newOpenFileIdsState.includes(newFile.id)) {
            newOpenFileIdsState.push(newFile.id);
          }
          if (showPreviewPanelState && newFile.name.match(/\.(html|htm)$/i)) {
            newActivePreviewFileIdForPreview = newFile.id;
          }

        } else if (op.action === 'update_file') {
          const fileIndex = newFilesState.findIndex(f => normalizePath(f.name) === opPath && f.type === 'file');
          if (fileIndex !== -1) {
            newFilesState[fileIndex] = { ...newFilesState[fileIndex], content: op.content || '' };
            addConsoleLog('success', `File updated: ${opPath}`);
            if (!newOpenFileIdsState.includes(newFilesState[fileIndex].id)) {
                newOpenFileIdsState.push(newFilesState[fileIndex].id);
            }
          } else {
            addConsoleLog('warn', `Update operation: File not found at path "${opPath}". Creating it.`);
            newFilesState = ensureParentFoldersExist(opPath, newFilesState);
            const newFileOnUpdate: FileItem = { id: generateUniqueId('file'), name: opPath, type: 'file', content: op.content || '' };
            newFilesState.push(newFileOnUpdate);
            newSelectedFileIdForEditor = newFileOnUpdate.id;
            if (!newOpenFileIdsState.includes(newFileOnUpdate.id)) {
              newOpenFileIdsState.push(newFileOnUpdate.id);
            }
            addConsoleLog('success', `File created (during update op): ${opPath}`);
            if (showPreviewPanelState && newFileOnUpdate.name.match(/\.(html|htm)$/i)) {
              newActivePreviewFileIdForPreview = newFileOnUpdate.id;
            }
          }
        } else if (op.action === 'delete_file') {
          const itemToDelete = newFilesState.find(f => normalizePath(f.name) === opPath);
          if (itemToDelete) {
            if (itemToDelete.type === 'folder') {
              newFilesState = newFilesState.filter(f => !(normalizePath(f.name) === opPath || normalizePath(f.name).startsWith(opPath + '/')));
              newOpenFileIdsState = newOpenFileIdsState.filter(id => !newFilesState.find(f => f.id === id && (normalizePath(f.name) === opPath || normalizePath(f.name).startsWith(opPath + '/'))));
              addConsoleLog('success', `Folder deleted: ${opPath} and its contents`);
            } else {
              newFilesState = newFilesState.filter(f => normalizePath(f.name) !== opPath);
              newOpenFileIdsState = newOpenFileIdsState.filter(id => id !== itemToDelete.id);
              addConsoleLog('success', `File deleted: ${opPath}`);
            }
            if (selectedFileId === itemToDelete.id || (itemToDelete.type === 'folder' && selectedFileId && !newFilesState.find(f=>f.id === selectedFileId))) {
              newSelectedFileIdForEditor = newOpenFileIdsState.length > 0 ? newOpenFileIdsState[newOpenFileIdsState.length - 1] : (newFilesState.find(f => f.type === 'file')?.id || null);
            }
            if (activePreviewFileId === itemToDelete.id || (itemToDelete.type === 'folder' && activePreviewFileId && !newFilesState.find(f => f.id === activePreviewFileId))) {
              newActivePreviewFileIdForPreview = newFilesState.find(f => f.type === 'file' && f.name.match(/\.(html|htm)$/i))?.id || null;
            }
          } else {
             addConsoleLog('warn', `Delete operation: Item not found at path "${opPath}".`);
          }
        }
      });

      const uniqueFilesState: FileItem[] = [];
      const seenPaths = new Set<string>();
      newFilesState.forEach(file => {
        const normPath = normalizePath(file.name);
        if (!seenPaths.has(normPath)) {
          uniqueFilesState.push({...file, name: normPath });
          seenPaths.add(normPath);
        } else {
            const existingIndex = uniqueFilesState.findIndex(uf => normalizePath(uf.name) === normPath);
            if (existingIndex !== -1) {
              if (file.id === selectedFileId && uniqueFilesState[existingIndex].id !== selectedFileId) {
                uniqueFilesState[existingIndex] = {...file, name: normPath};
              } else if (file.type === 'file' && uniqueFilesState[existingIndex].type === 'folder') {
                 uniqueFilesState[existingIndex] = {...file, name: normPath};
              }
            }
        }
      });

      setSelectedFileId(newSelectedFileIdForEditor);
      setActivePreviewFileId(newActivePreviewFileIdForPreview);
      setOpenFileIds(newOpenFileIdsState);
      return uniqueFilesState;
    });
  }, [selectedFileId, activePreviewFileId, openFileIds, ensureParentFoldersExist, addConsoleLog, showPreviewPanelState]);


  const handleSendMessage = useCallback(async (userInput: string, screenshotContext?: ScreenshotContext, isFixAttempt: boolean = false) => {
    const userMessage: Message = {
      id: generateUniqueId('user'),
      text: userInput,
      sender: 'user',
      timestamp: new Date(),
      screenshotDataUrl: screenshotContext?.screenshotDataUrl,
      consoleContextForAI: screenshotContext?.consoleContextForAI,
      isFixAttempt
    };
    setMessages(prev => [...prev, userMessage]);
    setIsGenerating(true); setError(null);
    addConsoleLog('info', `User query${isFixAttempt ? ' (AI Fix)' : ''}: "${userInput.substring(0, 50)}..."${screenshotContext ? ' (with screenshot & console context)' : ''}`);

    const startTime = Date.now();
    try {
      let fileStructureContext = "The project is currently empty.";
      if (files.length > 0) {
        fileStructureContext = "Current project file structure (full paths):\n" + files.map(f => `- ${f.name} (${f.type})`).join('\n');
      }

      let allFilesContent = "\n\n--- Project Files Content ---\n";
      if (files.filter(f => f.type === 'file').length > 0) {
          files.filter(f => f.type ==='file').forEach(f => {
              allFilesContent += `\n-- File: ${f.name} --\n${f.content}\n-- End File: ${f.name} --\n`;
          });
      } else {
          allFilesContent += "No files in the project to display content for.\n";
      }
      allFilesContent += "--- End Project Files Content ---";

      const checkpointFiles = JSON.parse(JSON.stringify(files));

      const aiResponse: AIResponseMessage = await geminiService.generateStructuredResponse(
        userInput,
        fileStructureContext,
        allFilesContent,
        screenshotContext
      );

      const endTime = Date.now();
      const processingTimeSeconds = parseFloat(((endTime - startTime) / 1000).toFixed(2));

      const aiMessage: Message = {
        id: generateUniqueId('assistant'),
        text: aiResponse.explanation,
        sender: 'assistant',
        timestamp: new Date(),
        checkpoint: { files: checkpointFiles },
        fileOperationsApplied: aiResponse.fileOperations || [],
        processingTime: processingTimeSeconds
      };
      setMessages(prev => [...prev, aiMessage]);
      addConsoleLog('success', `AI response received. Explanation: ${aiResponse.explanation.substring(0,50)}... (Took ${processingTimeSeconds}s)`);

      if (aiResponse.fileOperations && aiResponse.fileOperations.length > 0) {
        addConsoleLog('info', `AI applying ${aiResponse.fileOperations.length} file operations.`);
        applyAIFileOperations(aiResponse.fileOperations);
      }

    } catch (e) {
      const endTime = Date.now();
      const processingTimeSeconds = parseFloat(((endTime - startTime) / 1000).toFixed(2));
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Failed to get response from AI: ${errorMessage}`);
      addConsoleLog('error', `AI Error: ${errorMessage} (Took ${processingTimeSeconds}s)`);
      setMessages(prev => [...prev, {
        id: generateUniqueId('error'),
        text: `Error: Could not connect to the AI. ${errorMessage}`,
        sender: 'assistant',
        timestamp: new Date(),
        processingTime: processingTimeSeconds
      }]);
    } finally {
      setIsGenerating(false);
    }
  }, [files, geminiService, applyAIFileOperations, addConsoleLog]);

  const handleFixErrorWithAI = useCallback(async (errorLog: ConsoleMessage) => {
    const currentSelectedFileForEditor = files.find(f => f.id === selectedFileId && f.type === 'file');
    let contextForFix = `\n--- Context: Currently Selected File in Editor (${currentSelectedFileForEditor ? currentSelectedFileForEditor.name : 'None Selected'}) ---\n`;
    contextForFix += currentSelectedFileForEditor ? currentSelectedFileForEditor.content : "No file is currently selected in the editor.";
    contextForFix += "\n--- End Selected File Context ---";

    const recentConsoleLogsText = "\n--- Recent Console Logs (leading to error) ---\n" +
      consoleLogs.slice(-20).map(log => `[${new Date(log.timestamp).toLocaleTimeString()}] [${log.type.toUpperCase()}] ${log.message}`).join('\n') +
      "\n--- End Recent Console Logs ---";

    const fixRequestPrompt = `
Objective: User has requested an AI-assisted fix for an error.
Error Message: "${errorLog.message}"
Timestamp of Error: ${errorLog.timestamp.toISOString()}

Please analyze this error. Consider the following:
1. The error message itself.
2. The content of the currently selected file in the editor (if any, provided below).
3. The recent console logs (provided below).
4. The overall project structure and content of all files (provided in the general context).

Based on your analysis, propose file operations to resolve this issue and provide an explanation of your reasoning and the fix.
${contextForFix}
${recentConsoleLogsText}
`;
    handleSendMessage(fixRequestPrompt, undefined, true);

  }, [files, selectedFileId, consoleLogs, handleSendMessage]);


  const handleUploadCodebase = async () => {
    addConsoleLog('info', 'Attempting to load project from folder using HTML input...');

    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    // @ts-ignore
    input.directory = true;
    input.multiple = true;

    input.onchange = async (event: Event) => {
        const fileInput = event.target as HTMLInputElement;
        if (!fileInput.files || fileInput.files.length === 0) {
            addConsoleLog('info', 'No folder or files selected.');
            return;
        }

        const filesFromInput = Array.from(fileInput.files);
        let processedProjectFiles: FileItem[] = [];
        let firstFileId: string | null = null;
        let readmeFileId: string | null = null;
        let firstHtmlFileId: string | null = null;
        let selectedDirectoryName = "Uploaded Project";

        if (filesFromInput.length > 0) {
            const firstFilePath = (filesFromInput[0] as any).webkitRelativePath || filesFromInput[0].name;
            if (firstFilePath.includes('/')) {
              selectedDirectoryName = firstFilePath.split('/')[0];
            }
        }

        for (const file of filesFromInput) {
            const relativePath = (file as any).webkitRelativePath || file.name;
            if (!relativePath) {
                addConsoleLog('warn', `Skipped file with no relative path: ${file.name}`);
                continue;
            }
            const entryPath = normalizePath(relativePath);

            const pathSegments = entryPath.split('/');
            const dirNameLowerInPath = pathSegments.slice(0, -1).map(seg => seg.toLowerCase());
            if (dirNameLowerInPath.some(seg => ['node_modules', '.git', '.vscode', '.idea', 'build', 'dist', 'target', '__pycache__', '.next', '.nuxt', 'vendor'].includes(seg))) {
                addConsoleLog('info', `Skipped file in ignored directory: ${entryPath}`);
                continue;
            }

            processedProjectFiles = ensureParentFoldersExist(entryPath, processedProjectFiles);

            const commonTextTypes = [
                'text/plain', 'text/html', 'text/css', 'text/javascript', 'application/json', 'text/markdown',
                'application/xml', 'text/xml', 'application/typescript', 'text/x-python', 'text/x-java-source',
                'text/x-csrc', 'text/x-c++src', 'text/x-shellscript', 'application/x-httpd-php', 'text/x-ruby'
            ];
            const knownTextExtensions = ['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.py', '.java', '.rb', '.php', '.go', '.rs', '.swift', '.kt', '.c', '.cpp', '.h', '.hpp', '.cs', '.html', '.htm', '.css', '.scss', '.less', '.xml', '.yaml', '.yml', '.txt', '.sh', '.gitignore', '.env'];
            const fileExt = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;

            const isTextBased = commonTextTypes.includes(file.type) ||
                                file.type.startsWith('text/') ||
                                knownTextExtensions.includes(fileExt) ||
                                !file.type;

            if (!isTextBased) {
                addConsoleLog('warn', `Skipped non-text or binary file: ${entryPath} (type: ${file.type || 'unknown'})`);
                continue;
            }
            if (file.size > 5 * 1024 * 1024) {
                addConsoleLog('warn', `Skipped large file: ${entryPath} (size: ${(file.size / (1024*1024)).toFixed(2)} MB)`);
                continue;
            }

            try {
                const content = await file.text();
                const fileId = generateUniqueId('file');

                const existingFileIndex = processedProjectFiles.findIndex(f => normalizePath(f.name) === entryPath && f.type === 'file');
                const newFileItem: FileItem = { id: fileId, name: entryPath, type: 'file', content: content };

                if (existingFileIndex !== -1) {
                    processedProjectFiles[existingFileIndex] = newFileItem;
                } else {
                    processedProjectFiles.push(newFileItem);
                }

                if (!firstFileId) firstFileId = fileId;
                if (file.name.toLowerCase() === 'readme.md' && !readmeFileId) readmeFileId = fileId;
                if (entryPath.match(/\.(html|htm)$/i) && !firstHtmlFileId) firstHtmlFileId = fileId;

            } catch (readError) {
                 addConsoleLog('warn', `Could not read content of file (may be binary or encoding issue): ${entryPath}. Error: ${(readError as Error).message}`);
            }
        }

        let finalFiles: FileItem[] = [];
        const allPaths = new Set<string>();

        processedProjectFiles.filter(f => f.type === 'folder').forEach(folder => {
            if (!allPaths.has(folder.name)) {
                finalFiles.push(folder);
                allPaths.add(folder.name);
            }
        });

        processedProjectFiles.filter(f => f.type === 'file').forEach(file => {
             if (!allPaths.has(file.name)) {
                finalFiles.push(file);
                allPaths.add(file.name);
            } else {
                const existingIndex = finalFiles.findIndex(ff => ff.name === file.name);
                if (existingIndex !== -1 && finalFiles[existingIndex].type === 'folder') {
                    addConsoleLog('warn', `Conflict: File path ${file.name} matches an existing folder. File not added.`);
                } else if (existingIndex !== -1) {
                    finalFiles[existingIndex] = file;
                } else {
                    finalFiles.push(file);
                }
            }
        });

        setFiles(finalFiles);
        const newSelectedId = readmeFileId || firstHtmlFileId || firstFileId || null;
        setSelectedFileId(newSelectedId);
        setOpenFileIds(newSelectedId ? [newSelectedId] : []);

        if (showPreviewPanelState) {
            const previewTargetId = firstHtmlFileId || (readmeFileId && finalFiles.find(f => f.id === readmeFileId)?.name.match(/\.(html|htm)$/i) ? readmeFileId : null) || (firstFileId && finalFiles.find(f => f.id === firstFileId)?.name.match(/\.(html|htm)$/i) ? firstFileId : null);
            setActivePreviewFileId(previewTargetId);
        } else {
            setActivePreviewFileId(null);
        }
        addConsoleLog('success', `Project loaded from '${selectedDirectoryName}'. ${finalFiles.length} items processed.`);
        setMessages(initialMessages);

        input.value = '';
    };

    input.onerror = (err) => {
        addConsoleLog('error', `Error with file input element: ${ (err as ErrorEvent)?.message || 'Unknown error'}`);
    };

    try {
      input.click();
    } catch (err) {
       addConsoleLog('error', `Error triggering folder selection: ${(err as Error).message}`);
    }
  };


  const handleAddFile = () => {
    let parentFolder = '';
    const selectedItem = files.find(f => f.id === selectedFileId);
    if (selectedItem) {
        if (selectedItem.type === 'folder') {
            parentFolder = selectedItem.name;
        } else {
            parentFolder = selectedItem.name.substring(0, selectedItem.name.lastIndexOf('/'));
        }
    }

    const fileName = prompt(`Enter new file name (e.g., component.tsx or path/to/file.js):`, parentFolder ? `${parentFolder}/newFile.txt` : 'newFile.txt');
    if (fileName) {
      const normalizedFileName = normalizePath(fileName);
      if (files.some(f => normalizePath(f.name) === normalizedFileName && f.type === 'file')) {
        alert("A file with this name already exists in this location.");
        return;
      }
      const newFileId = generateUniqueId('file');
      let newFilesWithParents = ensureParentFoldersExist(normalizedFileName, files);
      const newFileItem: FileItem = { id: newFileId, name: normalizedFileName, type: 'file', content: '' };

      newFilesWithParents = newFilesWithParents.filter(f => !(f.name === newFileItem.name && f.type === 'folder'));

      setFiles([...newFilesWithParents, newFileItem]);
      handleSelectFile(newFileId);
      addConsoleLog('success', `File added: ${normalizedFileName}`);
    }
  };

  const handleAddFolder = () => {
    let parentFolder = '';
    const selectedItem = files.find(f => f.id === selectedFileId);
    if (selectedItem) {
        if (selectedItem.type === 'folder') {
            parentFolder = selectedItem.name;
        } else {
            parentFolder = selectedItem.name.substring(0, selectedItem.name.lastIndexOf('/'));
        }
    }
    const folderName = prompt(`Enter new folder name (e.g., components or path/to/folder):`, parentFolder ? `${parentFolder}/newFolder` : 'newFolder');
    if (folderName) {
      const normalizedFolderName = normalizePath(folderName);
      if (files.some(f => normalizePath(f.name) === normalizedFolderName)) {
        alert("An item with this name already exists in this location.");
        return;
      }
      let newFilesWithParents = ensureParentFoldersExist(normalizedFolderName + '/', files);
      const newFolderItem: FileItem = { id: generateUniqueId('folder'), name: normalizedFolderName, type: 'folder', content: '' };

      if (!newFilesWithParents.some(f => f.name === newFolderItem.name && f.type === 'folder')) {
          newFilesWithParents.push(newFolderItem);
      }
      setFiles(newFilesWithParents);
      addConsoleLog('success', `Folder added: ${normalizedFolderName}`);
    }
  };

  const handleRenameFile = (fileId: string, newFullPath: string) => {
    const normalizedNewPath = normalizePath(newFullPath);
    const oldFile = files.find(f => f.id === fileId);
    if (!oldFile) return;

    if (normalizedNewPath !== oldFile.name && files.some(f => f.id !== fileId && normalizePath(f.name) === normalizedNewPath && f.type === oldFile.type)) {
        alert(`A ${oldFile.type} with the name "${normalizedNewPath}" already exists.`);
        return;
    }

    setFiles(prevFiles => {
        let updatedFiles = prevFiles.map(f =>
            f.id === fileId ? { ...f, name: normalizedNewPath } : f
        );

        if (oldFile.type === 'folder' && oldFile.name !== normalizedNewPath) {
            const oldPathPrefix = oldFile.name + '/';
            const newPathPrefix = normalizedNewPath + '/';
            updatedFiles = updatedFiles.map(f => {
                if (normalizePath(f.name).startsWith(oldPathPrefix)) {
                    return { ...f, name: normalizePath(f.name).replace(oldPathPrefix, newPathPrefix) };
                }
                return f;
            });
             addConsoleLog('info', `Folder renamed from ${oldFile.name} to ${normalizedNewPath}. Child paths updated.`);
        } else if (oldFile.type === 'file') {
             addConsoleLog('success', `File renamed from ${oldFile.name} to ${normalizedNewPath}`);
        }
        updatedFiles = ensureParentFoldersExist(normalizedNewPath + (oldFile.type === 'folder' ? '/' : ''), updatedFiles);
        return updatedFiles.filter((file, index, self) =>
            index === self.findIndex((f) => f.name === file.name && f.type === file.type)
        );
    });
  };

  const handleDeleteFile = (fileId: string) => {
    const fileToDelete = files.find(f => f.id === fileId);
    if (!fileToDelete) return;

    setFiles(prevFiles => {
        let updatedFiles;
        if (fileToDelete.type === 'folder') {
            updatedFiles = prevFiles.filter(f => !(normalizePath(f.name) === normalizePath(fileToDelete.name) || normalizePath(f.name).startsWith(normalizePath(fileToDelete.name) + '/')));
            addConsoleLog('success', `Folder deleted: ${fileToDelete.name} and its contents`);
        } else {
            updatedFiles = prevFiles.filter(f => f.id !== fileId);
            addConsoleLog('success', `File deleted: ${fileToDelete.name}`);
        }

        if (selectedFileId === fileId || (fileToDelete.type === 'folder' && selectedFileId && files.find(f => f.id === selectedFileId)?.name.startsWith(normalizePath(fileToDelete.name) + '/'))) {
            setSelectedFileId(updatedFiles.find(f => f.type === 'file')?.id || null);
        }
        if (activePreviewFileId === fileId || (fileToDelete.type === 'folder' && activePreviewFileId && files.find(f => f.id === activePreviewFileId)?.name.startsWith(normalizePath(fileToDelete.name) + '/'))) {
            setActivePreviewFileId(updatedFiles.find(f => f.type === 'file' && f.name.match(/\.(html|htm)$/i))?.id || null);
        }
        setOpenFileIds(prevOpenIds => prevOpenIds.filter(id => id !== fileId && ! (fileToDelete.type === 'folder' && files.find(f => f.id === id)?.name.startsWith(normalizePath(fileToDelete.name) + '/')) ));

        return updatedFiles;
    });
  };

  const handleRestoreCheckpoint = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message?.checkpoint) {
      setFiles(message.checkpoint.files);
      const stillExistsEditor = message.checkpoint.files.some(f => f.id === selectedFileId);
      const newSelected = stillExistsEditor ? selectedFileId : (message.checkpoint.files.find(f=>f.type==='file')?.id || null);
      setSelectedFileId(newSelected);
      setOpenFileIds(prevOpen => prevOpen.filter(id => message.checkpoint!.files.some(f => f.id === id)));
      if (newSelected && !openFileIds.includes(newSelected)) {
        setOpenFileIds(prev => [...prev, newSelected]);
      }

      const stillExistsPreview = message.checkpoint.files.some(f => f.id === activePreviewFileId);
      const newActivePreview = stillExistsPreview ? activePreviewFileId : (message.checkpoint.files.find(f => f.type === 'file' && f.name.match(/\.(html|htm)$/i))?.id || null);
      setActivePreviewFileId(newActivePreview);

      addConsoleLog('info', 'Restored files from checkpoint.');
    }
  };

  const handleResetConversation = () => {
    setMessages(initialMessages);
    setError(null);
    setIsGenerating(false);
    addConsoleLog('info', 'Conversation reset.');
  };

  const handleCloseTab = (fileIdToClose: string) => {
    setOpenFileIds(prev => prev.filter(id => id !== fileIdToClose));
    if (selectedFileId === fileIdToClose) {
        const remainingOpenFiles = openFileIds.filter(id => id !== fileIdToClose);
        if (remainingOpenFiles.length > 0) {
            setSelectedFileId(remainingOpenFiles[remainingOpenFiles.length - 1]);
        } else {
            setSelectedFileId(null);
        }
    }
    if (activePreviewFileId === fileIdToClose) {
        setActivePreviewFileId(null);
    }
    const closedFileName = files.find(f => f.id === fileIdToClose)?.name || 'Unknown file';
    addConsoleLog('info', `Closed tab for: ${closedFileName}.`);
  };

  let editorColumnWidth = '100%';
  let previewColumnWidth = '0px';

  if (showEditorSectionState && showPreviewPanelState) {
    editorColumnWidth = `calc(100% - ${middleSectionGroupWidth}px - ${isFileExplorerVisibleInMiddleState ? fileExplorerWidth : 0}px)`;
    previewColumnWidth = `${middleSectionGroupWidth}px`;
  } else if (showEditorSectionState) {
    editorColumnWidth = `calc(100% - ${isFileExplorerVisibleInMiddleState ? fileExplorerWidth : 0}px)`;
  } else if (showPreviewPanelState) {
    previewColumnWidth = `calc(100% - ${isFileExplorerVisibleInMiddleState ? fileExplorerWidth : 0}px)`;
    editorColumnWidth = '0px';
  }

  const openFilesForEditor = files.filter(file => openFileIds.includes(file.id));

  return (
    <div ref={appContainerRef} className="h-screen w-screen flex flex-col bg-[#0a0a0a] overflow-hidden">
      <TopHeaderBar
        appTitle={appTitle}
        onEditTitle={handleEditAppTitle}
        showConversationPanel={showConversationPanelState}
        setShowConversationPanel={setShowConversationPanelState}
        showEditorSection={showEditorSectionState}
        setShowEditorSection={effectiveSetShowEditorSection}
        showPreviewPanel={showPreviewPanelState}
        setShowPreviewPanel={setShowPreviewPanelState}
        previewToggleButtonId="tutorial-target-preview-toggle-button"
        isTutorialVisible={showTutorial}
        onToggleTutorial={handleToggleTutorial}
      />
      <main className="flex-grow flex overflow-hidden">
        {showConversationPanelState && (
          <>
            <div id="tutorial-target-conversation-panel" style={{ width: `${conversationWidth}px` }} className="flex-shrink-0 h-full">
              <ConversationPanel
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isGenerating}
                error={error}
                onResetConversation={handleResetConversation}
                onRestoreCheckpoint={handleRestoreCheckpoint}
                onUploadCodebase={handleUploadCodebase}
                uploadButtonId="tutorial-target-upload-button"
                consoleLogs={consoleLogs}
              />
            </div>
            <Splitter onDrag={handleConversationDrag} ariaLabel="Resize Conversation Panel" />
          </>
        )}

        <div className="flex-grow flex flex-col overflow-hidden">
            <div className="flex-grow flex overflow-hidden">
            {showEditorSectionState && isFileExplorerVisibleInMiddleState && (
                <>
                <div id="tutorial-target-file-explorer" style={{ width: `${fileExplorerWidth}px` }} className="flex-shrink-0 h-full">
                    <FileExplorerPanel
                        files={files}
                        selectedFileId={selectedFileId}
                        onSelectFile={handleSelectFile}
                        onAddFile={handleAddFile}
                        onAddFolder={handleAddFolder}
                        onRenameFile={handleRenameFile}
                        onDeleteFile={handleDeleteFile}
                        onToggleVisibility={() => setIsFileExplorerVisibleInMiddleState(false)}
                        onUploadFile={() => alert("File upload via explorer not yet implemented. Use main upload button.")}
                    />
                </div>
                <Splitter onDrag={handleFileExplorerDrag} ariaLabel="Resize File Explorer Panel" />
                </>
            )}

            {showEditorSectionState && (
                 <div id="tutorial-target-editor-panel" style={{ width: editorColumnWidth }} className="flex-shrink-0 h-full overflow-hidden">
                     <EditorPanel
                        openFiles={openFilesForEditor}
                        selectedFile={files.find(f => f.id === selectedFileId && f.type === 'file') || null}
                        onSelectFile={handleSelectFile}
                        onCloseTab={handleCloseTab}
                    />
                 </div>
            )}

            {showEditorSectionState && showPreviewPanelState && (
                <Splitter onDrag={handleMiddleSectionDrag} ariaLabel="Resize Editor/Preview Split" />
            )}

            {showPreviewPanelState && (
                <div id="tutorial-target-preview-panel" style={{ width: previewColumnWidth }} className="flex-shrink-0 h-full bg-[#171717]">
                    <PreviewPanel
                        file={files.find(f => f.id === activePreviewFileId) || null}
                        refreshKey={previewRefreshKey}
                    />
                </div>
            )}

            {!showEditorSectionState && !showPreviewPanelState && isFileExplorerVisibleInMiddleState && (
                <div className="flex-grow flex items-center justify-center text-neutral-500 p-4">
                    Editor and Preview are hidden. Toggle them from the top bar.
                </div>
            )}
             {!showEditorSectionState && !showPreviewPanelState && !isFileExplorerVisibleInMiddleState && (
                <div className="flex-grow flex items-center justify-center text-neutral-500 p-4">
                    All panels in this section are hidden.
                </div>
            )}

            </div>
            {showEditorSectionState && (
                <div id="tutorial-target-console-panel">
                    <ConsolePanel
                    consoleLogs={consoleLogs}
                    onClearConsole={handleClearConsole}
                    onFixErrorWithAI={handleFixErrorWithAI}
                    />
                </div>
            )}
        </div>
      </main>
      {showTutorial && currentTutorialStep < tutorialSteps.length && (
        <TutorialGuide
          step={tutorialSteps[currentTutorialStep]}
          currentStepIndex={currentTutorialStep}
          totalSteps={tutorialSteps.length}
          onNext={handleNextTutorialStep}
          onSkip={handleSkipTutorial}
          targetRect={tutorialTargetRect}
        />
      )}
    </div>
  );
};

export default App;
