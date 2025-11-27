import React, { useState, useEffect, useRef } from 'react';
import sdk from '@farcaster/miniapp-sdk';
import { Send, X, Upload, RotateCcw, Trophy, Sparkles, Briefcase, Smile, Zap } from 'lucide-react';

// --- 🧩 DATA: Story Slides ---
const INTRO_SLIDES = [
  { id: 1, emoji: "👋", title: "Not Just AI", text: "This isn't just AI content creation. It's a Mini App designed to help you make your own posts perfect.", bg: "from-violet-600 to-indigo-600", animation: "animate-wiggle" },
  { id: 2, emoji: "🏆", title: "Earn Rewards", text: "Generate captions and post to earn points. Climb the leaderboard (coming soon)!", bg: "from-blue-600 to-cyan-500", animation: "animate-float" },
  { id: 3, emoji: "🚀", title: "Native Posting", text: "Pick an image (or use your own) and post directly without leaving the app.", bg: "from-teal-500 to-emerald-500", animation: "animate-pulse" }
];

// --- 🧩 COMPONENT: Story Viewer ---
function StoryIntro({ onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentIndex < INTRO_SLIDES.length - 1) setCurrentIndex(c => c + 1);
      else onComplete();
    }, 4000);
    return () => clearTimeout(timer);
  }, [currentIndex, onComplete]);

  const handleTap = (e) => {
    const screenWidth = window.innerWidth;
    if (e.clientX > screenWidth / 2) {
      if (currentIndex < INTRO_SLIDES.length - 1) setCurrentIndex(c => c + 1);
      else onComplete();
    } else {
      if (currentIndex > 0) setCurrentIndex(c => c - 1);
    }
  };

  const slide = INTRO_SLIDES[currentIndex];
  return (
    <div onClick={handleTap} className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-white cursor-pointer bg-gradient-to-br ${slide.bg} transition-colors duration-700`}>
      <div className="absolute top-4 left-0 right-0 flex gap-1 px-2 z-10">
        {INTRO_SLIDES.map((s, idx) => (
          <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
            <div className={`h-full bg-white transition-all duration-300 ease-linear ${idx === currentIndex ? 'w-full' : idx < currentIndex ? 'w-full' : 'w-0'}`} style={{ transitionDuration: idx === currentIndex ? '4000ms' : '0ms' }} />
          </div>
        ))}
      </div>
      <div className="text-center animate-in fade-in zoom-in duration-500 slide-in-from-bottom-4">
        <div className={`text-8xl mb-6 drop-shadow-xl filter ${slide.animation}`}>{slide.emoji}</div>
        <h2 className="text-3xl font-bold mb-4 drop-shadow-md">{slide.title}</h2>
        <p className="text-lg opacity-90 font-medium leading-relaxed max-w-xs mx-auto">{slide.text}</p>
      </div>
      <div className="absolute bottom-8 left-0 right-0 flex justify-between px-8 text-sm opacity-50 uppercase tracking-widest"><span>Back</span><span>Tap to skip</span><span>Next</span></div>
    </div>
  );
}

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [localImage, setLocalImage] = useState(null);
  const fileInputRef = useRef(null);
  
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [mode, setMode] = useState('funny');
  const [points, setPoints] = useState(0);
  const [imageLoadStatus, setImageLoadStatus] = useState({});
  const [postConfirmed, setPostConfirmed] = useState(false);
  const [pointsAnimation, setPointsAnimation] = useState(null);

  useEffect(() => {
    const savedPoints = localStorage.getItem('magicCaptionPoints');
    if (savedPoints) setPoints(parseInt(savedPoints));

    const init = async () => {
      try { await sdk.actions.disableNativeGestures(); } catch (e) {}
      setTimeout(() => {
        sdk.actions.ready(); 
        setIsLoaded(true);
      }, 300);
    };
    init();
  }, []);

  const finishIntro = () => setShowIntro(false);

  const awardPoints = (amount, label) => {
    const newPoints = points + amount;
    setPoints(newPoints);
    localStorage.setItem('magicCaptionPoints', newPoints.toString());
    setPointsAnimation({ show: true, amount, label });
    setTimeout(() => setPointsAnimation(null), 2000);
  };

  const generateMagic = async () => {
    if (!input) return;
    setLoading(true);
    setLocalImage(null);
    setImageLoadStatus({});

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input, mode: mode })
      });
      
      if (!res.ok) throw new Error("API Failed");
      const data = await res.json();
      
      setResults(data);
      awardPoints(10, "Idea Generated");
    } catch (e) {
      console.error(e);
      alert("AI is busy. Please try again!");
    } finally {
      setLoading(false);
    }
  };

  const regenerateImages = async () => {
    if (!results || isImageLoading) return;
    setIsImageLoading(true);
    setImageLoadStatus({});
    
    try {
       const newImages = results.image_prompts.map((p) => {
          const encoded = encodeURIComponent(p + ", photorealistic, 8k");
          const seed = Math.floor(Math.random() * 99999);
          return `https://pollinations.ai/p/${encoded}?width=1080&height=1080&seed=${seed}&nologo=true&model=flux`;
       });
       setResults(prev => ({ ...prev, images: newImages }));
    } finally {
       setTimeout(() => setIsImageLoading(false), 500);
    }
  };

  const handleImageLoad = (url) => {
    setImageLoadStatus(prev => ({ ...prev, [url]: true }));
  };

  const postToFarcaster = async (image) => {
    if (!results) return;
    awardPoints(10, "Post Created");
    setPostConfirmed(true);
    setTimeout(() => setPostConfirmed(false), 1500);

    if (image && !image.startsWith('blob:')) {
      await sdk.actions.composeCast({ text: results.caption, embeds: [image] });
    } else {
      await sdk.actions.composeCast({ text: results.caption });
    }
  };

  if (!isLoaded) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans overflow-hidden relative pb-8 flex flex-col items-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#2a1b3d] via-[#0f172a] to-black pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <input type="file" ref={fileInputRef} onChange={(e) => {
          if(e.target.files[0]) setLocalImage(URL.createObjectURL(e.target.files[0]));
      }} accept="image/*" className="hidden" />

      {showIntro && <StoryIntro onComplete={finishIntro} />}

      {pointsAnimation && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in zoom-in fade-in duration-300 flex flex-col items-center pointer-events-none">
          <div className="flex items-center gap-2 mb-2">
             <Trophy className="w-16 h-16 text-yellow-400 drop-shadow-glow animate-bounce" />
             <div className="text-6xl font-bold text-yellow-400 drop-shadow-glow">+{pointsAnimation.amount}</div>
          </div>
          <div className="text-xl font-bold text-white bg-black/50 px-4 py-1 rounded-full backdrop-blur-sm">{pointsAnimation.label}</div>
        </div>
      )}
      
      {postConfirmed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-purple-600 p-6 rounded-2xl flex flex-col items-center animate-in zoom-in-50">
              <Send className="w-10 h-10 text-white mb-2" />
              <h3 className="text-xl font-bold">Composer Opened!</h3>
           </div>
        </div>
      )}

      <div className="absolute top-4 right-4 z-20">
          <div className="flex items-center gap-1.5 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-full px-3 py-1.5 shadow-sm">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="font-bold text-sm text-yellow-100">{points}</span>
          </div>
      </div>

      <div className="w-full max-w-md h-full flex flex-col flex-grow relative px-6 z-10 pt-10">
        {!results ? (
          <div className="flex flex-col flex-grow justify-center items-center animate-in fade-in duration-700 space-y-6">
             <div className="relative">
               <h1 className="text-4xl font-bold text-center tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 drop-shadow-lg">Magic Caption</h1>
               <Sparkles className="absolute -top-4 -right-6 w-5 h-5 text-yellow-300 animate-pulse opacity-80" />
               <Sparkles className="absolute -bottom-2 -left-6 w-3 h-3 text-purple-300 animate-ping-slow opacity-60" />
             </div>

             <div className="relative group cursor-pointer my-4 animate-in zoom-in duration-1000 delay-300">
                <div className="absolute inset-0 bg-[#0052FF] rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000 animate-pulse-slow"></div>
                <div className="w-24 h-24 relative z-10 animate-float">
                  <div className="w-full h-full bg-[#0052FF] rounded-full shadow-2xl flex items-center justify-center border-4 border-white/10 relative overflow-hidden group-hover:scale-105 transition-transform duration-500 ease-out">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent translate-x-[-150%] animate-shine-infinite"></div>
                    <div className="w-8 h-8 bg-white/20 rounded-full blur-md animate-pulse"></div>
                  </div>
                </div>
             </div>

             <div className="w-full bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-center shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
               <h3 className="font-semibold text-white mb-1 tracking-wide">The AI that makes your post perfect</h3>
               <p className="text-xs text-slate-400 leading-relaxed">Magic Caption shapes your thoughts into the perfect vibe.</p>
             </div>

             <div className="w-full flex flex-col gap-3 mt-2">
               <div className="flex gap-2 w-full p-1 bg-slate-900/20 backdrop-blur-sm rounded-xl border border-white/5">
                 <button onClick={() => setMode('professional')} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex flex-col items-center gap-1 active:scale-95 ${mode === 'professional' ? 'bg-purple-500/30 text-white shadow-inner border border-purple-500/50' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                   <Briefcase className={`w-4 h-4 ${mode === 'professional' ? 'animate-nod text-blue-300' : ''}`} /> Pro
                 </button>
                 <button onClick={() => setMode('funny')} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex flex-col items-center gap-1 active:scale-95 ${mode === 'funny' ? 'bg-purple-500/30 text-white shadow-inner border border-purple-500/50' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                   <Smile className={`w-4 h-4 ${mode === 'funny' ? 'animate-wiggle text-yellow-300' : ''}`} /> Funny
                 </button>
                 <button onClick={() => setMode('unhinge')} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex flex-col items-center gap-1 active:scale-95 ${mode === 'unhinge' ? 'bg-purple-500/30 text-white shadow-inner border border-purple-500/50' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                   <Zap className={`w-4 h-4 ${mode === 'unhinge' ? 'animate-shake-wild text-red-400' : ''}`} /> Unhinge
                 </button>
               </div>

               <div className="w-full bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-1 shadow-lg group focus-within:border-purple-500/30 focus-within:shadow-purple-500/10 transition-all duration-300 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                 <div className="flex justify-between px-4 pt-3 pb-1">
                   <label className="text-slate-400 text-sm font-medium">What's the vibe today?</label>
                   {input.length > 0 && (
                     <button onClick={() => setInput('')} className="text-xs text-purple-400 hover:text-purple-300 font-medium active:scale-95 transition-transform flex items-center gap-1">
                      <RotateCcw className="w-3 h-3" /> Clear
                     </button>
                   )}
                 </div>
                 <textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full bg-transparent border-none text-white text-lg p-4 h-24 focus:ring-0 placeholder:text-slate-600 resize-none outline-none" />
               </div>
             </div>
             
             <div className="flex-grow"></div>

             <button onClick={generateMagic} disabled={loading || !input} className={`w-full py-4 rounded-2xl font-bold text-lg shadow-2xl transition-all duration-200 transform active:scale-95 mb-6 flex items-center justify-center relative overflow-hidden group ${loading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-md text-white hover:shadow-purple-500/20 hover:border-white/20'}`}>
               <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shine pointer-events-none"></div>
               {loading ? (
                 <span className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Brewing...</span>
               ) : 'Make it Perfect'}
             </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-8">
            <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-xl relative group">
              <div className="flex justify-between mb-3">
                 <h3 className="text-xs font-bold text-purple-400 uppercase">Generated Caption</h3>
                 <button onClick={() => { setResults(null); setInput(''); }} className="text-slate-500 hover:text-white transition-all p-1 hover:bg-white/10 rounded-full active:scale-90"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-lg leading-relaxed text-slate-200 whitespace-pre-line">{results.caption}</p>
            </div>

            <div className="space-y-4">
               <div className="flex items-center justify-center gap-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select Image (+10 <span className="text-yellow-500">✨</span>)</h3>
                  <button onClick={regenerateImages} disabled={isImageLoading} className="text-slate-500 hover:text-white transition-all p-1 hover:bg-white/10 rounded-full active:scale-90 disabled:opacity-50">
                     {isImageLoading ? <RotateCcw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  </button>
               </div>

               <div className="grid grid-cols-2 gap-3 relative">
                 {isImageLoading && <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-30 flex items-center justify-center rounded-2xl col-span-2"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>}

                 <button onClick={() => fileInputRef.current.click()} className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-200 aspect-square flex flex-col items-center justify-center group active:scale-95 ${localImage ? 'border-purple-500 shadow-purple-500/20 shadow-lg' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-900/50'}`}>
                   {localImage ? (
                     <>
                       <img src={localImage} className="w-full h-full object-cover absolute inset-0" alt="Local upload" />
                       <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 hover:opacity-100 z-10 transition-opacity p-2 text-center">
                         <Send className="w-8 h-8 mb-2 text-white" />
                         <span className="font-bold text-sm text-white">Post This</span>
                       </div>
                     </>
                   ) : (
                     <>
                       <div className="bg-slate-800 p-3 rounded-full mb-2 group-hover:bg-slate-700 transition-colors"><Upload className="w-6 h-6 text-slate-400" /></div>
                       <span className="text-sm font-medium text-slate-400">My Photo</span>
                     </>
                   )}
                 </button>

                 {results.images.map((img, idx) => {
                   const isImageLoaded = imageLoadStatus[img];
                   return (
                     <button key={img} onClick={() => postToFarcaster(img)} className={`relative group overflow-hidden rounded-2xl border-2 border-transparent hover:border-purple-500/50 focus:border-purple-500 aspect-square shadow-lg transition-all duration-200 active:scale-95 ${!isImageLoaded ? 'bg-slate-800 animate-pulse' : 'bg-slate-900/70'}`} disabled={!isImageLoaded}>
                       {!isImageLoaded && (
                         <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2">
                            <div className="w-8 h-8 border-4 border-white/20 border-t-purple-500 rounded-full animate-spin"></div>
                            <span className="text-xs text-slate-400 font-medium">Generating...</span>
                         </div>
                       )}
                       <img src={img} className={`w-full h-full object-cover relative z-10 transition-opacity duration-500 group-hover:scale-110 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`} loading="lazy" alt={`AI generated ${idx}`} onLoad={() => handleImageLoad(img)} onError={() => handleImageLoad(img)} />
                       <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 flex flex-col items-center justify-end pb-4 z-20 transition-opacity ${isImageLoaded ? '' : 'hidden'}`}>
                          <span className="font-bold text-sm flex items-center gap-1 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30"><Send className="w-3 h-3" /> Post AI</span>
                       </div>
                     </button>
                   );
                 })}
               </div>
            </div>

            <button onClick={handleReset} className="w-full py-4 text-slate-500 font-medium hover:text-white transition-all flex items-center justify-center gap-2 group hover:bg-slate-900 rounded-2xl active:scale-95">
              <RotateCcw className="w-4 h-4 group-hover:-rotate-180 transition-transform duration-500" /> Start Over
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
        .animate-float { animation: float 4s ease-in-out infinite; }
        @keyframes pulse-slow { 0%, 100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.1); } }
        .animate-pulse-slow { animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes shine { 100% { transform: translateX(100%); } }
        .group-hover\\:animate-shine:hover { animation: shine 0.7s; }
        @keyframes shine-infinite { 0% { transform: translateX(-150%) skewX(-20deg); } 50% { transform: translateX(150%) skewX(-20deg); } 100% { transform: translateX(150%) skewX(-20deg); } }
        .animate-shine-infinite { animation: shine-infinite 3s ease-in-out infinite; }
        @keyframes wiggle { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
        .animate-wiggle { animation: wiggle 0.5s ease-in-out infinite; }
        @keyframes shake-wild { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 25% { transform: translate(-2px, 2px) rotate(-5deg); } 50% { transform: translate(2px, -2px) rotate(5deg); } 75% { transform: translate(-2px, -2px) rotate(-5deg); } }
        .animate-shake-wild { animation: shake-wild 0.3s linear infinite; }
        @keyframes nod { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        .animate-nod { animation: nod 1s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
