import React, { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { StarIcon } from './IconComponents';

interface FeedbackFormProps {
  onSubmit: (rating: number, comments: string) => void;
  isSubmitting: boolean;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ onSubmit, isSubmitting }) => {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comments, setComments] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating > 0 && !isSubmitting) {
      onSubmit(rating, comments);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-brand-text-secondary dark:text-gray-400 mb-2">
          {t('feedback_rating_label')}
        </label>
        <div className="flex space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
              className="focus:outline-none"
              aria-label={`Rate ${star} out of 5 stars`}
              disabled={isSubmitting}
            >
              <StarIcon
                className={`w-8 h-8 cursor-pointer transition-colors duration-200 ${
                  (hoverRating || rating) >= star
                    ? 'text-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="comments" className="block text-sm font-medium text-brand-text-secondary dark:text-gray-400 mb-1">
          {t('feedback_comments_label')}
        </label>
        <textarea
          id="comments"
          name="comments"
          rows={3}
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder={t('feedback_comments_placeholder')}
          className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-light dark:focus:ring-green-500 focus:border-transparent transition duration-300"
          disabled={isSubmitting}
        />
      </div>

      <div className="text-right">
        <button
          type="submit"
          disabled={rating === 0 || isSubmitting}
          className="px-6 py-2 bg-brand-primary text-white font-bold rounded-lg hover:bg-brand-primary-light transition-colors duration-300 disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          {isSubmitting ? t('feedback_submitting') : t('feedback_submit_button')}
        </button>
      </div>
    </form>
  );
};

export default FeedbackForm;
