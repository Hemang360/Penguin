import React from 'react'
import Topbar from '../components/Topbar'
import { Link } from 'react-router-dom'
import { ShieldCheck, Image, BadgeCheck, Network } from 'lucide-react'
import { motion } from 'framer-motion'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-gray-100">
      <Topbar />
      <main className="relative w-full overflow-hidden">
        {/* Animated background particles */}
        <div className="absolute inset-0 pointer-events-none z-0">
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
        </div>
        {/* Decorative animated blobs */}
        <motion.div
          className="pointer-events-none absolute -top-10 -left-10 h-72 w-72 bg-gradient-to-br from-fuchsia-500/30 to-cyan-500/30 blur-3xl rounded-full opacity-60 z-0"
          animate={{ 
            y: [0, -20, 10, 0],
            x: [0, 15, -10, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="pointer-events-none absolute top-40 -right-10 h-64 w-64 bg-gradient-to-br from-cyan-500/30 to-fuchsia-500/30 blur-3xl rounded-full opacity-40 z-0"
          animate={{ 
            scale: [1, 1.15, 0.9, 1],
            x: [0, -20, 10, 0],
            y: [0, 15, -10, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="pointer-events-none absolute bottom-20 left-1/4 h-80 w-80 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 blur-3xl rounded-full opacity-30 z-0"
          animate={{ 
            scale: [1, 1.2, 0.85, 1],
            x: [0, 30, -20, 0],
            y: [0, -25, 20, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        />
        {/* Hero */}
        <section className="py-16 md:py-24 relative z-10 px-4" style={{ isolation: 'isolate' }}>
          <div className="max-w-6xl mx-auto relative" style={{ zIndex: 10 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Left side - Text content */}
              <div className="text-left">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                >
                  <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
                    Certify Your AI-Crafted Creations
                  </h1>
                </motion.div>
                <motion.p
                  className="mt-4 md:mt-6 text-base md:text-lg text-gray-400"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.35 }}
                >
                  PengWin lets you generate, import, and verify AI artwork with on-chain proofs and IPFS-backed storage.
                </motion.p>
                <motion.div
                  className="mt-8 flex items-center gap-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.5 }}
                >
                  <Link
                    to="/generate"
                    className="bg-gradient-to-r from-fuchsia-500 to-cyan-500 hover:from-fuchsia-600 hover:to-cyan-600 text-white font-medium py-3 px-6 rounded-lg transition-transform duration-200 hover:scale-[1.02]"
                  >
                    Launch Studio
                  </Link>
                  <Link
                    to="/verify"
                    className="border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-white font-medium py-3 px-6 rounded-lg transition-transform duration-200 hover:scale-[1.02]"
                  >
                    Verify Artwork
                  </Link>
                </motion.div>
              </div>
              
              {/* Right side - SVG image */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="flex justify-center md:justify-end relative"
                style={{ zIndex: 50 }}
              >
                <img 
                  src="/pengwin.svg" 
                  alt="Pengwin" 
                  className="w-80 h-80 md:w-96 md:h-96 lg:w-[28rem] lg:h-[28rem]"
                  style={{ 
                    position: 'relative', 
                    zIndex: 50,
                    filter: 'invert(1) brightness(1.2)',
                  }}
                />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section className="pb-16 md:pb-24 relative z-10 px-4">
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

        {/* Showcase/CTA strip */}
        <section className="pb-20 relative z-10 px-4">
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

      <footer className="py-8 text-center text-xs text-gray-600">
        © {new Date().getFullYear()} PengWin
      </footer>
    </div>
  )
}


