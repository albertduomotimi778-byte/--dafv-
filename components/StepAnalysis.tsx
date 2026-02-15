import React, { useEffect } from 'react';
import { TrendAnalysis } from '../types';
import { Button } from './Button';
import { Loader2, TrendingUp, Music, Target } from 'lucide-react';

interface Props {
  isProcessing: boolean;
  trends: TrendAnalysis | null;
  onNext: () => void;
  startAnalysis: () => void;
}

export const StepAnalysis: React.FC<Props> = ({ isProcessing, trends, onNext, startAnalysis }) => {
  
  // Auto-start analysis on mount if not done
  useEffect(() => {
    if (!trends && !isProcessing) {
      startAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-700">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 rounded-full animate-pulse"></div>
          <Loader2 className="w-16 h-16 text-blue-400 animate-spin relative z-10" />
        </div>
        <h3 className="mt-8 text-2xl font-bold text-white">Scanning the Matrix...</h3>
        <p className="text-zinc-400 mt-2 text-center max-w-md">
          Analyzing viral vectors, audio trends, and competitor content.
        </p>
      </div>
    );
  }

  if (!trends) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center">
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-400">
          Opportunities Detected
        </h2>
        <p className="text-zinc-400 mt-2">Here is what's trending right now.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4 text-pink-400">
            <TrendingUp className="w-6 h-6" />
            <h3 className="text-xl font-bold">Viral Trends</h3>
          </div>
          <ul className="space-y-3">
            {trends.trends?.map((t, i) => (
              <li key={i} className="flex gap-3 text-zinc-300">
                <span className="text-zinc-600 font-mono">0{i+1}</span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-4 text-violet-400">
                <Music className="w-6 h-6" />
                <h3 className="text-xl font-bold">Audio Vibe</h3>
            </div>
            <p className="text-zinc-300 italic">"{trends.audioVibe}"</p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-4 text-orange-400">
                <Target className="w-6 h-6" />
                <h3 className="text-xl font-bold">Winning Hooks</h3>
            </div>
            <ul className="space-y-2">
                {trends.competitorHooks?.map((h, i) => (
                <li key={i} className="text-zinc-300 text-sm border-l-2 border-zinc-700 pl-3">
                    "{h}"
                </li>
                ))}
            </ul>
            </div>
        </div>
      </div>

      <div className="flex justify-center">
        <Button onClick={onNext} fullWidth className="max-w-md">
           Upload Media & Generate
        </Button>
      </div>
    </div>
  );
};