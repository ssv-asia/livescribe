import React, { useEffect, useState, useRef, useCallback } from 'react';
import { AlertCircle, Loader2, Mic, Play, Square, MonitorPlay } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

interface TranscriptDisplayProps {
  isReady: boolean;
  sourceType: 'tab' | 'microphone';
}

export const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({ isReady, sourceType }) => {
  const [transcripts, setTranscripts] = useState<{time: string, text: string}[]>([]);
  const [currentLine, setCurrentLine] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'listening' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<any>(null); 
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  
  // Use Ref for the buffer to safely access it inside interval and event callbacks
  const textBufferRef = useRef<string>('');

  // Helper: Base64 Encode
  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Helper: Create PCM Blob
  const createPcmData = (data: Float32Array) => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      const s = Math.max(-1, Math.min(1, data[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return encode(new Uint8Array(int16.buffer));
  };

  // Helper: Flush the buffer to the transcript history
  const flushTranscript = useCallback(() => {
    const text = textBufferRef.current;
    if (text && text.trim().length > 0) {
      const timestamp = new Date().toLocaleTimeString();
      setTranscripts(prev => [...prev, { time: timestamp, text: text.trim() }]);
      textBufferRef.current = '';
      setCurrentLine('');
    }
  }, []);

  const stopTranscription = () => {
    // Force final flush
    flushTranscript();

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    setStatus('idle');
  };

  const startTranscription = async () => {
    setStatus('connecting');
    setErrorMessage(null);
    textBufferRef.current = ''; // Reset buffer
    setCurrentLine('');

    try {
      let stream: MediaStream;
      
      if (sourceType === 'tab') {
        // 1. Get Screen/Tab Audio (getDisplayMedia)
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: true, // Required for tab selector
            audio: true
          });
        } catch (permErr: any) {
          if (permErr.name === 'NotAllowedError') {
             throw new Error("Permission denied. You cancelled the stream selection.");
          }
          throw permErr;
        }

        const audioTrack = stream.getAudioTracks()[0];
        if (!audioTrack) {
          stream.getTracks().forEach(t => t.stop());
          throw new Error("No audio track found. Did you check 'Share tab audio'?");
        }

        // Stop video immediately, we only want audio
        stream.getVideoTracks().forEach(track => track.stop());
        
        audioTrack.onended = () => {
            stopTranscription();
        };

      } else {
        // 1. Get Microphone Audio (getUserMedia)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
          });
        } catch (permErr: any) {
           if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
              throw new Error("Microphone permission denied. Please allow access in your browser settings.");
           }
           throw permErr;
        }
      }

      mediaStreamRef.current = stream;

      // 2. Audio Context (16kHz)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioContext.destination);

      // 3. Gemini Live
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setStatus('listening');
          },
          onmessage: (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              if (text) {
                textBufferRef.current += text;
                setCurrentLine(textBufferRef.current);
              }
            }
          },
          onclose: () => {
            if (status !== 'idle') stopTranscription();
          },
          onerror: (e) => {
            console.error("Gemini API Error:", e);
            setErrorMessage("Connection error with Gemini API.");
            stopTranscription();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO], 
          inputAudioTranscription: {}, 
          systemInstruction: "You are a professional stenographer. Transcribe the audio stream exactly as heard into text. Do not reply to the content. Do not output any audio.",
        }
      });
      
      sessionRef.current = sessionPromise;

      // 4. Stream Data
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const b64Data = createPcmData(inputData);
        
        sessionPromise.then(session => {
          session.sendRealtimeInput({
            media: {
              mimeType: 'audio/pcm;rate=16000',
              data: b64Data
            }
          });
        });
      };

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to start transcription.");
      setStatus('error');
      stopTranscription();
    }
  };

  // Auto-save every 30 seconds if there is content
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (status === 'listening') {
      interval = setInterval(() => {
        flushTranscript();
      }, 30000);
    }
    return () => clearInterval(interval);
  }, [status, flushTranscript]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts, currentLine]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Control Area */}
      {status === 'idle' && isReady && (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
           <div className="bg-green-900/10 border border-green-800 rounded-lg p-8 max-w-lg">
              {sourceType === 'tab' ? (
                 <MonitorPlay className="w-12 h-12 mx-auto mb-4 text-green-500 animate-pulse" />
              ) : (
                 <Mic className="w-12 h-12 mx-auto mb-4 text-green-500 animate-pulse" />
              )}
              
              <h3 className="text-xl font-bold mb-2">Ready to Transcribe</h3>
              
              {sourceType === 'tab' ? (
                <p className="opacity-70 mb-6 text-sm">
                  Click the button below. A browser dialog will appear. <br/>
                  <span className="text-green-400 font-bold underline decoration-wavy">You MUST select the specific YouTube Tab and check "Share tab audio"</span>.
                </p>
              ) : (
                <p className="opacity-70 mb-6 text-sm">
                   Click the button below. <br/>
                   <span className="text-green-400 font-bold">Please allow microphone access</span> when prompted by your browser.
                </p>
              )}

              <button 
                onClick={startTranscription}
                className="bg-green-600 hover:bg-green-500 text-black font-bold px-8 py-3 rounded flex items-center gap-2 mx-auto transition-all transform hover:scale-105"
              >
                <Play className="w-5 h-5" fill="black" />
                START TRANSCRIPTION
              </button>
           </div>
        </div>
      )}

      {/* Error Display */}
      {status === 'error' && (
        <div className="p-4 bg-red-900/20 border-b border-red-900 text-red-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setStatus('idle')} className="underline">Dismiss</button>
        </div>
      )}

      {/* Transcript Log */}
      {(status === 'listening' || transcripts.length > 0) && (
        <div className="flex-1 overflow-y-auto p-6 font-mono text-base space-y-4">
           {transcripts.length === 0 && currentLine === '' && status === 'listening' && (
             <div className="opacity-50 italic flex items-center gap-2">
               <Loader2 className="w-4 h-4 animate-spin" />
               Listening for speech...
             </div>
           )}
           
           {transcripts.map((item, idx) => (
             <div key={idx} className="flex gap-4 group hover:bg-green-900/5 p-1 rounded">
               <span className="text-green-800 text-xs py-1 select-none shrink-0 w-20">{item.time}</span>
               <span className="flex-1 text-green-300 break-words">{item.text}</span>
             </div>
           ))}

           {currentLine && (
             <div className="flex gap-4 opacity-70">
                <span className="text-green-800 text-xs py-1 select-none shrink-0 w-20">...</span>
                <span className="flex-1 text-green-500/80 animate-pulse break-words">{currentLine}</span>
             </div>
           )}
           <div ref={bottomRef} />
        </div>
      )}

      {/* Active Control Bar */}
      {status === 'listening' && (
        <div className="p-4 border-t border-green-900 bg-gray-900/80 backdrop-blur flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
             <span className="text-sm font-bold tracking-wider text-red-400">
                {sourceType === 'tab' ? 'LIVE TAB CAPTURE' : 'LIVE MIC RECORDING'}
             </span>
          </div>
          <button 
            onClick={stopTranscription}
            className="border border-red-900/50 hover:bg-red-900/20 text-red-500 px-4 py-1.5 rounded text-xs flex items-center gap-2 transition-colors uppercase"
          >
            <Square className="w-3 h-3" fill="currentColor" />
            Stop
          </button>
        </div>
      )}
    </div>
  );
};