import React, { useState, useEffect, lazy, Suspense } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import type { CropAdvisory, GroundingChunk, WeatherForecast, UserInput } from '../types';
import { InfoCard, SectionCard, ListCard } from './CardComponents';
import { CalendarIcon, DropletIcon, CheckCircleIcon, WarningIcon, MarketIcon, BookIcon, DollarSignIcon, SpeakerWaveIcon, GlobeIcon, BugIcon, NutrientIcon, ThermometerIcon, SoilIcon } from './IconComponents';
import { useTranslation } from '../hooks/useTranslation';
import { generateSpeech, getWeatherForecast } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { useTheme } from '../context/ThemeContext';
import LoadingSpinner from './LoadingSpinner';

const WeatherDisplay = lazy(() => import('./WeatherDisplay'));

interface AdvisoryDisplayProps {
  advisory: CropAdvisory;
  sources: GroundingChunk[];
  onReset: () => void;
  userInput: UserInput;
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const parseRangeToAvg = (rangeStr: string): number => {
    if (!rangeStr) return 0;
    // Updated regex to handle potential negative signs
    const numbers = rangeStr.replace(/[₹,A-Za-z]/g, '').split('-').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    if (numbers.length === 0) return 0;
    if (numbers.length === 1) return numbers[0];

    // Handle ranges like "-10000 - 5000"
    if (numbers.length > 2) {
      if (rangeStr.trim().startsWith('-')) {
        return (-numbers[0] + numbers[1]) / 2;
      }
    }
    return (numbers[0] + numbers[1]) / 2;
};


const ProfitabilityChart: React.FC<{ expense: number; revenue: string; profit: string }> = ({ expense, revenue, profit }) => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const revenueAvg = parseRangeToAvg(revenue);
    const profitAvg = parseRangeToAvg(profit);
    const isLoss = profitAvg < 0;

    const data = [
        { 
            name: t('financial_overview'), 
            [t('expense')]: expense, 
            [t('revenue')]: revenueAvg, 
            [t('profit')]: profitAvg 
        },
    ];

    const gridColor = theme === 'dark' ? '#4a5568' : '#e2e8f0'; // gray-700 : gray-300
    const textColor = theme === 'dark' ? '#e2e8f0' : '#4b5563'; // gray-300 : gray-600

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: textColor }} />
                    <YAxis tickFormatter={(value) => `${currencyFormatter.format(value).slice(0, -3)}k`} tick={{ fontSize: 12, fill: textColor }} allowDataOverflow={true} domain={['dataMin - 10000', 'auto']} />
                    <Tooltip 
                        formatter={(value: number) => currencyFormatter.format(value)} 
                        cursor={{ fill: theme === 'dark' ? 'rgba(156, 163, 175, 0.1)' : 'rgba(203, 213, 225, 0.5)' }}
                        contentStyle={{ 
                            backgroundColor: theme === 'dark' ? '#2d3748' : '#ffffff', // gray-800
                            borderColor: theme === 'dark' ? '#4a5568' : '#e2e8f0', // gray-700
                            color: textColor
                        }}
                    />
                    <Legend wrapperStyle={{fontSize: "0.8rem", color: textColor}} />
                    <Bar dataKey={t('expense')} fill="#fb7185" />
                    <Bar dataKey={t('revenue')} fill="#4ade80" />
                    <Bar dataKey={t('profit')} fill={isLoss ? "#ef4444" : "#16a34a"} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

const HarvestTimeline: React.FC<{ duration: string }> = ({ duration }) => {
    const { t } = useTranslation();
    const days = duration.match(/\d+/g)?.map(Number) || [0, 0];
    const endDay = days[1] || days[0] || 0;
    const midDay = Math.floor(endDay / 2);

    return (
        <div className="mt-2 w-full">
            <p className="text-center font-bold text-brand-primary dark:text-green-400 text-2xl mb-4">{duration} {t('days')}</p>
            <div className="relative w-full h-2 bg-green-200 dark:bg-green-800 rounded-full my-2">
                <div className="absolute top-0 left-0 h-2 bg-brand-primary-light rounded-full" style={{ width: '100%' }}></div>
                 {/* Milestones */}
                <div className="absolute top-1/2 left-0 w-4 h-4 -translate-y-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 border-2 border-brand-primary dark:border-green-400 rounded-full"></div>
                <div className="absolute top-1/2 left-1/2 w-4 h-4 -translate-y-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 border-2 border-brand-primary dark:border-green-400 rounded-full"></div>
                <div className="absolute top-1/2 left-full w-4 h-4 -translate-y-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 border-2 border-brand-primary dark:border-green-400 rounded-full"></div>
            </div>
            <div className="relative w-full flex justify-between mt-2 text-xs text-brand-text-secondary dark:text-gray-400 font-medium">
                <span>{t('timeline_day_0')}</span>
                <span>{t('timeline_day_mid', { day: midDay })}</span>
                <span>{t('timeline_day_end', { day: endDay })}</span>
            </div>
        </div>
    );
};


const AdvisoryDisplay: React.FC<AdvisoryDisplayProps> = ({ advisory, sources, onReset, userInput }) => {
  const { t, locale } = useTranslation();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState<boolean>(true);
  
  const { location } = userInput;

  // Weather state
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const formatCurrencyRange = (rangeStr: string | undefined): string => {
    if (!rangeStr) return 'N/A';
    // Regex to find numbers (including negative and with commas) and format them as currency.
    return rangeStr.replace(/-?[\d,]+(\.\d+)?/g, (match) => {
        const num = parseFloat(match.replace(/,/g, ''));
        if (isNaN(num)) return match;
        return currencyFormatter.format(num);
    });
  };

  useEffect(() => {
    const fetchAudio = async () => {
        setIsAudioLoading(true);
        setSpeechError(null);
        setAudioData(null);
        try {
            const summaryText = [
                t('tts_summary_part1', { crop: advisory?.suggested_crop_for_cultivation ?? 'the suggested crop' }),
                t('tts_summary_part2'),
                t('tts_summary_part3', { expense: currencyFormatter.format(advisory?.estimated_total_expense_for_user_land?.amount ?? 0) }),
                t('tts_summary_part4', { profit: advisory?.profitability_projection?.net_profit_for_user_land?.amount_range ?? 'an unknown amount' })
            ].join(' ');

            const base64Audio = await generateSpeech(summaryText, locale);
            setAudioData(base64Audio);
        } catch (err) {
            console.error("Failed to pre-fetch audio summary:", err);
            setSpeechError(err instanceof Error ? err.message : 'Could not prepare audio.');
        } finally {
            setIsAudioLoading(false);
        }
    };

    const fetchWeather = async () => {
        setIsWeatherLoading(true);
        setWeatherError(null);
        try {
            const forecast = await getWeatherForecast(location, locale);
            setWeather(forecast);
        } catch (err) {
             console.error("Failed to fetch weather:", err);
            setWeatherError(err instanceof Error ? err.message : 'Could not load weather data.');
        } finally {
            setIsWeatherLoading(false);
        }
    }

    fetchAudio();
    fetchWeather();
  }, [advisory, locale, t, location]);


  const handleSpeak = async () => {
    if (!audioData || isSpeaking || isAudioLoading) return;
    setIsSpeaking(true);
    setSpeechError(null);
    try {
        // FIX: Handle vendor-prefixed webkitAudioContext for broader browser support.
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const outputAudioContext = new AudioContext({ sampleRate: 24000 });
        const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContext, 24000, 1);
        const source = outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(outputAudioContext.destination);
        source.start();
        source.onended = () => {
            setIsSpeaking(false);
            outputAudioContext.close();
        };
    } catch (err) {
        setSpeechError(err instanceof Error ? err.message : 'Could not play audio.');
        setIsSpeaking(false);
    }
  };
  
  const getButtonText = () => {
      if (isAudioLoading) return t('tts_preparing');
      if (isSpeaking) return t('tts_speaking');
      return t('tts_read_summary');
  };

  const financialAssumptions = `${advisory?.estimated_total_expense_for_user_land?.assumptions ?? ''} ${advisory?.profitability_projection?.farm_gate_price?.assumptions ?? ''}`;
  
  const expenseData = Object.entries(advisory?.estimated_total_expense_for_user_land?.breakdown ?? {})
    .map(([name, value]) => ({
        name: t(`expense_${name}` as any),
        value: value as number,
    }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const maxExpense = expenseData.length > 0 ? expenseData[0].value : 0;
  
  return (
    <div className="space-y-8 animate-fade-in">
      <div 
        className="relative text-center p-12 bg-gradient-to-br from-brand-primary to-brand-primary-light rounded-xl shadow-lg overflow-hidden"
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full filter blur-md"></div>
        <div className="absolute -bottom-12 -left-8 w-48 h-48 bg-white/10 rounded-full filter blur-md"></div>
        <div className="relative z-10">
            <p className="text-lg text-green-100">{t('advisory_title')}</p>
            <h1 className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight my-2 drop-shadow-lg">
              {advisory?.suggested_crop_for_cultivation ?? '...'}
            </h1>
            <div className="flex items-center justify-center space-x-4 mt-4">
                <button
                  onClick={onReset}
                  className="px-5 py-2 text-sm bg-white/90 text-brand-primary font-semibold rounded-lg hover:bg-white transition-colors duration-300"
                >
                {t('advisory_new_button')}
                </button>
                 <button
                    onClick={handleSpeak}
                    disabled={isSpeaking || isAudioLoading || !audioData}
                    className="px-5 py-2 text-sm bg-white/20 text-white font-semibold rounded-lg hover:bg-white/30 backdrop-blur-sm border border-white/30 transition-colors duration-300 flex items-center space-x-2 disabled:bg-gray-400/50 disabled:cursor-not-allowed"
                >
                    <SpeakerWaveIcon />
                    <span>{getButtonText()}</span>
                </button>
            </div>
            {speechError && <p className="text-sm text-red-200 mt-2">{speechError}</p>}
        </div>
      </div>

      <SectionCard title={t('advisory_why_title')} icon={<CheckCircleIcon />}>
        <div className="grid md:grid-cols-3 gap-6">
          <InfoCard title={t('advisory_why_soil')} value={advisory?.why?.soil_suitability ?? 'N/A'} />
          <InfoCard title={t('advisory_why_rotation')} value={advisory?.why?.crop_rotation ?? 'N/A'} />
          <InfoCard title={t('advisory_why_market')} value={advisory?.why?.market_demand ?? 'N/A'} />
        </div>
      </SectionCard>

      {advisory?.soil_health_analysis && (
          <SectionCard title={t('advisory_soil_health_title')} icon={<SoilIcon />}>
              <p className="text-brand-text-secondary dark:text-gray-300 mb-6">{advisory.soil_health_analysis.assessment}</p>
              <div className="space-y-6">
                  {advisory.soil_health_analysis.recommendations_for_improvement?.map((rec, index) => (
                      <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border dark:border-gray-600">
                          <h4 className="font-bold text-lg text-brand-primary dark:text-green-300 mb-4">{rec.practice}</h4>
                          <div className="space-y-4">
                              <div>
                                  <h5 className="font-semibold text-brand-text-primary dark:text-gray-200 mb-2">{t('soil_benefit')}</h5>
                                  <div className="p-3 bg-green-100 dark:bg-green-900/60 rounded-lg">
                                      <p className="text-sm text-green-800 dark:text-green-200">{rec.benefit}</p>
                                  </div>
                              </div>
                              <div>
                                  <h5 className="font-semibold text-brand-text-primary dark:text-gray-200 mb-2">{t('soil_how_to')}</h5>
                                  <ol className="list-decimal list-inside space-y-2 text-sm text-brand-text-secondary dark:text-gray-300 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                                      {rec.how_to.map((step, i) => <li key={i} className="pl-2">{step}</li>)}
                                  </ol>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
               <div className="mt-6">
                  <h4 className="font-semibold text-brand-text-primary dark:text-gray-200 mb-1">{t('soil_organic_link')}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{advisory.soil_health_analysis.organic_farming_link}</p>
              </div>
          </SectionCard>
      )}

      <Suspense fallback={
          <SectionCard title={t('weather_title')} icon={<ThermometerIcon />}>
              <div className="flex justify-center items-center h-48"><LoadingSpinner /></div>
          </SectionCard>
      }>
          <SectionCard title={t('weather_title')} icon={<ThermometerIcon />}>
              {isWeatherLoading && <div className="flex justify-center items-center h-48"><LoadingSpinner /></div>}
              {weatherError && <p className="text-center text-red-500">{weatherError}</p>}
              {weather && !isWeatherLoading && <WeatherDisplay location={location} forecast={weather} />}
          </SectionCard>
      </Suspense>
      
      <SectionCard title={t('advisory_timeline_title')} icon={<CalendarIcon />}>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-full md:w-2/3">
                <HarvestTimeline duration={advisory?.time_to_complete_harvest?.duration_days_range ?? 'N/A'} />
            </div>
            <div className="w-full md:w-1/3">
                 <InfoCard title={t('advisory_timeline_season')} value={advisory?.time_to_complete_harvest?.season_window ?? 'N/A'} />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 italic">{t('note')}: {advisory?.time_to_complete_harvest?.assumptions ?? ''}</p>
      </SectionCard>

      <SectionCard title={t('financial_overview')} icon={<DollarSignIcon />}>
        <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div className="border-r-0 lg:border-r lg:dark:border-gray-600 lg:pr-8">
                <h3 className="text-lg font-semibold text-brand-text-primary dark:text-gray-200 text-center">{t('advisory_expenses_title')}</h3>
                <p className="text-3xl font-bold text-red-500 text-center mb-4">{currencyFormatter.format(advisory?.estimated_total_expense_for_user_land?.amount ?? 0)}</p>
                <div className="space-y-3 mt-4 text-sm">
                    {expenseData.map(({ name, value }) => (
                        <div key={name} className="grid grid-cols-3 gap-2 items-center">
                            <span className="font-medium text-brand-text-secondary dark:text-gray-400 truncate col-span-1">{name}</span>
                            <div className="col-span-2">
                                <div className="flex items-center space-x-2">
                                    <div className="w-full bg-green-100 dark:bg-gray-700 rounded-full h-4">
                                        <div 
                                            className="bg-brand-primary-light h-4 rounded-full" 
                                            style={{ width: maxExpense > 0 ? `${(value / maxExpense) * 100}%` : '0%'}}
                                            role="progressbar"
                                            aria-valuenow={value}
                                            aria-valuemin={0}
                                            aria-valuemax={maxExpense}
                                            aria-label={`${name}: ${currencyFormatter.format(value)}`}
                                        ></div>
                                    </div>
                                    <span className="font-semibold text-brand-text-primary dark:text-gray-200 w-24 text-right">{currencyFormatter.format(value)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div>
                 <h3 className="text-lg font-semibold text-brand-text-primary dark:text-gray-200 text-center">{t('advisory_profit_title')}</h3>
                 <ProfitabilityChart 
                    expense={advisory?.estimated_total_expense_for_user_land?.amount ?? 0} 
                    revenue={advisory?.profitability_projection?.gross_revenue_for_user_land?.amount_range ?? '0'} 
                    profit={advisory?.profitability_projection?.net_profit_for_user_land?.amount_range ?? '0'} 
                 />
            </div>
        </div>
        <div className="mt-8 grid md:grid-cols-3 gap-4">
            <InfoCard title={t('advisory_profit_revenue')} value={formatCurrencyRange(advisory?.profitability_projection?.gross_revenue_for_user_land?.amount_range)} />
            <InfoCard title={t('advisory_profit_net')} value={formatCurrencyRange(advisory?.profitability_projection?.net_profit_for_user_land?.amount_range)} />
            <InfoCard title={t('advisory_profit_roi')} value={advisory?.profitability_projection?.roi_percentage_range ?? 'N/A'} />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 italic">{t('note')}: {financialAssumptions}</p>
      </SectionCard>
      
       <SectionCard title={t('advisory_irrigation_title')} icon={<DropletIcon />}>
          <div className="grid md:grid-cols-3 gap-6">
            <InfoCard title={t('advisory_irrigation_frequency')} value={advisory?.irrigation_schedule?.frequency ?? 'N/A'} />
            <InfoCard title={t('advisory_irrigation_method')} value={advisory?.irrigation_schedule?.method ?? 'N/A'} />
            <InfoCard title={t('advisory_irrigation_seasonal')} value={advisory?.irrigation_schedule?.seasonal_adjustments ?? 'N/A'} />
          </div>
           <p className="text-sm text-gray-600 dark:text-gray-300 bg-green-50 dark:bg-green-900/50 p-3 rounded-md mt-4"><strong>{t('note')}:</strong> {advisory?.irrigation_schedule?.notes ?? ''}</p>
      </SectionCard>

      <SectionCard title={t('advisory_fertilizer_title')} icon={<NutrientIcon />}>
          <div className="space-y-4">
              {/* Header */}
              <div className="hidden md:grid md:grid-cols-12 gap-4 font-bold text-sm text-brand-text-secondary dark:text-gray-400 px-4">
                  <div className="col-span-3">{t('fert_stage')}</div>
                  <div className="col-span-3">{t('fert_fertilizer')}</div>
                  <div className="col-span-2">{t('fert_dosage')}</div>
                  <div className="col-span-4">{t('fert_notes')}</div>
              </div>
              {advisory?.fertilizer_recommendations?.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-2 p-4 bg-green-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-200 dark:border-gray-600">
                      <div className="col-span-1 md:col-span-3 font-semibold text-brand-text-primary dark:text-gray-200">
                          <span className="md:hidden font-bold text-brand-text-secondary dark:text-gray-400">{t('fert_stage')}: </span>{item.stage}
                      </div>
                      <div className="col-span-1 md:col-span-3">
                          <span className="md:hidden font-bold text-brand-text-secondary dark:text-gray-400">{t('fert_fertilizer')}: </span>{item.fertilizer}
                      </div>
                      <div className="col-span-1 md:col-span-2">
                          <span className="md:hidden font-bold text-brand-text-secondary dark:text-gray-400">{t('fert_dosage')}: </span>{item.dosage_per_acre}
                      </div>
                      <div className="col-span-1 md:col-span-4 text-sm text-gray-600 dark:text-gray-300">
                          <span className="md:hidden font-bold text-brand-text-secondary dark:text-gray-400">{t('fert_notes')}: </span>{item.application_notes}
                      </div>
                  </div>
              ))}
          </div>
      </SectionCard>
      
      <SectionCard title={t('advisory_pest_title')} icon={<BugIcon />}>
        <div className="space-y-6">
            {advisory?.pest_and_disease_management?.map((item, index) => (
                <div key={index} className="p-4 bg-red-50 dark:bg-gray-700/50 rounded-lg border border-red-200 dark:border-gray-600">
                    <h4 className="font-bold text-lg text-red-800 dark:text-red-300">{item.name} <span className="text-sm font-normal text-red-600 dark:text-red-400 ml-2">({item.type})</span></h4>
                    <p className="mt-2 text-sm text-brand-text-secondary dark:text-gray-300"><strong>{t('pest_symptoms')}:</strong> {item.symptoms}</p>
                    <div className="mt-3">
                        <p className="text-sm font-semibold text-brand-text-primary dark:text-gray-200 mb-1">{t('pest_management')}:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-brand-text-secondary dark:text-gray-300">
                            {item.management.map((tip, i) => <li key={i}>{tip}</li>)}
                        </ul>
                    </div>
                </div>
            ))}
        </div>
      </SectionCard>


      <div className="grid lg:grid-cols-2 gap-8">
        <ListCard title={t('advisory_practices_title')} items={advisory?.key_practices_for_success ?? []} icon={<CheckCircleIcon />} itemClassName="text-green-800 bg-green-50 dark:bg-green-900/50 dark:text-green-200" />
        <ListCard title={t('advisory_warnings_title')} items={advisory?.warnings_and_constraints ?? []} icon={<WarningIcon />} itemClassName="text-red-800 bg-red-50 dark:bg-red-900/50 dark:text-red-200" />
      </div>

       <SectionCard title={t('advisory_marketplaces_title')} icon={<MarketIcon />}>
          <div className="space-y-4">
             {advisory?.recommended_marketplaces?.map((market, index) => (
               <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
                 <h4 className="font-bold text-brand-text-primary dark:text-gray-200">{market.name} <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">({market.type} - {market.region})</span></h4>
                 <p className="text-sm text-brand-text-secondary dark:text-gray-300">{market.why_suitable}</p>
               </div>
             ))}
          </div>
      </SectionCard>

      <ListCard title={t('advisory_assumptions_title')} items={advisory?.data_gaps_and_assumptions ?? []} icon={<BookIcon />} itemClassName="text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50" />
      
      {sources.length > 0 && (
        <SectionCard title={t('advisory_sources_title')} icon={<GlobeIcon />}>
            <p className="text-brand-text-secondary dark:text-gray-400 mb-4 -mt-2 text-sm">
                {t('advisory_sources_subtitle')}
            </p>
            <div className="space-y-3">
                {sources.map((source, index) => {
                    const chunk = source.web || source.maps;
                    if (!chunk || !chunk.uri) return null;
                    return (
                        <a 
                            key={index} 
                            href={chunk.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                        >
                            <p className="font-semibold text-brand-primary dark:text-green-400 group-hover:underline truncate">{chunk.title}</p>
                            <p className="text-sm text-brand-text-secondary dark:text-gray-400 truncate">{chunk.uri}</p>
                        </a>
                    );
                })}
            </div>
        </SectionCard>
      )}

    </div>
  );
};

export default AdvisoryDisplay;