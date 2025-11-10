import React, { useState, useEffect } from 'react';
import { FarmerIcon } from './IconComponents';
import { login, register } from '../services/authService';
import type { User } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    confirmEmail: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Pre-fill login form with last used credentials
    const savedLogin = localStorage.getItem('krishi_ai_last_login');
    if (savedLogin) {
      const { email, password } = JSON.parse(savedLogin);
      if (email && password) {
        setFormData(prev => ({ ...prev, email, password }));
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleModeChange = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setError(null);
    setSuccess(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      confirmEmail: '',
      password: '',
      confirmPassword: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === 'signup') {
      // --- SIGNUP LOGIC ---
      if (Object.values(formData).some(val => val === '')) {
        setError(t('error_all_fields_required'));
        return;
      }
      if (formData.email !== formData.confirmEmail) {
        setError(t('error_emails_no_match'));
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError(t('error_passwords_no_match'));
        return;
      }
      try {
        register({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
        });
        setSuccess(t('signup_success'));
        handleModeChange('login');
      } catch (err) {
        setError(err instanceof Error ? err.message : t('error_unknown'));
      }
    } else {
      // --- LOGIN LOGIC ---
      if (!formData.email || !formData.password) {
        setError(t('error_email_password_required'));
        return;
      }
      try {
        const user = login(formData.email, formData.password);
        onLoginSuccess(user);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('error_unknown'));
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-brand-background dark:bg-gray-900 px-4 py-8 transition-colors duration-300">
      <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="text-center mb-8">
          <div className="inline-block bg-brand-primary p-3 rounded-full mb-4">
            <FarmerIcon />
          </div>
          <h1 className="text-3xl font-bold text-brand-text-primary dark:text-gray-100">{t('welcome_title')}</h1>
          <p className="text-brand-text-secondary dark:text-gray-400 mt-2">
            {mode === 'login' ? t('login_subtitle') : t('signup_subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-brand-text-secondary dark:text-gray-400 mb-1">{t('first_name')}</label>
                  <input type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-light focus:border-transparent transition duration-300 text-brand-text-primary dark:text-gray-200" placeholder="John" required />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-brand-text-secondary dark:text-gray-400 mb-1">{t('last_name')}</label>
                  <input type="text" name="lastName" id="lastName" value={formData.lastName} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-light focus:border-transparent transition duration-300 text-brand-text-primary dark:text-gray-200" placeholder="Doe" required />
                </div>
              </div>
            </>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-brand-text-secondary dark:text-gray-400 mb-1">{t('email_address')}</label>
            <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-light focus:border-transparent transition duration-300 text-brand-text-primary dark:text-gray-200" placeholder="you@example.com" required />
          </div>
          
          {mode === 'signup' && (
             <div>
               <label htmlFor="confirmEmail" className="block text-sm font-medium text-brand-text-secondary dark:text-gray-400 mb-1">{t('retype_email')}</label>
               <input type="email" name="confirmEmail" id="confirmEmail" value={formData.confirmEmail} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-light focus:border-transparent transition duration-300 text-brand-text-primary dark:text-gray-200" placeholder="you@example.com" required />
             </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-brand-text-secondary dark:text-gray-400 mb-1">{t('password')}</label>
            <input type="password" name="password" id="password" value={formData.password} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-light focus:border-transparent transition duration-300 text-brand-text-primary dark:text-gray-200" placeholder="••••••••" required />
          </div>

          {mode === 'signup' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-brand-text-secondary dark:text-gray-400 mb-1">{t('retype_password')}</label>
                <input type="password" name="confirmPassword" id="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-light focus:border-transparent transition duration-300 text-brand-text-primary dark:text-gray-200" placeholder="••••••••" required />
              </div>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>}
          {success && <p className="text-sm text-green-600 dark:text-green-400 text-center">{success}</p>}

          <div className="pt-2">
            <button type="submit" className="w-full bg-brand-primary-light text-white font-bold py-3 px-4 rounded-lg hover:bg-brand-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition duration-300 ease-in-out transform hover:scale-105">
              {mode === 'login' ? t('sign_in') : t('create_account')}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-brand-text-secondary dark:text-gray-400">
            {mode === 'login' ? t('no_account') : t('have_account')}
            <button onClick={() => handleModeChange(mode === 'login' ? 'signup' : 'login')} className="font-semibold text-brand-primary-light hover:text-brand-primary dark:text-green-400 dark:hover:text-green-300 ml-2 focus:outline-none">
              {mode === 'login' ? t('sign_up') : t('sign_in')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;