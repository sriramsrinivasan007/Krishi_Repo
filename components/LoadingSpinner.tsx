import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="w-16 h-16 border-8 border-primary/20 border-dashed rounded-full animate-spin border-t-primary"></div>
  );
};

export default LoadingSpinner;