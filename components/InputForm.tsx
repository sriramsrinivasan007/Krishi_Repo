import React, { useState } from 'react';
import type { UserInput } from '../types';

interface InputFormProps {
  onGenerate: (data: UserInput) => void;
}

const InputForm: React.FC<InputFormProps> = ({ onGenerate }) => {
  const [formData, setFormData] = useState<UserInput>({
    landSize: '5',
    location: 'Nashik, Maharashtra, India',
    soilType: 'Alluvial',
    irrigation: 'Drip Irrigation',
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.landSize || !formData.location || !formData.soilType || !formData.irrigation) {
      setError('All fields are required.');
      return;
    }
    if (parseFloat(formData.landSize) <= 0) {
      setError('Land size must be a positive number.');
      return;
    }
    setError(null);
    onGenerate(formData);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-brand-text-primary">Plan Your Next Harvest</h2>
        <p className="text-brand-text-secondary mt-2">Enter your farm's details to receive a personalized crop recommendation from our AI expert.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="landSize" className="block text-sm font-medium text-brand-text-secondary mb-1">
            Land Size (in acres)
          </label>
          <input
            type="number"
            name="landSize"
            id="landSize"
            value={formData.landSize}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary-light focus:border-transparent transition duration-300"
            placeholder="e.g., 5"
            required
            min="0.1"
            step="0.1"
          />
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-brand-text-secondary mb-1">
            Location (City, State, Country)
          </label>
          <input
            type="text"
            name="location"
            id="location"
            value={formData.location}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary-light focus:border-transparent transition duration-300"
            placeholder="e.g., Nashik, Maharashtra, India"
            required
          />
        </div>

        <div>
          <label htmlFor="soilType" className="block text-sm font-medium text-brand-text-secondary mb-1">
            Soil Type
          </label>
          <input
            type="text"
            name="soilType"
            id="soilType"
            value={formData.soilType}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary-light focus:border-transparent transition duration-300"
            placeholder="e.g., Alluvial, Black, Red Clay"
            required
          />
        </div>

        <div>
          <label htmlFor="irrigation" className="block text-sm font-medium text-brand-text-secondary mb-1">
            Primary Irrigation Source
          </label>
           <input
            type="text"
            name="irrigation"
            id="irrigation"
            value={formData.irrigation}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary-light focus:border-transparent transition duration-300"
            placeholder="e.g., Drip Irrigation, Canal, Rain-fed"
            required
          />
        </div>
        
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="pt-4">
          <button
            type="submit"
            className="w-full bg-brand-primary-light text-white font-bold py-3 px-4 rounded-lg hover:bg-brand-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition duration-300 ease-in-out transform hover:scale-105"
          >
            Generate Advisory
          </button>
        </div>
      </form>
    </div>
  );
};

export default InputForm;