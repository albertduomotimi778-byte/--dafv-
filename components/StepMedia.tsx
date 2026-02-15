import React, { useRef } from 'react';
import { Button } from './Button';
import { UploadCloud, Film, SkipForward, Image as ImageIcon, Scissors } from 'lucide-react';

interface Props {
  onVideoSelect: (file: File) => void;
  onIconSelect: (file: File) => void;
  onContinue: () => void;
  hasVideo: boolean;
  hasIcon: boolean;
}

export const StepMedia: React.FC<Props> = ({ onVideoSelect, onIconSelect, onContinue, hasVideo, hasIcon }) => {
  const videoInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onVideoSelect(e.target.files[0]);
    }
  };

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onIconSelect(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white">Upload Raw Footage</h2>
        <p className="text-zinc-400 mt-2">
            Upload your raw product video. The AI will watch it, find the best moments, and auto-cut it to the beat.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Video Upload */}
        <div 
          className={`
            border-2 border-dashed transition-all duration-300 rounded-3xl p-8 text-center cursor-pointer group flex flex-col items-center justify-center min-h-[250px]
            ${hasVideo ? 'border-green-500 bg-green-500/10' : 'border-zinc-700 hover:border-blue-500 hover:bg-zinc-900/50'}
          `}
          onClick={() => videoInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={videoInputRef} 
            className="hidden" 
            accept="video/mp4,video/webm,video/quicktime" 
            onChange={handleVideoChange}
          />
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${hasVideo ? 'bg-green-500 text-black' : 'bg-zinc-800 text-zinc-400 group-hover:bg-blue-500/20 group-hover:text-blue-400'}`}>
            <Film className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">
            {hasVideo ? 'Footage Uploaded' : 'Upload Video Clips'}
          </h3>
          <p className="text-sm text-zinc-500 mb-4">MP4, MOV</p>
          
          {hasVideo && (
              <div className="flex items-center gap-2 text-green-400 text-xs bg-green-950/50 px-3 py-1 rounded-full border border-green-500/30">
                  <Scissors className="w-3 h-3" />
                  <span>AI Auto-Cut Ready</span>
              </div>
          )}
        </div>

        {/* Icon Upload */}
        <div 
          className={`
            border-2 border-dashed transition-all duration-300 rounded-3xl p-8 text-center cursor-pointer group flex flex-col items-center justify-center min-h-[250px]
            ${hasIcon ? 'border-green-500 bg-green-500/10' : 'border-zinc-700 hover:border-pink-500 hover:bg-zinc-900/50'}
          `}
          onClick={() => iconInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={iconInputRef} 
            className="hidden" 
            accept="image/png,image/jpeg,image/webp" 
            onChange={handleIconChange}
          />
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${hasIcon ? 'bg-green-500 text-black' : 'bg-zinc-800 text-zinc-400 group-hover:bg-pink-500/20 group-hover:text-pink-400'}`}>
            <ImageIcon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">
            {hasIcon ? 'Icon Added' : 'App Icon / Logo'}
          </h3>
          <p className="text-sm text-zinc-500">PNG, JPG (Optional)</p>
        </div>
      </div>

      <div className="flex justify-center pt-4">
          <Button 
            onClick={onContinue} 
            className="w-full md:w-auto min-w-[200px]"
          >
            {hasVideo ? 'Analyze & Detect Features' : 'Skip Video & Use AI Images'} 
            <SkipForward className="w-4 h-4 ml-2"/>
          </Button>
      </div>
    </div>
  );
}