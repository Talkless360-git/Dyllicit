import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Next.js App Router route segment config
// Increases the body size limit beyond Vercel's default 4.5MB for serverless functions
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for large file transcription

// Supported audio file extensions and MIME types
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB max (both OpenAI and Groq limit)

/**
 * Detects which API provider to use based on the key prefix.
 * - Groq keys start with "gsk_"
 * - OpenAI keys start with "sk-"
 */
function resolveProvider(apiKey: string): {
  provider: 'groq' | 'openai';
  endpoint: string;
  model: string;
} {
  if (apiKey.startsWith('gsk_')) {
    return {
      provider: 'groq',
      endpoint: 'https://api.groq.com/openai/v1/audio/transcriptions',
      model: 'whisper-large-v3-turbo', // Fast, free, high-accuracy Groq model
    };
  }
  return {
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1/audio/transcriptions',
    model: 'whisper-1',
  };
}

export async function POST(req: Request) {
  try {
    // 1. Session Authorization Guard
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    // 2. Parse FormData
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided.' }, { status: 400 });
    }

    // 3. Validate file extension and size
    const fileName = file.name || 'audio.mp3';
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    const isSupportedExtension = ['mp3', 'wav', 'm4a', 'mp4', 'webm', 'ogg', 'flac'].includes(fileExtension);

    if (!isSupportedExtension) {
      return NextResponse.json({
        error: 'Unsupported file format.',
        details: `We support MP3, WAV, M4A, MP4, WEBM, OGG, and FLAC. Got: .${fileExtension}`
      }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: 'File too large.',
        details: `Maximum audio file size is 25MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`
      }, { status: 400 });
    }

    // 4. Check API key — support GROQ_API_KEY or OPENAI_API_KEY
    const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || '';
    const isMockMode = !apiKey || apiKey.trim() === '' || apiKey.startsWith('your_');

    // 5. Smart Mock Fallback (no API key configured)
    if (isMockMode) {
      console.warn(`[AI Transcribe] No API key configured. Using smart mock fallback for: ${fileName}`);
      await new Promise(resolve => setTimeout(resolve, 2500));

      const mockLyrics = `[00:00.00] (Instrumental Intro)
[00:04.00] Under the neon city glow
[00:08.50] Feeling the rhythm start to flow
[00:13.00] Dyllicit frequencies in the air
[00:17.50] A brand new digital sound we share
[00:22.00] Locked in the blockchain, safe and free
[00:26.50] This is the future of you and me
[00:31.00] (Melodic Chorus / Synthesizer Lead)
[00:36.00] Releasing the sound, breaking the chain
[00:40.50] Streaming the beats that ease the pain
[00:45.00] The fans are connected, the node is alive
[00:49.50] Together we listen, together we thrive
[00:54.00] (Instrumental Outro)`;

      return NextResponse.json({
        success: true,
        text: mockLyrics,
        isMock: true,
        provider: 'mock',
        fileName,
        confidence: 0.98,
        language: 'english'
      });
    }

    // 6. Resolve provider (Groq vs OpenAI) from the key prefix
    const { provider, endpoint, model } = resolveProvider(apiKey);
    console.log(`[AI Transcribe] Using ${provider.toUpperCase()} (${model}) for file: ${fileName} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    // 7. Build multipart/form-data payload for the Whisper endpoint
    const whisperFormData = new FormData();
    whisperFormData.append('file', file, fileName);
    whisperFormData.append('model', model);
    // verbose_json returns per-segment timestamps so we can build accurate LRC output
    whisperFormData.append('response_format', 'verbose_json');

    // 8. Call the resolved Whisper endpoint
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: whisperFormData
    });

    if (!response.ok) {
      let errorMessage = `${provider.toUpperCase()} API returned status ${response.status}`;
      try {
        const errorResponse = await response.json();
        errorMessage = errorResponse?.error?.message || errorMessage;
      } catch {}
      console.error(`[AI Transcribe] ${provider.toUpperCase()} API Error:`, errorMessage);
      throw new Error(errorMessage);
    }

    const result = await response.json();

    // 9. Convert verbose_json segments → LRC format for precise player sync
    let lyricsText: string = result.text || '';
    if (result.segments && Array.isArray(result.segments) && result.segments.length > 0) {
      lyricsText = result.segments
        .map((seg: { start: number; text: string }) => {
          const start = seg.start as number;
          const m = Math.floor(start / 60);
          const s = Math.floor(start % 60);
          const cs = Math.round((start % 1) * 100);
          const mm = String(m).padStart(2, '0');
          const ss = String(s).padStart(2, '0');
          const cc = String(cs).padStart(2, '0');
          return `[${mm}:${ss}.${cc}] ${seg.text.trim()}`;
        })
        .filter((line: string) => line.trim() !== '')
        .join('\n');
    }

    // 10. Return the transcription
    return NextResponse.json({
      success: true,
      text: lyricsText,
      isMock: false,
      provider,
      fileName,
      confidence: 0.97,
      language: result.language || 'english'
    });

  } catch (error: any) {
    console.error('[AI Transcribe] Server Error:', error);
    return NextResponse.json({
      error: 'Failed to generate transcription.',
      details: error.message
    }, { status: 500 });
  }
}
