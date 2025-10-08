import React, { useState } from 'react';
import { FarmerIcon } from './IconComponents';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // Mock submission handler for demonstration purposes
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real application, you would add form validation and an API call here.
    onLoginSuccess();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-brand-background px-4">
      <div className="w-full max-w-md mx-auto bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
        <div className="text-center mb-8">
          <div className="inline-block bg-brand-primary p-3 rounded-full mb-4">
            <FarmerIcon />
          </div>
          <h1 className="text-3xl font-bold text-brand-text-primary">Welcome to Krishi GPT</h1>
          <p className="text-brand-text-secondary mt-2">
            {mode === 'login' ? 'Sign in to continue' : 'Create an account to get started'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === 'signup' && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-brand-text-secondary mb-1">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary-light focus:border-transparent transition duration-300"
                placeholder="John Doe"
                required
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-brand-text-secondary mb-1">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              id="email"
              className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary-light focus:border-transparent transition duration-300"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-brand-text-secondary mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              id="password"
              className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary-light focus:border-transparent transition duration-300"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-brand-primary-light text-white font-bold py-3 px-4 rounded-lg hover:bg-brand-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition duration-300 ease-in-out transform hover:scale-105"
            >
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-brand-text-secondary">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="font-semibold text-brand-primary-light hover:text-brand-primary ml-2 focus:outline-none"
            >
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
