'use client';

import { useState, useEffect } from 'react';

interface UserKeyPromptProps {
  onUserKeySet: (userKey: string) => void;
}

export default function UserKeyPrompt({ onUserKeySet }: UserKeyPromptProps) {
  const [userKey, setUserKey] = useState('');
  const [showGenerator, setShowGenerator] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user key exists in session storage
    const storedKey = sessionStorage.getItem('userKey');
    if (storedKey) {
      onUserKeySet(storedKey);
    }
  }, [onUserKeySet]);

  const generateKey = () => {
    const adjectives = ['swift', 'bright', 'clever', 'calm', 'bold', 'brave', 'wise', 'smart', 'quick', 'sharp'];
    const nouns = ['panda', 'eagle', 'tiger', 'falcon', 'wolf', 'lion', 'bear', 'hawk', 'fox', 'owl'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 1000);
    return `${adj}-${noun}-${num}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (userKey.length < 8) {
      setError('User key must be at least 8 characters long');
      return;
    }

    if (userKey.length > 255) {
      setError('User key must be less than 255 characters');
      return;
    }

    // Store in session storage
    sessionStorage.setItem('userKey', userKey);
    onUserKeySet(userKey);
  };

  const handleGenerateKey = () => {
    const newKey = generateKey();
    setUserKey(newKey);
    setShowGenerator(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">AI Summary App</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your unique workspace identifier to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="userKey" className="block text-sm font-medium text-gray-700 mb-2">
              Workspace Identifier
            </label>
            <input
              type="text"
              id="userKey"
              value={userKey}
              onChange={(e) => setUserKey(e.target.value)}
              placeholder="Enter your unique key (min 8 characters)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              minLength={8}
              maxLength={255}
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Continue
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or</span>
          </div>
        </div>

        <div>
          {!showGenerator ? (
            <button
              type="button"
              onClick={() => setShowGenerator(true)}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Generate Random Key
            </button>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGenerateKey}
                className="w-full flex justify-center py-2 px-4 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                🎲 Generate Key
              </button>
              <button
                type="button"
                onClick={() => setShowGenerator(false)}
                className="w-full text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Important:</strong> Save your workspace identifier! You'll need it to access your documents later.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
