import React from 'react';
import type { WeatherForecast } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { SunIcon, PartlyCloudyIcon, CloudIcon, CloudRainIcon, CloudLightningIcon, SnowIcon, WindIcon } from './IconComponents';

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

  const truncateLocation = (loc: string) => {
    const parts = loc.split(',');
    // Return the first 2-3 significant parts of the location for brevity
    if (parts.length > 3) {
      return `${parts[0].trim()}, ${parts[1].trim()}, ${parts[2].trim()}`;
    }
    return loc;
  }

  return (
    <div className="text-brand-text-primary dark:text-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Current Weather */}
        <div className="flex flex-col items-center text-center p-4 bg-green-50 dark:bg-gray-700/50 rounded-lg">
           <p className="font-semibold text-brand-text-secondary dark:text-gray-400">{t('weather_current_conditions')}</p>
           <p className="text-sm text-gray-500 dark:text-gray-400/80 truncate mb-2" title={location}>{truncateLocation(location)}</p>
           <div className="flex items-center space-x-4">
              <div className="w-24 h-24">
                 {getWeatherIcon(current.icon, "w-full h-full")}
              </div>
              <div>
                  <p className="text-6xl font-bold">{Math.round(current.temperature)}°C</p>
                  <p className="font-medium text-brand-text-secondary dark:text-gray-300">{current.condition}</p>
              </div>
           </div>
        </div>

        {/* 5-Day Forecast */}
        <div className="w-full">
            <p className="font-semibold text-center md:text-left text-brand-text-secondary dark:text-gray-400 mb-2">{t('weather_5_day_forecast')}</p>
            <div className="space-y-2">
                {daily.slice(0, 5).map((day, index) => (
                    <div key={index} className="grid grid-cols-4 items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900/40 rounded-md">
                        <p className="font-bold col-span-1">{day.day}</p>
                        <div className="flex items-center justify-center space-x-2 col-span-1">
                            {getWeatherIcon(day.icon, "w-8 h-8")}
                            <span className="hidden sm:inline text-sm text-brand-text-secondary dark:text-gray-400">{day.condition}</span>
                        </div>
                        <p className="text-right font-semibold col-span-2">
                            <span className="text-gray-800 dark:text-gray-200">{Math.round(day.high_temp)}°</span>
                            <span className="text-gray-400 dark:text-gray-500"> / {Math.round(day.low_temp)}°</span>
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