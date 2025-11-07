import React from 'react'
import Topbar from '../components/Topbar'
import { Link } from 'react-router-dom'
import { ShieldCheck, Image, BadgeCheck, Network, Lock, Fingerprint, FileCheck, AlertTriangle, CheckCircle2, ArrowRight, Zap, Database, Link2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-gray-100 relative">
      {/* Animated background particles - covers entire page */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {/* Small glowing particles with varied motion */}
          {[...Array(12)].map((_, i) => {
            const positions = [
              { top: '10%', left: '5%' },
              { top: '15%', right: '8%' },
              { top: '25%', left: '15%' },
              { top: '30%', right: '20%' },
              { top: '45%', left: '8%' },
              { top: '50%', right: '12%' },
              { top: '65%', left: '20%' },
              { top: '70%', right: '15%' },
              { bottom: '20%', left: '10%' },
              { bottom: '25%', right: '18%' },
              { bottom: '35%', left: '25%' },
              { bottom: '40%', right: '8%' },
            ];
            const colors = ['cyan', 'fuchsia', 'purple', 'blue'];
            const color = colors[i % colors.length];
            const size = [2, 2.5, 3, 3.5, 4][i % 5];
            const duration = [6, 8, 10, 12, 14][i % 5];
            const delay = i * 0.3;
            
            const colorMap = {
              cyan: 'rgba(6, 182, 212, 0.3)',
              fuchsia: 'rgba(217, 70, 239, 0.3)',
              purple: 'rgba(168, 85, 247, 0.3)',
              blue: 'rgba(59, 130, 246, 0.3)',
            };
            const glowMap = {
              cyan: 'rgba(6, 182, 212, 0.4)',
              fuchsia: 'rgba(217, 70, 239, 0.4)',
              purple: 'rgba(168, 85, 247, 0.4)',
              blue: 'rgba(59, 130, 246, 0.4)',
            };
            
            return (
              <motion.div
                key={`particle-${i}`}
                className="absolute rounded-full blur-sm"
                style={{
                  ...positions[i % positions.length],
                  width: `${size}px`,
                  height: `${size}px`,
                  backgroundColor: colorMap[color as keyof typeof colorMap],
                  boxShadow: `0 0 ${size * 2}px ${glowMap[color as keyof typeof glowMap]}`,
                }}
                animate={{
                  x: [0, Math.sin(i) * 80, Math.cos(i) * 60, 0],
                  y: [0, Math.cos(i) * 70, -Math.sin(i) * 50, 0],
                  scale: [1, 1.3, 0.8, 1],
                  opacity: [0.3, 0.6, 0.4, 0.3],
                }}
                transition={{
                  duration,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay,
                }}
              />
            );
          })}
          
          {/* Medium floating orbs with rotation */}
          {[...Array(6)].map((_, i) => {
            const positions = [
              { top: '20%', left: '10%' },
              { top: '35%', right: '15%' },
              { top: '55%', left: '20%' },
              { bottom: '30%', right: '12%' },
              { bottom: '45%', left: '15%' },
              { top: '75%', right: '25%' },
            ];
            const size = [12, 16, 14, 18, 15, 13][i];
            const duration = [20, 25, 22, 28, 24, 26][i];
            
            return (
              <motion.div
                key={`orb-${i}`}
                className="absolute rounded-full blur-md"
                style={{
                  ...positions[i],
                  width: `${size}px`,
                  height: `${size}px`,
                  background: i % 2 === 0 
                    ? 'linear-gradient(135deg, rgba(217, 70, 239, 0.15), rgba(6, 182, 212, 0.15))'
                    : 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(168, 85, 247, 0.15))',
                }}
                animate={{
                  x: [0, Math.sin(i * 0.5) * 100, Math.cos(i * 0.5) * 80, 0],
                  y: [0, Math.cos(i * 0.5) * 90, -Math.sin(i * 0.5) * 70, 0],
                  scale: [1, 1.2, 0.9, 1],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.4,
                }}
              />
            );
          })}
          
          {/* Large gradient orbs with pulsing effect */}
          {[...Array(4)].map((_, i) => {
            const positions = [
              { top: '15%', left: '5%' },
              { top: '60%', right: '8%' },
              { bottom: '20%', left: '12%' },
              { bottom: '50%', right: '10%' },
            ];
            const size = [80, 100, 90, 110][i];
            const duration = [25, 30, 28, 32][i];
            
            return (
              <motion.div
                key={`large-orb-${i}`}
                className="absolute rounded-full blur-2xl"
                style={{
                  ...positions[i],
                  width: `${size}px`,
                  height: `${size}px`,
                  background: i % 2 === 0
                    ? 'radial-gradient(circle, rgba(217, 70, 239, 0.2), rgba(6, 182, 212, 0.1))'
                    : 'radial-gradient(circle, rgba(6, 182, 212, 0.2), rgba(168, 85, 247, 0.1))',
                }}
                animate={{
                  x: [0, Math.sin(i) * 120, Math.cos(i) * 100, 0],
                  y: [0, Math.cos(i) * 110, -Math.sin(i) * 90, 0],
                  scale: [1, 1.3, 0.8, 1],
                  opacity: [0.3, 0.5, 0.4, 0.3],
                }}
                transition={{
                  duration,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.5,
                }}
              />
            );
          })}
          
          {/* Circular motion particles */}
          {[...Array(8)].map((_, i) => {
            const radius = 60 + i * 15;
            const angle = (i * Math.PI) / 4;
            const centerX = 50;
            const centerY = 50;
            
            return (
              <motion.div
                key={`circle-${i}`}
                className="absolute rounded-full blur-sm"
                style={{
                  left: `${centerX}%`,
                  top: `${centerY}%`,
                  width: '8px',
                  height: '8px',
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(217, 70, 239, 0.4))',
                }}
                animate={{
                  x: [
                    Math.cos(angle) * radius,
                    Math.cos(angle + Math.PI) * radius,
                    Math.cos(angle) * radius,
                  ],
                  y: [
                    Math.sin(angle) * radius,
                    Math.sin(angle + Math.PI) * radius,
                    Math.sin(angle) * radius,
                  ],
                  scale: [1, 1.5, 1],
                  opacity: [0.4, 0.7, 0.4],
                }}
                transition={{
                  duration: 8 + i * 0.5,
                  repeat: Infinity,
                  ease: 'linear',
                  delay: i * 0.2,
                }}
              />
            );
          })}
          
          {/* Decorative animated blobs */}
          <motion.div
            className="pointer-events-none absolute -top-10 -left-10 h-72 w-72 bg-gradient-to-br from-fuchsia-500/30 to-cyan-500/30 blur-3xl rounded-full opacity-60"
            animate={{ 
              y: [0, -20, 10, 0],
              x: [0, 15, -10, 0],
              scale: [1, 1.1, 0.95, 1],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="pointer-events-none absolute top-40 -right-10 h-64 w-64 bg-gradient-to-br from-cyan-500/30 to-fuchsia-500/30 blur-3xl rounded-full opacity-40"
            animate={{ 
              scale: [1, 1.15, 0.9, 1],
              x: [0, -20, 10, 0],
              y: [0, 15, -10, 0],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="pointer-events-none absolute bottom-20 left-1/4 h-80 w-80 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 blur-3xl rounded-full opacity-30"
            animate={{ 
              scale: [1, 1.2, 0.85, 1],
              x: [0, 30, -20, 0],
              y: [0, -25, 20, 0],
            }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          />
        </div>
      
      <div className="relative z-10">
        <Topbar />
        <main className="relative w-full">
          {/* Hero */}
          <section className="py-16 md:py-24 relative px-4">
            <div className="max-w-6xl mx-auto relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Left side - Text content */}
              <div className="text-left">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                >
                  <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
                    PengWin: Verify and Mint Your Artwork
                  </h1>
                  <p className="mt-2 text-xl md:text-2xl text-gray-300 font-medium">
                    Verifiable, Immutable, Yours.
                  </p>
                </motion.div>
                <motion.p
                  className="mt-4 md:mt-6 text-base md:text-lg text-gray-400"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.35 }}
                >
                  PengWin introduces the Proof of Art (PoA) Framework - a blockchain-backed system for immutable AI creation records. Protect your generative art with cryptographic signatures and decentralized storage.
                </motion.p>
                <motion.div
                  className="mt-8 flex items-center gap-3 flex-wrap"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.5 }}
                >
                  <Link
                    to="/generate"
                    className="bg-gradient-to-r from-fuchsia-500 to-cyan-500 hover:from-fuchsia-600 hover:to-cyan-600 text-white font-medium py-3 px-6 rounded-lg transition-transform duration-200 hover:scale-[1.02] flex items-center gap-2"
                  >
                    Start Creating & Certifying
                    <ArrowRight size={18} />
                  </Link>
                  <Link
                    to="/verify"
                    className="border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-white font-medium py-3 px-6 rounded-lg transition-transform duration-200 hover:scale-[1.02]"
                  >
                    Verify an Artwork Now
                  </Link>
                </motion.div>
              </div>
              
              {/* Right side - SVG image */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="flex justify-center md:justify-end relative"
              >
                <img 
                  src="/pengwin.svg" 
                  alt="Pengwin" 
                  className="w-80 h-80 md:w-96 md:h-96 lg:w-[28rem] lg:h-[28rem] relative"
                  style={{ 
                    filter: 'invert(1) brightness(1.2)',
                  }}
                />
              </motion.div>
            </div>
          </div>
        </section>

          {/* Problem/Solution Section */}
          <section className="py-16 md:py-24 relative px-4">
            <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {/* Problem */}
              <div className="rounded-2xl p-8 border border-red-500/20 bg-red-500/5">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="text-red-400" size={24} />
                  <h2 className="text-2xl font-bold text-red-400">The Problem</h2>
                </div>
                <p className="text-gray-300 leading-relaxed">
                  AI generated art faces a critical threat to ownership and attribution. As generative AI becomes mainstream, creators struggle to:
                </p>
                <ul className="mt-4 space-y-2 text-gray-400">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">•</span>
                    <span>Prove authentic authorship of their AI creations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">•</span>
                    <span>Protect against theft and unauthorized reproduction</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">•</span>
                    <span>Establish verifiable ownership for legal protection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">•</span>
                    <span>Maintain immutable records of creation metadata</span>
                  </li>
                </ul>
              </div>

              {/* Solution */}
              <div className="rounded-2xl p-8 border border-cyan-500/20 bg-cyan-500/5">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="text-cyan-400" size={24} />
                  <h2 className="text-2xl font-bold text-cyan-400">The Solution</h2>
                </div>
                <p className="text-gray-300 leading-relaxed mb-4">
                  <strong className="text-white">PengWin's Proof of Art Framework</strong> solves this with:
                </p>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="text-cyan-400 mt-1" size={18} />
                    <span><strong>Unique Pixel Watermarking:</strong> Undetectable, tamper-proof noise patterns embedded in every creation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="text-cyan-400 mt-1" size={18} />
                    <span><strong>Blockchain Certification:</strong> Ed25519 cryptographic signatures tied to creator identity</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="text-cyan-400 mt-1" size={18} />
                    <span><strong>Decentralized Storage:</strong> IPFS-backed immutable records with DAG-based fast retrieval</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="text-cyan-400 mt-1" size={18} />
                    <span><strong>Anti-Theft Crawler:</strong> pHash-based detection of unauthorized copies across the web</span>
                  </li>
                </ul>
              </div>
            </motion.div>
            </div>
          </section>

          {/* How It Works - 3 Step Process */}
          <section className="py-16 md:py-24 relative px-4">
            <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
                How It Works
              </h2>
              <p className="text-gray-400 text-lg">Three simple steps to secure your AI creations forever</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="relative"
              >
                <div className="rounded-2xl p-8 border border-neutral-800 bg-neutral-900 h-full">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center text-2xl font-bold">
                      1
                    </div>
                    <h3 className="text-xl font-bold">Create & Sign</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Image className="text-fuchsia-400 mt-1" size={18} />
                      <div>
                        <p className="font-medium text-gray-200">Prompt/Art Input</p>
                        <p className="text-sm text-gray-500">Generate or import your AI creation with full metadata capture</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Fingerprint className="text-cyan-400 mt-1" size={18} />
                      <div>
                        <p className="font-medium text-gray-200">Unique Pixel Noise</p>
                        <p className="text-sm text-gray-500">Invisible watermark embedded using Gaussian noise pattern unique to you</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-neutral-800">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Lock size={14} />
                      <span>Biometric authentication via Microsoft</span>
                    </div>
                  </div>
                </div>
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                  <ArrowRight className="text-neutral-600" size={32} />
                </div>
              </motion.div>

              {/* Step 2 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative"
              >
                <div className="rounded-2xl p-8 border border-neutral-800 bg-neutral-900 h-full">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center text-2xl font-bold">
                      2
                    </div>
                    <h3 className="text-xl font-bold">Verify & Mint</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="text-green-400 mt-1" size={18} />
                      <div>
                        <p className="font-medium text-gray-200">Ed25519/GPG Key</p>
                        <p className="text-sm text-gray-500">Cryptographic signature generated from your authenticator</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <FileCheck className="text-cyan-400 mt-1" size={18} />
                      <div>
                        <p className="font-medium text-gray-200">Proof of Human</p>
                        <p className="text-sm text-gray-500">Biometric hash captured for human verification</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-neutral-800">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Zap size={14} />
                      <span>Automatic key generation on first login</span>
                    </div>
                  </div>
                </div>
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                  <ArrowRight className="text-neutral-600" size={32} />
                </div>
              </motion.div>

              {/* Step 3 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <div className="rounded-2xl p-8 border border-neutral-800 bg-neutral-900 h-full">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center text-2xl font-bold">
                      3
                    </div>
                    <h3 className="text-xl font-bold">Secure & Trade</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Database className="text-purple-400 mt-1" size={18} />
                      <div>
                        <p className="font-medium text-gray-200">DAG Storage</p>
                        <p className="text-sm text-gray-500">Directed Acyclic Graph for fast metadata retrieval by public key</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Link2 className="text-cyan-400 mt-1" size={18} />
                      <div>
                        <p className="font-medium text-gray-200">IPFS/Blockchain</p>
                        <p className="text-sm text-gray-500">Immutable on-chain records with IPFS content addressing</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-neutral-800">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <BadgeCheck size={14} />
                      <span>Certificate downloadable immediately</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
            </div>
          </section>

          {/* Feature grid */}
          <section className="pb-16 md:pb-24 relative px-4">
            <div className="max-w-6xl mx-auto">
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-100px' }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
          >
            <motion.div
              className="rounded-2xl p-6 border border-neutral-800 bg-neutral-900"
              variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <div className="h-10 w-10 rounded-md bg-gradient-to-br from-fuchsia-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
                <Image className="text-white/70" size={20} />
              </div>
              <h3 className="text-lg font-semibold">Create or Import</h3>
              <p className="text-sm text-gray-500 mt-2">
                Generate new pieces or bring your existing work—capture prompts and metadata seamlessly.
              </p>
            </motion.div>
            <motion.div
              className="rounded-2xl p-6 border border-neutral-800 bg-neutral-900"
              variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <div className="h-10 w-10 rounded-md bg-gradient-to-br from-fuchsia-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
                <ShieldCheck className="text-white/70" size={20} />
              </div>
              <h3 className="text-lg font-semibold">Immutable Proofs</h3>
              <p className="text-sm text-gray-500 mt-2">
                IPFS for decentralized storage and blockchain transactions for authenticity and provenance.
              </p>
            </motion.div>
            <motion.div
              className="rounded-2xl p-6 border border-neutral-800 bg-neutral-900"
              variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <div className="h-10 w-10 rounded-md bg-gradient-to-br from-fuchsia-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
                <BadgeCheck className="text-white/70" size={20} />
              </div>
              <h3 className="text-lg font-semibold">Instant Certificates</h3>
              <p className="text-sm text-gray-500 mt-2">
                Download verifiable certificates for each artwork—share with collectors and platforms.
              </p>
            </motion.div>
          </motion.div>
            </div>
          </section>

          {/* Technology & Transparency Section */}
          <section className="py-16 md:py-24 relative px-4">
            <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
                Technology & Transparency
              </h2>
              <p className="text-gray-400 text-lg">Understanding our innovative Proof of Art mechanics</p>
            </motion.div>

            <div className="space-y-8">
              {/* Proof-of-Art Mechanics */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="rounded-2xl p-8 border border-neutral-800 bg-neutral-900"
              >
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Fingerprint className="text-fuchsia-400" size={24} />
                  Proof of Art Mechanics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-cyan-400">Secure Prompt Capture</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Every prompt and creation metadata is hashed using SHA-256. Combined with Proof of Human biometric signatures, we ensure authentic authorship verification tied to your Microsoft authenticator.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-cyan-400">Unique Watermark Technology</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Our innovative Gaussian noise pattern is generated uniquely per user and artwork. This invisible watermark is undetectable to the human eye and tamper-proof, allowing us to verify authenticity even in compressed or modified copies.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-cyan-400">Cryptographic Bond</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Each artwork is signed with Ed25519 cryptographic keys automatically generated from your authenticator. This creates an immutable link between your identity and your creation, preventing forgery.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-cyan-400">Anti-Theft Protection</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Our pHash (Perceptual Hashing) crawler constantly scans the web for unauthorized copies. By detecting the unique pixel arrangement, we can identify tampered or stolen artworks across platforms.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Decentralized Architecture */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="rounded-2xl p-8 border border-neutral-800 bg-neutral-900"
              >
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Network className="text-cyan-400" size={24} />
                  Decentralized Architecture
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-fuchsia-400">Blockchain Layer</h4>
                    <p className="text-gray-400 text-sm leading-relaxed mb-3">
                      Built on Ethereum for security, smart contract capabilities, and ecosystem compatibility. Every certificate transaction is immutably recorded on-chain, providing transparent verification.
                    </p>
                    <ul className="space-y-1 text-sm text-gray-500">
                      <li>• Smart contract-based certificate registry</li>
                      <li>• Gas-optimized transaction batching</li>
                      <li>• Cross-chain compatibility ready</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-fuchsia-400">Storage Layer</h4>
                    <p className="text-gray-400 text-sm leading-relaxed mb-3">
                      Dual-layer storage architecture combines speed with permanence. DAG (Directed Acyclic Graph) enables fast metadata retrieval using public keys, while IPFS/Filecoin ensures content permanence and decentralization.
                    </p>
                    <ul className="space-y-1 text-sm text-gray-500">
                      <li>• DAG for instant metadata lookup</li>
                      <li>• IPFS for content addressing</li>
                      <li>• Redundant pinning for availability</li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            </div>
            </div>
          </section>

          {/* Showcase/CTA strip */}
          <section className="pb-20 relative px-4">
            <div className="max-w-6xl mx-auto">
            <motion.div
              className="rounded-2xl p-6 border border-neutral-800 bg-gradient-to-r from-fuchsia-500/10 to-cyan-500/10"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-120px' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-gradient-to-br from-fuchsia-500 to-cyan-500 animate-subtle-pulse" />
                <div>
                  <p className="text-sm text-gray-400">On-chain and IPFS backed</p>
                  <h4 className="font-semibold">Own your creative timeline</h4>
                </div>
              </div>
              <Link
                to="/generate"
                className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white px-4 py-2 rounded-lg transition-transform duration-200 hover:scale-[1.02]"
              >
                <Network size={16} /> Open Studio
              </Link>
            </div>
          </motion.div>
            </div>
          </section>
        </main>

        <footer className="py-8 border-t border-neutral-800/50 relative">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center text-xs text-gray-600">
              © {new Date().getFullYear()} PengWin. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}


