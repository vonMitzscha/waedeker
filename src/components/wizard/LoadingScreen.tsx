'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useT } from '@/i18n';

export interface LinkProgress {
  depth: number;   // current depth level being processed (1-based)
  ofDepth: number; // total depth levels
  done: boolean;   // whether this level is complete
  progress?: number; // 0–1 fraction of titles fetched within this level
}

interface LoadingScreenProps {
  linkDepth?: number;
  linkProgress?: LinkProgress | null;
}

export default function LoadingScreen({ linkDepth = 0, linkProgress = null }: LoadingScreenProps) {
  const t = useT();
  const STEPS = t.loading.steps;

  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
    }, 1200);
    return () => clearInterval(interval);
  }, [STEPS.length]);

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="max-w-sm w-full text-center">
        {/* Animated globe/spinner */}
        <div className="relative w-24 h-24 mx-auto mb-10">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-[#700700]/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#700700]" />
          </motion.div>
          <motion.div
            className="absolute inset-3 rounded-full border-2 border-[#700700]/30"
            animate={{ rotate: -360 }}
            transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
          >
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#6B8F3E]" />
          </motion.div>
          <div className="absolute inset-6 rounded-full border-2 border-[#700700]/10 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-[#700700]/60">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 2c0 0-3 3-3 8s3 8 3 8" stroke="currentColor" strokeWidth="1" />
              <path d="M2 10h16" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>
        </div>

        <h2
          className="text-2xl font-serif text-[#700700] mb-3"
          style={{ fontFamily: "'Rakkas', Georgia, serif" }}
        >
          {t.loading.heading}
        </h2>
        <p className={`text-sm text-[#700700]/50 leading-relaxed ${linkDepth > 0 ? 'mb-4' : 'mb-10'}`}>
          {t.loading.description}
        </p>

        {linkDepth > 0 && (
          <p className="text-xs text-[#700700]/60 bg-[#EDE0CE] border border-[#c4a882]/50 rounded-lg px-4 py-3 mb-10 leading-relaxed text-left">
            {t.loading.linkDepthHint}
          </p>
        )}

        {/* Steps */}
        <div className="space-y-2.5 text-left">
          {STEPS.map((step, i) => (
            <motion.div
              key={step}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: i <= currentStep ? 1 : 0.25, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                i < currentStep
                  ? 'bg-[#6B8F3E]'
                  : i === currentStep
                  ? 'bg-[#700700]'
                  : 'bg-[#c4a882]/30'
              }`}>
                {i < currentStep ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2 2.5 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : i === currentStep ? (
                  <motion.div
                    className="w-2 h-2 rounded-full bg-[#F5EDE0]"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  />
                ) : null}
              </div>
              <span className={`text-sm ${i === currentStep ? 'text-[#700700] font-medium' : i < currentStep ? 'text-[#700700]/50' : 'text-[#700700]/25'}`}>
                {step}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Link-depth progress — shown when linkDepth > 0 */}
        {linkDepth > 0 && (
          <div className="mt-6 space-y-2">
            {Array.from({ length: linkDepth }, (_, i) => i + 1).map((d) => {
              const isActive = linkProgress?.depth === d && !linkProgress.done;
              const isDone = linkProgress ? (linkProgress.depth > d || (linkProgress.depth === d && linkProgress.done)) : false;
              const isPending = !isDone && !isActive;
              return (
                <motion.div
                  key={d}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: isPending ? 0.25 : 1, x: 0 }}
                  transition={{ delay: STEPS.length * 0.1 + d * 0.1 }}
                >
                  {isDone ? (
                    <div className="w-5 h-5 rounded-full bg-[#6B8F3E] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2 2.5 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  ) : isActive ? (
                    <svg width="20" height="20" viewBox="0 0 20 20" className="flex-shrink-0 mt-0.5" style={{ transform: 'rotate(-90deg)' }}>
                      {/* track */}
                      <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(196,168,130,0.3)" strokeWidth="2" />
                      {/* filled slice */}
                      <motion.circle
                        cx="10" cy="10" r="8"
                        fill="none"
                        stroke="#700700"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 8}`}
                        initial={{ strokeDashoffset: 2 * Math.PI * 8 }}
                        animate={{ strokeDashoffset: (1 - (linkProgress?.progress ?? 0)) * 2 * Math.PI * 8 }}
                        transition={{ ease: 'easeOut', duration: 0.4 }}
                      />
                    </svg>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-[#c4a882]/30 flex-shrink-0 mt-0.5" />
                  )}
                  <span className={`text-sm ${isActive ? 'text-[#700700] font-medium' : isDone ? 'text-[#700700]/50' : 'text-[#700700]/25'}`}>
                    {t.loading.linkDepthProgress(d, linkDepth)}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
