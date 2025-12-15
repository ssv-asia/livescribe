import React, { useState, useEffect } from 'react';
import { TranscriptDisplay } from './components/TranscriptDisplay';
import { Activity, Terminal, ExternalLink, Mic, MonitorPlay, Code, X, Copy, Check, Link } from 'lucide-react';

const App: React.FC = () => {
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [isReadyToCapture, setIsReadyToCapture] = useState<boolean>(false);
  const [sourceType, setSourceType] = useState<'tab' | 'microphone'>('tab');
  const [showEmbedModal, setShowEmbedModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [embedCode, setEmbedCode] = useState<string>('');
  const [currentAppUrl, setCurrentAppUrl] = useState<string>('');
  const [urlCopied, setUrlCopied] = useState<boolean>(false);

  const handleOpenLink = () => {
    if (youtubeUrl) {
      window.open(youtubeUrl, '_blank');
      setIsReadyToCapture(true);
    }
  };

  const handleMicStart = () => {
    setIsReadyToCapture(true);
  };

  // Update embed code when modal opens to ensure current URL is captured correctly
  useEffect(() => {
    if (showEmbedModal) {
      // Use window.location.href (stripped of query/hash) to handle subdirectories/paths correctly
      const url = typeof window !== 'undefined' 
        ? window.location.href.split('?')[0].split('#')[0] 
        : 'https://your-app-url.com';
      
      setCurrentAppUrl(url);

      const code = `<iframe 
  src="${url}" 
  style="width: 100%; height: 70vh; min-height: 500px; border: 1px solid #14532d; border-radius: 8px; background-color: #000;" 
  allow="microphone; display-capture; autoplay" 
  title="LiveScribe Transcription"
></iframe>`;
      setEmbedCode(code);
    }
  }, [showEmbedModal]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyUrlToClipboard = () => {
    navigator.clipboard.writeText(currentAppUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-black text-green-500 font-mono relative">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-green-900 bg-gray-950/50 backdrop-blur-sm z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <Terminal className="w-6 h-6 animate-pulse" />
          <h1 className="text-xl font-bold tracking-wider">LIVESCRIBE<span className="text-xs ml-2 opacity-70 font-normal">WEB TRANSCRIPTION</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowEmbedModal(true)}
            className="flex items-center gap-2 text-xs hover:text-green-300 transition-colors border border-green-900/50 px-3 py-1 rounded bg-green-900/10"
          >
            <Code className="w-4 h-4" />
            <span>EMBED</span>
          </button>
          <div className="flex items-center gap-2 text-xs opacity-70 hidden sm:flex">
            <Activity className="w-4 h-4" />
            <span>CLIENT-SIDE MODE</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {/* Setup Toolbar */}
        {!isReadyToCapture ? (
           <div className="border-b border-green-900 p-6 bg-gray-900/50">
             <div className="max-w-2xl mx-auto flex flex-col gap-6">
               <h2 className="text-sm uppercase tracking-widest opacity-80 text-center">Select Audio Source</h2>
               
               {/* Source Selector */}
               <div className="flex gap-4">
                  <button 
                    onClick={() => setSourceType('tab')}
                    className={`flex-1 py-4 px-4 rounded border flex flex-col items-center justify-center gap-2 transition-all ${sourceType === 'tab' ? 'bg-green-900/30 border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'border-green-900/30 text-green-800 hover:border-green-700 hover:bg-green-900/10'}`}
                  >
                    <MonitorPlay className="w-6 h-6" />
                    <span className="font-bold text-sm">YouTube / Tab Audio</span>
                  </button>
                  <button 
                    onClick={() => setSourceType('microphone')}
                    className={`flex-1 py-4 px-4 rounded border flex flex-col items-center justify-center gap-2 transition-all ${sourceType === 'microphone' ? 'bg-green-900/30 border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'border-green-900/30 text-green-800 hover:border-green-700 hover:bg-green-900/10'}`}
                  >
                    <Mic className="w-6 h-6" />
                    <span className="font-bold text-sm">Device Microphone</span>
                  </button>
               </div>

               {/* Source Specific Inputs */}
               {sourceType === 'tab' ? (
                 <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                   <div className="flex gap-2">
                     <input 
                       type="text" 
                       value={youtubeUrl} 
                       onChange={(e) => setYoutubeUrl(e.target.value)}
                       placeholder="Paste YouTube Livestream URL here..."
                       className="flex-1 bg-black border border-green-800 rounded px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors placeholder-green-900"
                     />
                     <button 
                       onClick={handleOpenLink}
                       disabled={!youtubeUrl}
                       className="bg-green-900/30 hover:bg-green-900/50 border border-green-700 text-green-400 px-6 py-2 rounded flex items-center gap-2 disabled:opacity-50 transition-all font-bold text-sm whitespace-nowrap"
                     >
                       <ExternalLink className="w-4 h-4" />
                       OPEN TAB & READY
                     </button>
                   </div>
                   <p className="text-xs text-green-800">
                     * Opening the video in a new tab is required to capture its audio securely.
                   </p>
                 </div>
               ) : (
                  <div className="text-center py-2 animate-in fade-in slide-in-from-top-4 duration-300">
                     <button 
                       onClick={handleMicStart}
                       className="bg-green-900/30 hover:bg-green-900/50 border border-green-700 text-green-400 px-12 py-3 rounded inline-flex items-center gap-2 mx-auto font-bold text-sm transition-all"
                     >
                       <Mic className="w-4 h-4" />
                       ACTIVATE MICROPHONE
                     </button>
                  </div>
               )}
             </div>
           </div>
        ) : (
          <div className="border-b border-green-900 p-4 bg-green-900/10 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <span className="bg-green-500 text-black text-xs font-bold px-2 py-0.5 rounded uppercase">
                    {sourceType === 'tab' ? 'Tab Audio' : 'Microphone'}
                </span>
                <span className="text-sm opacity-90">
                    {sourceType === 'tab' 
                        ? <>Click <strong>Start</strong> below. Select the <strong>YouTube Tab</strong> and check <strong>"Share Audio"</strong>.</>
                        : <>Click <strong>Start</strong> below and allow microphone access when prompted.</>
                    }
                </span>
             </div>
             <button 
               onClick={() => {
                 setYoutubeUrl('');
                 setIsReadyToCapture(false);
               }}
               className="text-xs hover:underline opacity-50 text-green-400"
             >
               Change Source
             </button>
          </div>
        )}

        <TranscriptDisplay isReady={isReadyToCapture} sourceType={sourceType} />
      </main>

      {/* Footer */}
      <footer className="py-2 px-6 text-xs text-green-900 border-t border-green-900/30 bg-black flex justify-between">
        <span>POWERED BY GEMINI LIVE API</span>
        <span>v2.1.0 (MULTI-SOURCE)</span>
      </footer>

      {/* Embed Modal */}
      {showEmbedModal && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-green-800 rounded-lg w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-green-900">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Code className="w-5 h-5" />
                Embed Code
              </h3>
              <button onClick={() => setShowEmbedModal(false)} className="hover:text-green-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <p className="text-sm opacity-80">
                Copy the code below to embed the transcript viewer on your site. 
                It includes necessary permission flags.
              </p>

              {/* URL Display */}
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-green-700 flex items-center gap-2">
                  <Link className="w-3 h-3" /> Application URL
                </label>
                <div className="flex gap-2 relative">
                   <input 
                    type="text" 
                    readOnly 
                    value={currentAppUrl}
                    className="flex-1 bg-black border border-green-900 rounded px-3 py-2 text-sm text-green-500 focus:outline-none"
                   />
                   <button 
                      onClick={copyUrlToClipboard}
                      className="bg-green-900/30 hover:bg-green-900/50 border border-green-800 text-green-400 px-3 rounded flex items-center gap-2 transition-all"
                   >
                     {urlCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                   </button>
                </div>
              </div>
              
              {/* Iframe Code */}
              <div className="space-y-2">
                 <label className="text-xs uppercase font-bold text-green-700">HTML Embed Code</label>
                 <div className="relative group">
                    <textarea 
                      value={embedCode}
                      onChange={(e) => setEmbedCode(e.target.value)}
                      className="w-full h-32 bg-black border border-green-900 rounded p-4 font-mono text-xs text-green-400 focus:outline-none resize-none focus:border-green-500 transition-colors"
                      spellCheck={false}
                    />
                    <button 
                      onClick={copyToClipboard}
                      className="absolute top-2 right-2 p-2 bg-green-900/50 hover:bg-green-800 rounded border border-green-700 transition-all opacity-0 group-hover:opacity-100"
                      title="Copy to clipboard"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
              </div>

              <div className="text-xs text-green-800 italic">
                * Note: The embedding site must be served over HTTPS for microphone/display-capture permissions to work.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;