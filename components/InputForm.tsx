import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import type { UserInput, Coordinates } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { MapPinIcon, MicrophoneIcon } from './IconComponents';

const LocationPicker = lazy(() => import('./LocationPicker'));

type VoiceField = keyof Omit<UserInput, 'location'>;

interface InputFormProps {
  onGenerate: (data: UserInput, enableThinking: boolean, coordinates: Coordinates | null) => void;
}

const InputForm: React.FC<InputFormProps> = ({ onGenerate }) => {
  const { t, locale } = useTranslation();
  const [formData, setFormData] = useState<UserInput>({
    landSize: '5 acres',
    location: 'Fetching location...',
    soilType: 'Alluvial',
    irrigation: 'Drip Irrigation',
    phoneNumber: '',
  });
  const [enableThinking, setEnableThinking] = useState(false);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  
  // Voice Input State
  const [recordingField, setRecordingField] = useState<VoiceField | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef<any>(null);

  // Cast window to `any` to access non-standard browser APIs for Speech Recognition.
  const SpeechRecognition = typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const newCoords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setCoordinates(newCoords);
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${newCoords.latitude}&lon=${newCoords.longitude}`);
            if (!response.ok) throw new Error('Failed to fetch address from Nominatim');
            const data = await response.json();
            setFormData(prev => ({ ...prev, location: data.display_name || 'Precise location selected' }));
          } catch (e) {
            console.error("Reverse geocoding failed", e);
            setFormData(prev => ({ ...prev, location: 'Precise location selected' }));
          }
        },
        (err) => {
          console.warn(`Geolocation error: ${err.message}`);
          setFormData(prev => ({ ...prev, location: 'Nashik, Maharashtra, India' }));
        }
      );
    } else {
      setFormData(prev => ({ ...prev, location: 'Nashik, Maharashtra, India' }));
    }
  }, []);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEnableThinking(e.target.checked);
  };
  
  const handleToggleVoiceInput = (fieldName: VoiceField) => {
    if (!SpeechRecognition) {
      setVoiceError(t('voice_error_unavailable'));
      return;
    }
    
    if (recordingField === fieldName) {
      recognitionRef.current?.stop();
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = locale;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setRecordingField(fieldName);
      setInterimTranscript('');
      setVoiceError('');
    };

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      
      if (event.results[0].isFinal) {
        setFormData(prev => ({...prev, [fieldName]: transcript.trim() }));
        setInterimTranscript('');
      } else {
        setInterimTranscript(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        setVoiceError(t('voice_error_no_speech'));
      } else if (event.error === 'not-allowed') {
        setVoiceError(t('voice_error_permission'));
      } else {
        setVoiceError(t('voice_error_generic'));
      }
    };
    
    recognition.onend = () => {
      setRecordingField(null);
      recognitionRef.current = null;
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.landSize || !formData.location || !formData.soilType || !formData.irrigation || !formData.phoneNumber) {
      setError(t('error_all_fields_required'));
      return;
    }
    setError(null);
    onGenerate(formData, enableThinking, coordinates);
  };

  const handleLocationSelect = (locationData: any) => {
    setFormData(prev => ({ ...prev, location: locationData.name }));
    setCoordinates(locationData.coords);
    setIsMapOpen(false);
  };

  const inputStyles = "w-full px-4 py-2.5 pr-10 bg-transparent dark:text-gray-200 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring transition duration-300";

  return (
    <>
      <div className="max-w-2xl mx-auto bg-card text-card-foreground p-8 rounded-3xl shadow-lg border">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold">{t('form_title')}</h2>
          <p className="text-muted-foreground mt-2">{t('form_subtitle')}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="landSize" className="block text-sm font-medium text-muted-foreground mb-1">
              {t('form_land_size')}
            </label>
            <div className="relative">
              <input
                type="text"
                name="landSize"
                id="landSize"
                value={formData.landSize}
                onChange={handleChange}
                className={inputStyles}
                placeholder={t('form_land_size_placeholder')}
                required
              />
              <button
                  type="button"
                  onClick={() => handleToggleVoiceInput('landSize')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={t('voice_start_prompt_land_size')}
              >
                  <MicrophoneIcon className={`w-5 h-5 ${recordingField === 'landSize' ? 'text-red-500 animate-pulse' : ''}`} />
              </button>
            </div>
             {recordingField === 'landSize' && (
              <p className="text-sm text-primary mt-1">
                {interimTranscript || t('voice_listening')}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-muted-foreground mb-1">
              {t('form_location')}
            </label>
            <div className="flex items-center space-x-2">
              <input
                  type="text"
                  name="location"
                  id="location"
                  value={formData.location}
                  readOnly
                  className="w-full px-4 py-2.5 bg-muted/50 border border-input rounded-lg cursor-default"
                  placeholder={t('form_location_placeholder')}
              />
              <button
                  type="button"
                  onClick={() => setIsMapOpen(true)}
                  className="px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition duration-300 whitespace-nowrap flex items-center space-x-2"
              >
                  <MapPinIcon className="w-5 h-5" />
                  <span>{t('form_select_on_map')}</span>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="soilType" className="block text-sm font-medium text-muted-foreground mb-1">
              {t('form_soil_type')}
            </label>
            <div className="relative">
              <input
                type="text"
                name="soilType"
                id="soilType"
                value={formData.soilType}
                onChange={handleChange}
                className={inputStyles}
                placeholder={t('form_soil_type_placeholder')}
                required
              />
               <button
                  type="button"
                  onClick={() => handleToggleVoiceInput('soilType')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={t('voice_start_prompt_soil_type')}
              >
                  <MicrophoneIcon className={`w-5 h-5 ${recordingField === 'soilType' ? 'text-red-500 animate-pulse' : ''}`} />
              </button>
            </div>
            {recordingField === 'soilType' && (
              <p className="text-sm text-primary mt-1">
                {interimTranscript || t('voice_listening')}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="irrigation" className="block text-sm font-medium text-muted-foreground mb-1">
              {t('form_irrigation')}
            </label>
            <div className="relative">
              <input
                type="text"
                name="irrigation"
                id="irrigation"
                value={formData.irrigation}
                onChange={handleChange}
                className={inputStyles}
                placeholder={t('form_irrigation_placeholder')}
                required
              />
              <button
                  type="button"
                  onClick={() => handleToggleVoiceInput('irrigation')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={t('voice_start_prompt_irrigation')}
              >
                  <MicrophoneIcon className={`w-5 h-5 ${recordingField === 'irrigation' ? 'text-red-500 animate-pulse' : ''}`} />
              </button>
            </div>
            {recordingField === 'irrigation' && (
              <p className="text-sm text-primary mt-1">
                {interimTranscript || t('voice_listening')}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-muted-foreground mb-1">
              {t('form_phone_number')}
            </label>
            <div className="relative">
              <input
                type="tel"
                name="phoneNumber"
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className={inputStyles}
                placeholder={t('form_phone_number_placeholder')}
                required
              />
              <button
                  type="button"
                  onClick={() => handleToggleVoiceInput('phoneNumber')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={t('voice_start_prompt_phone_number')}
              >
                  <MicrophoneIcon className={`w-5 h-5 ${recordingField === 'phoneNumber' ? 'text-red-500 animate-pulse' : ''}`} />
              </button>
            </div>
             {recordingField === 'phoneNumber' && (
              <p className="text-sm text-primary mt-1">
                {interimTranscript || t('voice_listening')}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{t('form_phone_number_desc')}</p>
          </div>
          
          {voiceError && <p className="text-sm text-destructive">{voiceError}</p>}

          <label htmlFor="enableThinking" className="flex items-center space-x-3 bg-muted/50 p-3 rounded-lg cursor-pointer">
              <div className="relative flex items-center justify-center w-5 h-5">
                  <input
                      type="checkbox"
                      id="enableThinking"
                      name="enableThinking"
                      checked={enableThinking}
                      onChange={handleCheckboxChange}
                      className="appearance-none h-5 w-5 rounded border-2 border-muted-foreground/50 checked:bg-primary checked:border-primary focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-ring transition-colors"
                  />
                  <svg 
                      className={`absolute w-3.5 h-3.5 text-primary-foreground pointer-events-none transition-opacity ${enableThinking ? 'opacity-100' : 'opacity-0'}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                      aria-hidden="true"
                  >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                  </svg>
              </div>
              <div>
                  <span className="font-medium text-foreground">
                      {t('form_thinking_mode')}
                  </span>
                  <p className="text-xs text-muted-foreground">{t('form_thinking_mode_desc')}</p>
              </div>
          </label>
          
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition duration-300 ease-in-out transform hover:scale-105"
            >
              {t('form_submit_button')}
            </button>
          </div>
        </form>
      </div>

      <Suspense fallback={null}>
        <LocationPicker
          isOpen={isMapOpen}
          initialCoords={coordinates ?? undefined}
          onLocationSelect={handleLocationSelect}
          onClose={() => setIsMapOpen(false)}
        />
      </Suspense>
    </>
  );
};

export default InputForm;