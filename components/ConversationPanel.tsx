import React, { useState, useEffect, useRef } from 'react';
import { Message, ScreenshotContext, ConsoleMessage } from '../types';
import { LoadingSpinner }
from '../constants';
import { MdSend, MdInfoOutline, MdAutoAwesome, MdCameraAlt, MdFolderOpen, MdEmojiEmotions } from 'react-icons/md';
import { FiRefreshCw, FiFlag, FiCheckCircle, FiTool } from 'react-icons/fi';

const escapeHtml = (unsafe: string): string => {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
};

const simpleMarkdownToHtml = (markdown: string): string => {
  let html = markdown;

  html = html.replace(/^```(\w*)\s*\n([\s\S]*?)\n```$/gm, (_match, lang, codeContent) => {
    const languageClass = lang ? `language-${lang}` : '';
    return `<pre class="${languageClass}"><code class="${languageClass}">${escapeHtml(codeContent.trim())}</code></pre>`;
  });

  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  let listItemsConverted = false;
  html = html.replace(/^\s*([-*+])\s+(.*)/gm, (_match, _bullet, content) => {
    listItemsConverted = true;
    return `<li>${content}</li>`;
  });

  if (listItemsConverted) {
     html = html.replace(/(<li>.*?<\/li>\s*)+(?=(<br\s*\/?>)?\s*(?:\S|$)(?!<li>))/gs, (match) => {
        return `<ul>${match.trimRight().replace(/<br\s*\/?>\s*$/,'')}</ul>`;
    });
  }

  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?<![a-zA-Z0-9*])\*(?!\s)(.+?)(?<!\s)\*(?![a-zA-Z0-9*])/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

   html = html.replace(/`([^`]+)`/g, (_match, codeContent) => {
    return `<code>${escapeHtml(codeContent)}</code>`;
  });

  return html;
};

const EMOJIS_TO_DISPLAY = ['👍', '👎', '😄', '🎉', '😕', '❤️', '🤔', '👀', '🔥', '💡', '❓', '✅'];


interface ConversationPanelProps {
  messages: Message[];
  onSendMessage: (input: string, screenshotContext?: ScreenshotContext) => void;
  isLoading: boolean;
  error: string | null;
  onResetConversation: () => void;
  onRestoreCheckpoint: (messageId: string) => void;
  onUploadCodebase: () => void;
  uploadButtonId?: string;
  consoleLogs: ConsoleMessage[];
  onRefineFix: (userInitiatingMessageId: string, previousAiMessageId: string) => void;
}

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
  messages,
  onSendMessage,
  isLoading,
  error,
  onResetConversation,
  onRestoreCheckpoint,
  onUploadCodebase,
  uploadButtonId,
  consoleLogs,
  onRefineFix
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [capturedScreenshotDataUrl, setCapturedScreenshotDataUrl] = useState<string | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.querySelectorAll('.copy-code-button-wrapper').forEach(btnWrapper => btnWrapper.remove());
      const codeBlocks = messagesContainerRef.current.querySelectorAll('.conversation-content pre, .conversation-content code:not(pre code)');
      codeBlocks.forEach(block => {
        const isPre = block.tagName === 'PRE';
        const codeElement = isPre ? block.querySelector('code') || block : block;
        const codeText = codeElement.textContent || '';
        if (codeText.trim().length === 0) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'copy-code-button-wrapper';
        const button = document.createElement('button');
        const originalButtonHTML = `<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 16 16" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" style="margin-right: 0.25em;"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"></path><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"></path></svg>Copy`;
        button.innerHTML = originalButtonHTML;
        button.className = 'copy-code-button';
        button.setAttribute('aria-label', 'Copy code');
        button.title = 'Copy code';

        let timeoutId: number | undefined;

        button.onclick = async (e) => {
            e.stopPropagation();
            clearTimeout(timeoutId);
            try {
                await navigator.clipboard.writeText(codeText);
                button.innerHTML = `<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 16 16" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" style="margin-right: 0.25em;"><path fill-rule="evenodd" d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"></path></svg>Copied!`;
                timeoutId = window.setTimeout(() => {
                    button.innerHTML = originalButtonHTML;
                }, 2000);
            } catch (err) {
                button.textContent = 'Failed';
                 timeoutId = window.setTimeout(() => {
                    button.innerHTML = originalButtonHTML;
                }, 2000);
            }
        };
        wrapper.appendChild(button);
        block.appendChild(wrapper);
      });
    }
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node) && !(event.target as HTMLElement).closest('.emoji-toggle-button')) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      let screenshotCtx: ScreenshotContext | undefined = undefined;
      if (capturedScreenshotDataUrl) {
        const consoleLogText = consoleLogs.map(log => `[${new Date(log.timestamp).toLocaleTimeString()}] [${log.type.toUpperCase()}] ${log.message}`).join('\n');
        screenshotCtx = {
          screenshotDataUrl: capturedScreenshotDataUrl,
          consoleContextForAI: consoleLogText
        };
      }
      onSendMessage(input.trim(), screenshotCtx);
      setInput('');
      setCapturedScreenshotDataUrl(null);
      setScreenshotPreview(null);
    }
  };

  const handleCaptureScreenshot = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: "screen" } as any,
        preferCurrentTab: true
      });
      const track = stream.getVideoTracks()[0];
      if (!window.ImageCapture) {
        alert('ImageCapture API is not supported in this browser.');
        track.stop();
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      const imageCapture = new window.ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      track.stop();
      stream.getTracks().forEach(t => t.stop());


      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(bitmap, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        setCapturedScreenshotDataUrl(dataUrl);
        setScreenshotPreview(dataUrl);
      } else {
        throw new Error('Could not get canvas context');
      }
    } catch (err) {
      alert(`Error capturing screenshot: ${(err as Error).message}. Make sure you grant permission and your browser supports ImageCapture.`);
      setCapturedScreenshotDataUrl(null);
      setScreenshotPreview(null);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  };


  return (
    <div className="h-full flex flex-col bg-[#171717] shadow-lg border-r border-[#1F1F1F]">
      <header className="flex items-center justify-between p-3 bg-[#171717] border-b border-[#1F1F1F] flex-shrink-0">
        <div className="flex items-center text-neutral-200">
          <MdAutoAwesome className="w-5 h-5 mr-2 text-sky-400" />
          <span className="font-semibold text-sm">Code Assistant</span>
        </div>
        <button
          onClick={onResetConversation}
          title="Reset Conversation"
          className="p-1 text-neutral-400 hover:bg-[#3a3a3a] hover:text-neutral-100 rounded-md focus:outline-none"
          aria-label="Reset conversation"
          disabled={isLoading}
        >
          <FiRefreshCw className="w-4 h-4" />
        </button>
      </header>

      {error && (
        <div className="p-3 bg-red-700 text-white text-sm flex items-start mx-2 mt-2 rounded">
          <MdInfoOutline className="w-5 h-5 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {screenshotPreview && (
        <div className="p-2 border-b border-[#1F1F1F] bg-[#262626]">
            <p className="text-xs text-neutral-400 mb-1">Screenshot captured (will be sent with next message):</p>
            <img src={screenshotPreview} alt="Screenshot preview" className="max-w-full h-auto max-h-20 rounded border border-neutral-500" />
            <button
                onClick={() => { setScreenshotPreview(null); setCapturedScreenshotDataUrl(null); }}
                className="mt-1 text-xs text-red-400 hover:text-red-300"
            >
                Clear Screenshot
            </button>
        </div>
      )}

      <div ref={messagesContainerRef} className={`flex flex-col justify-end flex-grow p-4 space-y-4 overflow-y-auto scrollbar-thin`}>
        {messages.map((msg, index) => {
           const affectedFilePaths = msg.fileOperationsApplied && msg.fileOperationsApplied.length > 0
            ? [...new Set(msg.fileOperationsApplied.map(op => op.path))]
            : [];

            const prevUserMessage = index > 0 ? messages[index-1] : null;
            const canRefineFix = msg.sender === 'assistant' && prevUserMessage?.sender === 'user' && prevUserMessage.isFixAttempt === true;

          return (
            <div key={msg.id} className="flex flex-col items-center">
                {msg.sender === 'user' ? (
                <div
                    className="w-full max-w-[98%] p-3 rounded-lg shadow bg-[#404040] text-white self-center"
                >
                    {msg.screenshotDataUrl && (
                    <div className="mb-2">
                        <p className="text-xs text-neutral-300 italic mb-1">Screenshot included:</p>
                        <img src={msg.screenshotDataUrl} alt="User screenshot" className="max-w-xs max-h-32 rounded border border-neutral-500" />
                    </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                    <p className="text-xs mt-1 opacity-70 text-right">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                ) : (
                <div className="w-full max-w-[98%] p-3 self-center text-neutral-200">
                    {affectedFilePaths.length > 0 && (
                        <div className="mb-2 pb-2 border-b border-neutral-700/50">
                            <ul className="space-y-1">
                                {affectedFilePaths.map(path => (
                                <li key={path} className="flex items-center text-xs text-neutral-300">
                                    <FiCheckCircle className="w-3.5 h-3.5 mr-1.5 text-green-500 flex-shrink-0" />
                                    <span className="truncate">{path}</span>
                                </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {msg.processingTime !== undefined && (
                        <details className="text-xs text-neutral-400 mb-1.5 thought-details">
                            <summary className="cursor-pointer hover:text-neutral-300">Thought for {msg.processingTime.toFixed(2)} seconds</summary>
                        </details>
                    )}
                    <div
                    className="text-sm whitespace-pre-wrap break-words conversation-content"
                    dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(msg.text) }}
                    />
                    <div className="flex justify-between items-center">
                        <p className="text-xs mt-1 opacity-70">
                            {/* Placeholder for potential future actions like thumbs up/down */}
                        </p>
                        <p className="text-xs mt-1 opacity-70 text-right">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>

                </div>
                )}

                {(msg.sender === 'assistant' && (msg.checkpoint || canRefineFix)) && (
                <div className="mt-2 w-full max-w-[98%] p-2 rounded-md flex items-center justify-between self-center">
                    <div className="flex items-center text-sm text-neutral-300">
                      {msg.checkpoint && <FiFlag className="w-4 h-4 mr-2 text-sky-400" />}
                      {msg.checkpoint && <span>Checkpoint</span>}
                    </div>
                    <div className="flex items-center space-x-2">
                    {msg.checkpoint && (
                      <button
                          onClick={() => onRestoreCheckpoint(msg.id)}
                          className="px-2 py-1 text-xs bg-[#404040] hover:bg-[#525252] text-neutral-200 rounded-md focus:outline-none"
                      >
                          Restore checkpoint
                      </button>
                    )}
                    {canRefineFix && prevUserMessage && (
                        <button
                            onClick={() => onRefineFix(prevUserMessage.id, msg.id)}
                            title="Refine this fix with AI"
                            className="px-2 py-1 text-xs bg-sky-600 hover:bg-sky-500 text-white rounded-md flex items-center focus:outline-none"
                        >
                            <FiTool className="w-3 h-3 mr-1" />
                            Refine Fix
                        </button>
                    )}
                    </div>
                </div>
                )}
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-2 border-t border-[#1F1F1F] bg-[#171717] relative">
        {showEmojiPicker && (
            <div ref={emojiPickerRef} className="absolute bottom-full left-0 mb-1 w-full bg-[#2a2a2a] p-2 rounded-md shadow-lg flex flex-wrap gap-1 border border-[#333333] z-10">
                {EMOJIS_TO_DISPLAY.map(emoji => (
                    <button
                        key={emoji}
                        onClick={() => handleEmojiSelect(emoji)}
                        className="text-lg p-1 hover:bg-[#404040] rounded-md"
                        title={emoji}
                        aria-label={`Insert emoji ${emoji}`}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        )}
        <div className="flex items-center space-x-2 mb-2">
            <button onClick={handleCaptureScreenshot} title="Capture Screenshot & Console Logs" className="chat-action-button">
                <MdCameraAlt className="w-5 h-5" />
            </button>
            <button
                id={uploadButtonId}
                onClick={onUploadCodebase}
                title="Upload Project Folder"
                className="chat-action-button"
            >
                <MdFolderOpen className="w-5 h-5" />
            </button>
            <button onClick={() => setShowEmojiPicker(prev => !prev)} title="Emoji Picker" className="chat-action-button emoji-toggle-button" aria-expanded={showEmojiPicker}>
                <MdEmojiEmotions className="w-5 h-5" />
            </button>
        </div>
        <form onSubmit={handleSubmit}>
            <div className="flex items-center bg-[#262626] rounded-lg p-1">
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask for changes, suggestions, or anything else"
                rows={2}
                className="flex-grow bg-transparent text-neutral-200 p-2 focus:outline-none resize-none placeholder-neutral-400 scrollbar-thin"
                disabled={isLoading}
                onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                }
                }}
            />
            <button
                type="submit"
                disabled={isLoading || !input.trim()}
                aria-label="Send message"
                className="p-2 text-neutral-400 hover:text-neutral-100 disabled:text-neutral-500 disabled:cursor-not-allowed transition-colors focus:outline-none"
            >
                {isLoading ? <LoadingSpinner className="w-6 h-6" /> : <MdSend className="w-6 h-6" />}
            </button>
            </div>
        </form>
      </div>
    </div>
  );
};
