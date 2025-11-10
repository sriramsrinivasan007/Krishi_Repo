import React, { useState, useCallback, lazy, Suspense } from 'react';
import { generateCropAdvisory } from './services/geminiService';
import type { AdvisoryResult, UserInput, User, Coordinates } from './types';
import InputForm from './components/InputForm';
import LoadingSpinner from './components/LoadingSpinner';
import LoginPage from './components/LoginPage';
import { FarmerIcon, ChatBubbleIcon } from './components/IconComponents';
import LanguageSelector from './components/LanguageSelector';
import { useTranslation } from './hooks/useTranslation';
import ThemeToggle from './components/ThemeToggle';

// Lazy-load large components
const AdvisoryDisplay = lazy(() => import('./components/AdvisoryDisplay'));
const Conversation = lazy(() => import('./components/Conversation'));

type View = 'advisory' | 'conversation';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [advisoryResult, setAdvisoryResult] = useState<AdvisoryResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('advisory');
  const { t, locale } = useTranslation();

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleGenerateAdvisory = useCallback(async (userInput: UserInput, enableThinking: boolean, coordinates: Coordinates | null) => {
    setIsLoading(true);
    setError(null);
    setAdvisoryResult(null);
    try {
      const result = await generateCropAdvisory(userInput, locale, enableThinking, coordinates);
      setAdvisoryResult(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  const handleReset = () => {
    setAdvisoryResult(null);
    setError(null);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAdvisoryResult(null);
    setError(null);
    setView('advisory');
  };

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-brand-background dark:bg-gray-900 text-brand-text-primary dark:text-gray-200 font-sans flex flex-col transition-colors duration-300">
      <header className="bg-brand-primary shadow-lg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FarmerIcon />
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">Krishi.AI</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-white hidden sm:block">{t('welcome_user', { name: currentUser.firstName })}</span>
            <ThemeToggle />
            <LanguageSelector />
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-brand-primary-light text-white font-semibold rounded-lg hover:bg-green-600 transition duration-300 text-sm"
            >
              {t('logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-grow">
        <div className="mb-8 flex justify-center">
            <div className="p-1 bg-green-200 dark:bg-green-900/50 rounded-xl inline-flex space-x-1">
                <button 
                    onClick={() => setView('advisory')}
                    className={`px-6 py-2 rounded-lg font-semibold transition-all duration-300 ${view === 'advisory' ? 'bg-white dark:bg-gray-700 text-brand-primary dark:text-white shadow' : 'bg-transparent text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-800/50'}`}
                >
                    {t('tab_advisory')}
                </button>
                 <button 
                    onClick={() => setView('conversation')}
                    className={`px-6 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2 ${view === 'conversation' ? 'bg-white dark:bg-gray-700 text-brand-primary dark:text-white shadow' : 'bg-transparent text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-800/50'}`}
                >
                    <ChatBubbleIcon />
                    <span>{t('tab_conversation')}</span>
                </button>
            </div>
        </div>

        <Suspense fallback={
            <div className="flex flex-col items-center justify-center text-center h-96">
                <LoadingSpinner />
            </div>
        }>
            {view === 'advisory' && (
              <>
                {!advisoryResult && !isLoading && !error && (
                  <InputForm onGenerate={handleGenerateAdvisory} />
                )}
                
                {isLoading && (
                  <div className="flex flex-col items-center justify-center text-center h-96">
                    <LoadingSpinner />
                    <p className="text-xl text-brand-primary-light mt-6 font-semibold">{t('loading_title')}</p>
                    <p className="text-md text-brand-text-secondary dark:text-gray-400 mt-2">{t('loading_subtitle')}</p>
                  </div>
                )}

                {error && (
                  <div className="text-center p-8 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 rounded-lg shadow-md">
                    <h2 className="text-2xl font-bold mb-4">{t('error_title')}</h2>
                    <p className="mb-6">{error}</p>
                    <button
                      onClick={handleReset}
                      className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition duration-300"
                    >
                      {t('try_again')}
                    </button>
                  </div>
                )}

                {advisoryResult && !isLoading && (
                  <AdvisoryDisplay advisory={advisoryResult.advisory} sources={advisoryResult.sources} onReset={handleReset} />
                )}
              </>
            )}

            {view === 'conversation' && (
                <Conversation />
            )}
        </Suspense>

      </main>
      
      <footer className="bg-brand-primary text-white mt-auto py-4">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} {t('footer_text')}</p>
        </div>
      </footer>
    </div>
  );
};

export default App;