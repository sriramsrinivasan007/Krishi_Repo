import React from 'react';
import type { WeatherForecast } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { SunIcon, PartlyCloudyIcon, CloudIcon, CloudRainIcon, CloudLightningIcon, SnowIcon, WindIcon, WarningIcon } from './IconComponents';

interface WeatherDisplayProps {
  location: string;
  forecast: WeatherForecast;
}

const getWeatherIcon = (iconName: string, className = "w-16 h-16") => {
    switch(iconName) {
        case 'Sunny': return <SunIcon className={`${className} text-yellow-500`} />;
        case 'PartlyCloudy': return <PartlyCloudyIcon className={`${className} text-gray-500`} />;
        case 'Cloudy': return <CloudIcon className={`${className} text-gray-400`} />;
        case 'Rain': return <CloudRainIcon className={`${className} text-blue-500`} />;
        case 'Thunderstorm': return <CloudLightningIcon className={`${className} text-purple-500`} />;
        case 'Snow': return <SnowIcon className={`${className} text-cyan-400`} />;
        case 'Windy': return <WindIcon className={`${className} text-slate-500`} />;
        default: return <CloudIcon className={`${className} text-gray-400`} />;
    }
};

const WeatherDisplay: React.FC<WeatherDisplayProps> = ({ location, forecast }) => {
  const { t } = useTranslation();
  const { current, daily } = forecast;

  const potentialRisks = daily.slice(0, 3).filter(day => 
    ['Rain', 'Thunderstorm', 'Snow'].includes(day.icon)
  );

  const truncateLocation = (loc: string) => {
    const parts = loc.split(',');
    // Return the first 2-3 significant parts of the location for brevity
    if (parts.length > 3) {
      return `${parts[0].trim()}, ${parts[1].trim()}, ${parts[2].trim()}`;
    }
    return loc;
  }

  return (
    <div className="text-foreground">
      {potentialRisks.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-300/90 text-sm flex items-start space-x-3">
              <div className="w-5 h-5 flex-shrink-0 mt-0.5">
                  <WarningIcon />
              </div>
              <div>
                <strong>{t('weather_alert_title')}:</strong> {t('weather_alert_desc', { days: potentialRisks.map(d => d.day).join(', ') })}
              </div>
          </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Current Weather */}
        <div className="flex flex-col items-center text-center p-4 bg-muted/50 rounded-lg">
           <p className="font-semibold text-muted-foreground">{t('weather_current_conditions')}</p>
           <p className="text-sm text-muted-foreground/80 truncate mb-2" title={location}>{truncateLocation(location)}</p>
           <div className="flex items-center space-x-4">
              <div className="w-24 h-24">
                 {getWeatherIcon(current.icon, "w-full h-full")}
              </div>
              <div>
                  <p className="text-6xl font-bold">{Math.round(current.temperature)}°C</p>
                  <p className="font-medium text-muted-foreground">{current.condition}</p>
              </div>
           </div>
        </div>

        {/* 5-Day Forecast */}
        <div className="w-full">
            <p className="font-semibold text-center md:text-left text-muted-foreground mb-2">{t('weather_5_day_forecast')}</p>
            <div className="space-y-2">
                {daily.slice(0, 5).map((day, index) => (
                    <div key={index} className="grid grid-cols-4 items-center gap-2 p-2 bg-muted/30 rounded-md">
                        <p className="font-bold col-span-1">{day.day}</p>
                        <div className="flex items-center justify-center space-x-2 col-span-1">
                            {getWeatherIcon(day.icon, "w-8 h-8")}
                            <span className="hidden sm:inline text-sm text-muted-foreground">{day.condition}</span>
                        </div>
                        <p className="text-right font-semibold col-span-2">
                            <span className="text-foreground">{Math.round(day.high_temp)}°</span>
                            <span className="text-muted-foreground"> / {Math.round(day.low_temp)}°</span>
                        </p>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
};

export default WeatherDisplay;