import React, { useState, useRef, useCallback, useEffect } from 'react';
// Removed `LiveSession` as it is not an exported member of the library.
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { useTranslation } from '../hooks/useTranslation';
import { FarmerIcon, MicrophoneIcon, StopCircleIcon } from './IconComponents';
import { createBlob, decode, decodeAudioData } from '../utils/audioUtils';
import { languages, voiceMap } from '../locales/translations';
import { getAiClient } from '../utils/geminiClient';
import ApiKeyErrorDisplay from './ApiKeyErrorDisplay';

type TranscriptEntry = {
    speaker: 'user' | 'model';
    text: string;
};

interface ConversationProps {
    // onApiError prop removed
}

const Conversation: React.FC<ConversationProps> = () => {
    const { t, locale } = useTranslation();

    const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [transcriptHistory, setTranscriptHistory] = useState<TranscriptEntry[]>(() => {
        try {
            const saved = localStorage.getItem('krishi_ai_conversation_history');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Could not load conversation history:', e);
            return [];
        }
    });
    const [currentInput, setCurrentInput] = useState('');
    const [currentOutput, setCurrentOutput] = useState('');

    // Changed type from `Promise<LiveSession>` to `Promise<any>` because `LiveSession` is not an exported type.
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const nextStartTimeRef = useRef(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    useEffect(() => {
        try {
            localStorage.setItem('krishi_ai_conversation_history', JSON.stringify(transcriptHistory));
        } catch (e) {
            console.error('Could not save conversation history:', e);
        }
    }, [transcriptHistory]);

    const cleanup = useCallback(() => {
        scriptProcessorRef.current?.disconnect();
        mediaStreamSourceRef.current?.disconnect();
        streamRef.current?.getTracks().forEach(track => track.stop());
        inputAudioContextRef.current?.close().catch(console.error);
        outputAudioContextRef.current?.close().catch(console.error);

        scriptProcessorRef.current = null;
        mediaStreamSourceRef.current = null;
        streamRef.current = null;
        inputAudioContextRef.current = null;
        outputAudioContextRef.current = null;
        sessionPromiseRef.current = null;
    }, []);

    const stopConversation = useCallback(async () => {
        console.log("Stopping conversation...");
        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch (e) {
                console.error("Error closing session:", e);
            }
        }
        cleanup();
        setStatus('idle');
    }, [cleanup]);

    useEffect(() => {
        return () => {
            stopConversation();
        };
    }, [stopConversation]);

    const startConversation = async () => {
        setStatus('connecting');
        setError(null);
        setCurrentInput('');
        setCurrentOutput('');

        try {
            const ai = getAiClient();
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
            outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
            nextStartTimeRef.current = 0;
            sourcesRef.current.clear();
            
            const languageName = languages.find(lang => lang.code === locale)?.name || 'English';
            const voiceName = voiceMap[locale] || 'Zephyr';

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        console.log('Session opened.');
                        setStatus('active');
                        mediaStreamSourceRef.current = inputAudioContextRef.current!.createMediaStreamSource(streamRef.current!);
                        scriptProcessorRef.current = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        
                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        
                        mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.outputTranscription) {
                            const text = message.serverContent.outputTranscription.text;
                            setCurrentOutput(prev => prev + text);
                        } else if (message.serverContent?.inputTranscription) {
                            const text = message.serverContent.inputTranscription.text;
                            setCurrentInput(prev => prev + text);
                        }

                        if (message.serverContent?.turnComplete) {
                            const finalInput = currentInput.trim();
                            const finalOutput = currentOutput.trim();
                            if (finalInput || finalOutput) {
                                setTranscriptHistory(prev => [...prev, { speaker: 'user', text: finalInput }, { speaker: 'model', text: finalOutput }]);
                            }
                            setCurrentInput('');
                            setCurrentOutput('');
                        }

                        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio) {
                            const outCtx = outputAudioContextRef.current!;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
                            const source = outCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outCtx.destination);
                            source.addEventListener('ended', () => {
                                sourcesRef.current.delete(source);
                            });
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }

                        if (message.serverContent?.interrupted) {
                            for (const source of sourcesRef.current.values()) {
                                source.stop();
                            }
                            sourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Session error:', e);
                        setError(t('conversation_error_api'));
                        setStatus('error');
                        cleanup();
                    },
                    onclose: () => {
                        console.log('Session closed.');
                        cleanup();
                        setStatus('idle');
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
                    systemInstruction: `You are a friendly and helpful agricultural assistant for Indian farmers. Your name is Mitra. The user's preferred language is ${languageName}. Respond exclusively in ${languageName}. IMPORTANT: Transcribe the user's speech literally in the language they are speaking. Do not transliterate their speech into a different script.`,
                },
            });

        } catch (err) {
            console.error("Failed to start conversation:", err);
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';

            if (errorMessage.includes("API_KEY environment variable is not configured")) {
                setError(t('error_api_key_missing'));
            } else if (errorMessage.includes("API Key") || errorMessage.includes("Requested entity was not found")) {
                setError(t('error_api_key_invalid'));
            } else if (err instanceof DOMException && err.name === "NotAllowedError") {
                 setError(t('conversation_error_mic'));
            } else {
                 setError(errorMessage);
            }
            setStatus('error');
            cleanup();
        }
    };
    
    const renderStatus = () => {
        if (status === 'active') {
            if (currentOutput.length > 0) return t('conversation_ai_speaking');
            return t('conversation_listening');
        }
        if (status === 'connecting') return t('conversation_connecting');
        return '';
    };

    return (
        <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-brand-text-primary dark:text-gray-100">{t('conversation_title')}</h2>
                <p className="text-brand-text-secondary dark:text-gray-400 mt-2">{t('conversation_subtitle')}</p>
            </div>

            <div className="h-96 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border dark:border-gray-700 mb-6 space-y-4">
                {transcriptHistory.map((entry, index) => (
                    <div key={index} className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-3 rounded-xl max-w-lg ${entry.speaker === 'user' ? 'bg-green-100 text-green-900 dark:bg-green-800 dark:text-green-100' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                            <p className="font-bold text-sm mb-1">{entry.speaker === 'user' ? t('conversation_you') : t('conversation_ai')}</p>
                            <p>{entry.text}</p>
                        </div>
                    </div>
                ))}
                 {currentInput && (
                    <div className="flex justify-end">
                        <div className="p-3 rounded-xl max-w-lg bg-green-50 text-green-700 dark:bg-green-900/70 dark:text-green-300 italic">
                             <p>{currentInput}</p>
                        </div>
                    </div>
                 )}
                  {currentOutput && (
                    <div className="flex justify-start">
                         <div className="p-3 rounded-xl max-w-lg bg-gray-100 text-gray-600 dark:bg-gray-700/70 dark:text-gray-400 italic">
                             <p>{currentOutput}</p>
                        </div>
                    </div>
                 )}
            </div>

            <div className="flex flex-col items-center justify-center space-y-4">
                 <p className="h-6 text-brand-primary dark:text-green-400 font-semibold">{renderStatus()}</p>
                {status === 'idle' || status === 'error' ? (
                    <button
                        onClick={startConversation}
                        className="w-48 h-16 bg-brand-primary-light text-white font-bold rounded-full flex items-center justify-center space-x-2 text-lg hover:bg-brand-primary transition-transform transform hover:scale-105"
                    >
                        <MicrophoneIcon className="w-6 h-6" />
                        <span>{t('conversation_start')}</span>
                    </button>
                ) : (
                    <button
                        onClick={stopConversation}
                        className="w-48 h-16 bg-red-600 text-white font-bold rounded-full flex items-center justify-center space-x-2 text-lg hover:bg-red-700 transition-transform transform hover:scale-105"
                    >
                        <StopCircleIcon className="w-6 h-6" />
                        <span>{t('conversation_stop')}</span>
                    </button>
                )}
                {error && (
                    error === t('error_api_key_missing')
                    ? <div className="text-left text-sm mt-4 p-4 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-600">
                        <ApiKeyErrorDisplay smallText={true} />
                      </div>
                    : <p className="text-sm text-red-600 dark:text-red-400 text-center mt-2">{error}</p>
                )}
            </div>
        </div>
    );
};

export default Conversation;