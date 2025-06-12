import React from 'react';
import { MdChat, MdCode, MdPreview, MdSchool } from 'react-icons/md';
import { FiEdit2 } from 'react-icons/fi';
import DeveloperInfo from './DeveloperInfo';

interface TopHeaderBarProps {
  appTitle: string;
  onEditTitle: () => void;
  showConversationPanel: boolean;
  setShowConversationPanel: (show: boolean) => void;
  showEditorSection: boolean;
  setShowEditorSection: (show: boolean) => void;
  showPreviewPanel: boolean;
  setShowPreviewPanel: (show: boolean) => void;
  previewToggleButtonId?: string;
  isTutorialVisible: boolean;
  onToggleTutorial: () => void;
}

const PanelToggleButton: React.FC<{
  label: string;
  Icon: React.ElementType;
  isPanelVisible: boolean;
  togglePanelVisibility: () => void;
  buttonId?: string;
}> = ({ label, Icon, isPanelVisible, togglePanelVisibility, buttonId }) => (
  <button
    id={buttonId}
    onClick={togglePanelVisibility}
    aria-label={`Toggle ${label} Panel`}
    aria-pressed={isPanelVisible}
    title={`Toggle ${label} Panel`}
    className={`p-1.5 rounded-lg transition-colors duration-150 ease-in-out focus:outline-none
      ${isPanelVisible
        ? 'bg-[#3a3a3a] text-neutral-100'
        : 'text-neutral-400 hover:bg-[#3a3a3a] hover:text-neutral-100'
      }`}
  >
    <Icon className="w-5 h-5" />
  </button>
);

export const TopHeaderBar: React.FC<TopHeaderBarProps> = ({
  appTitle, onEditTitle,
  showConversationPanel, setShowConversationPanel,
  showEditorSection, setShowEditorSection,
  showPreviewPanel, setShowPreviewPanel,
  previewToggleButtonId,
  isTutorialVisible, onToggleTutorial,
}) => {
  return (
    <header className="p-2 flex items-center justify-between bg-[#262626] border-b border-[#1F1F1F] text-neutral-100 h-[41px]">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold text-neutral-100 mr-1.5 whitespace-nowrap">{appTitle}</h1>
        <button
          onClick={onEditTitle}
          aria-label="Edit assistant name"
          title="Edit assistant name"
          className="p-1 rounded-md text-neutral-400 hover:bg-[#3a3a3a] hover:text-neutral-100 focus:outline-none"
        >
          <FiEdit2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-grow flex justify-center">
        <div className="flex items-center space-x-1.5">
            <PanelToggleButton
            label="Conversation"
            Icon={MdChat}
            isPanelVisible={showConversationPanel}
            togglePanelVisibility={() => setShowConversationPanel(!showConversationPanel)}
            />
            <PanelToggleButton
            label="Editor"
            Icon={MdCode}
            isPanelVisible={showEditorSection}
            togglePanelVisibility={() => setShowEditorSection(!showEditorSection)}
            />
            <PanelToggleButton
            label="Preview"
            Icon={MdPreview}
            isPanelVisible={showPreviewPanel}
            togglePanelVisibility={() => setShowPreviewPanel(!showPreviewPanel)}
            buttonId={previewToggleButtonId}
            />
        </div>
      </div>

      <div className="flex items-center space-x-1.5">
        <PanelToggleButton
            label="Tutorial"
            Icon={MdSchool}
            isPanelVisible={isTutorialVisible}
            togglePanelVisibility={onToggleTutorial}
            buttonId="tutorial-toggle-button"
        />
        <DeveloperInfo
          githubUsername="aGVyYXdlbm4="
          email="YWxleEBmZWFyLnB3"
          discordUsername="aGVyYXdlbm4="
          discordUserId="MTE0MzM1MDQ2ODE0NDI3NTU3OA=="
        />
      </div>
    </header>
  );
};
