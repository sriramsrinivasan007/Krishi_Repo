import React, { useState, useCallback, lazy, Suspense, useEffect } from 'react';
import type { AdvisoryResult, UserInput, User, Coordinates, WeatherForecast } from './types';
import InputForm from './components/InputForm';
import LoadingSpinner from './components/LoadingSpinner';
import LoadingScreen from './components/LoadingScreen';
import LoginPage from './components/LoginPage';
import { FarmerIcon, ChatBubbleIcon } from './components/IconComponents';
import LanguageSelector from './components/LanguageSelector';
import { useTranslation } from './hooks/useTranslation';
import ThemeToggle from './components/ThemeToggle';
import { generateCropAdvisory, getWeatherForecast } from './services/geminiService';
import { sendSmsNotification } from './services/notificationService';
import ApiKeyErrorDisplay from './components/ApiKeyErrorDisplay';

// Lazy-load large components
const AdvisoryDisplay = lazy(() => import('./components/AdvisoryDisplay'));
const Conversation = lazy(() => import('./components/Conversation'));

type View = 'advisory' | 'conversation';
type Toast = { message: string; type: 'success' | 'error' | 'info' };

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [advisoryResult, setAdvisoryResult] = useState<AdvisoryResult | null>(null);
  const [weatherForecast, setWeatherForecast] = useState<WeatherForecast | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [view, setView] = useState<View>('advisory');
  const [lastInput, setLastInput] = useState<{userInput: UserInput, coordinates: Coordinates | null} | null>(null);
  const { t, locale } = useTranslation();
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

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleGenerateAdvisory = useCallback(async (userInput: UserInput, enableThinking: boolean, coordinates: Coordinates | null) => {
    // Asynchronously send a welcome notification via the mock SMS service
    if (currentUser) {
        sendSmsNotification(userInput.phoneNumber, t('welcome_notification', { name: currentUser.firstName }))
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
    setWeatherForecast(null);
    setWeatherError(null);
    setLastInput({ userInput, coordinates });
    try {
      const advisoryPromise = generateCropAdvisory(userInput, locale, enableThinking, coordinates);
      const weatherPromise = getWeatherForecast(userInput.location, locale);

      const [advisorySettled, weatherSettled] = await Promise.allSettled([advisoryPromise, weatherPromise]);
      
      if (advisorySettled.status === 'fulfilled') {
        setAdvisoryResult(advisorySettled.value);
      } else {
        // If advisory fails, we throw the error to be caught by the main catch block
        throw advisorySettled.reason;
      }

      if (weatherSettled.status === 'fulfilled') {
        setWeatherForecast(weatherSettled.value);
      } else {
        console.error("Failed to fetch weather forecast:", weatherSettled.reason);
        setWeatherError(t('error_weather_fetch'));
      }

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      // FIX: Updated environment variable name from VITE_API_KEY to API_KEY to align with guidelines.
      if (errorMessage.includes("API_KEY environment variable is not configured")) {
          setError(t('error_api_key_missing'));
      } else if (errorMessage.includes("API Key") || errorMessage.includes("Requested entity was not found.")) {
          setError(t('error_api_key_invalid'));
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
    setWeatherForecast(null);
    setWeatherError(null);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAdvisoryResult(null);
    setError(null);
    setLastInput(null);
    setView('advisory');
  };

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const Header = () => (
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-primary p-2 rounded-lg">
              <FarmerIcon />
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-wide">Krishi.AI</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-foreground hidden sm:block font-medium">{t('welcome_user', { name: currentUser.firstName })}</span>
            <ThemeToggle />
            <LanguageSelector />
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-muted transition duration-300 text-sm"
            >
              {t('logout')}
            </button>
          </div>
        </div>
      </header>
  );

  const Footer = () => (
      <footer className="bg-muted text-muted-foreground mt-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} {t('footer_text')}</p>
        </div>
      </footer>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-grow">
        <div className="mb-8 flex justify-center">
            <div className="p-1 bg-muted rounded-xl inline-flex space-x-1">
                <button 
                    onClick={() => setView('advisory')}
                    className={`px-6 py-2 rounded-lg font-semibold transition-all duration-300 ${view === 'advisory' ? 'bg-background text-primary shadow' : 'bg-transparent text-muted-foreground hover:bg-background/50'}`}
                >
                    {t('tab_advisory')}
                </button>
                 <button 
                    onClick={() => setView('conversation')}
                    className={`px-6 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2 ${view === 'conversation' ? 'bg-background text-primary shadow' : 'bg-transparent text-muted-foreground hover:bg-background/50'}`}
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
                  <div className="text-center p-8 bg-destructive/10 border border-destructive/20 text-destructive-foreground rounded-2xl shadow-md">
                    <h2 className="text-2xl font-bold mb-4">{t('error_title')}</h2>
                    {error === t('error_api_key_missing') ? (
                        <ApiKeyErrorDisplay />
                    ) : (
                        <p className="mb-6">{error}</p>
                    )}
                    <button
                      onClick={handleReset}
                      className="mt-6 px-6 py-2 bg-destructive text-destructive-foreground font-semibold rounded-lg hover:bg-destructive/90 transition duration-300"
                    >
                      {t('try_again')}
                    </button>
                  </div>
                )}

                {advisoryResult && lastInput && !isLoading && (
                  <AdvisoryDisplay 
                    advisory={advisoryResult.advisory} 
                    sources={advisoryResult.sources} 
                    onReset={handleReset}
                    userInput={lastInput.userInput}
                    weatherForecast={weatherForecast}
                    weatherError={weatherError}
                  />
                )}
              </>
            )}

            {view === 'conversation' && (
                <Conversation />
            )}
        </Suspense>

      </main>
      
      <Footer />
      
      {/* Toast Notification */}
      {toast && (
        <div
          role="alert"
          className={`fixed bottom-8 right-8 z-50 p-4 rounded-xl shadow-2xl text-primary-foreground font-semibold transition-opacity duration-300 ${
            toast.type === 'success' ? 'bg-primary' : 'bg-destructive'
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