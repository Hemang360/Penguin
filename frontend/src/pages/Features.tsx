import React from 'react'
import { Link } from 'react-router-dom'
import Topbar from '../components/Topbar'
import { 
  Shield, Lock, Image, CheckCircle2, FileText, Database, 
  Link2, Fingerprint, Zap, Globe, ArrowRight, Sparkles 
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function Features() {
  const features = [
    {
      icon: <Fingerprint className="h-6 w-6" />,
      title: 'Unique Pixel Watermarking',
      description: 'Invisible, tamper-proof Gaussian noise patterns embedded in every creation. Undetectable to the human eye but cryptographically verifiable.',
      color: 'from-fuchsia-500 to-pink-500'
    },
    {
      icon: <Lock className="h-6 w-6" />,
      title: 'Ed25519 Cryptographic Signing',
      description: 'Each artwork is signed with Ed25519 keys automatically generated from your Microsoft authenticator, creating an immutable link to your identity.',
      color: 'from-cyan-500 to-blue-500'
    },
    {
      icon: <Database className="h-6 w-6" />,
      title: 'IPFS Decentralized Storage',
      description: 'Immutable content addressing via IPFS ensures your artwork and metadata are permanently stored across a distributed network.',
      color: 'from-purple-500 to-indigo-500'
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Blockchain Certification',
      description: 'Every certificate transaction is recorded on Ethereum Sepolia blockchain, providing transparent and verifiable provenance.',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: 'Anti-Theft Crawler',
      description: 'pHash-based detection system continuously scans the web for unauthorized copies, protecting your intellectual property.',
      color: 'from-orange-500 to-red-500'
    },
    {
      icon: <CheckCircle2 className="h-6 w-6" />,
      title: 'Instant Verification',
      description: 'Public verification interface allows anyone to verify artwork authenticity by uploading a file or entering an Art ID.',
      color: 'from-teal-500 to-cyan-500'
    }
  ]

  const useCases = [
    {
      title: 'For Artists & Creators',
      description: 'Protect your AI generated artwork with immutable certificates, establish ownership, and monetize your creations with confidence.',
      benefits: [
        'Prove authentic authorship',
        'Protect against theft',
        'Establish legal ownership',
        'Enable NFT trading',
        'Build reputation portfolio'
      ]
    },
    {
      title: 'For Collectors & Buyers',
      description: 'Verify the authenticity of AI art before purchasing. Ensure you\'re buying from the original creator with verified provenance.',
      benefits: [
        'Verify before purchase',
        'Check creator identity',
        'View full certificate',
        'Ensure authenticity',
        'Trusted transactions'
      ]
    },
    {
      title: 'For Platforms & Marketplaces',
      description: 'Integrate PengWin verification to protect your users and ensure only authentic, certified artwork is traded on your platform.',
      benefits: [
        'Prevent fraud',
        'Build trust',
        'Reduce disputes',
        'Enhance reputation',
        'API integration ready'
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <Topbar />
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
            Platform Features & Capabilities
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Discover how PengWin revolutionizes AI art ownership and verification with cutting-edge blockchain technology
          </p>
        </motion.div>

        {/* Core Features */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-8 text-center">Core Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="rounded-2xl p-6 border border-neutral-800 bg-neutral-900 hover:border-cyan-500/50 transition-all"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-200">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Use Cases */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-8 text-center">Who Benefits?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {useCases.map((useCase, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.15 }}
                className="rounded-2xl p-8 border border-neutral-800 bg-neutral-900"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="h-6 w-6 text-cyan-400" />
                  <h3 className="text-xl font-semibold text-gray-200">{useCase.title}</h3>
                </div>
                <p className="text-gray-400 mb-6">{useCase.description}</p>
                <ul className="space-y-2">
                  {useCase.benefits.map((benefit, bidx) => (
                    <li key={bidx} className="flex items-start gap-2 text-sm text-gray-300">
                      <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Technical Highlights */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-8 text-center">Technical Highlights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="rounded-2xl p-8 border border-cyan-500/20 bg-cyan-500/5"
            >
              <FileText className="h-8 w-8 text-cyan-400 mb-4" />
              <h3 className="text-xl font-semibold mb-3 text-gray-200">Proof of Art Certificate</h3>
              <p className="text-gray-400 mb-4">
                Each certified artwork receives a comprehensive certificate containing:
              </p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Artwork ID and metadata</li>
                <li>• Creator wallet address</li>
                <li>• Cryptographic signatures (Ed25519/GPG)</li>
                <li>• Blockchain transaction hash</li>
                <li>• IPFS content address</li>
                <li>• Verification hash (pixel noise fingerprint)</li>
                <li>• Timestamps and provenance chain</li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="rounded-2xl p-8 border border-purple-500/20 bg-purple-500/5"
            >
              <Zap className="h-8 w-8 text-purple-400 mb-4" />
              <h3 className="text-xl font-semibold mb-3 text-gray-200">Fast & Efficient</h3>
              <p className="text-gray-400 mb-4">
                Optimized for speed and scalability:
              </p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• DAG-based metadata retrieval (instant lookup)</li>
                <li>• IPFS content addressing (distributed storage)</li>
                <li>• Gas-optimized blockchain transactions</li>
                <li>• Real-time verification (&lt; 2 seconds)</li>
                <li>• Scalable architecture for millions of artworks</li>
                <li>• RESTful API for platform integration</li>
                <li>• Chrome Extension for easy import</li>
              </ul>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl p-8 border border-neutral-800 bg-gradient-to-r from-fuchsia-500/10 to-cyan-500/10 text-center"
        >
          <h3 className="text-2xl font-bold mb-4 text-gray-200">Ready to Get Started?</h3>
          <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
            Join creators who are protecting their AI art with PengWin's Proof of Art Framework
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/generate"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-fuchsia-500 to-cyan-500 hover:from-fuchsia-600 hover:to-cyan-600 text-white font-medium py-3 px-6 rounded-lg transition-transform duration-200 hover:scale-[1.02]"
            >
              Start Creating
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/verify"
              className="inline-flex items-center justify-center gap-2 border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-white font-medium py-3 px-6 rounded-lg transition-transform duration-200 hover:scale-[1.02]"
            >
              Verify Artwork
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

