import { useState, useRef } from 'react'
import Topbar from '../components/Topbar'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Upload, X, Image as ImageIcon, CheckCircle2, XCircle, AlertCircle, User, Bot } from 'lucide-react'

type Stage = 'ai-upload' | 'ai-verify' | 'human-upload' | 'human-verify' | 'complete'

export default function ProofOfHumanWork() {
  const [stage, setStage] = useState<Stage>('ai-upload')
  const [aiImage, setAiImage] = useState<File | null>(null)
  const [aiPreview, setAiPreview] = useState<string | null>(null)
  const [humanImage, setHumanImage] = useState<File | null>(null)
  const [humanPreview, setHumanPreview] = useState<string | null>(null)
  const [aiVerification, setAiVerification] = useState<'ai' | 'human' | null>(null)
  const [humanVerification, setHumanVerification] = useState<'ai' | 'human' | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const aiFileInputRef = useRef<HTMLInputElement>(null)
  const humanFileInputRef = useRef<HTMLInputElement>(null)

  const handleAiFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }
    setAiImage(file)
    
    const reader = new FileReader()
    reader.onloadend = () => {
      setAiPreview(reader.result as string)
      // Auto-advance to verification stage after preview is loaded
      setTimeout(() => setStage('ai-verify'), 300)
    }
    reader.readAsDataURL(file)
  }

  const handleHumanFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }
    setHumanImage(file)
    
    const reader = new FileReader()
    reader.onloadend = () => {
      setHumanPreview(reader.result as string)
      // Auto-advance to verification stage after preview is loaded
      setTimeout(() => setStage('human-verify'), 300)
    }
    reader.readAsDataURL(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'ai' | 'human') => {
    const file = e.target.files?.[0]
    if (file) {
      if (type === 'ai') {
        handleAiFileSelect(file)
      } else {
        handleHumanFileSelect(file)
      }
    }
  }

  const handleDrop = (e: React.DragEvent, type: 'ai' | 'human') => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      if (type === 'ai') {
        handleAiFileSelect(file)
      } else {
        handleHumanFileSelect(file)
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleRemoveAiFile = () => {
    setAiImage(null)
    setAiPreview(null)
    setAiVerification(null)
    if (aiFileInputRef.current) {
      aiFileInputRef.current.value = ''
    }
  }

  const handleRemoveHumanFile = () => {
    setHumanImage(null)
    setHumanPreview(null)
    setHumanVerification(null)
    if (humanFileInputRef.current) {
      humanFileInputRef.current.value = ''
    }
  }

  const handleAiVerification = (choice: 'ai' | 'human') => {
    setAiVerification(choice)
    // For now, hardcoded: AI images should be identified as 'ai'
    if (choice === 'ai') {
      setTimeout(() => {
        setStage('human-upload')
      }, 1500)
    } else {
      // Show error but allow retry
      alert('Incorrect! This is an AI-generated image. Please select "AI Generated".')
    }
  }

  const handleHumanVerification = (choice: 'ai' | 'human') => {
    setHumanVerification(choice)
    // For now, hardcoded: Human photos should be identified as 'human'
    if (choice === 'human') {
      setTimeout(() => {
        setStage('complete')
      }, 1500)
    } else {
      // Show error but allow retry
      alert('Incorrect! This is a human-generated photo. Please select "Human Generated".')
    }
  }

  const handleReset = () => {
    setStage('ai-upload')
    setAiImage(null)
    setAiPreview(null)
    setHumanImage(null)
    setHumanPreview(null)
    setAiVerification(null)
    setHumanVerification(null)
  }

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <Topbar />
      <div className="max-w-7xl mx-auto px-4 py-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-fuchsia-500 to-cyan-500 bg-clip-text text-transparent text-center">
          Proof of Human Work
        </h1>
        <p className="text-center text-gray-400 mb-8">
          Demonstrate your ability to distinguish AI-generated content from human-created work
        </p>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${stage === 'ai-upload' || stage === 'ai-verify' || stage === 'human-upload' || stage === 'human-verify' || stage === 'complete' ? 'text-cyan-500' : 'text-gray-600'}`}>
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                stage === 'ai-upload' || stage === 'ai-verify' || stage === 'human-upload' || stage === 'human-verify' || stage === 'complete'
                  ? 'border-cyan-500 bg-cyan-500/20' 
                  : 'border-gray-600'
              }`}>
                {aiVerification === 'ai' ? <CheckCircle2 className="w-6 h-6" /> : <Bot className="w-5 h-5" />}
              </div>
              <span className="ml-2 text-sm font-medium">AI Image</span>
            </div>
            <div className={`w-16 h-0.5 ${stage === 'human-upload' || stage === 'human-verify' || stage === 'complete' ? 'bg-cyan-500' : 'bg-gray-600'}`} />
            <div className={`flex items-center ${stage === 'human-upload' || stage === 'human-verify' || stage === 'complete' ? 'text-cyan-500' : 'text-gray-600'}`}>
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                stage === 'human-upload' || stage === 'human-verify' || stage === 'complete'
                  ? 'border-cyan-500 bg-cyan-500/20' 
                  : 'border-gray-600'
              }`}>
                {humanVerification === 'human' ? <CheckCircle2 className="w-6 h-6" /> : <User className="w-5 h-5" />}
              </div>
              <span className="ml-2 text-sm font-medium">Human Photo</span>
            </div>
          </div>
        </div>

        {/* Stage 1: AI Image Upload */}
        {stage === 'ai-upload' && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <Bot className="mx-auto h-12 w-12 text-fuchsia-500 mb-4" />
                <h2 className="text-2xl font-semibold mb-2">Step 1: Upload AI-Generated Image</h2>
                <p className="text-gray-400">
                  Upload an AI-generated image. You'll need to identify it correctly in the next step.
                </p>
              </div>
              <div
                onDrop={(e) => handleDrop(e, 'ai')}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => aiFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-fuchsia-500 bg-fuchsia-500/10'
                    : 'border-neutral-700 hover:border-neutral-600'
                }`}
              >
                <input
                  ref={aiFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileInputChange(e, 'ai')}
                  className="hidden"
                />
                <Upload className="mx-auto h-12 w-12 text-neutral-400 mb-4" />
                <p className="text-lg font-medium text-gray-200 mb-2">
                  Drop an AI-generated image here or click to upload
                </p>
                <p className="text-sm text-gray-400">
                  Upload an image created by AI (e.g., DALL-E, Midjourney, Stable Diffusion)
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stage 2: AI Image Verification */}
        {stage === 'ai-verify' && aiPreview && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">AI-Generated Image</h2>
                    <button
                      onClick={handleRemoveAiFile}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="relative rounded-lg overflow-hidden border border-neutral-800">
                    <img
                      src={aiPreview}
                      alt="AI Generated"
                      className="w-full h-auto max-h-[500px] object-contain bg-neutral-900"
                    />
                  </div>
                  {aiImage && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <ImageIcon className="h-4 w-4" />
                      <span>{aiImage.name}</span>
                      <span className="text-neutral-600">
                        ({(aiImage.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold mb-4">Identify This Image</h2>
                  <p className="text-gray-400 mb-6">
                    Is this image AI-generated or human-created? Select the correct answer.
                  </p>
                  
                  {aiVerification === null ? (
                    <div className="space-y-3">
                      <Button
                        onClick={() => handleAiVerification('ai')}
                        className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 h-16 text-lg flex items-center justify-center gap-3"
                      >
                        <Bot className="h-5 w-5" />
                        AI Generated
                      </Button>
                      <Button
                        onClick={() => handleAiVerification('human')}
                        variant="outline"
                        className="w-full h-16 text-lg flex items-center justify-center gap-3 border-neutral-700 hover:bg-neutral-800"
                      >
                        <User className="h-5 w-5" />
                        Human Generated
                      </Button>
                    </div>
                  ) : aiVerification === 'ai' ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="mx-auto h-16 w-16 text-green-400 mb-4" />
                      <p className="text-xl font-semibold text-green-400 mb-2">Correct!</p>
                      <p className="text-gray-400">This is an AI-generated image.</p>
                      <p className="text-sm text-gray-500 mt-4">Moving to next step...</p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <XCircle className="mx-auto h-16 w-16 text-red-400 mb-4" />
                      <p className="text-xl font-semibold text-red-400 mb-2">Incorrect</p>
                      <p className="text-gray-400">Please try again.</p>
                      <Button
                        onClick={() => setAiVerification(null)}
                        className="mt-4"
                        variant="outline"
                      >
                        Try Again
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stage 3: Human Photo Upload */}
        {stage === 'human-upload' && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <User className="mx-auto h-12 w-12 text-cyan-500 mb-4" />
                <h2 className="text-2xl font-semibold mb-2">Step 2: Upload Human-Generated Photo</h2>
                <p className="text-gray-400">
                  Upload a real photo taken by a human. You'll need to identify it correctly in the next step.
                </p>
              </div>
              <div
                onDrop={(e) => handleDrop(e, 'human')}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => humanFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-neutral-700 hover:border-neutral-600'
                }`}
              >
                <input
                  ref={humanFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileInputChange(e, 'human')}
                  className="hidden"
                />
                <Upload className="mx-auto h-12 w-12 text-neutral-400 mb-4" />
                <p className="text-lg font-medium text-gray-200 mb-2">
                  Drop a human photo here or click to upload
                </p>
                <p className="text-sm text-gray-400">
                  Upload a real photograph taken by a human (e.g., camera photo, hand-drawn scan)
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stage 4: Human Photo Verification */}
        {stage === 'human-verify' && humanPreview && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Human-Generated Photo</h2>
                    <button
                      onClick={handleRemoveHumanFile}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="relative rounded-lg overflow-hidden border border-neutral-800">
                    <img
                      src={humanPreview}
                      alt="Human Generated"
                      className="w-full h-auto max-h-[500px] object-contain bg-neutral-900"
                    />
                  </div>
                  {humanImage && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <ImageIcon className="h-4 w-4" />
                      <span>{humanImage.name}</span>
                      <span className="text-neutral-600">
                        ({(humanImage.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold mb-4">Identify This Photo</h2>
                  <p className="text-gray-400 mb-6">
                    Is this photo AI-generated or human-created? Select the correct answer.
                  </p>
                  
                  {humanVerification === null ? (
                    <div className="space-y-3">
                      <Button
                        onClick={() => handleHumanVerification('ai')}
                        variant="outline"
                        className="w-full h-16 text-lg flex items-center justify-center gap-3 border-neutral-700 hover:bg-neutral-800"
                      >
                        <Bot className="h-5 w-5" />
                        AI Generated
                      </Button>
                      <Button
                        onClick={() => handleHumanVerification('human')}
                        className="w-full bg-cyan-600 hover:bg-cyan-700 h-16 text-lg flex items-center justify-center gap-3"
                      >
                        <User className="h-5 w-5" />
                        Human Generated
                      </Button>
                    </div>
                  ) : humanVerification === 'human' ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="mx-auto h-16 w-16 text-green-400 mb-4" />
                      <p className="text-xl font-semibold text-green-400 mb-2">Correct!</p>
                      <p className="text-gray-400">This is a human-generated photo.</p>
                      <p className="text-sm text-gray-500 mt-4">Completing verification...</p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <XCircle className="mx-auto h-16 w-16 text-red-400 mb-4" />
                      <p className="text-xl font-semibold text-red-400 mb-2">Incorrect</p>
                      <p className="text-gray-400">Please try again.</p>
                      <Button
                        onClick={() => setHumanVerification(null)}
                        className="mt-4"
                        variant="outline"
                      >
                        Try Again
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stage 5: Complete */}
        {stage === 'complete' && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-12">
                <CheckCircle2 className="mx-auto h-20 w-20 text-green-400 mb-6" />
                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
                  Verification Complete!
                </h2>
                <p className="text-gray-400 mb-8 text-lg">
                  You have successfully demonstrated your ability to distinguish between AI-generated and human-created content.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-8">
                  <div className="bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-lg p-6">
                    <Bot className="mx-auto h-8 w-8 text-fuchsia-500 mb-3" />
                    <p className="font-semibold text-fuchsia-400 mb-2">AI Image</p>
                    <p className="text-sm text-gray-400">Correctly identified</p>
                  </div>
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-6">
                    <User className="mx-auto h-8 w-8 text-cyan-500 mb-3" />
                    <p className="font-semibold text-cyan-400 mb-2">Human Photo</p>
                    <p className="text-sm text-gray-400">Correctly identified</p>
                  </div>
                </div>
                <Button
                  onClick={handleReset}
                  className="bg-gradient-to-r from-fuchsia-500 to-cyan-500 hover:from-fuchsia-600 hover:to-cyan-600"
                >
                  Start Over
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}

