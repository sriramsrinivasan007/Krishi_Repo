import React, { useState, useCallback, lazy, Suspense, useEffect } from 'react';
import type { AdvisoryResult, UserInput, User, Coordinates } from './types';
import InputForm from './components/InputForm';
import LoadingSpinner from './components/LoadingSpinner';
import LoadingScreen from './components/LoadingScreen';
import LoginPage from './components/LoginPage';
import { FarmerIcon, ChatBubbleIcon } from './components/IconComponents';
import LanguageSelector from './components/LanguageSelector';
import { useTranslation } from './hooks/useTranslation';
import ThemeToggle from './components/ThemeToggle';
import { generateCropAdvisory } from './services/geminiService';
import { sendSmsNotification } from './services/notificationService';

// Lazy-load large components
const AdvisoryDisplay = lazy(() => import('./components/AdvisoryDisplay'));
const Conversation = lazy(() => import('./components/Conversation'));

type View = 'advisory' | 'conversation';
type Toast = { message: string; type: 'success' | 'error' | 'info' };

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [advisoryResult, setAdvisoryResult] = useState<AdvisoryResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('advisory');
  const [lastInput, setLastInput] = useState<{userInput: UserInput, coordinates: Coordinates | null} | null>(null);
  const { t, locale } = useTranslation();
  const [isKeyReady, setIsKeyReady] = useState<boolean>(false);
  const [toast, setToast] = useState<Toast | null>(null);

  // Effect to auto-hide the toast notification
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000); // Hide after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const checkApiKey = async () => {
        if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
            setIsKeyReady(true);
        }
    };
    if (currentUser) {
        checkApiKey();
    }
  }, [currentUser]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };
  
  const resetApiKeyStatus = () => {
      setIsKeyReady(false);
  };

  const handleGenerateAdvisory = useCallback(async (userInput: UserInput, enableThinking: boolean, coordinates: Coordinates | null) => {
    // Asynchronously send a welcome notification via the mock SMS service
    if (currentUser) {
        const message = t('welcome_notification', { name: currentUser.firstName });
        sendSmsNotification(userInput.phoneNumber, message)
            .then(response => {
                setToast({ message: response.message, type: 'success' });
            })
            .catch(error => {
                console.error("SMS Notification Error:", error);
                setToast({ message: error.message || 'Failed to send notification.', type: 'error' });
            });
    }
      
    setIsLoading(true);
    setError(null);
    setAdvisoryResult(null);
    setLastInput({ userInput, coordinates });
    try {
      const result = await generateCropAdvisory(userInput, locale, enableThinking, coordinates);
      setAdvisoryResult(result);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      if (errorMessage.includes("API Key") || errorMessage.includes("Requested entity was not found.")) {
          setError("Your API Key seems to be invalid. Please select a valid key to continue.");
          resetApiKeyStatus();
      } else {
          setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [locale, currentUser, t]);

  const handleReset = () => {
    setAdvisoryResult(null);
    setError(null);
    setLastInput(null);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAdvisoryResult(null);
    setError(null);
    setLastInput(null);
    setView('advisory');
    setIsKeyReady(false);
  };

  const handleSelectKey = async () => {
      if (window.aistudio) {
          await window.aistudio.openSelectKey();
          // Assume success to avoid race conditions.
          setIsKeyReady(true);
      }
  };

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const Header = () => (
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
  );

  const Footer = () => (
      <footer className="bg-brand-primary text-white mt-auto py-4">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} {t('footer_text')}</p>
        </div>
      </footer>
  );
  
  if (!isKeyReady) {
      return (
          <div className="min-h-screen bg-brand-background dark:bg-gray-900 text-brand-text-primary dark:text-gray-200 font-sans flex flex-col transition-colors duration-300">
              <Header />
              <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-grow flex items-center justify-center">
                  <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-lg">
                      <h2 className="text-2xl font-bold text-brand-text-primary dark:text-gray-100 mb-4">{t('api_key_required_title')}</h2>
                      <p className="text-brand-text-secondary dark:text-gray-400 mb-6">
                          {t('api_key_required_desc')}
                      </p>
                      <button
                          onClick={handleSelectKey}
                          className="w-full bg-brand-primary-light text-white font-bold py-3 px-4 rounded-lg hover:bg-brand-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition duration-300 ease-in-out transform hover:scale-105"
                      >
                          {t('api_key_required_button')}
                      </button>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                        {t('api_key_required_note_1')}
                        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-primary">
                            {t('api_key_required_note_link')}
                        </a>
                        {t('api_key_required_note_2')}
                      </p>
                  </div>
              </main>
              <Footer />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-brand-background dark:bg-gray-900 text-brand-text-primary dark:text-gray-200 font-sans flex flex-col transition-colors duration-300">
      <Header />

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
                
                {isLoading && <LoadingScreen />}

                {error && (
                  <div className="text-center p-8 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 rounded-lg shadow-md">
                    <h2 className="text-2xl font-bold mb-4">{t('error_title')}</h2>
                    <p className="mb-6">{error}</p>
                    <button
                      onClick={isKeyReady ? handleReset : handleSelectKey}
                      className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition duration-300"
                    >
                      {isKeyReady ? t('try_again') : 'Select Another Key'}
                    </button>
                  </div>
                )}

                {advisoryResult && lastInput && !isLoading && (
                  <AdvisoryDisplay 
                    advisory={advisoryResult.advisory} 
                    sources={advisoryResult.sources} 
                    onReset={handleReset}
                    userInput={lastInput.userInput}
                  />
                )}
              </>
            )}

            {view === 'conversation' && (
                <Conversation onApiError={resetApiKeyStatus} />
            )}
        </Suspense>

      </main>
      
      <Footer />
      
      {/* Toast Notification */}
      {toast && (
        <div
          role="alert"
          className={`fixed bottom-8 right-8 z-50 p-4 rounded-lg shadow-2xl text-white font-semibold transition-opacity duration-300 ${
            toast.type === 'success' ? 'bg-brand-primary' : 'bg-red-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-4 -mr-1 bg-transparent rounded-full p-1 hover:bg-white/20 transition-colors"
              aria-label="Close notification"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;