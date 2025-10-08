import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="w-16 h-16 border-8 border-brand-primary-light border-dashed rounded-full animate-spin border-t-transparent"></div>
  );
};

export default LoadingSpinner;