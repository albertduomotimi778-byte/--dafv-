
import React, { useRef } from 'react';
import { SocialPlatform, AdType } from '../types';
import { Button } from './Button';
import { Instagram, Twitter, Music2, Youtube, Video, Clapperboard, FileArchive, CheckCircle2 } from 'lucide-react';

interface Props {
  selected: SocialPlatform | null;
  adType: AdType;
  zipFile: File | null;
  onSelect: (p: SocialPlatform) => void;
  onAdTypeChange: (t: AdType) => void;
  onZipUpload: (f: File) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepPlatform: React.FC<Props> = ({ 
    selected, 
    adType, 
    zipFile,
    onSelect, 
    onAdTypeChange, 
    onZipUpload,
    onNext, 
    onBack 
}) => {
  const zipInputRef = useRef<HTMLInputElement>(null);

  const platforms = [
    { id: SocialPlatform.TIKTOK, icon: Music2, color: 'hover:border-pink-500 hover:shadow-pink-500/20', activeColor: 'border-pink-500 bg-pink-500/10' },
    { id: SocialPlatform.INSTAGRAM, icon: Instagram, color: 'hover:border-purple-500 hover:shadow-purple-500/20', activeColor: 'border-purple-500 bg-purple-500/10' },
    { id: SocialPlatform.TWITTER, icon: Twitter, color: 'hover:border-blue-500 hover:shadow-blue-500/20', activeColor: 'border-blue-500 bg-blue-500/10' },
    { id: SocialPlatform.YOUTUBE, icon: Youtube, color: 'hover:border-red-500 hover:shadow-red-500/20', activeColor: 'border-red-500 bg-red-500/10' },
  ];

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onZipUpload(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white">Strategy Center</h2>
        <p className="text-zinc-400 mt-2">Choose your platform and production style.</p>
      </div>

      {/* Platform Selection */}
      <div className="space-y-3">
        <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider ml-1">1. Select Platform</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {platforms.map((p) => (
            <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className={`
                relative group flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-300
                ${selected === p.id 
                    ? `${p.activeColor} shadow-xl scale-[1.02]` 
                    : 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 ' + p.color}
                `}
            >
                <p.icon className={`w-8 h-8 mb-3 transition-colors ${selected === p.id ? 'text-white' : 'text-zinc-500 group-hover:text-white'}`} />
                <span className={`text-sm font-bold ${selected === p.id ? 'text-white' : 'text-zinc-400 group-hover:text-white'}`}>
                {p.id}
                </span>
            </button>
            ))}
        </div>
      </div>

      {/* YouTube Specific: Knowledge Base Upload */}
      {selected === SocialPlatform.YOUTUBE && (
         <div className="space-y-3 animate-in slide-in-from-top-2">
            <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider ml-1">2. Knowledge Base</label>
            <div 
                onClick={() => zipInputRef.current?.click()}
                className={`
                    w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors
                    ${zipFile ? 'border-green-500 bg-green-500/10' : 'border-zinc-700 hover:border-red-500 hover:bg-zinc-900'}
                `}
            >
                <input type="file" ref={zipInputRef} accept=".zip,.rar" className="hidden" onChange={handleZipChange}/>
                {zipFile ? (
                    <div className="flex flex-col items-center text-green-400">
                        <CheckCircle2 className="w-8 h-8 mb-2" />
                        <span className="font-bold">{zipFile.name} attached</span>
                        <span className="text-xs text-green-500/70">AI will use this for the tutorial</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-zinc-400">
                        <FileArchive className="w-8 h-8 mb-2" />
                        <span className="font-bold text-zinc-200">Upload Product Assets (.ZIP)</span>
                        <span className="text-xs text-zinc-500 text-center mt-1">
                            Required for YouTube. Upload manuals, images, or details so the AI can teach the user.
                        </span>
                    </div>
                )}
            </div>
         </div>
      )}

      {/* Ad Type Selection */}
      <div className="space-y-3">
         <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider ml-1">
             {selected === SocialPlatform.YOUTUBE ? '3. Video Style' : '2. Video Style'}
         </label>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <button
                onClick={() => onAdTypeChange('full_ai')}
                className={`
                    p-4 rounded-xl border-2 text-left flex items-start gap-4 transition-all
                    ${adType === 'full_ai' 
                        ? 'border-blue-500 bg-blue-500/10' 
                        : 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800'}
                `}
             >
                <div className={`p-2 rounded-lg ${adType === 'full_ai' ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                    <Video className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-white">Full AI Ad Video</h3>
                    <p className="text-xs text-zinc-400 mt-1">
                        100% AI generated. No filming required. Uses high-end generated visuals.
                    </p>
                </div>
             </button>

             <button
                onClick={() => onAdTypeChange('filming_guide')}
                className={`
                    p-4 rounded-xl border-2 text-left flex items-start gap-4 transition-all
                    ${adType === 'filming_guide' 
                        ? 'border-green-500 bg-green-500/10' 
                        : 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800'}
                `}
             >
                <div className={`p-2 rounded-lg ${adType === 'filming_guide' ? 'bg-green-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                    <Clapperboard className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-white">Creator Guide</h3>
                    <p className="text-xs text-zinc-400 mt-1">
                        A mix of AI visuals and placeholders for YOU to film. Perfect for UGC.
                    </p>
                </div>
             </button>
         </div>
      </div>

      <div className="flex gap-4 pt-4">
        <Button variant="secondary" onClick={onBack} className="flex-1">Back</Button>
        <Button 
          onClick={onNext} 
          disabled={!selected || (selected === SocialPlatform.YOUTUBE && !zipFile)} 
          className="flex-[2]"
        >
          {selected === SocialPlatform.YOUTUBE ? 'Process Assets & Generate' : 'Scan for Viral Trends'}
        </Button>
      </div>
    </div>
  );
};
