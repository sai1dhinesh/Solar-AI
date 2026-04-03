import { useState } from 'react';
import { Star, Send, CheckCircle2, MessageSquare } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { cn } from '../lib/utils';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FeedbackFormProps {
  analysisId?: string;
}

export default function FeedbackForm({ analysisId }: FeedbackFormProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    setIsSubmitting(true);
    setError(null);
    
    try {
      await addDoc(collection(db, 'feedback'), {
        analysisId: analysisId || 'unknown',
        rating,
        comment,
        timestamp: serverTimestamp(),
        userId: auth.currentUser?.uid || 'anonymous'
      });
      
      setIsSubmitted(true);
    } catch (err) {
      console.error('Firestore Error:', err);
      setError('Failed to submit feedback. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-8 text-center animate-in fade-in zoom-in duration-300">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-emerald-900">Thank you for your feedback!</h3>
        <p className="text-emerald-700 mt-2">Your input helps us improve the SolarPotential AI model.</p>
        <button 
          onClick={() => {
            setIsSubmitted(false);
            setRating(0);
            setComment('');
          }}
          className="mt-4 text-sm font-medium text-emerald-600 hover:underline"
        >
          Submit another response
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
        <MessageSquare size={20} className="text-orange-500" />
        Rate this Analysis
      </h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">How accurate do you find these results?</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
                className="transition-transform active:scale-95"
              >
                <Star 
                  size={32} 
                  className={cn(
                    "transition-colors",
                    (hoveredRating || rating) >= star 
                      ? "fill-amber-400 text-amber-400" 
                      : "text-slate-200"
                  )} 
                />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 block">Suggestions for improvement</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What else would you like to see in this analysis?"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 outline-none min-h-[100px] transition-all"
          />
        </div>

        {error && (
          <p className="text-xs text-red-500 font-medium">{error}</p>
        )}

        <button
          type="submit"
          disabled={rating === 0 || isSubmitting}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all shadow-lg",
            rating === 0 || isSubmitting
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-orange-500 text-white hover:bg-orange-600 shadow-orange-200"
          )}
        >
          {isSubmitting ? (
            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          ) : (
            <Send size={18} />
          )}
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
}
