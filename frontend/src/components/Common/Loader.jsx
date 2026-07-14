import React from 'react';

const Loader = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizeClasses[size]} border-vit-sky border-t-vit-blue rounded-full animate-spin`}
        role="status"
        aria-label="loading"
      />
      <span className="text-sm font-medium text-vit-neutral-500 animate-pulse">Loading portal...</span>
    </div>
  );
};

export default Loader;
