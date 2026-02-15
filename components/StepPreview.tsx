
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ViralContent, Scene } from '../types';
import { Button } from './Button';
import { Play, Download, RefreshCw, Copy, Volume2, Pause, RotateCcw, Image as ImageIcon, Check, Share2, Clapperboard, Rewind, FastForward, ShoppingBag, ArrowLeft, AlertTriangle } from 'lucide-react';

interface Props {
  audioUrl: string | null;
  bgMusicUrl: string | null;
  appIconUrl: string | null;
  content: ViralContent | null;
  adType?: 'full_ai' | 'filming_guide';
  onRestart: () => void;
  onBack?: () => void;
}

export const StepPreview: React.FC<Props> = ({ audioUrl, bgMusicUrl, appIconUrl, content, adType = 'full_ai', onRestart, onBack }) => {
  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [musicVolume, setMusicVolume] = useState(0.4); 
  const [isExporting, setIsExporting] = useState(false);
  
  // Visual Effects State
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [flashOpacity, setFlashOpacity] = useState(0);
  
  // UI State
  const [copiedCaption, setCopiedCaption] = useState<number | null>(null);
  const [copiedHashtags, setCopiedHashtags] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const bgMusicRef = useRef<HTMLAudioElement>(null);
  const requestRef = useRef<number>(null);
  const startTimeRef = useRef<number>(0);
  
  // Export Context
  const audioContextRef = useRef<AudioContext | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // --- Initialization ---
  
  // Handle Audio Metadata Loading
  useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      const handleLoadedMetadata = () => {
          if (audio.duration && audio.duration !== Infinity) {
              setDuration(audio.duration);
              renderFrame(0);
          }
      };

      if (audio.readyState >= 1 && audio.duration && audio.duration !== Infinity) {
          setDuration(audio.duration);
          renderFrame(0);
      }

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => {
          audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
  }, [audioUrl]);

  // Fallback for no audio or duration calc
  useEffect(() => {
    if (content && (!audioUrl)) {
         const estimatedDuration = content.scenes.reduce((acc, s) => acc + s.duration, 0);
         setDuration(estimatedDuration);
         renderFrame(0);
    }
  }, [content, audioUrl]);

  useEffect(() => {
    if (bgMusicRef.current) {
      bgMusicRef.current.volume = musicVolume;
    }
  }, [musicVolume, bgMusicUrl]);

  // --- Music Error Handling & Auto-Retry ---
  const handleMusicError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
      const audio = e.currentTarget;
      const errorCode = audio.error?.code;
      const errorMessage = audio.error?.message;
      
      console.warn("Music load error:", errorCode, errorMessage);
      
      // If error is related to format or decode (sometimes triggered by CORS + strict browser)
      // Retry without CORS. This enables playback but disables export for this track.
      if (audio.crossOrigin === "anonymous") {
          console.log("Retrying music without CORS to enable playback...");
          audio.crossOrigin = null; 
          audio.src = bgMusicUrl || ""; // Reload
          audio.load();
          setAudioError("Export restricted");
      } else {
          setAudioError("Music failed");
      }
  };

  // --- Copy Handlers ---
  const handleCopyCaption = (text: string, index: number) => {
      navigator.clipboard.writeText(text);
      setCopiedCaption(index);
      setTimeout(() => setCopiedCaption(null), 2000);
  };

  const handleCopyHashtags = () => {
      if(!content) return;
      navigator.clipboard.writeText(content.hashtags.join(' '));
      setCopiedHashtags(true);
      setTimeout(() => setCopiedHashtags(false), 2000);
  };

  // --- Rendering ---
  
  const getSubtitleChunk = (text: string, progress: number) => {
      if (!text) return "";
      // Split into chunks of roughly 5-6 words for readability
      const words = text.split(" ");
      const chunkSize = 6;
      const chunks = [];
      for (let i = 0; i < words.length; i += chunkSize) {
          chunks.push(words.slice(i, i + chunkSize).join(" "));
      }
      
      // Map progress (0-1) to chunk index
      const chunkIndex = Math.floor(progress * chunks.length);
      return chunks[Math.min(chunkIndex, chunks.length - 1)];
  };

  const renderFrame = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !content) return;
    
    // Setup High DPI Canvas
    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = 1080;
    const logicalHeight = 1920;
    
    if (canvas.width !== logicalWidth * dpr) {
        canvas.width = logicalWidth * dpr;
        canvas.height = logicalHeight * dpr;
        const ctxReset = canvas.getContext('2d');
        ctxReset?.scale(dpr, dpr);
    }
    
    const ctx = canvas.getContext('2d', { alpha: false });
    if(!ctx) return;

    const w = logicalWidth;
    const h = logicalHeight;

    // Determine current scene
    let accumulatedTime = 0;
    let currentScene: Scene | undefined;
    let sceneStartTime = 0;
    let sceneIndex = 0;

    const safeDuration = duration > 0 ? duration : content.scenes.reduce((acc, s) => acc + s.duration, 0);
    const totalEstimatedDur = content.scenes.reduce((acc, s) => acc + s.duration, 0);

    for (let i = 0; i < content.scenes.length; i++) {
        const scene = content.scenes[i];
        const sceneRatio = scene.duration / totalEstimatedDur;
        const sceneDur = sceneRatio * safeDuration;
        
        if (time >= accumulatedTime && time < accumulatedTime + sceneDur) {
            currentScene = scene;
            sceneStartTime = accumulatedTime;
            sceneIndex = i;
            break;
        }
        accumulatedTime += sceneDur;
    }
    
    if (!currentScene && content.scenes.length > 0) {
        currentScene = content.scenes[content.scenes.length - 1];
        sceneStartTime = accumulatedTime; 
        sceneIndex = content.scenes.length - 1;
    }

    if (!currentScene) return;

    // Detect Scene Change for Effects
    if (sceneIndex !== currentSceneIndex) {
        setCurrentSceneIndex(sceneIndex);
        setFlashOpacity(0.4); // Trigger flash
    }

    // Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const sceneTime = Math.max(0, time - sceneStartTime);
    const sceneDurationReal = (currentScene.duration / totalEstimatedDur) * safeDuration;
    
    ctx.save();
    
    // --- DRAW SCENE CONTENT ---
    
    if (currentScene.type === 'image' && currentScene.mediaUrl) {
        const img = new Image();
        img.src = currentScene.mediaUrl;
        if (img.complete) {
            // Cinematic Ken Burns Effect
            const moveSpeed = 0.05;
            const scaleBase = 1.1; 
            
            const sceneIdx = content.scenes.indexOf(currentScene);
            const direction = sceneIdx % 2 === 0 ? 1 : -1;
            
            // Slow push in or pull out
            const scale = scaleBase + (sceneTime * 0.015);
            // Gentle pan
            const xOffset = Math.sin(sceneTime * moveSpeed * 0.5) * 30 * direction;
            
            // Stronger Beat Pulse for VIBE
            const beatPulse = Math.abs(Math.sin(time * 3)) * 0.015; // Increased frequency and amplitude
            const finalScale = scale + beatPulse;

            ctx.translate(w / 2 + xOffset, h / 2);
            ctx.scale(finalScale, finalScale);
            ctx.translate(-(w / 2), -(h / 2));
            
            drawImageCover(ctx, img, w, h);
        }
    } else {
        // Video Placeholder (Camera Viewfinder Mode)
        const gradient = ctx.createLinearGradient(0, 0, w, h);
        gradient.addColorStop(0, '#09090b');
        gradient.addColorStop(1, '#000000');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        // Viewfinder Corners
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 4;
        const cornerSize = 80;
        const padding = 60;
        
        ctx.beginPath(); ctx.moveTo(padding, padding + cornerSize); ctx.lineTo(padding, padding); ctx.lineTo(padding + cornerSize, padding); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w - padding - cornerSize, padding); ctx.lineTo(w - padding, padding); ctx.lineTo(w - padding, padding + cornerSize); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(padding, h - padding - cornerSize); ctx.lineTo(padding, h - padding); ctx.lineTo(padding + cornerSize, h - padding); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w - padding - cornerSize, h - padding); ctx.lineTo(w - padding, h - padding); ctx.lineTo(w - padding, h - padding - cornerSize); ctx.stroke();

        // Center Reticle
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        const retSize = 20;
        ctx.beginPath();
        ctx.moveTo(w/2 - retSize, h/2); ctx.lineTo(w/2 + retSize, h/2);
        ctx.moveTo(w/2, h/2 - retSize); ctx.lineTo(w/2, h/2 + retSize);
        ctx.stroke();

        // REC Indicator
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(100, 100, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 32px Inter';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText("REC", 125, 100);

        // Scene Number
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = 'bold 32px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(`SCENE ${content.scenes.indexOf(currentScene) + 1}`, w - 100, 100);
    }
    
    ctx.restore();

    // --- CINEMATIC OVERLAYS ---

    // 1. Film Grain
    drawNoise(ctx, w, h, 0.05);

    // 2. Vignette
    const vig = ctx.createRadialGradient(w/2, h/2, h/3, w/2, h/2, h);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vig;
    ctx.fillRect(0,0, w, h);

    // 3. Subtitles (High Priority for Full AI)
    // Only show if adType is full_ai OR explicitly requested.
    if (adType === 'full_ai' && currentScene.script) {
         const progress = Math.min(1, Math.max(0, sceneTime / sceneDurationReal));
         const subtitle = getSubtitleChunk(currentScene.script, progress);
         
         if (subtitle) {
             ctx.save();
             ctx.font = "bold 56px Inter"; // Large, readable
             ctx.textAlign = "center";
             ctx.textBaseline = "bottom"; 
             ctx.lineJoin = "round";
             
             // Position: Lower third, but clear of bottom edge
             const textX = w / 2;
             const textY = h - 450; 

             // Strong Outline for visibility over any background
             ctx.lineWidth = 12;
             ctx.strokeStyle = "rgba(0,0,0, 0.8)";
             ctx.strokeText(subtitle, textX, textY);
             
             // White Fill
             ctx.fillStyle = "#ffffff";
             ctx.fillText(subtitle, textX, textY);
             ctx.restore();
         }
    }

    // 4. Call To Action (CTA) - Appears in last 3 seconds
    const timeLeft = safeDuration - time;
    if (timeLeft < 3.5 && timeLeft > 0) {
        // Slide up animation
        const slideProgress = Math.min(1, (3.5 - timeLeft) * 2); 
        const yPos = h - (300 * slideProgress);
        
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 30;
        
        // Button BG with Gradient for prominence
        const btnW = 600;
        const btnH = 140;
        const btnX = w/2 - btnW/2;
        
        // Pulse the CTA size slightly
        const pulse = 1 + Math.sin(time * 5) * 0.02;
        
        ctx.translate(w/2, yPos + btnH/2);
        ctx.scale(pulse, pulse);
        ctx.translate(-(w/2), -(yPos + btnH/2));

        const grad = ctx.createLinearGradient(btnX, yPos, btnX + btnW, yPos);
        grad.addColorStop(0, '#2563eb'); // Blue
        grad.addColorStop(1, '#7c3aed'); // Violet
        ctx.fillStyle = grad;
        
        roundRect(ctx, btnX, yPos, btnW, btnH, 70);
        ctx.fill();
        
        // Text
        ctx.fillStyle = "#fff";
        ctx.font = "bold 50px Inter";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Shop Now", w/2, yPos + btnH/2);
        
        ctx.restore();
    }

    // 5. Flash Effect (Transitions)
    if (flashOpacity > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`;
        ctx.fillRect(0, 0, w, h);
    }

    // 6. Progress Bar
    const barProgress = Math.min(time / (duration || 1), 1);
    const barHeight = 8;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(0, h - barHeight, w, barHeight);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, h - barHeight, w * barProgress, barHeight);

  }, [content, duration, appIconUrl, currentSceneIndex, flashOpacity, adType]);


  // --- Helper Render Functions ---

  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  const drawNoise = (ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number) => {
       ctx.save();
       ctx.globalAlpha = alpha;
       ctx.fillStyle = `rgba(255, 255, 255, 0.05)`; 
       if (Math.random() > 0.5) ctx.fillRect(0,0,w,h);
       ctx.restore();
  }

  const drawImageCover = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, cw: number, ch: number) => {
       const iRatio = img.width / img.height;
       const cRatio = cw / ch;
       let dw, dh, dx, dy;
       if (iRatio > cRatio) {
           dw = ch * iRatio; dh = ch; dx = (cw - dw) / 2; dy = 0;
       } else {
           dw = cw; dh = cw / iRatio; dx = 0; dy = (ch - dh) / 2;
       }
       ctx.drawImage(img, dx, dy, dw, dh);
  };


  // --- Playback Loop ---

  const tick = useCallback(() => {
    let time = 0;
    
    // Decay flash opacity
    setFlashOpacity(prev => Math.max(0, prev - 0.05));

    if (audioRef.current && !audioRef.current.paused) {
        time = audioRef.current.currentTime;
    } else {
        time = (performance.now() - startTimeRef.current) / 1000;
    }

    // Auto-loop
    if (time >= duration && duration > 0 && !isExporting) {
        time = 0;
        // Reset immediately for tighter loop
        if(audioRef.current) {
            audioRef.current.currentTime = 0;
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) playPromise.catch(() => {});
        }
        if(bgMusicRef.current) {
            bgMusicRef.current.currentTime = 0;
            const playPromise = bgMusicRef.current.play();
            if (playPromise !== undefined) playPromise.catch(() => {});
        }
        startTimeRef.current = performance.now();
        setFlashOpacity(0.8); // Big flash on loop
    }

    setCurrentTime(time);
    renderFrame(time);
    
    if (isPlaying) requestRef.current = requestAnimationFrame(tick);
  }, [isPlaying, duration, renderFrame, isExporting]);

  useEffect(() => {
    if (isPlaying) {
        requestRef.current = requestAnimationFrame(tick);
    } else {
        if(requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => { if(requestRef.current) cancelAnimationFrame(requestRef.current); }
  }, [isPlaying, tick]);

  // --- Controls ---

  const togglePlay = async () => {
     if (isPlaying) {
         audioRef.current?.pause();
         bgMusicRef.current?.pause();
         setIsPlaying(false);
     } else {
         if (currentTime >= duration && duration > 0) {
             setCurrentTime(0);
             if (audioRef.current) audioRef.current.currentTime = 0;
             if (bgMusicRef.current) bgMusicRef.current.currentTime = 0;
         }
         startTimeRef.current = performance.now() - (currentTime * 1000);
         try {
             await audioRef.current?.play();
             bgMusicRef.current?.play().catch(() => {});
             setIsPlaying(true);
         } catch (e) { console.error("Play failed", e); }
     }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value);
      if(audioRef.current) audioRef.current.currentTime = time;
      if(bgMusicRef.current) bgMusicRef.current.currentTime = time;
      startTimeRef.current = performance.now() - (time * 1000);
      setCurrentTime(time);
      renderFrame(time);
  };

  const handleRestart = () => {
      if(audioRef.current) audioRef.current.currentTime = 0;
      if(bgMusicRef.current) bgMusicRef.current.currentTime = 0;
      startTimeRef.current = performance.now();
      setCurrentTime(0);
      renderFrame(0);
      if(isPlaying) {
          audioRef.current?.play();
          bgMusicRef.current?.play();
      }
  };

  const skip = (seconds: number) => {
    let newTime = currentTime + seconds;
    newTime = Math.max(0, Math.min(newTime, duration));
    if (audioRef.current) audioRef.current.currentTime = newTime;
    if (bgMusicRef.current) bgMusicRef.current.currentTime = newTime;
    startTimeRef.current = performance.now() - (newTime * 1000);
    setCurrentTime(newTime);
    renderFrame(newTime);
  };

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleExport = async () => {
      if (!canvasRef.current) return;
      setIsExporting(true); setIsPlaying(false);
      audioRef.current?.pause(); bgMusicRef.current?.pause();

      if (!audioContextRef.current) {
          const AC = window.AudioContext || (window as any).webkitAudioContext;
          const actx = new AC();
          const dest = actx.createMediaStreamDestination();
          
          if (audioRef.current) {
             const srcVO = actx.createMediaElementSource(audioRef.current);
             srcVO.connect(dest); srcVO.connect(actx.destination);
          }
          if(bgMusicRef.current && (!bgMusicRef.current.crossOrigin || bgMusicRef.current.crossOrigin === "anonymous")) {
            try {
                // IMPORTANT: createMediaElementSource requires CORS. 
                const srcBG = actx.createMediaElementSource(bgMusicRef.current);
                const gain = actx.createGain(); gain.gain.value = musicVolume;
                srcBG.connect(gain); gain.connect(dest); gain.connect(actx.destination);
            } catch(e) {
                console.warn("Could not capture background music for export due to CORS", e);
            }
          }
          audioContextRef.current = actx; destRef.current = dest;
      }
      if(audioContextRef.current?.state === 'suspended') await audioContextRef.current.resume();

      const stream = new MediaStream([ ...canvasRef.current.captureStream(60).getVideoTracks(), ...destRef.current!.stream.getAudioTracks() ]);
      const mimeType = 'video/webm;codecs=vp9';
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 25000000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
          a.download = 'AdViral_Blueprint.webm'; a.click();
          setIsExporting(false);
      };
      
      // Reset for export
      if(audioRef.current) audioRef.current.currentTime = 0;
      if(bgMusicRef.current) bgMusicRef.current.currentTime = 0;
      renderFrame(0);
      
      setTimeout(async () => {
          recorder.start();
          await audioRef.current?.play(); bgMusicRef.current?.play();
          
          const checkEnd = () => {
                const currentT = audioRef.current ? audioRef.current.currentTime : 0;
                renderFrame(currentT);
                const isEnded = audioRef.current ? (audioRef.current.ended || currentT >= duration) : false;
                
                if (isEnded) {
                    setTimeout(() => recorder.stop(), 500);
                    audioRef.current?.pause(); bgMusicRef.current?.pause();
                } else {
                    requestAnimationFrame(checkEnd);
                }
          };
          requestAnimationFrame(checkEnd);
      }, 500);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* LEFT: SOCIAL MEDIA PLAYER PREVIEW */}
        <div className="flex-1 flex justify-center items-start pt-4">
             <div className="relative aspect-[9/16] h-[75vh] max-h-[850px] bg-black rounded-[2.5rem] border-8 border-zinc-900 shadow-2xl ring-1 ring-zinc-800 flex flex-col">
                 
                 {/* Video Container (Clipped) */}
                 <div className="relative flex-1 w-full overflow-hidden rounded-t-[2rem]">
                    {/* Top Status Bar Mock */}
                    <div className="absolute top-0 w-full h-8 bg-black/20 z-20 flex justify-between items-center px-6">
                        <div className="text-[10px] text-white font-bold">9:41</div>
                        <div className="flex gap-1">
                            <div className="w-4 h-2.5 bg-white rounded-sm"/>
                            <div className="w-0.5 h-2.5 bg-white/50 rounded-sm"/>
                        </div>
                    </div>

                    {/* Canvas Layer */}
                    <canvas ref={canvasRef} className="w-full h-full object-cover" />
                    
                    {/* Big Center Play Button (Only when paused) */}
                    {!isPlaying && !isExporting && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer z-10" onClick={togglePlay}>
                            <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 transition-transform hover:scale-110">
                                <Play fill="white" className="w-8 h-8 text-white ml-1"/>
                            </div>
                        </div>
                    )}

                    {/* Exporting Overlay */}
                    {isExporting && (
                        <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center">
                            <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mb-4"/>
                            <p className="text-white font-bold">Rendering Blueprint...</p>
                        </div>
                    )}
                 </div>

                 {/* Control Bar (Bottom of Phone) */}
                 <div className="h-20 bg-zinc-950 border-t border-zinc-800 flex items-center px-6 gap-4 rounded-b-[2rem] justify-between">
                    
                    <div className="flex items-center gap-4">
                        <button onClick={handleRestart} className="text-zinc-500 hover:text-white transition-colors p-2">
                            <RotateCcw className="w-5 h-5"/>
                        </button>
                        
                        <div className="flex items-center gap-3 bg-zinc-900/50 rounded-full px-4 py-2 border border-zinc-800">
                             <button onClick={() => skip(-5)} className="text-zinc-300 hover:text-white hover:scale-110 transition-all">
                                <Rewind className="w-5 h-5 fill-current" />
                             </button>
                             <button onClick={togglePlay} className="text-white hover:text-blue-400 hover:scale-110 transition-all mx-1">
                                {isPlaying ? <Pause className="w-6 h-6 fill-current"/> : <Play className="w-6 h-6 fill-current"/>}
                             </button>
                             <button onClick={() => skip(5)} className="text-zinc-300 hover:text-white hover:scale-110 transition-all">
                                <FastForward className="w-5 h-5 fill-current" />
                             </button>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col gap-1 ml-4">
                        <input 
                            type="range" 
                            min="0" 
                            max={duration || 1} 
                            step="0.1" 
                            value={currentTime} 
                            onChange={handleSeek}
                            className="w-full h-1.5 bg-zinc-800 rounded-full accent-blue-500 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>
                 </div>
             </div>
        </div>

        {/* RIGHT: SOCIAL KIT & SCENE BREAKDOWN */}
        <div className="flex-1 max-w-xl flex flex-col gap-6 h-[75vh] overflow-y-auto custom-scrollbar pr-2">
            
            {/* Header / Actions */}
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl backdrop-blur-sm">
                 <div className="flex justify-between items-start mb-6">
                     <div className="flex items-center gap-3">
                         {onBack && (
                            <Button variant="secondary" onClick={onBack} className="h-10 w-10 p-0 rounded-full flex items-center justify-center">
                                <ArrowLeft className="w-5 h-5"/>
                            </Button>
                         )}
                         <div>
                             <h2 className="text-2xl font-bold text-white mb-1">Viral Blueprint</h2>
                             <p className="text-sm text-zinc-400">Export this video and use it as a guide in CapCut.</p>
                         </div>
                     </div>
                     <Button onClick={handleExport} disabled={isExporting} className="bg-blue-600 hover:bg-blue-500 h-10 text-sm">
                         <Download className="w-4 h-4 mr-2"/> Export Video
                     </Button>
                 </div>
                 
                 {audioError && (
                     <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-xs p-2 rounded flex items-center gap-2">
                         <AlertTriangle className="w-4 h-4" />
                         {audioError === "Export restricted" 
                            ? "Music playback enabled, but it cannot be exported to the video due to license/browser security."
                            : "Could not load background music."}
                     </div>
                 )}

                 <div className="flex items-center gap-4 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                     <Volume2 className="w-5 h-5 text-zinc-400" />
                     <input 
                        type="range" min="0" max="1" step="0.1" 
                        value={musicVolume} onChange={e => setMusicVolume(parseFloat(e.target.value))}
                        className="flex-1 h-1.5 bg-zinc-800 rounded-full accent-blue-500 cursor-pointer"
                     />
                 </div>
            </div>

            {/* Viral Thumbnail Card */}
            {content?.thumbnailUrl && (
                <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <div className="flex justify-between items-center mb-4 relative z-10">
                        <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                                 <ImageIcon className="w-4 h-4 text-purple-400" />
                             </div>
                             <div>
                                 <h3 className="text-sm font-bold text-white">Viral Cover Image</h3>
                                 <p className="text-[10px] text-zinc-400">High CTR Thumbnail Generated by AI</p>
                             </div>
                        </div>
                        <a 
                            href={content.thumbnailUrl} 
                            download="viral-thumbnail.png"
                            className="bg-zinc-900 hover:bg-zinc-800 text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-white transition-colors flex items-center gap-2"
                        >
                            <Download className="w-3 h-3" /> Save
                        </a>
                    </div>
                    <div className="aspect-[9/16] w-full bg-black rounded-lg overflow-hidden border border-zinc-800 relative">
                        <img src={content.thumbnailUrl} alt="Viral Thumbnail" className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur px-2 py-0.5 rounded text-[10px] text-white font-bold">
                            9:16
                        </div>
                    </div>
                </div>
            )}

            {/* Captions & Hashtags */}
            <div className="grid grid-cols-1 gap-4">
                {/* Captions */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Viral Captions</h3>
                    <div className="space-y-3">
                        {content?.captions.map((cap, i) => (
                            <div key={i} className="flex gap-3 group">
                                <div className="flex-1 p-3 bg-zinc-950 rounded-lg text-sm text-zinc-300 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                                    {cap}
                                </div>
                                <button 
                                    onClick={() => handleCopyCaption(cap, i)}
                                    className="p-3 bg-zinc-800 hover:bg-blue-600 rounded-lg transition-colors text-white"
                                >
                                    {copiedCaption === i ? <Check className="w-4 h-4"/> : <Copy className="w-4 h-4"/>}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Hashtags */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                     <div className="flex justify-between items-center mb-3">
                         <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Hashtag Stack</h3>
                         <button onClick={handleCopyHashtags} className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1">
                             {copiedHashtags ? <Check className="w-3 h-3"/> : <Copy className="w-3 h-3"/>} Copy All
                         </button>
                     </div>
                     <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-sm text-zinc-400 leading-relaxed font-mono">
                         {content?.hashtags.map(t => `#${t}`).join(' ')}
                     </div>
                </div>
            </div>

            {/* Scene Breakdown (The Guide) */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Clapperboard className="w-4 h-4"/> Shooting Guide
                </h3>
                <div className="space-y-6 relative">
                    {/* Line connector */}
                    <div className="absolute left-3 top-4 bottom-4 w-0.5 bg-zinc-800" />
                    
                    {content?.scenes.map((scene, i) => (
                        <div key={i} className="relative pl-10">
                            {/* Dot */}
                            <div className={`
                                absolute left-0 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold z-10 bg-zinc-900
                                ${scene.type === 'image' ? 'border-purple-500 text-purple-400' : 'border-blue-500 text-blue-400'}
                            `}>
                                {i+1}
                            </div>
                            
                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between items-center">
                                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${scene.type === 'image' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                        {scene.type === 'image' ? 'AI Hook / Visual' : 'Filming Required'}
                                    </span>
                                    <span className="text-xs text-zinc-600 font-mono">{scene.duration.toFixed(1)}s</span>
                                </div>
                                <p className="text-sm text-white font-medium mt-1">
                                    {scene.type === 'image' ? 'Generated Visual Hook' : `ACTION: ${scene.visualPrompt}`}
                                </p>
                                <p className="text-xs text-zinc-500 italic border-l-2 border-zinc-800 pl-2 mt-1">
                                    "{scene.script}"
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>

        {/* Hidden Audio */}
        {audioUrl && (
            <audio 
                ref={audioRef} 
                src={audioUrl} 
                onError={(e) => console.warn("Audio load error", e.currentTarget.error?.message || "Unknown error")}
            />
        )}
        {bgMusicUrl && (
            <audio 
                ref={bgMusicRef} 
                src={bgMusicUrl} 
                loop 
                crossOrigin="anonymous"
                onError={handleMusicError}
                preload="auto"
            />
        )}
    </div>
  );
};
