import React from 'react';
import { FiX, FiChevronRight } from 'react-icons/fi';
import { TutorialStep } from '../types';

interface TutorialGuideProps {
  step: TutorialStep;
  currentStepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
  targetRect?: DOMRect | null;
}

export const TutorialGuide: React.FC<TutorialGuideProps> = ({
  step,
  currentStepIndex,
  totalSteps,
  onNext,
  onSkip,
  targetRect,
}) => {
  const popupRef = React.useRef<HTMLDivElement>(null);
  const [style, setStyle] = React.useState<React.CSSProperties>({
    position: 'fixed',
    zIndex: 10000,
    opacity: 0,
    transform: 'scale(0.95)',
    top: '0px',
    left: '0px',
  });

  React.useEffect(() => {
    const calculateAndSetPosition = () => {
      if (!popupRef.current) {
        setStyle({
          position: 'fixed',
          zIndex: 10000,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%) scale(1)',
          opacity: 1,
          transition: 'opacity 300ms ease-in-out, transform 300ms ease-in-out',
        });
        return;
      }

      const popupWidth = popupRef.current.offsetWidth;
      const popupHeight = popupRef.current.offsetHeight;

      let finalLeft: number;
      let finalTop: number;

      const PADDING = 15;

      if (targetRect && step.position && step.position !== 'center') {
        let idealX = 0;
        let idealY = 0;

        switch (step.position) {
          case 'top':
            idealX = targetRect.left + targetRect.width / 2 - popupWidth / 2;
            idealY = targetRect.top - popupHeight - PADDING;
            break;
          case 'bottom':
            idealX = targetRect.left + targetRect.width / 2 - popupWidth / 2;
            idealY = targetRect.bottom + PADDING;
            break;
          case 'left':
            idealX = targetRect.left - popupWidth - PADDING;
            idealY = targetRect.top + targetRect.height / 2 - popupHeight / 2;
            break;
          case 'right':
            idealX = targetRect.right + PADDING;
            idealY = targetRect.top + targetRect.height / 2 - popupHeight / 2;
            break;
          case 'top-left':
            idealX = targetRect.left;
            idealY = targetRect.top - popupHeight - PADDING;
            break;
          case 'top-right':
            idealX = targetRect.right - popupWidth;
            idealY = targetRect.top - popupHeight - PADDING;
            break;
          case 'bottom-left':
            idealX = targetRect.left;
            idealY = targetRect.bottom + PADDING;
            break;
          case 'bottom-right':
            idealX = targetRect.right - popupWidth;
            idealY = targetRect.bottom + PADDING;
            break;
          default:
            idealX = window.innerWidth / 2 - popupWidth / 2;
            idealY = window.innerHeight / 2 - popupHeight / 2;
            break;
        }

        finalLeft = Math.max(PADDING, Math.min(idealX, window.innerWidth - popupWidth - PADDING));
        finalTop = Math.max(PADDING, Math.min(idealY, window.innerHeight - popupHeight - PADDING));

      } else {
        finalLeft = window.innerWidth / 2 - popupWidth / 2;
        finalTop = window.innerHeight / 2 - popupHeight / 2;
        finalLeft = Math.max(PADDING, Math.min(finalLeft, window.innerWidth - popupWidth - PADDING));
        finalTop = Math.max(PADDING, Math.min(finalTop, window.innerHeight - popupHeight - PADDING));
      }

      setStyle({
        position: 'fixed',
        zIndex: 10000,
        left: `${finalLeft}px`,
        top: `${finalTop}px`,
        opacity: 1,
        transform: 'scale(1)',
        transition: 'opacity 300ms ease-in-out, transform 300ms ease-in-out, left 0ms linear, top 0ms linear',
      });
    };

    const timerId = setTimeout(calculateAndSetPosition, 50);

    return () => clearTimeout(timerId);
  }, [step, targetRect]);

  return (
    <>
      <div
        className="tutorial-overlay"
        onClick={onSkip}
        style={{ opacity: style.opacity === 1 ? 1 : 0 }}
      />
      <div
        ref={popupRef}
        style={style}
        className="tutorial-popup p-4 rounded-lg w-full max-w-[260px] sm:max-w-[300px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`tutorial-title-${step.id}`}
        aria-describedby={`tutorial-content-${step.id}`}
      >
        <div className="flex justify-between items-start mb-3">
          <h3 id={`tutorial-title-${step.id}`} className="text-lg font-semibold text-sky-400">
            {step.title}
          </h3>
          <button
            onClick={onSkip}
            className="text-neutral-400 hover:text-neutral-100 p-1 -mt-1 -mr-1 rounded-full focus:outline-none focus:ring-2 focus:ring-sky-500"
            aria-label="Skip tutorial"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <div id={`tutorial-content-${step.id}`} className="text-sm mb-5 leading-relaxed prose prose-sm prose-invert max-w-none">
          {step.content}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-neutral-400">
            Step {currentStepIndex + 1} of {totalSteps}
          </span>
          <button
            onClick={onNext}
            className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-[rgba(35,35,38,0.8)]" // Adjusted offset color for glass
          >
            {currentStepIndex === totalSteps - 1 ? 'Finish' : 'Next'}
            {currentStepIndex < totalSteps - 1 && <FiChevronRight className="w-4 h-4 ml-1 stroke-2" />}
          </button>
        </div>
      </div>
    </>
  );
};