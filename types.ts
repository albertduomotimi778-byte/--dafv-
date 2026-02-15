
export enum AppStep {
  CONCEPT = 1,
  FEATURES = 2,
  PLATFORM = 3,
  ANALYSIS_GENERATION = 4,
  PREVIEW = 5
}

export enum SocialPlatform {
  TIKTOK = 'TikTok',
  INSTAGRAM = 'Instagram',
  TWITTER = 'Twitter',
  YOUTUBE = 'YouTube'
}

export type AdType = 'full_ai' | 'filming_guide';

export interface TrendAnalysis {
  trends: string[];
  audioVibe: string;
  competitorHooks: string[];
}

export interface Scene {
  id: string;
  type: 'image' | 'video_placeholder';
  script: string; 
  visualPrompt: string; // Describes the AI image OR the instruction for the user video
  mediaUrl: string | null; 
  duration: number;
}

export interface ViralContent {
  script: string;
  captions: string[];
  hashtags: string[];
  scenes: Scene[];
  bgMusicVibe: string;
  thumbnailUrl?: string;
}

export interface AppState {
  step: AppStep;
  productDescription: string;
  viewerEmotion: string;
  voiceGender: 'male' | 'female';
  
  // Feature Extraction
  detectedFeatures: string[];
  selectedFeatures: string[];

  platform: SocialPlatform | null;
  adType: AdType;
  
  // Reference material (Context)
  appIconFile: File | null;
  appIconUrl: string | null;
  zipFile: File | null; // For YouTube deep dive
  
  trends: TrendAnalysis | null;
  
  generatedContent: ViralContent | null;
  voiceoverAudioUrl: string | null;
  bgMusicUrl: string | null;
  
  isProcessing: boolean;
  processingStatus: string;
  progress: number;
  error: string | null;
}
