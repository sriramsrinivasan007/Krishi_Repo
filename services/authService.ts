import type { User } from '../types';

const DB_KEY = 'krishi_ai_users';
const LAST_LOGIN_KEY = 'krishi_ai_last_login';

// Helper to get all users from localStorage
const getUsers = (): User[] => {
  const usersJson = localStorage.getItem(DB_KEY);
  return usersJson ? JSON.parse(usersJson) : [];
};

// Helper to save users to localStorage
const saveUsers = (users: User[]) => {
  localStorage.setItem(DB_KEY, JSON.stringify(users));
};

/**
 * Registers a new user.
 * @param userData - The new user's details.
 * @throws An error if the email is already registered.
 */
export const register = (userData: Omit<User, 'id'>): void => {
  const users = getUsers();
  const existingUser = users.find(u => u.email.toLowerCase() === userData.email.toLowerCase());

  if (existingUser) {
    throw new Error('Email address is already registered. Please log in.');
  }

  const newUser: User = {
    id: new Date().toISOString(), // Simple unique ID
    ...userData,
  };

  users.push(newUser);
  saveUsers(users);
};

/**
 * Logs in a user.
 * @param email - The user's email.
 * @param password - The user's password.
 * @returns The logged-in user object.
 * @throws An error if the email is not found or the password is incorrect.
 */
export const login = (email: string, password: string): User => {
  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    throw new Error('Email not registered. Please sign up.');
  }

  if (user.password !== password) {
    // NOTE: In a real app, passwords should be hashed and compared securely.
    // This is a plain text comparison for demonstration purposes only.
    throw new Error('Incorrect password. Please try again.');
  }

  // Store the successful login credentials
  localStorage.setItem(LAST_LOGIN_KEY, JSON.stringify({ email, password }));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};