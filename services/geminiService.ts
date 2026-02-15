
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { SocialPlatform, TrendAnalysis, ViralContent, Scene, AdType } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Music Library (Premium & Classic Collection) ---
// Switched to Internet Archive (Archive.org) direct MP3 links.
// These are standard MP3 files, very reliable, and classic.
const MUSIC_LIBRARY: Record<string, string> = {
  // Satie - Gymnopédie No.1 (Luxury/Calm/Classic)
  luxury: "https://archive.org/download/ErikSatieGymnopedieNo1/Erik%20Satie%20-%20Gymnopedie%20No%201.mp3",
  
  // Beethoven - Moonlight Sonata (Cinematic/Serious)
  cinematic: "https://archive.org/download/BeethovenMoonlightSonata_282/Beethoven-MoonlightSonata.mp3",
  
  // Chopin - Nocturne Op. 9 No. 2 (Emotional/Romantic)
  emotional: "https://archive.org/download/ChopinNocturneOp.9No.2_685/Chopin-NocturneOp.9No.2.mp3",
  
  // Satie (Same as Luxury for chill)
  chill: "https://archive.org/download/ErikSatieGymnopedieNo1/Erik%20Satie%20-%20Gymnopedie%20No%201.mp3",
  
  // Vivaldi - Spring (Upbeat/Bright)
  upbeat: "https://archive.org/download/VivaldiTheFourSeasons-Spring/01Spring-I.Allegro.mp3",
  
  // Mozart - Eine Kleine Nachtmusik (Energetic)
  energetic: "https://archive.org/download/MozartEineKleineNachtmusik_195/Mozart-EineKleineNachtmusik.mp3",
  
  // Fallback
  default: "https://archive.org/download/ErikSatieGymnopedieNo1/Erik%20Satie%20-%20Gymnopedie%20No%201.mp3"
};

const PRIMARY_MODEL = "gemini-3-flash-preview";
const FALLBACK_MODEL = "gemini-2.0-flash-exp";

export const selectBackgroundMusic = (vibeDescription: string): string => {
  const lower = (vibeDescription || "").toLowerCase();
  
  // Refined Vibe Matching
  if (lower.includes('luxury') || lower.includes('rich') || lower.includes('elegant') || lower.includes('fashion') || lower.includes('classic') || lower.includes('premium')) return MUSIC_LIBRARY.luxury;
  if (lower.includes('sad') || lower.includes('emotional') || lower.includes('story') || lower.includes('soft') || lower.includes('touching')) return MUSIC_LIBRARY.emotional;
  if (lower.includes('chill') || lower.includes('relax') || lower.includes('lofi') || lower.includes('study') || lower.includes('calm')) return MUSIC_LIBRARY.chill;
  if (lower.includes('epic') || lower.includes('movie') || lower.includes('dramatic') || lower.includes('trailer') || lower.includes('dark')) return MUSIC_LIBRARY.cinematic;
  if (lower.includes('rap') || lower.includes('hip hop') || lower.includes('gym') || lower.includes('drill') || lower.includes('fast') || lower.includes('energy')) return MUSIC_LIBRARY.energetic;
  if (lower.includes('happy') || lower.includes('fun') || lower.includes('upbeat') || lower.includes('joy') || lower.includes('bright')) return MUSIC_LIBRARY.upbeat;
  
  return MUSIC_LIBRARY.default; 
};

// --- Helper Functions ---

const base64ToWav = (base64: string): string => {
  const binaryString = atob(base64.replace(/\s/g, ''));
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const numChannels = 1;
  const sampleRate = 24000;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = bytes.length;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const pcmData = new Uint8Array(buffer, 44);
  pcmData.set(bytes);

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callGeminiWithRetry(fn: () => Promise<any>, retries = 3, baseDelay = 2000): Promise<any> {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (e: any) {
            const isRateLimit = e.message?.includes('429') || e.status === 429 || e.code === 429 || e.message?.includes('RESOURCE_EXHAUSTED');
            if (isRateLimit && i < retries - 1) {
                const delay = baseDelay * Math.pow(2, i); // Exponential backoff: 2s, 4s, 8s
                console.warn(`Rate limit 429. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
                await wait(delay);
                continue;
            }
            throw e;
        }
    }
}

// --- API Service Methods ---

async function callGeminiWithFallback(params: any, schema?: any): Promise<any> {
    try {
        const response = await ai.models.generateContent({
            model: PRIMARY_MODEL,
            ...params,
            config: {
                ...params.config,
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });
        return response;
    } catch (error: any) {
        if (error.message?.includes('403') || error.message?.includes('PERMISSION_DENIED') || error.status === 403 ||
            error.message?.includes('400') || error.message?.includes('INVALID_ARGUMENT') || error.status === 400) {
            
            console.warn(`Primary model ${PRIMARY_MODEL} failed (${error.status}). Falling back to ${FALLBACK_MODEL}.`);
            return await ai.models.generateContent({
                model: FALLBACK_MODEL,
                ...params,
                config: {
                    ...params.config,
                    responseMimeType: "application/json",
                    responseSchema: schema
                }
            });
        }
        throw error;
    }
}

export const extractUniqueFeatures = async (description: string): Promise<string[]> => {
  const prompt = `
    Analyze this product description: "${description}"
    
    Identify the top 4 specific features that are emotionally compelling.
    Focus on the "Benefit" not just the "Feature".
    Keep each concise (under 5 words).
    
    Return ONLY a JSON array of strings.
  `;

  try {
    const response = await callGeminiWithFallback(
        { contents: prompt },
        { type: Type.ARRAY, items: { type: Type.STRING } }
    );

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (e) {
    console.error("Feature extraction failed", e);
    return ["AI Automation", "Easy to Use", "High Performance", "Cost Effective"];
  }
};

export const analyzeTrends = async (
  description: string,
  platform: SocialPlatform
): Promise<TrendAnalysis> => {
  
  const trendPrompt = `
    Context: Advertising product "${description}" on ${platform}.
    Task: Search for current viral ad formats and "psychological hooks" used in top performing short-form content.
    Find 3 visual concepts that stop the scroll immediately.
    Find 1 trending audio vibe description.
    Find 3 short, punchy competitor text hooks.
  `;
  
  const trendSchema = {
      type: Type.OBJECT,
      properties: {
        trends: { type: Type.ARRAY, items: { type: Type.STRING } },
        audioVibe: { type: Type.STRING },
        competitorHooks: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
  };

  try {
      const res = await callGeminiWithFallback(
          { 
              contents: trendPrompt,
              config: { tools: [{ googleSearch: {} }] }
          },
          trendSchema
      );
      const text = res.text;
      return text ? JSON.parse(text) : { trends: [], audioVibe: "Upbeat", competitorHooks: [] };
  } catch (e) {
      console.warn("Trend analysis warning:", e);
      return { trends: ["Visual Loop", "Pattern Interrupt", "ASMR Unboxing"], audioVibe: "Upbeat", competitorHooks: [] };
  }
};

export const generateStoryboard = async (
  description: string,
  emotion: string,
  platform: SocialPlatform,
  trends: TrendAnalysis,
  selectedFeatures: string[],
  adType: AdType,
  hasZipContext: boolean
): Promise<ViralContent> => {
  
  const isYouTube = platform === SocialPlatform.YOUTUBE;
  const isFullAI = adType === 'full_ai';

  let narrativeInstructions = "";
  if (isYouTube) {
     narrativeInstructions = `
        **NARRATIVE STRUCTURE (YouTube Tutorial Ad)**:
        The user has uploaded a ZIP file with asset details. Treat this as a deep-dive educational ad.
        1. **The Hook (0-5s)**: "Stop doing X wrong." or "Here is the ultimate guide to..."
        2. **The Product Intro (5-10s)**: Introduce the product as the tool.
        3. **Step 1 (10-15s)**: "First, set it up like this..." (Educational)
        4. **Step 2 (15-20s)**: "Then, use this feature to..." (Demonstration)
        5. **The Result/CTA (20-25s)**: Show the final result and tell them where to download/buy.
        
        *Tone*: Educational, Helpful, Authority Figure.
        *Word Count*: Under 100 words (longer form allowed for YouTube).
     `;
  } else {
     narrativeInstructions = `
        **NARRATIVE STRUCTURE (Infinite Loop)**:
        1. **The Hook (0-3s)**: Start with second half of sentence.
        2. **Agitation**: Problem.
        3. **Reveal**: Solution.
        4. **CTA**: Explicit instruction.
        5. **Loop Bridge**: End with phrase like "And that's why..." that connects to start.
        *Word Count*: Under 65 words.
     `;
  }

  const sceneTypeConstraint = isFullAI 
    ? "CONSTRAINT: ALL scenes must be type 'image'. Do NOT use 'video_placeholder'. The user wants a full AI generated video."
    : "CONSTRAINT: Use a mix of 'image' (for visuals/b-roll) and 'video_placeholder' (where a human needs to demonstrate the product).";

  const prompt = `
    You are a Viral Content Architect. Create a high-retention video blueprint for: "${description}".
    
    **Vibe**: ${emotion}.
    **Platform**: ${platform}.
    **Features**: ${selectedFeatures.join(", ")}.
    **Ad Type**: ${isFullAI ? "Full AI Video (No Filming)" : "Creator Guide (User Films)"}.
    **Context**: ${hasZipContext ? "User provided deep-dive assets via ZIP. Ensure script is detailed and accurate." : "General generation."}

    ${narrativeInstructions}
    
    **SCENE VISUALS**:
    ${sceneTypeConstraint}
    - **CTA Scene**: Visually distinct.
    
    **Output (JSON)**:
    - scenes: Array of scenes (target ${isYouTube ? '6-8' : '5-6'} scenes).
    - bgMusicVibe: Mood for the music.
    - script: Full spoken narration.
    - captions: 3 viral caption hooks.
    - hashtags: 20 niche tags.
  `;

  const schema = {
        type: Type.OBJECT,
        properties: {
          script: { type: Type.STRING },
          captions: { type: Type.ARRAY, items: { type: Type.STRING } },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
          bgMusicVibe: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ['image', 'video_placeholder'] },
                script: { type: Type.STRING },
                visualPrompt: { type: Type.STRING, description: "Detailed photography prompt for AI" },
              }
            }
          }
        },
  };

  const response = await callGeminiWithFallback(
      { contents: prompt },
      schema
  );

  const text = response.text;
  if (!text) throw new Error("Failed to generate storyboard");
  
  const parsed = JSON.parse(text);
  
  // Post-process scenes for viral pacing
  const scenes = (parsed.scenes || []).map((s: any, index: number) => {
    // Dynamic duration based on viral pacing
    let duration = 3.0;
    const wordCount = (s.script || "").split(' ').length;
    duration = Math.max(2.0, wordCount * 0.4); // Fast speech rate

    if (index === 0) duration = 2.5; // Fast Hook
    if (index === parsed.scenes.length - 1) duration = 2.0; // Fast Loop Bridge
    
    return {
        ...s,
        id: `scene-${index}`,
        type: s.type,
        script: s.script || "",
        visualPrompt: s.visualPrompt || "Cinematic shot",
        duration: duration,
        mediaUrl: null
    };
  });

  return {
    script: parsed.script || "",
    captions: Array.isArray(parsed.captions) ? parsed.captions : [],
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
    bgMusicVibe: parsed.bgMusicVibe || "Upbeat",
    scenes: scenes,
  } as ViralContent;
};

export const generateImageForScene = async (scene: Scene): Promise<Scene> => {
  if (scene.type !== 'image') return scene;

  const model = "gemini-2.5-flash-image";
  
  // Enhance prompts for "Crispy" Quality
  const enhancedPrompt = `
    Hyper-realistic 4k image, vertical 9:16 aspect ratio.
    Subject: ${scene.visualPrompt}
    
    AESTHETIC SETTINGS:
    - Camera: Shot on Sony A7R IV, 35mm lens, f/1.8 aperture.
    - Lighting: Cinematic, volumetric lighting, high contrast, professional color grading.
    - Quality: 8k, Unreal Engine 5 render style, sharp focus, award-winning photography.
    - Vibe: Authentic, viral social media aesthetic, NOT stock photo.
  `;

  try {
    // Wrap in retry logic to handle 429
    const response = await callGeminiWithRetry(async () => {
        return await ai.models.generateContent({
            model,
            contents: {
                parts: [{ text: enhancedPrompt }]
            },
            config: {
                imageConfig: { aspectRatio: "9:16" }
            }
        });
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return {
          ...scene,
          mediaUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
        };
      }
    }
  } catch (e) {
    console.error("Image generation failed for scene", scene.id, e);
    // Return a styled placeholder on failure to prevent app crash
    return {
      ...scene,
      mediaUrl: "https://placehold.co/1080x1920/18181b/ffffff?text=Generation+Skipped"
    };
  }
  return scene;
};

export const generateThumbnail = async (description: string, emotion: string, visualHook: string): Promise<string> => {
  const model = "gemini-2.5-flash-image";
  const prompt = `
    Generate a CLICKBAIT YouTube/TikTok cover image (vertical 9:16).
    
    Subject: ${visualHook} relating to ${description}.
    
    Style: 
    - High Saturation.
    - Expressive face (if human).
    - Extreme close-up or wide dynamic shot.
    - "MrBeast style" thumbnail quality.
    - Sharp, 4k resolution.
  `;
  
  try {
    const response = await callGeminiWithRetry(async () => {
        return await ai.models.generateContent({
            model,
            contents: { parts: [{ text: prompt }] },
            config: { imageConfig: { aspectRatio: "9:16" } }
        });
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
       if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
       }
    }
  } catch (e) {
    console.error("Thumbnail generation failed", e);
  }
  return "";
};

export const generateVoiceover = async (script: string, gender: 'male' | 'female'): Promise<string> => {
  if (!script || script.trim().length === 0) return "";

  const model = "gemini-2.5-flash-preview-tts";
  const voiceName = gender === 'male' ? 'Puck' : 'Aoede'; 
  
  // Sanitize script slightly
  const cleanScript = script.replace(/[*#]/g, '');

  // TTS usually has higher limits, but we can wrap it too if needed. 
  // Sticking to single try for now as it's less prone to 429 than image gen.
  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: cleanScript }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error("Failed to generate audio");
  }
  
  return base64ToWav(base64Audio);
};
