import React, { useState, useEffect, useRef } from 'react';
// 👇 UNCOMMENT THIS LINE IN YOUR VS CODE PROJECT:
// import sdk from '@farcaster/miniapp-sdk'; 
import { Send, X, Upload, RotateCcw, Trophy, Sparkles, Briefcase, Smile, Zap, AlertCircle } from 'lucide-react';

// --- 🔑 CONFIGURATION ---
const GEMINI_API_KEY = ""; 

// --- 🛠️ MOCK SDK (FOR PREVIEW ONLY) ---
// DELETE THIS SECTION WHEN MOVING TO VS CODE
const mockSdk = {
  actions: {
    ready: () => console.log("✅ SDK: Ready signal sent"),
    disableNativeGestures: () => console.log("🚫 SDK: Gestures disabled"),
    composeCast: async ({ text, embeds }) => {
      console.log("📝 SDK: Opening Composer", { text, embeds });
      return new Promise((resolve) => setTimeout(resolve, 500));
    },
    close: () => console.log("❌ SDK: Closing App"),
    openUrl: (url) => console.log("🔗 SDK: Opening URL", url),
  }
};
// ---------------------------------------------------------

// --- 🧩 DATA: Story Slides ---
const INTRO_SLIDES = [
  { id: 1, emoji: "👋", title: "Not Just AI", text: "This isn't just AI content creation. It's a Mini App designed to help you make your own posts perfect.", bg: "from-violet-600 to-indigo-600", animation: "animate-wiggle" },
  { id: 2, emoji: "🏆", title: "Earn Rewards", text: "Generate captions and post to earn points. Climb the leaderboard (coming soon)!", bg: "from-blue-600 to-cyan-500", animation: "animate-float" },
  { id: 3, emoji: "🚀", title: "Native Posting", text: "Pick an image (or use your own) and post directly without leaving the app.", bg: "from-teal-500 to-emerald-500", animation: "animate-pulse" }
];

function StoryIntro({ onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentIndex < INTRO_SLIDES.length - 1) setCurrentIndex(c => c + 1);
      else onComplete();
    }, 4000);
    return () => clearTimeout(timer);
  }, [currentIndex, onComplete]);

  const handleTap = () => {
      if (currentIndex < INTRO_SLIDES.length - 1) setCurrentIndex(c => c + 1);
      else onComplete();
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
    </div>
  );
}

// --- 🧠 SMART FALLBACK LOGIC ---
const generateSmartFallback = (input) => {
  const lower = input.toLowerCase();
  let caption = "";
  
  if (lower.includes('morning')) {
    caption = "Rise and shine, Farcaster fam! ☀️☕️ \n\nAnother day to build, create, and connect. Let's make this one count. What's everyone working on today? 👇 \n\n#GoodMorning #BuilderEnergy #Warpcast";
  } else if (lower.includes('gym') || lower.includes('workout')) {
    caption = "Sweat now, shine later. 💪😤 \n\nJust crushed a session and feeling absolutely unstoppable. Remember: consistency is the only cheat code. \n\n#FitnessJourney #GrindMode";
  } else if (lower.includes('coffee')) {
    caption = "Life begins after coffee. ☕️✨ \n\nFueling up for a massive day ahead. If you're reading this, go get that caffeine fix. \n\n#CoffeeVibes #Focus";
  } else if (lower.includes('code') || lower.includes('build')) {
    caption = "Ship. Sleep. Repeat. 💻🚀 \n\nDeep in the code mines today building something special. The bugs don't stand a chance. \n\n#BuildInPublic #DevLife";
  } else {
    caption = `"${input}" ✨\n\nSometimes the simple moments hit different. Just wanted to share this vibe with you all. Hope everyone is having a legendary day! 🚀\n\n#Vibes #Farcaster #Moments`;
  }

  return {
    caption,
    image_prompts: [
      input + " cinematic lighting 4k", 
      input + " aesthetic minimal high quality", 
      input + " vibrant artistic style"
    ]
  };
};

const getImagesFromPrompts = (prompts) => {
    return prompts.map((imgPrompt) => {
        const encoded = encodeURIComponent(imgPrompt + ", photorealistic, 8k, cinematic lighting");
        const seed = Math.floor(Math.random() * 99999);
        return `https://pollinations.ai/p/${encoded}?width=1080&height=1080&seed=${seed}&nologo=true&model=flux`;
    });
};

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
  const [error, setError] = useState(null);

  useEffect(() => {
    const savedPoints = localStorage.getItem('magicCaptionPoints');
    if (savedPoints) setPoints(parseInt(savedPoints));

    const init = async () => {
      // IN VS CODE, USE: await sdk.actions.disableNativeGestures();
      setTimeout(() => {
        mockSdk.actions.ready(); // IN VS CODE, USE: sdk.actions.ready();
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
    setError(null);

    try {
      // IN VS CODE, this fetch call works because you have the backend API file.
      // In this preview, it will fail and trigger the fallback, which is what we want for testing.
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input, mode: mode })
      });
      
      if (!res.ok) throw new Error("API Failed");
      const data = await res.json();
      
      if (!data.caption || !data.images) throw new Error("Incomplete data");

      setResults(data);
      awardPoints(10, "Idea Generated");
    } catch (e) {
      console.log("Using offline fallback...");
      const fallbackData = generateSmartFallback(input);
      const fallbackImages = getImagesFromPrompts(fallbackData.image_prompts);
      setResults({
          caption: fallbackData.caption,
          images: fallbackImages,
          image_prompts: fallbackData.image_prompts
      });
      awardPoints(5, "Idea Generated");
    } finally {
      setLoading(false);
    }
  };

  const regenerateImages = async () => {
    if (!results || isImageLoading) return;
    setIsImageLoading(true);
    setImageLoadStatus({});
    
    try {
       if (!results.image_prompts) return;
       const newImages = getImagesFromPrompts(results.image_prompts);
       setResults(prev => ({ ...prev, images: newImages }));
    } finally {
       setTimeout(() => setIsImageLoading(false), 500);
    }
  };

  const handleImageLoad = (url) => {
    setImageLoadStatus(prev => ({ ...prev, [url]: true }));
  };

  // --- ✨ ADDED MISSING RESET FUNCTION ---
  const handleReset = () => {
    setInput('');
    setResults(null);
    setLocalImage(null);
    setIsImageLoading(false); 
    setImageLoadStatus({});
  };

  const postToFarcaster = async (image) => {
    if (!results) return;
    awardPoints(10, "Post Created");
    setPostConfirmed(true);
    setTimeout(() => setPostConfirmed(false), 1500);

    // IN VS CODE, USE 'sdk' INSTEAD OF 'mockSdk'
    if (image && !image.startsWith('blob:')) {
      await mockSdk.actions.composeCast({ text: results.caption, embeds: [image] });
    } else {
      await mockSdk.actions.composeCast({ text: results.caption });
    }
  };

  if (!isLoaded) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans overflow-hidden relative pb-8 flex flex-col items-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#2a1b3d] via-[#0f172a] to-black pointer-events-none"></div>
      <input type="file" ref={fileInputRef} onChange={(e) => { if(e.target.files[0]) setLocalImage(URL.createObjectURL(e.target.files[0])); }} accept="image/*" className="hidden" />
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
      
      {/* Error Overlay (Only shows if critical error) */}
      {error && (
         <div className="fixed top-20 left-4 right-4 z-50 bg-red-500/90 text-white p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-5 shadow-xl border border-red-400/50">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <div className="text-sm font-medium">{error}</div>
            <button onClick={() => setError(null)} className="ml-auto"><X className="w-5 h-5" /></button>
         </div>
      )}

      {/* Post Confirmation */}
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
             </div>

             <div className="w-full bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-center shadow-2xl relative overflow-hidden">
               <h3 className="font-semibold text-white mb-1 tracking-wide">The AI that makes your post perfect</h3>
               <p className="text-xs text-slate-400 leading-relaxed">Magic Caption shapes your thoughts into the perfect vibe.</p>
             </div>

             <div className="w-full flex flex-col gap-3 mt-2">
               <div className="flex gap-2 w-full p-1 bg-slate-900/20 backdrop-blur-sm rounded-xl border border-white/5">
                 {['professional', 'funny', 'unhinge'].map((m) => (
                    <button key={m} onClick={() => setMode(m)} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex flex-col items-center gap-1 active:scale-95 ${mode === m ? 'bg-purple-500/30 text-white shadow-inner border border-purple-500/50' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                       {m === 'professional' && <Briefcase className={`w-4 h-4 ${mode === m ? 'animate-nod text-blue-300' : ''}`} />}
                       {m === 'funny' && <Smile className={`w-4 h-4 ${mode === m ? 'animate-wiggle text-yellow-300' : ''}`} />}
                       {m === 'unhinge' && <Zap className={`w-4 h-4 ${mode === m ? 'animate-shake-wild text-red-400' : ''}`} />}
                       {m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                 ))}
               </div>

               <div className="w-full bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-1 shadow-lg group focus-within:border-purple-500/30 focus-within:shadow-purple-500/10 transition-all duration-300 relative overflow-hidden">
                 <div className="flex justify-between px-4 pt-3 pb-1">
                   <label className="text-slate-400 text-sm font-medium">What's the vibe today?</label>
                   {input.length > 0 && <button onClick={() => setInput('')} className="text-xs text-purple-400 hover:text-purple-300 font-medium active:scale-95 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Clear</button>}
                 </div>
                 <textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full bg-transparent border-none text-white text-lg p-4 h-24 focus:ring-0 placeholder:text-slate-600 resize-none outline-none" />
               </div>
             </div>
             <div className="flex-grow"></div>
             <button onClick={generateMagic} disabled={loading || !input} className="w-full py-4 rounded-2xl font-bold text-lg shadow-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-md text-white hover:shadow-purple-500/20 active:scale-95 flex items-center justify-center gap-2">
               {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Make it Perfect'}
             </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-8">
            <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-xl relative group">
              <div className="flex justify-between mb-3">
                 <h3 className="text-xs font-bold text-purple-400 uppercase">Generated Caption</h3>
                 <button onClick={handleReset} className="text-slate-500 hover:text-white transition-all p-1 hover:bg-white/10 rounded-full active:scale-90"><X className="w-5 h-5" /></button>
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
                 
                 <button onClick={() => fileInputRef.current.click()} className="relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-200 aspect-square flex flex-col items-center justify-center group active:scale-95 bg-slate-900/70 border-slate-700 hover:border-slate-500">
                   {localImage ? <img src={localImage} className="w-full h-full object-cover absolute inset-0" /> : <div className="bg-slate-800 p-3 rounded-full mb-2"><Upload className="w-6 h-6 text-slate-400" /></div>}
                 </button>

                 {results.images && results.images.map((img, idx) => {
                   const isImageLoaded = imageLoadStatus[img];
                   return (
                     <button key={img} onClick={() => postToFarcaster(img)} className="relative group overflow-hidden rounded-2xl border-2 border-transparent hover:border-purple-500/50 aspect-square bg-slate-900 active:scale-95" disabled={!isImageLoaded}>
                       {!isImageLoaded && <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2"><div className="w-6 h-6 border-3 border-white/50 border-t-purple-500 rounded-full animate-spin" /><span className="text-[10px] text-slate-400">Loading...</span></div>}
                       <img src={img} onLoad={() => handleImageLoad(img)} className={`w-full h-full object-cover transition-opacity duration-500 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`} loading="lazy" />
                       <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 flex flex-col items-center justify-end pb-4 z-20 transition-opacity ${isImageLoaded ? '' : 'hidden'}`}><span className="font-bold text-sm flex items-center gap-1 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30"><Send className="w-3 h-3" /> Post AI</span></div>
                     </button>
                   );
                 })}
               </div>
            </div>
            <button onClick={handleReset} className="w-full py-4 text-slate-500 font-medium hover:text-white transition-all flex items-center justify-center gap-2 group hover:bg-slate-900 rounded-2xl active:scale-95"><RotateCcw className="w-4 h-4" /> Start Over</button>
          </div>
        )}
      </div>
    </div>
  );
}