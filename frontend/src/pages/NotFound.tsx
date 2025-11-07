import { Link } from 'react-router-dom'
import Topbar from '../components/Topbar'
import { Home, ArrowLeft, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-gray-100">
      <Topbar />
      <div className="max-w-4xl mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="mb-8">
            <AlertCircle className="mx-auto h-24 w-24 text-cyan-400 mb-4" />
            <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-fuchsia-500 to-cyan-500 bg-clip-text text-transparent mb-4">
              404
            </h1>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-200 mb-4">
              Page Not Found
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-fuchsia-500 to-cyan-500 hover:from-fuchsia-600 hover:to-cyan-600 text-white font-medium py-3 px-6 rounded-lg transition-transform duration-200 hover:scale-[1.02]"
            >
              <Home size={20} />
              Go Home
            </Link>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-white font-medium py-3 px-6 rounded-lg transition-transform duration-200 hover:scale-[1.02]"
            >
              <ArrowLeft size={20} />
              Go Back
            </button>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <Link
              to="/verify"
              className="p-4 rounded-lg border border-neutral-800 bg-neutral-900 hover:border-cyan-500 transition-colors"
            >
              <h3 className="font-semibold text-gray-200 mb-2">Verify Artwork</h3>
              <p className="text-sm text-gray-400">Check the authenticity of any AI creation</p>
            </Link>
            <Link
              to="/generate"
              className="p-4 rounded-lg border border-neutral-800 bg-neutral-900 hover:border-cyan-500 transition-colors"
            >
              <h3 className="font-semibold text-gray-200 mb-2">Create Art</h3>
              <p className="text-sm text-gray-400">Generate and certify your AI artwork</p>
            </Link>
            <Link
              to="/"
              className="p-4 rounded-lg border border-neutral-800 bg-neutral-900 hover:border-cyan-500 transition-colors"
            >
              <h3 className="font-semibold text-gray-200 mb-2">Learn More</h3>
              <p className="text-sm text-gray-400">Discover how PengWin works</p>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

