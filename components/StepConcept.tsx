import React from 'react';
import { Button } from './Button';
import { Sparkles, Heart, Mic } from 'lucide-react';

interface Props {
  description: string;
  emotion: string;
  voiceGender: 'male' | 'female';
  onDescriptionChange: (val: string) => void;
  onEmotionChange: (val: string) => void;
  onVoiceGenderChange: (val: 'male' | 'female') => void;
  onNext: () => void;
}

export const StepConcept: React.FC<Props> = ({ 
  description, 
  emotion, 
  voiceGender,
  onDescriptionChange, 
  onEmotionChange, 
  onVoiceGenderChange,
  onNext 
}) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">
          Create Viral Content
        </h2>
        <p className="text-zinc-400">Define your product and the desired impact.</p>
      </div>

      <div className="space-y-5">
        {/* Product Description */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-300 ml-1">What are you promoting?</label>
          <div className="bg-zinc-900/50 p-1 rounded-2xl border border-zinc-800 focus-within:border-blue-500/50 transition-colors">
            <textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="E.g. A new fitness app that tracks your form using AI. It has a futuristic interface..."
              className="w-full h-32 bg-transparent text-lg p-4 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Viewer Emotion */}
            <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-300 ml-1 flex items-center gap-2">
                <Heart className="w-3 h-3 text-pink-500" />
                Target Emotion
            </label>
            <div className="bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 focus-within:border-pink-500/50 transition-colors">
                <input
                type="text"
                value={emotion}
                onChange={(e) => onEmotionChange(e.target.value)}
                placeholder="E.g. Inspired, Curious..."
                className="w-full bg-transparent text-lg p-3 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none"
                />
            </div>
            </div>

            {/* Voice Selection */}
            <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-300 ml-1 flex items-center gap-2">
                    <Mic className="w-3 h-3 text-blue-500" />
                    Narrator Voice
                </label>
                <div className="flex gap-2">
                    <button 
                        onClick={() => onVoiceGenderChange('female')}
                        className={`flex-1 p-3 rounded-xl border transition-all ${voiceGender === 'female' ? 'bg-pink-500/20 border-pink-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                    >
                        Female
                    </button>
                    <button 
                        onClick={() => onVoiceGenderChange('male')}
                        className={`flex-1 p-3 rounded-xl border transition-all ${voiceGender === 'male' ? 'bg-blue-500/20 border-blue-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                    >
                        Male
                    </button>
                </div>
            </div>
        </div>
      </div>

      <div className="flex justify-center pt-4">
        <Button 
          onClick={onNext} 
          disabled={description.trim().length < 10 || emotion.trim().length < 3}
          className="w-full md:w-auto min-w-[200px]"
        >
          <Sparkles className="w-5 h-5" />
          Next: Choose Platform
        </Button>
      </div>
    </div>
  );
};