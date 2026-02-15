
import React, { useState } from 'react';
import { AppState, AppStep, SocialPlatform, Scene } from './types';
import { StepConcept } from './components/StepConcept';
import { StepFeatures } from './components/StepFeatures';
import { StepPlatform } from './components/StepPlatform';
import { StepAnalysis } from './components/StepAnalysis';
import { StepPreview } from './components/StepPreview';
import { 
    analyzeTrends, 
    generateStoryboard, 
    generateImageForScene, 
    generateVoiceover,
    extractUniqueFeatures,
    selectBackgroundMusic,
    generateThumbnail
} from './services/geminiService';
import { Zap } from 'lucide-react';

export default function App() {
  const [state, setState] = useState<AppState>({
    step: AppStep.CONCEPT,
    productDescription: '',
    viewerEmotion: '',
    voiceGender: 'female', // Default
    detectedFeatures: [],
    selectedFeatures: [],
    platform: null,
    adType: 'full_ai', // Default to Full AI
    trends: null,
    appIconFile: null,
    appIconUrl: null,
    zipFile: null,
    generatedContent: null,
    voiceoverAudioUrl: null,
    bgMusicUrl: null,
    isProcessing: false,
    processingStatus: '',
    progress: 0,
    error: null,
  });

  const nextStep = () => setState(prev => ({ ...prev, step: prev.step + 1 }));
  const prevStep = () => setState(prev => ({ ...prev, step: prev.step - 1 }));

  // --- Step 1: Concept ---
  const handleConceptSubmit = async () => {
      // Skip Media, go straight to feature extraction
      setState(prev => ({ ...prev, isProcessing: true, processingStatus: "Analyzing product DNA..." }));
      try {
          const features = await extractUniqueFeatures(state.productDescription);
          setState(prev => ({ 
              ...prev, 
              detectedFeatures: features, 
              step: AppStep.FEATURES,
              isProcessing: false 
          }));
      } catch (e) {
          console.error(e);
          setState(prev => ({ ...prev, isProcessing: false, step: AppStep.FEATURES, detectedFeatures: ["Innovative Design", "Time Saving"] }));
      }
  };

  // --- Step 2: Features ---
  const handleFeatureToggle = (feature: string) => {
      setState(prev => {
          const exists = prev.selectedFeatures.includes(feature);
          if (exists) {
              return { ...prev, selectedFeatures: prev.selectedFeatures.filter(f => f !== feature) };
          } else {
              if (prev.selectedFeatures.length >= 3) return prev; // Max 3
              return { ...prev, selectedFeatures: [...prev.selectedFeatures, feature] };
          }
      });
  };

  // --- Step 3 -> 4: Analysis ---
  const handleAnalyzeTrends = async () => {
    setState(prev => ({ 
        ...prev, 
        step: AppStep.ANALYSIS_GENERATION,
        isProcessing: true, 
        processingStatus: 'Scanning viral trends...', 
        progress: 10, 
        error: null 
    }));

    try {
        const trends = await analyzeTrends(state.productDescription, state.platform!);
        setState(prev => ({ ...prev, trends, isProcessing: false }));
    } catch (e) {
        console.warn(e);
        // Fallback trends if failure, but let user proceed
        setState(prev => ({ 
            ...prev, 
            trends: { trends: [], audioVibe: "Upbeat", competitorHooks: [] }, 
            isProcessing: false 
        }));
    }
  };

  // --- Step 4 -> 5: Generation ---
  const handleGenerateContent = async () => {
    const { productDescription, viewerEmotion, platform, selectedFeatures, voiceGender, trends, adType, zipFile } = state;
    if (!productDescription || !platform) return;
    
    setState(prev => ({ 
        ...prev, 
        isProcessing: true, 
        processingStatus: platform === SocialPlatform.YOUTUBE 
            ? 'Analyzing Knowledge Base assets...' 
            : 'Drafting Director\'s Blueprint...', 
        progress: 30 
    }));

    try {
      // 1. Generate Storyboard
      const storyboardContent = await generateStoryboard(
          productDescription, 
          viewerEmotion, 
          platform, 
          trends || { trends: [], audioVibe: "Upbeat", competitorHooks: [] }, 
          selectedFeatures,
          adType,
          !!zipFile
      );
      
      // 2. Select Background Music
      const musicUrl = selectBackgroundMusic(storyboardContent.bgMusicVibe);

      // Start Voiceover generation immediately (async)
      const voiceoverPromise = generateVoiceover(storyboardContent.script, voiceGender);

      // 3. Generate Images (Sequential Processing)
      // We process sequentially to avoid hitting Gemini 429 Rate Limits
      setState(prev => ({
            ...prev, 
            processingStatus: `Rendering 4K Visual Hooks...`,
            progress: 50
      }));

      const finalScenes: Scene[] = [];
      const totalScenes = storyboardContent.scenes.length;

      for (let i = 0; i < totalScenes; i++) {
          const scene = storyboardContent.scenes[i];
          
          if (scene.type === 'image') {
              // Update status
              setState(prev => ({
                  ...prev,
                  processingStatus: `Rendering Scene ${i + 1} of ${totalScenes}...`,
                  progress: 50 + Math.floor((i / totalScenes) * 30) // Scale progress 50-80%
              }));

              // Artificial delay between heavy image generation requests
              if (i > 0) {
                  await new Promise(resolve => setTimeout(resolve, 1500));
              }

              const processedScene = await generateImageForScene(scene);
              finalScenes.push(processedScene);
          } else {
              finalScenes.push(scene);
          }
      }

      // 4. Generate Thumbnail (Last visual step)
      setState(prev => ({ ...prev, processingStatus: "Designing Viral Thumbnail...", progress: 85 }));
      
      const visualHook = storyboardContent.scenes[0]?.visualPrompt || productDescription;
      // Delay before thumbnail to be safe
      await new Promise(resolve => setTimeout(resolve, 1000));
      const thumbnail = await generateThumbnail(productDescription, viewerEmotion, visualHook);

      // 5. Finalize
      setState(prev => ({ ...prev, processingStatus: "Mixing Audio...", progress: 95 }));
      const audioWav = await voiceoverPromise;

      setState(prev => ({
          ...prev,
          generatedContent: {
              ...storyboardContent,
              scenes: finalScenes,
              thumbnailUrl: thumbnail
          },
          voiceoverAudioUrl: audioWav,
          bgMusicUrl: musicUrl,
          step: AppStep.PREVIEW,
          isProcessing: false,
          progress: 100
      }));

    } catch (e: any) {
       console.error(e);
       setState(prev => ({ ...prev, isProcessing: false, error: "Generation failed. Please try again." }));
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
              AdViral AI
            </h1>
          </div>
          <div className="text-xs font-mono text-zinc-500 border border-zinc-800 px-3 py-1 rounded-full">
            v2.1 Beta
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-6 flex flex-col">
        {state.error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 text-red-400 rounded-xl text-sm">
                {state.error}
            </div>
        )}

        {/* Progress Bar */}
        {state.step > AppStep.CONCEPT && state.step < AppStep.PREVIEW && (
            <div className="w-full h-1 bg-zinc-900 rounded-full mb-8 overflow-hidden">
                <div 
                    className="h-full bg-blue-500 transition-all duration-500 ease-out"
                    style={{ width: `${state.isProcessing ? state.progress : (state.step / 5) * 100}%` }}
                />
            </div>
        )}

        {state.step === AppStep.CONCEPT && (
            <StepConcept 
                description={state.productDescription}
                emotion={state.viewerEmotion}
                voiceGender={state.voiceGender}
                onDescriptionChange={d => setState(s => ({...s, productDescription: d}))}
                onEmotionChange={e => setState(s => ({...s, viewerEmotion: e}))}
                onVoiceGenderChange={g => setState(s => ({...s, voiceGender: g}))}
                onNext={handleConceptSubmit}
            />
        )}

        {state.step === AppStep.FEATURES && (
            <StepFeatures 
                features={state.detectedFeatures} 
                selected={state.selectedFeatures}
                onToggle={handleFeatureToggle}
                onNext={() => setState(s => ({...s, step: AppStep.PLATFORM}))}
            />
        )}

        {state.step === AppStep.PLATFORM && (
             <StepPlatform 
                selected={state.platform}
                adType={state.adType}
                zipFile={state.zipFile}
                onSelect={p => setState(s => ({...s, platform: p}))}
                onAdTypeChange={t => setState(s => ({...s, adType: t}))}
                onZipUpload={f => setState(s => ({...s, zipFile: f}))}
                onBack={prevStep}
                onNext={handleAnalyzeTrends}
             />
        )}

        {state.step === AppStep.ANALYSIS_GENERATION && (
            <StepAnalysis 
                isProcessing={state.isProcessing}
                trends={state.trends}
                startAnalysis={handleAnalyzeTrends}
                onNext={handleGenerateContent}
            />
        )}

        {state.step === AppStep.PREVIEW && (
            <StepPreview 
                audioUrl={state.voiceoverAudioUrl}
                bgMusicUrl={state.bgMusicUrl}
                appIconUrl={state.appIconUrl}
                content={state.generatedContent}
                adType={state.adType}
                onRestart={() => setState(s => ({...s, step: AppStep.CONCEPT, generatedContent: null}))}
                onBack={() => setState(s => ({...s, step: AppStep.PLATFORM, generatedContent: null}))}
            />
        )}

      </main>
    </div>
  );
}
