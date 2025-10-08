import React, { useState, useCallback } from 'react';
import { generateCropAdvisory } from './services/geminiService';
import type { CropAdvisory, UserInput } from './types';
import AdvisoryDisplay from './components/AdvisoryDisplay';
import InputForm from './components/InputForm';
import LoadingSpinner from './components/LoadingSpinner';
import LoginPage from './components/LoginPage';
import { FarmerIcon } from './components/IconComponents';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [advisory, setAdvisory] = useState<CropAdvisory | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateAdvisory = useCallback(async (userInput: UserInput) => {
    setIsLoading(true);
    setError(null);
    setAdvisory(null);
    try {
      const result = await generateCropAdvisory(userInput);
      setAdvisory(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleReset = () => {
    setAdvisory(null);
    setError(null);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAdvisory(null);
    setError(null);
  };

  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="min-h-screen bg-brand-background text-brand-text-primary font-sans flex flex-col">
      <header className="bg-brand-primary shadow-lg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FarmerIcon />
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">Krishi GPT</h1>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-brand-primary-light text-white font-semibold rounded-lg hover:bg-green-600 transition duration-300 text-sm"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-grow">
        {!advisory && !isLoading && !error && (
          <InputForm onGenerate={handleGenerateAdvisory} />
        )}
        
        {isLoading && (
          <div className="flex flex-col items-center justify-center text-center h-96">
            <LoadingSpinner />
            <p className="text-xl text-brand-primary-light mt-6 font-semibold">Analyzing your farm data...</p>
            <p className="text-md text-brand-text-secondary mt-2">Our AI is crafting the perfect plan for your success.</p>
          </div>
        )}

        {error && (
          <div className="text-center p-8 bg-red-100 border border-red-400 text-red-700 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">An Error Occurred</h2>
            <p className="mb-6">{error}</p>
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition duration-300"
            >
              Try Again
            </button>
          </div>
        )}

        {advisory && !isLoading && (
          <AdvisoryDisplay advisory={advisory} onReset={handleReset} />
        )}
      </main>
      
      <footer className="bg-brand-primary text-white mt-auto py-4">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Krishi GPT. All recommendations are AI-generated and should be cross-verified.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;