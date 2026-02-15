import React from 'react';
import { Button } from './Button';
import { Check, Star, Sparkles } from 'lucide-react';

interface Props {
  features: string[];
  selected: string[];
  onToggle: (feature: string) => void;
  onNext: () => void;
}

export const StepFeatures: React.FC<Props> = ({ features, selected, onToggle, onNext }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-white">
          Identify Your Power
        </h2>
        <p className="text-zinc-400">
          We scanned your description. Select the 2-3 killer features that will sell this product.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feature, idx) => {
          const isSelected = selected.includes(feature);
          return (
            <button
              key={idx}
              onClick={() => onToggle(feature)}
              className={`
                relative p-4 rounded-xl border-2 text-left transition-all duration-200 group
                ${isSelected 
                  ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/10' 
                  : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-600'}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center transition-colors
                        ${isSelected ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-500'}
                    `}>
                        {isSelected ? <Check className="w-5 h-5" /> : <Star className="w-4 h-4" />}
                    </div>
                    <span className={`font-semibold ${isSelected ? 'text-white' : 'text-zinc-400'}`}>
                        {feature}
                    </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-center pt-6">
        <Button 
          onClick={onNext} 
          disabled={selected.length === 0}
          className="w-full md:w-auto min-w-[200px]"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Target Audience & Platform
        </Button>
      </div>
    </div>
  );
};