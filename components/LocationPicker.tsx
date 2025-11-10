import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { SearchIcon } from './IconComponents';

export interface LocationData {
  name: string;
  coords: {
    latitude: number;
    longitude: number;
  };
}

interface LocationPickerProps {
  isOpen: boolean;
  initialCoords?: { latitude: number; longitude: number };
  onLocationSelect: (location: LocationData) => void;
  onClose: () => void;
}

declare const L: any; // Declare Leaflet global

const LocationPicker: React.FC<LocationPickerProps> = ({ isOpen, initialCoords, onLocationSelect, onClose }) => {
  const { t } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);
  
  const [selectedCoords, setSelectedCoords] = useState<{ latitude: number; longitude: number } | null>(initialCoords || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');

  const placeMarker = useCallback((lat: number, lng: number, shouldPan: boolean = true) => {
    const latLng = L.latLng(lat, lng);
    if (!mapInstance.current) return;

    if (markerInstance.current) {
      markerInstance.current.setLatLng(latLng);
    } else {
      markerInstance.current = L.marker(latLng, { draggable: true }).addTo(mapInstance.current);
      markerInstance.current.on('dragend', (e: any) => {
        const newLatLng = e.target.getLatLng();
        setSelectedCoords({ latitude: newLatLng.lat, longitude: newLatLng.lng });
      });
    }

    if (shouldPan) {
      mapInstance.current.setView(latLng, 13);
    }
    setSelectedCoords({ latitude: lat, longitude: lng });
  }, []);

  useEffect(() => {
    if (isOpen && mapContainerRef.current) {
      if (!mapInstance.current) {
        const initialCenter: [number, number] = initialCoords
          ? [initialCoords.latitude, initialCoords.longitude]
          : [20.5937, 78.9629]; // Default to India
        const initialZoom = initialCoords ? 13 : 5;

        mapInstance.current = L.map(mapContainerRef.current).setView(initialCenter, initialZoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapInstance.current);

        mapInstance.current.on('click', (e: any) => {
          placeMarker(e.latlng.lat, e.latlng.lng);
        });

        if (initialCoords) {
          placeMarker(initialCoords.latitude, initialCoords.longitude, false);
        }
      } else {
        // When modal re-opens, the map needs its size invalidated to render correctly
        setTimeout(() => mapInstance.current.invalidateSize(), 100);
      }
    }
  }, [isOpen, initialCoords, placeMarker]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setSearchError('');
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`);
      if (!response.ok) throw new Error('Search request failed');
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        placeMarker(parseFloat(lat), parseFloat(lon));
      } else {
        setSearchError(t('error_location_not_found', { location: searchQuery }));
      }
    } catch (error) {
      setSearchError(t('error_search_failed'));
      console.error(error);
    }
  };

  const handleConfirm = async () => {
    if (!selectedCoords) return;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${selectedCoords.latitude}&lon=${selectedCoords.longitude}`);
      if (!response.ok) throw new Error('Failed to fetch address');
      const data = await response.json();
      onLocationSelect({
        name: data.display_name || `Lat: ${selectedCoords.latitude.toFixed(4)}, Lng: ${selectedCoords.longitude.toFixed(4)}`,
        coords: selectedCoords,
      });
    } catch (error) {
      console.warn('Reverse geocoding failed for confirm:', error);
      // Fallback if geocoding fails
      onLocationSelect({
        name: `Lat: ${selectedCoords.latitude.toFixed(4)}, Lng: ${selectedCoords.longitude.toFixed(4)}`,
        coords: selectedCoords,
      });
    }
  };

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-80 z-50 flex items-center justify-center p-4 transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
      role="dialog"
      aria-modal={isOpen}
      aria-hidden={!isOpen}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-brand-text-primary dark:text-gray-100">{t('location_picker_title')}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white text-3xl font-light">&times;</button>
        </div>

        <div className="p-4">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('location_picker_search_placeholder')}
              className="w-full px-4 py-2 pl-10 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-light focus:border-transparent transition"
            />
            <button type="submit" aria-label="Search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <SearchIcon className="w-5 h-5" />
            </button>
          </form>
          {searchError && <p className="text-red-500 text-xs mt-1 px-1">{searchError}</p>}
        </div>

        <div 
          ref={mapContainerRef} 
          className="flex-grow bg-gray-200 dark:bg-gray-900 dark:filter dark:invert-[1] dark:hue-rotate-[180deg]" 
          id="map"
        >
            {/* Map will be rendered here by Leaflet */}
        </div>

        <div className="p-4 border-t dark:border-gray-700 flex justify-end items-center space-x-4">
          <button onClick={onClose} className="px-6 py-2 bg-gray-200 dark:bg-gray-600 text-brand-text-secondary dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedCoords}
            className="px-6 py-2 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-primary-light transition disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {t('location_picker_confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationPicker;