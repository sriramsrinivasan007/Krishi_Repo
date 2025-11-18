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
  
  const inputStyles = "w-full px-4 py-2.5 bg-transparent border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring transition duration-300 text-foreground";


  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4 py-8">
      <div className="w-full max-w-md mx-auto bg-card text-card-foreground p-8 rounded-2xl shadow-xl border">
        <div className="text-center mb-8">
          <div className="inline-block bg-primary p-3 rounded-xl mb-4">
            <FarmerIcon />
          </div>
          <h1 className="text-3xl font-bold text-foreground">{t('welcome_title')}</h1>
          <p className="text-muted-foreground mt-2">
            {mode === 'login' ? t('login_subtitle') : t('signup_subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-muted-foreground mb-1">{t('first_name')}</label>
                  <input type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleChange} className={inputStyles} placeholder="John" required />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-muted-foreground mb-1">{t('last_name')}</label>
                  <input type="text" name="lastName" id="lastName" value={formData.lastName} onChange={handleChange} className={inputStyles} placeholder="Doe" required />
                </div>
              </div>
            </>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1">{t('email_address')}</label>
            <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className={inputStyles} placeholder="you@example.com" required />
          </div>
          
          {mode === 'signup' && (
             <div>
               <label htmlFor="confirmEmail" className="block text-sm font-medium text-muted-foreground mb-1">{t('retype_email')}</label>
               <input type="email" name="confirmEmail" id="confirmEmail" value={formData.confirmEmail} onChange={handleChange} className={inputStyles} placeholder="you@example.com" required />
             </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-1">{t('password')}</label>
            <input type="password" name="password" id="password" value={formData.password} onChange={handleChange} className={inputStyles} placeholder="••••••••" required />
          </div>

          {mode === 'signup' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-muted-foreground mb-1">{t('retype_password')}</label>
                <input type="password" name="confirmPassword" id="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className={inputStyles} placeholder="••••••••" required />
              </div>
          )}

          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          {success && <p className="text-sm text-primary text-center">{success}</p>}

          <div className="pt-2">
            <button type="submit" className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition duration-300 ease-in-out transform hover:scale-105">
              {mode === 'login' ? t('sign_in') : t('create_account')}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            {mode === 'login' ? t('no_account') : t('have_account')}
            <button onClick={() => handleModeChange(mode === 'login' ? 'signup' : 'login')} className="font-semibold text-primary hover:text-primary/90 ml-2 focus:outline-none">
              {mode === 'login' ? t('sign_up') : t('sign_in')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;