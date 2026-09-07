import React from 'react';

export interface TutorialProps {
  showTutorial: boolean;
  tutorialStep: number;
  setTutorialStep: React.Dispatch<React.SetStateAction<number>>;
  finishTutorial: () => void;
}

interface PopoverProps extends TutorialProps {
  stepIndex: number;
  text: string;
  arrowPosition?: 'top' | 'bottom' | 'top-right' | 'bottom-left' | 'top-left';
}

export const TutorialPopover: React.FC<PopoverProps> = ({ 
  showTutorial, 
  tutorialStep, 
  setTutorialStep, 
  finishTutorial,
  stepIndex,
  text,
  arrowPosition = 'top'
}) => {
  if (!showTutorial || tutorialStep !== stepIndex) return null;

  // Determinar classes baseadas na posição da seta
  let containerClasses = "z-50 bg-indigo-600 dark:bg-[#8b5cf6] text-white p-5 rounded-xl shadow-2xl transition-all duration-300 animate-in fade-in zoom-in-95 ";
  
  // Mobile: fixed no rodapé. Desktop: absolute atrelado ao componente.
  containerClasses += "fixed bottom-6 left-4 right-4 sm:absolute sm:w-72 sm:max-w-[320px] sm:bottom-auto sm:left-auto sm:right-auto ";

  // Setas ocultas no mobile, visíveis no desktop
  let arrowClasses = "hidden sm:block absolute w-4 h-4 bg-indigo-600 dark:bg-[#8b5cf6] transform rotate-45 ";

  if (arrowPosition === 'top') {
    containerClasses += "sm:mt-4 sm:top-full sm:left-1/2 sm:-translate-x-1/2";
    arrowClasses += "-top-2 left-1/2 -translate-x-1/2";
  } else if (arrowPosition === 'top-right') {
    containerClasses += "sm:mt-4 sm:top-full sm:right-0";
    arrowClasses += "-top-2 right-4";
  } else if (arrowPosition === 'top-left') {
    containerClasses += "sm:mt-4 sm:top-full sm:left-0";
    arrowClasses += "-top-2 left-4";
  } else if (arrowPosition === 'bottom') {
    containerClasses += "mb-4 bottom-full left-1/2 -translate-x-1/2";
    arrowClasses += "-bottom-2 left-1/2 -translate-x-1/2";
  } else if (arrowPosition === 'bottom-left') {
    containerClasses += "mb-4 bottom-full left-0";
    arrowClasses += "-bottom-2 left-4";
  }

  return (
    <div className={containerClasses}>
      <div className={arrowClasses}></div>
      <h4 className="font-bold text-sm mb-1 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.8)]">
        Guia Rápido ({stepIndex}/4)
      </h4>
      <p className="text-xs text-indigo-50 dark:text-purple-100 mb-4 drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.8)] leading-relaxed">
        {text}
      </p>
      
      <div className="flex items-center justify-between relative z-10">
        <button 
          onClick={finishTutorial}
          className="text-[10px] font-semibold text-indigo-200 hover:text-white transition-colors drop-shadow-md"
        >
          Pular Tutorial
        </button>
        
        <div className="flex gap-1.5">
          {stepIndex > 1 && (
            <button 
              onClick={() => setTutorialStep(s => s - 1)}
              className="px-2 py-1 text-[10px] font-semibold bg-indigo-700/50 hover:bg-indigo-700 dark:bg-purple-900/40 dark:hover:bg-purple-900/60 rounded transition-colors shadow-sm"
            >
              Anterior
            </button>
          )}
          {stepIndex < 4 ? (
            <button 
              onClick={() => setTutorialStep(s => s + 1)}
              className="px-2 py-1 text-[10px] font-bold bg-white text-indigo-600 hover:bg-gray-100 dark:text-purple-600 rounded transition-colors shadow-sm"
            >
              Próximo
            </button>
          ) : (
            <button 
              onClick={finishTutorial}
              className="px-2 py-1 text-[10px] font-bold bg-white text-indigo-600 hover:bg-gray-100 dark:text-purple-600 rounded transition-colors shadow-sm"
            >
              Concluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper para adicionar highlight no elemento-alvo
export const getHighlightClass = (isActive: boolean) => {
  return isActive 
    ? 'relative z-40 after:content-[""] after:absolute after:inset-0 after:ring-2 after:ring-purple-500 after:animate-pulse after:rounded-[inherit] after:pointer-events-none shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all duration-300' 
    : 'transition-all duration-300';
};
