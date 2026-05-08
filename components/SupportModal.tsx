"use client";
import { useState } from "react";

// Replace with your actual Solana wallet address
const SOLANA_ADDRESS = "UfoVRxsGCQvSBVz8ozic8b9qCD7taYor2YUYehFKxqq";

interface Props {
  onClose: () => void;
}

export default function SupportModal({ onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(SOLANA_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0d0d1a] border border-[#2a2a4a] rounded-2xl p-6 max-w-sm w-full shadow-2xl shadow-purple-900/20">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors text-xl"
        >
          ✕
        </button>

        <div className="text-center mb-5">
          <div className="text-4xl mb-2">🛸</div>
          <h2 className="text-white text-xl font-bold mb-1">Support UFO Tracker</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            UFO Tracker is free, ad-free, and independently maintained.
            If it's useful to you, a donation helps keep it running.
          </p>
        </div>

        {/* Solana */}
        <div className="bg-[#13132a] border border-[#2a2a4a] rounded-xl p-4 mb-3">
          <div className="flex items-center gap-2 mb-2">
            {/* Solana logo SVG */}
            <svg width="20" height="16" viewBox="0 0 646 500" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M108.53 347.62a16.85 16.85 0 0 1 11.89-4.92H637.5a8.42 8.42 0 0 1 5.95 14.37l-105.3 105.3a16.85 16.85 0 0 1-11.89 4.92H8.5a8.42 8.42 0 0 1-5.95-14.37l105.98-105.3Z" fill="url(#a)"/>
              <path d="M108.53 4.92A16.85 16.85 0 0 1 120.42 0H637.5a8.42 8.42 0 0 1 5.95 14.37L537.15 119.67a16.85 16.85 0 0 1-11.89 4.92H8.5A8.42 8.42 0 0 1 2.55 110.2L108.53 4.92Z" fill="url(#b)"/>
              <path d="M537.15 175.46a16.85 16.85 0 0 0-11.89-4.92H8.5a8.42 8.42 0 0 0-5.95 14.37l105.98 105.3a16.85 16.85 0 0 0 11.89 4.92H637.5a8.42 8.42 0 0 0 5.95-14.37L537.15 175.46Z" fill="url(#c)"/>
              <defs>
                <linearGradient id="a" x1="0" y1="0" x2="646" y2="500" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#9945FF"/><stop offset="1" stopColor="#14F195"/>
                </linearGradient>
                <linearGradient id="b" x1="0" y1="0" x2="646" y2="500" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#9945FF"/><stop offset="1" stopColor="#14F195"/>
                </linearGradient>
                <linearGradient id="c" x1="0" y1="0" x2="646" y2="500" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#9945FF"/><stop offset="1" stopColor="#14F195"/>
                </linearGradient>
              </defs>
            </svg>
            <span className="text-white font-semibold text-sm">Solana (SOL)</span>
          </div>
          <div className="bg-black/40 rounded-lg px-3 py-2 mb-2 font-mono text-xs text-gray-300 break-all select-all">
            {SOLANA_ADDRESS}
          </div>
          <button
            onClick={copy}
            className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${
              copied
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30"
            }`}
          >
            {copied ? "✓ Copied!" : "Copy address"}
          </button>
        </div>

        <p className="text-gray-600 text-xs text-center">
          Every contribution keeps this project alive. Thank you. 🙏
        </p>
      </div>
    </div>
  );
}
