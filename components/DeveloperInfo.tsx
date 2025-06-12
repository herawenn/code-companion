import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FiUser, FiGithub, FiMail, FiX } from 'react-icons/fi';
import { FaDiscord } from 'react-icons/fa';

interface DeveloperInfoProps {
  githubUsername: string;
  email: string;
  discordUsername?: string;
  discordUserId?: string;
}

const DeveloperInfo: React.FC<DeveloperInfoProps> = ({
  githubUsername: encodedGithub,
  email: encodedEmail,
  discordUsername: encodedDiscordUsername,
  discordUserId: encodedDiscordUserId,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const decodedInfo = useMemo(() => {
    try {
      return {
        githubUsername: atob(encodedGithub),
        email: atob(encodedEmail),
        discordUsername: encodedDiscordUsername ? atob(encodedDiscordUsername) : undefined,
        discordUserId: encodedDiscordUserId ? atob(encodedDiscordUserId) : undefined,
      };
    } catch (e) {
      console.error("Failed to decode developer info:", e);
      // Fallback to encoded strings if decoding fails, to prevent crashes
      return {
        githubUsername: encodedGithub,
        email: encodedEmail,
        discordUsername: encodedDiscordUsername,
        discordUserId: encodedDiscordUserId,
      };
    }
  }, [encodedGithub, encodedEmail, encodedDiscordUsername, encodedDiscordUserId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        aria-label="Developer Information"
        aria-expanded={isExpanded}
        title="Developer Information"
        className="p-1.5 rounded-lg text-neutral-400 hover:bg-[#3a3a3a] hover:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
      >
        <FiUser className="w-5 h-5" />
      </button>

      {isExpanded && (
        <div
          className="absolute right-0 mt-2 w-64 sm:w-72 bg-[#2c2c2e] border border-neutral-600 rounded-lg shadow-xl p-4 z-50"
          role="dialog"
          aria-labelledby="developer-info-title"
        >
          <div className="flex justify-between items-center mb-3">
            <h3 id="developer-info-title" className="text-md font-semibold text-sky-400">
              Developer Info
            </h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-neutral-400 hover:text-neutral-100 p-1 -mt-1 -mr-1 rounded-full focus:outline-none focus:ring-2 focus:ring-sky-500"
              aria-label="Close developer information"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
          <ul className="space-y-3 text-sm">
            {decodedInfo.githubUsername && (
              <li>
                <a
                  href={`https://github.com/${decodedInfo.githubUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-neutral-200 transition-colors group"
                >
                  <FiGithub className="w-4 h-4 mr-2.5 text-neutral-400 group-hover:text-sky-400 transition-colors flex-shrink-0" />
                  <span className="truncate">GitHub: {decodedInfo.githubUsername}</span>
                </a>
              </li>
            )}
            {decodedInfo.email && (
              <li>
                <a
                  href={`mailto:${decodedInfo.email}`}
                  className="flex items-center text-neutral-200 transition-colors group"
                >
                  <FiMail className="w-4 h-4 mr-2.5 text-neutral-400 group-hover:text-sky-400 transition-colors flex-shrink-0" />
                  <span className="truncate">Email: {decodedInfo.email}</span>
                </a>
              </li>
            )}
            {decodedInfo.discordUsername && decodedInfo.discordUserId && (
              <li>
                <a
                  href={`https://discord.com/users/${decodedInfo.discordUserId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-neutral-200 transition-colors group"
                >
                  <FaDiscord className="w-4 h-4 mr-2.5 text-neutral-400 group-hover:text-sky-400 transition-colors flex-shrink-0" />
                  <span className="truncate">Discord: {decodedInfo.discordUsername}</span>
                </a>
              </li>
            )}
          </ul>
           <p className="text-xs text-neutral-500 mt-4 pt-3 border-t border-neutral-700/60">
            Thanks for checking out the app!
          </p>
        </div>
      )}
    </div>
  );
};

export default DeveloperInfo;
