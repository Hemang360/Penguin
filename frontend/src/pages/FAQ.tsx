import React, { useState } from 'react'
import Topbar from '../components/Topbar'
import { ChevronDown, ChevronUp, HelpCircle, Shield, Lock, Image, Database } from 'lucide-react'
import { motion } from 'framer-motion'

interface FAQItem {
  question: string
  answer: string
  category: string
  icon: React.ReactNode
}

const faqs: FAQItem[] = [
  {
    category: 'General',
    question: 'What is PengWin?',
    answer: 'PengWin is a blockchain-backed Proof of Art (PoA) Framework that enables creators to certify and protect their AI generated artwork. It uses unique pixel watermarking, cryptographic signatures, and decentralized storage to establish immutable ownership records.',
    icon: <HelpCircle className="h-5 w-5" />
  },
  {
    category: 'General',
    question: 'How does Proof of Art work?',
    answer: 'When you create or import artwork, PengWin embeds an invisible, unique pixel noise pattern (watermark) into your creation. It then generates a cryptographic signature using Ed25519 keys, stores metadata on IPFS, and records the certificate transaction on the blockchain. This creates an unbreakable chain of ownership.',
    icon: <Shield className="h-5 w-5" />
  },
  {
    category: 'Authentication',
    question: 'How does biometric authentication work?',
    answer: 'PengWin uses Microsoft Authenticator for secure login. When you authenticate, your biometric data (facial recognition) is securely processed by Microsoft, and Ed25519 cryptographic keys are automatically generated for your account. This ensures "Proof of Human" verification while maintaining privacy.',
    icon: <Lock className="h-5 w-5" />
  },
  {
    category: 'Authentication',
    question: 'Do I need a crypto wallet?',
    answer: 'No, you don\'t need a separate crypto wallet. PengWin uses your Microsoft account for authentication and automatically manages cryptographic keys. Blockchain transactions are handled seamlessly in the background.',
    icon: <Lock className="h-5 w-5" />
  },
  {
    category: 'Art Creation',
    question: 'What types of content can I certify?',
    answer: 'Currently, PengWin supports images, audio, and video files. You can generate new content using integrated AI models (OpenAI, Vertex, Grok, Stability AI) or import existing artwork created on other platforms using our Chrome Extension.',
    icon: <Image className="h-5 w-5" />
  },
  {
    category: 'Art Creation',
    question: 'How do I import artwork from other platforms?',
    answer: 'Use the PengWin Chrome Extension to capture and import artwork from platforms like Midjourney, DALL-E, Stable Diffusion, and others. The extension captures the prompt, metadata, and artwork automatically for certification.',
    icon: <Image className="h-5 w-5" />
  },
  {
    category: 'Certification',
    question: 'What information is stored in the certificate?',
    answer: 'Each certificate contains: Artwork ID, Creator Wallet Address, Original Prompt Hash, Verification Hash (pixel noise fingerprint), Ed25519/GPG Signature, Blockchain Transaction ID, IPFS Storage Link, Creation Timestamp, and Proof of Human Biometric Hash. All data is cryptographically signed and immutable.',
    icon: <Shield className="h-5 w-5" />
  },
  {
    category: 'Certification',
    question: 'How long does certification take?',
    answer: 'Certification typically completes in 10-30 seconds. The process includes watermarking, cryptographic signing, IPFS upload, and blockchain transaction. You\'ll receive your certificate immediately upon completion.',
    icon: <Shield className="h-5 w-5" />
  },
  {
    category: 'Verification',
    question: 'How can I verify an artwork?',
    answer: 'Anyone can verify artwork by visiting the Verify page and either uploading the image/audio/video file or entering the Art ID, Transaction Hash, or Wallet Address. The system checks the embedded watermark, compares hashes, and validates the cryptographic signature.',
    icon: <HelpCircle className="h-5 w-5" />
  },
  {
    category: 'Verification',
    question: 'What if verification fails?',
    answer: 'Verification failure can occur if: (1) The artwork has been tampered with or modified, (2) The artwork was never certified on PengWin, (3) The cryptographic signature is invalid, or (4) The file doesn\'t contain the original watermark. Always verify before purchasing artwork.',
    icon: <HelpCircle className="h-5 w-5" />
  },
  {
    category: 'Storage & Blockchain',
    question: 'Where is my artwork stored?',
    answer: 'Artwork is stored on IPFS (InterPlanetary File System) for decentralized, permanent storage. Metadata is also stored in a DAG (Directed Acyclic Graph) for fast retrieval. Certificate transactions are recorded on Ethereum Sepolia blockchain for immutability.',
    icon: <Database className="h-5 w-5" />
  },
  {
    category: 'Storage & Blockchain',
    question: 'Can my artwork be deleted or removed?',
    answer: 'Once certified on the blockchain, your certificate transaction cannot be deleted or modified - this is the power of blockchain immutability. However, IPFS content depends on network availability. We use redundant pinning services to ensure long-term availability.',
    icon: <Database className="h-5 w-5" />
  },
  {
    category: 'Security',
    question: 'Is my artwork safe from theft?',
    answer: 'PengWin provides multiple layers of protection: (1) Unique pixel watermarking makes unauthorized copies detectable, (2) Cryptographic signatures prove ownership, (3) Anti-theft crawler scans the web for unauthorized copies, (4) Blockchain records provide legal proof of creation date and ownership.',
    icon: <Shield className="h-5 w-5" />
  },
  {
    category: 'Security',
    question: 'What happens if someone steals my artwork?',
    answer: 'If unauthorized copies are found, you can use your PengWin certificate as legal proof of ownership. The certificate contains timestamps, cryptographic signatures, and blockchain records that can be used in legal proceedings. The anti-theft crawler helps detect unauthorized usage automatically.',
    icon: <Shield className="h-5 w-5" />
  },
  {
    category: 'Pricing & Costs',
    question: 'How much does it cost to certify artwork?',
    answer: 'Certification involves blockchain transaction fees (gas costs) which vary based on network congestion. Currently, these fees are minimal on Ethereum Sepolia. PengWin itself doesn\'t charge subscription fees - you only pay for blockchain transactions.',
    icon: <HelpCircle className="h-5 w-5" />
  },
  {
    category: 'Technical',
    question: 'What blockchain does PengWin use?',
    answer: 'PengWin is built on Ethereum Sepolia for security, smart contract capabilities, and ecosystem compatibility. We use Ethereum Sepolia for lower gas costs while maintaining the security benefits of Ethereum.',
    icon: <Database className="h-5 w-5" />
  }
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  const categories = ['All', ...Array.from(new Set(faqs.map(faq => faq.category)))]

  const filteredFAQs = selectedCategory === 'All' 
    ? faqs 
    : faqs.filter(faq => faq.category === selectedCategory)

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <Topbar />
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-gray-400">
            Everything you need to know about PengWin and Proof of Art
          </p>
        </motion.div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category)
                setOpenIndex(null)
              }}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedCategory === category
                  ? 'bg-cyan-600 text-white'
                  : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {filteredFAQs.map((faq, index) => {
            const isOpen = openIndex === index
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full p-6 flex items-center justify-between text-left hover:bg-neutral-800/50 transition-colors"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="text-cyan-400 mt-0.5 flex-shrink-0">
                      {faq.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-200 mb-1">
                        {faq.question}
                      </h3>
                      <span className="text-xs text-gray-500 bg-neutral-800 px-2 py-1 rounded">
                        {faq.category}
                      </span>
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0 ml-4" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0 ml-4" />
                  )}
                </button>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="px-6 pb-6"
                  >
                    <div className="pl-9 border-l-2 border-cyan-500/30">
                      <p className="text-gray-300 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

