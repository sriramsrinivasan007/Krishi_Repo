import React, { useState, useEffect, lazy, Suspense } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import type { CropAdvisory, GroundingChunk, WeatherForecast, UserInput, Feedback } from '../types';
import { InfoCard, SectionCard, ListCard } from './CardComponents';
import { BellIcon, CalendarIcon, DropletIcon, CheckCircleIcon, WarningIcon, MarketIcon, BookIcon, DollarSignIcon, SpeakerWaveIcon, GlobeIcon, BugIcon, NutrientIcon, ThermometerIcon, SoilIcon, StarIcon } from './IconComponents';
import { useTranslation } from '../hooks/useTranslation';
import { generateSpeech } from '../services/geminiService';
import { saveFeedback } from '../services/feedbackService';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { useTheme } from '../context/ThemeContext';
import LoadingSpinner from './LoadingSpinner';
import FeedbackForm from './FeedbackForm';

const WeatherDisplay = lazy(() => import('./WeatherDisplay'));

interface AdvisoryDisplayProps {
  advisory: CropAdvisory;
  sources: GroundingChunk[];
  onReset: () => void;
  userInput: UserInput;
  weatherForecast: WeatherForecast | null;
  weatherError: string | null;
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const parseRangeToAvg = (rangeStr: string): number => {
    if (!rangeStr) return 0;
    // Use a robust regex to find all numbers, including negative and comma-separated ones.
    const numberMatches = rangeStr.match(/-?[\d,.]+/g);
    if (!numberMatches) return 0;

    const parsedNumbers = numberMatches
        .map(s => parseFloat(s.replace(/,/g, '')))
        .filter(n => !isNaN(n));

    if (parsedNumbers.length === 0) return 0;
    if (parsedNumbers.length === 1) return parsedNumbers[0];

    // Return the average of all found numbers (typically the start and end of a range)
    return parsedNumbers.reduce((acc, val) => acc + val, 0) / parsedNumbers.length;
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

    const gridColor = theme === 'dark' ? 'hsl(var(--border))' : 'hsl(var(--border))';
    const textColor = 'hsl(var(--muted-foreground))';

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: textColor }} />
                    <YAxis tickFormatter={(value) => `${currencyFormatter.format(value).slice(0, -3)}k`} tick={{ fontSize: 12, fill: textColor }} allowDataOverflow={true} domain={['dataMin - 10000', 'auto']} />
                    <Tooltip 
                        formatter={(value: number) => currencyFormatter.format(value)} 
                        cursor={{ fill: 'hsl(var(--accent))' }}
                        contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            borderColor: 'hsl(var(--border))',
                            color: 'hsl(var(--foreground))'
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
            <p className="text-center font-bold text-primary text-2xl mb-4">{duration} {t('days')}</p>
            <div className="relative w-full h-2 bg-muted rounded-full my-2">
                <div className="absolute top-0 left-0 h-2 bg-primary rounded-full" style={{ width: '100%' }}></div>
                 {/* Milestones */}
                <div className="absolute top-1/2 left-0 w-4 h-4 -translate-y-1/2 -translate-x-1/2 bg-background border-2 border-primary rounded-full"></div>
                <div className="absolute top-1/2 left-1/2 w-4 h-4 -translate-y-1/2 -translate-x-1/2 bg-background border-2 border-primary rounded-full"></div>
                <div className="absolute top-1/2 left-full w-4 h-4 -translate-y-1/2 -translate-x-1/2 bg-background border-2 border-primary rounded-full"></div>
            </div>
            <div className="relative w-full flex justify-between mt-2 text-xs text-muted-foreground font-medium">
                <span>{t('timeline_day_0')}</span>
                <span>{t('timeline_day_mid', { day: midDay })}</span>
                <span>{t('timeline_day_end', { day: endDay })}</span>
            </div>
        </div>
    );
};


const AdvisoryDisplay: React.FC<AdvisoryDisplayProps> = ({ advisory, sources, onReset, userInput, weatherForecast, weatherError }) => {
  const { t, locale } = useTranslation();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState<boolean>(true);
  const [isFeedbackSubmitted, setIsFeedbackSubmitted] = useState(false);
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  
  const { location } = userInput;

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

    fetchAudio();
  }, [advisory, locale, t]);


  const handleSpeak = async () => {
    if (!audioData || isSpeaking || isAudioLoading) return;
    setIsSpeaking(true);
    setSpeechError(null);
    try {
        // Handle vendor-prefixed webkitAudioContext for broader browser support.
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

  const handleFeedbackSubmit = async (rating: number, comments: string) => {
    setIsFeedbackSubmitting(true);
    setFeedbackError(null);
    const feedbackData: Feedback = {
      advisoryCrop: advisory.suggested_crop_for_cultivation,
      userInput,
      rating,
      comments,
      submittedAt: new Date().toISOString(),
    };
    try {
        await saveFeedback(feedbackData);
        setIsFeedbackSubmitted(true);
    } catch (err) {
        setFeedbackError(err instanceof Error ? err.message : 'An unknown error occurred while submitting feedback.');
    } finally {
        setIsFeedbackSubmitting(false);
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
    <div className="space-y-8">
      <div 
        className="relative text-center p-12 bg-gradient-to-br from-primary to-green-600 dark:to-primary/80 rounded-3xl shadow-lg overflow-hidden animate-fade-in-up"
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full filter blur-md"></div>
        <div className="absolute -bottom-12 -left-8 w-48 h-48 bg-white/10 rounded-full filter blur-md"></div>
        <div className="relative z-10">
            <p className="text-lg text-primary-foreground/80">{t('advisory_title')}</p>
            <h1 className="text-5xl sm:text-6xl font-extrabold text-primary-foreground tracking-tight my-2 drop-shadow-lg">
              {advisory?.suggested_crop_for_cultivation ?? '...'}
            </h1>
            <div className="flex items-center justify-center space-x-4 mt-4">
                <button
                  onClick={onReset}
                  className="px-5 py-2 text-sm bg-background/90 text-primary font-semibold rounded-lg hover:bg-background transition-colors duration-300"
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

      {userInput.phoneNumber && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center space-x-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="w-8 h-8 text-blue-400 flex-shrink-0">
                <BellIcon />
            </div>
            <div>
                <h3 className="font-semibold text-blue-300">{t('alerts_enabled_title')}</h3>
                <p className="text-sm text-blue-300/80">{t('alerts_enabled_desc', { phone: userInput.phoneNumber })}</p>
            </div>
        </div>
      )}

      <SectionCard title={t('advisory_why_title')} icon={<CheckCircleIcon />} delay="150ms">
        <div className="grid md:grid-cols-3 gap-6">
          <InfoCard title={t('advisory_why_soil')} value={advisory?.why?.soil_suitability ?? 'N/A'} />
          <InfoCard title={t('advisory_why_rotation')} value={advisory?.why?.crop_rotation ?? 'N/A'} />
          <InfoCard title={t('advisory_why_market')} value={advisory?.why?.market_demand ?? 'N/A'} />
        </div>
      </SectionCard>

      {advisory?.soil_health_analysis && (
          <SectionCard title={t('advisory_soil_health_title')} icon={<SoilIcon />} delay="200ms">
              <p className="text-muted-foreground mb-6">{advisory.soil_health_analysis.assessment}</p>
              <div className="space-y-6">
                  {advisory.soil_health_analysis.recommendations_for_improvement?.map((rec, index) => (
                      <div key={index} className="p-4 bg-muted/50 rounded-xl border">
                          <h4 className="font-bold text-lg text-primary mb-4">{rec.practice}</h4>
                          <div className="space-y-4">
                              <div>
                                  <h5 className="font-semibold text-foreground mb-2">{t('soil_benefit')}</h5>
                                  <div className="p-3 bg-green-500/10 rounded-lg">
                                      <p className="text-sm text-green-300">{rec.benefit}</p>
                                  </div>
                              </div>
                              <div>
                                  <h5 className="font-semibold text-foreground mb-2">{t('soil_how_to')}</h5>
                                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground bg-secondary p-3 rounded-lg">
                                      {rec.how_to.map((step, i) => <li key={i} className="pl-2">{step}</li>)}
                                  </ol>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
               <div className="mt-6">
                  <h4 className="font-semibold text-foreground mb-1">{t('soil_organic_link')}</h4>
                  <p className="text-sm text-muted-foreground">{advisory.soil_health_analysis.organic_farming_link}</p>
              </div>
          </SectionCard>
      )}

      <Suspense fallback={
          <SectionCard title={t('weather_title')} icon={<ThermometerIcon />}>
              <div className="flex justify-center items-center h-48"><LoadingSpinner /></div>
          </SectionCard>
      }>
          <SectionCard title={t('weather_title')} icon={<ThermometerIcon />} delay="250ms">
              {weatherError && <p className="text-center text-red-500">{weatherError}</p>}
              {weatherForecast && <WeatherDisplay location={location} forecast={weatherForecast} />}
              {!weatherForecast && !weatherError && (
                 <div className="flex justify-center items-center h-48">
                    <p className="text-muted-foreground">{t('weather_not_available')}</p>
                 </div>
              )}
          </SectionCard>
      </Suspense>
      
      <SectionCard title={t('advisory_timeline_title')} icon={<CalendarIcon />} delay="300ms">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-full md:w-2/3">
                <HarvestTimeline duration={advisory?.time_to_complete_harvest?.duration_days_range ?? 'N/A'} />
            </div>
            <div className="w-full md:w-1/3">
                 <InfoCard title={t('advisory_timeline_season')} value={advisory?.time_to_complete_harvest?.season_window ?? 'N/A'} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4 italic">{t('note')}: {advisory?.time_to_complete_harvest?.assumptions ?? ''}</p>
      </SectionCard>

      <SectionCard title={t('financial_overview')} icon={<DollarSignIcon />} delay="350ms">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div className="border-r-0 lg:border-r lg:border-border lg:pr-8">
                <h3 className="text-lg font-semibold text-foreground text-center">{t('advisory_expenses_title')}</h3>
                <p className="text-3xl font-bold text-red-500 text-center mb-4">{currencyFormatter.format(advisory?.estimated_total_expense_for_user_land?.amount ?? 0)}</p>
                <div className="space-y-3 mt-4 text-sm">
                    {expenseData.map(({ name, value }) => (
                        <div key={name} className="grid grid-cols-3 gap-2 items-center">
                            <span className="font-medium text-muted-foreground truncate col-span-1">{name}</span>
                            <div className="col-span-2">
                                <div className="flex items-center space-x-2">
                                    <div className="w-full bg-muted rounded-full h-4">
                                        <div 
                                            className="bg-primary h-4 rounded-full" 
                                            style={{ width: maxExpense > 0 ? `${(value / maxExpense) * 100}%` : '0%'}}
                                            role="progressbar"
                                            aria-valuenow={value}
                                            aria-valuemin={0}
                                            aria-valuemax={maxExpense}
                                            aria-label={`${name}: ${currencyFormatter.format(value)}`}
                                        ></div>
                                    </div>
                                    <span className="font-semibold text-foreground w-24 text-right">{currencyFormatter.format(value)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div>
                 <h3 className="text-lg font-semibold text-foreground text-center">{t('advisory_profit_title')}</h3>
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
        <p className="text-sm text-muted-foreground mt-4 italic">{t('note')}: {financialAssumptions}</p>
      </SectionCard>
      
       <SectionCard title={t('advisory_irrigation_title')} icon={<DropletIcon />} delay="400ms">
          <div className="grid md:grid-cols-3 gap-6">
            <InfoCard title={t('advisory_irrigation_frequency')} value={advisory?.irrigation_schedule?.frequency ?? 'N/A'} />
            <InfoCard title={t('advisory_irrigation_method')} value={advisory?.irrigation_schedule?.method ?? 'N/A'} />
            <InfoCard title={t('advisory_irrigation_seasonal')} value={advisory?.irrigation_schedule?.seasonal_adjustments ?? 'N/A'} />
          </div>
           <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md mt-4"><strong>{t('note')}:</strong> {advisory?.irrigation_schedule?.notes ?? ''}</p>
      </SectionCard>

      <SectionCard title={t('advisory_fertilizer_title')} icon={<NutrientIcon />} delay="450ms">
          <div className="space-y-4">
              {/* Header */}
              <div className="hidden md:grid md:grid-cols-12 gap-4 font-bold text-sm text-muted-foreground px-4">
                  <div className="col-span-3">{t('fert_stage')}</div>
                  <div className="col-span-3">{t('fert_fertilizer')}</div>
                  <div className="col-span-2">{t('fert_dosage')}</div>
                  <div className="col-span-4">{t('fert_notes')}</div>
              </div>
              {advisory?.fertilizer_recommendations?.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-2 p-4 bg-muted/50 rounded-lg border">
                      <div className="col-span-1 md:col-span-3 font-semibold text-foreground">
                          <span className="md:hidden font-bold text-muted-foreground">{t('fert_stage')}: </span>{item.stage}
                      </div>
                      <div className="col-span-1 md:col-span-3">
                          <span className="md:hidden font-bold text-muted-foreground">{t('fert_fertilizer')}: </span>{item.fertilizer}
                      </div>
                      <div className="col-span-1 md:col-span-2">
                          <span className="md:hidden font-bold text-muted-foreground">{t('fert_dosage')}: </span>{item.dosage_per_acre}
                      </div>
                      <div className="col-span-1 md:col-span-4 text-sm text-muted-foreground">
                          <span className="md:hidden font-bold text-muted-foreground">{t('fert_notes')}: </span>{item.application_notes}
                      </div>
                  </div>
              ))}
          </div>
      </SectionCard>
      
      <SectionCard title={t('advisory_pest_title')} icon={<BugIcon />} delay="500ms">
        <div className="space-y-6">
            {advisory?.pest_and_disease_management?.map((item, index) => (
                <div key={index} className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                    <h4 className="font-bold text-lg text-destructive-foreground/90">{item.name} <span className="text-sm font-normal text-destructive-foreground/70 ml-2">({item.type})</span></h4>
                    <p className="mt-2 text-sm text-muted-foreground"><strong>{t('pest_symptoms')}:</strong> {item.symptoms}</p>
                    <div className="mt-3">
                        <p className="text-sm font-semibold text-foreground mb-1">{t('pest_management')}:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {item.management.map((tip, i) => <li key={i}>{tip}</li>)}
                        </ul>
                    </div>
                </div>
            ))}
        </div>
      </SectionCard>


      <div className="grid lg:grid-cols-2 gap-8">
        <ListCard title={t('advisory_practices_title')} items={advisory?.key_practices_for_success ?? []} icon={<CheckCircleIcon />} itemClassName="text-green-800 bg-green-500/10 dark:text-green-300" delay="550ms" />
        <ListCard title={t('advisory_warnings_title')} items={advisory?.warnings_and_constraints ?? []} icon={<WarningIcon />} itemClassName="text-red-800 bg-red-500/10 dark:text-red-300" delay="600ms" />
      </div>

       <SectionCard title={t('advisory_marketplaces_title')} icon={<MarketIcon />} delay="650ms">
          <div className="space-y-4">
             {advisory?.recommended_marketplaces?.map((market, index) => (
               <div key={index} className="p-4 bg-muted/50 rounded-lg border">
                 <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-bold text-foreground">{market.name} <span className="text-sm font-normal text-muted-foreground ml-2">({market.type} - {market.region})</span></h4>
                        <p className="text-sm text-muted-foreground">{market.why_suitable}</p>
                    </div>
                    {market.phone_number && (
                        <a href={`tel:${market.phone_number}`} className="ml-4 flex-shrink-0 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors">
                            {t('market_phone')}
                        </a>
                    )}
                 </div>
               </div>
             ))}
          </div>
      </SectionCard>

      <ListCard title={t('advisory_assumptions_title')} items={advisory?.data_gaps_and_assumptions ?? []} icon={<BookIcon />} itemClassName="text-muted-foreground bg-muted/50" delay="700ms" />
      
      <SectionCard title={t('feedback_title')} icon={<StarIcon />} delay="750ms">
        {isFeedbackSubmitted ? (
            <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto text-green-500">
                    <CheckCircleIcon />
                </div>
                <h3 className="text-2xl font-bold text-foreground mt-4">{t('feedback_thanks_title')}</h3>
                <p className="text-muted-foreground mt-2">{t('feedback_thanks_desc')}</p>
            </div>
        ) : (
            <>
                <p className="text-muted-foreground -mt-2 mb-4 text-sm">{t('feedback_subtitle')}</p>
                <FeedbackForm onSubmit={handleFeedbackSubmit} isSubmitting={isFeedbackSubmitting} />
                {feedbackError && <p className="text-destructive text-sm mt-2 text-center">{feedbackError}</p>}
            </>
        )}
      </SectionCard>

      {sources.length > 0 && (
        <SectionCard title={t('advisory_sources_title')} icon={<GlobeIcon />} delay="800ms">
            <p className="text-muted-foreground mb-4 -mt-2 text-sm">
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
                            className="block p-3 bg-muted/50 rounded-lg border hover:bg-muted transition-colors group"
                        >
                            {/* Use uri as a fallback for the title, as title can be optional. */}
                            <p className="font-semibold text-primary group-hover:underline truncate">{chunk.title || chunk.uri}</p>
                            <p className="text-sm text-muted-foreground truncate">{chunk.uri}</p>
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