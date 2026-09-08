export const getHighlightClass = (isActive: boolean) => {
    return isActive
        ? 'relative z-40 after:content-[""] after:absolute after:inset-0 after:ring-2 after:ring-purple-500 after:animate-pulse after:rounded-[inherit] after:pointer-events-none shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all duration-300'
        : 'transition-all duration-300';
};