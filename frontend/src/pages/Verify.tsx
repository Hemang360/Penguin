import { useState, useRef } from 'react'
import { verifyByFile, verifyByKey } from '../lib/api'
import Topbar from '../components/Topbar'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Upload, X, Image as ImageIcon, Music, Video, File, Search, CheckCircle2, XCircle, AlertCircle, Shield, Key, Hash, Link as LinkIcon } from 'lucide-react'

export default function Verify() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileType, setFileType] = useState<'image' | 'audio' | 'video' | null>(null)
  const [artId, setArtId] = useState('')
  const [verificationMethod, setVerificationMethod] = useState<'file' | 'id'>('file')
  const [result, setResult] = useState<any>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getFileType = (file: File): 'image' | 'audio' | 'video' => {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.startsWith('audio/')) return 'audio'
    if (file.type.startsWith('video/')) return 'video'
    return 'image' // fallback
  }

  const getFileIcon = (type: 'image' | 'audio' | 'video') => {
    switch (type) {
      case 'image':
        return <ImageIcon className="h-4 w-4" />
      case 'audio':
        return <Music className="h-4 w-4" />
      case 'video':
        return <Video className="h-4 w-4" />
      default:
        return <File className="h-4 w-4" />
    }
  }

  const handleFileSelect = (file: File) => {
    const type = getFileType(file)
    if (!file.type.startsWith('image/') && !file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
      alert('Please select an image, audio, or video file')
      return
    }
    setSelectedFile(file)
    setFileType(type)
    setResult(null)
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
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

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setPreview(null)
    setFileType(null)
    setResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleVerify = async () => {
    setIsUploading(true)
    try {
      let res
      if (verificationMethod === 'file' && selectedFile) {
        res = await verifyByFile(selectedFile)
      } else if (verificationMethod === 'id' && artId.trim()) {
        res = await verifyByKey(artId.trim())
      } else {
        setResult({ error: 'Please select a file or enter an Art ID/Wallet Address' })
        setIsUploading(false)
        return
      }
      setResult(res)
    } catch (error: any) {
      setResult({ 
        error: error.response?.data?.error || error.message || 'Verification failed',
        isAuthentic: false
      })
    } finally {
      setIsUploading(false)
    }
  }

  const showFilePreview = selectedFile && verificationMethod === 'file'
  const showIdResult = result && verificationMethod === 'id' && !selectedFile
  const showInitialForm = !selectedFile && !result

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <Topbar />
      <div className="max-w-7xl mx-auto px-4 py-10">
        {showInitialForm ? (
          <>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-fuchsia-500 to-cyan-500 bg-clip-text text-transparent text-center">
              Verify Artwork Authenticity
            </h1>
            <p className="text-center text-gray-400 mb-8">
              Enter an Art ID, Wallet Address, or upload a file to verify its authenticity
            </p>
            
            {/* Verification Method Toggle */}
            <div className="flex justify-center gap-4 mb-6">
              <button
                onClick={() => {
                  setVerificationMethod('file')
                  setArtId('')
                  setResult(null)
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  verificationMethod === 'file'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'
                }`}
              >
                Upload File
              </button>
              <button
                onClick={() => {
                  setVerificationMethod('id')
                  setSelectedFile(null)
                  setPreview(null)
                  setFileType(null)
                  setResult(null)
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  verificationMethod === 'id'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'
                }`}
              >
                Enter Art ID / Wallet
              </button>
            </div>

            <Card className="mt-6">
              <CardContent className="p-6">
                {verificationMethod === 'file' ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-neutral-700 hover:border-neutral-600'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,audio/*,video/*"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                    <Upload className="mx-auto h-12 w-12 text-neutral-400 mb-4" />
                    <p className="text-lg font-medium text-gray-200 mb-2">
                      Drop a file here or click to upload
                    </p>
                    <p className="text-sm text-gray-400">
                      Upload an image, audio, or video file to verify its authenticity
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-300">
                        Art ID, Transaction Hash, or Wallet Address
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
                          <input
                            type="text"
                            value={artId}
                            onChange={(e) => setArtId(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && artId.trim() && handleVerify()}
                            placeholder="/ipfs/Qm... or 0x..."
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-gray-500"
                          />
                        </div>
                        <Button
                          onClick={handleVerify}
                          disabled={isUploading || !artId.trim()}
                          className="bg-cyan-600 hover:bg-cyan-700"
                        >
                          {isUploading ? 'Verifying...' : 'Verify'}
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-4">
                      <p className="text-sm text-gray-300">
                        <strong className="text-cyan-400">How verification works:</strong> Our system detects the embedded Public Key and Unique Pixel Arrangement/Noise, compares the hash against on-chain records via DAG/IPFS, and validates the Ed25519 Cryptographic Signature.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : showFilePreview ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side: Hero Text and File Preview */}
            <div className="space-y-6">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
                Find out who made it
              </h1>
              
              {selectedFile && (
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="relative">
                        {preview && fileType && (
                        <div className="relative rounded-lg overflow-hidden border border-neutral-800">
                          {fileType === 'image' && (
                            <img
                              src={preview}
                              alt="Preview"
                              className="w-full h-auto max-h-[500px] object-contain bg-neutral-900"
                            />
                          )}
                          {fileType === 'audio' && (
                            <div className="w-full bg-neutral-900 p-12 flex flex-col items-center justify-center min-h-[300px]">
                              <Music className="h-16 w-16 text-cyan-500 mb-4" />
                              <p className="text-gray-300 mb-4">Audio File</p>
                              <audio controls src={preview} className="w-full max-w-md">
                                Your browser does not support the audio element.
                              </audio>
                            </div>
                          )}
                          {fileType === 'video' && (
                            <video
                              src={preview}
                              controls
                              className="w-full h-auto max-h-[500px] object-contain bg-neutral-900"
                            >
                              Your browser does not support the video element.
                            </video>
                          )}
                          <button
                            onClick={handleRemoveFile}
                            className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        {fileType && getFileIcon(fileType)}
                        <span>{selectedFile.name}</span>
                        <span className="text-neutral-600">
                          ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                        {selectedFile && (
                          <Button
                            onClick={handleVerify}
                            disabled={isUploading}
                            className="bg-cyan-600 hover:bg-cyan-700 w-full"
                          >
                            {isUploading ? 'Verifying...' : 'Verify File'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Side: Verification Results */}
            <div className="space-y-6">
              {result ? (
                <Card className="sticky top-6">
                  <CardContent className="p-6">
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold mb-4 text-gray-200">Verification Result</h2>
                      {result.error ? (
                        <div className="space-y-4">
                          <div className="flex items-start gap-3 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                            <XCircle className="mt-0.5" size={20} />
                            <div>
                              <p className="font-medium mb-1">Verification Failed</p>
                              <p className="text-sm">{result.error}</p>
                              <p className="text-sm mt-2 text-gray-400">
                                The cryptographic signature is invalid, or the artwork has been tampered with or is not registered.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : result.isAuthentic !== false ? (
                        <div className="space-y-4">
                          <div className="flex items-start gap-3 text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                            <CheckCircle2 className="mt-0.5" size={20} />
                            <div>
                              <p className="font-medium mb-1 text-lg">VERIFIED!</p>
                              <p className="text-sm text-gray-300">
                                This artwork is immutably linked to <span className="font-mono text-cyan-400">{result.original_artist || result.artist_wallet || 'Creator'}</span>
                              </p>
                            </div>
                          </div>
                          
                          {/* Verification Steps */}
                          {result.verification_steps && (
                            <div className="space-y-2">
                              <h3 className="font-semibold text-gray-200 flex items-center gap-2">
                                <Shield size={18} />
                                Verification Steps
                              </h3>
                              <div className="space-y-2">
                                {result.verification_steps.map((step: string, idx: number) => (
                                  <div key={idx} className="flex items-start gap-2 text-sm">
                                    <CheckCircle2 className="text-green-400 mt-0.5" size={16} />
                                    <span className="text-gray-300">{step}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Certificate Details */}
                          <div className="space-y-3 pt-4 border-t border-neutral-800">
                            <h3 className="font-semibold text-gray-200 flex items-center gap-2">
                              <File size={18} />
                              Certificate Details
                            </h3>
                            <div className="space-y-2 text-sm">
                              {result.artwork_id && (
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-400">Artwork ID:</span>
                                  <span className="font-mono text-cyan-400 text-xs">{result.artwork_id}</span>
                                </div>
                              )}
                              {result.blockchain_tx_hash && (
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-400">Blockchain TX:</span>
                                  <span className="font-mono text-green-400 text-xs truncate ml-2">{result.blockchain_tx_hash.substring(0, 16)}...</span>
                                </div>
                              )}
                              {result.ipfs_hash && (
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-400">IPFS Hash:</span>
                                  <span className="font-mono text-purple-400 text-xs truncate ml-2">{result.ipfs_hash.substring(0, 16)}...</span>
                                </div>
                              )}
                              {result.creation_date && (
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-400">Created:</span>
                                  <span className="text-gray-300">{new Date(result.creation_date).toLocaleDateString()}</span>
                                </div>
                              )}
                              {result.similarity_score !== undefined && (
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-400">Confidence:</span>
                                  <span className="text-green-400 font-semibold">{(result.similarity_score * 100).toFixed(1)}%</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Full JSON for technical users */}
                          <details className="mt-4">
                            <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                              View Full Certificate Data
                            </summary>
                            <pre className="mt-2 rounded-lg border border-neutral-800 bg-neutral-900 p-4 overflow-auto text-xs text-gray-300 max-h-[300px]">
                              {JSON.stringify(result, null, 2)}
                            </pre>
                          </details>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                          <XCircle className="mt-0.5" size={20} />
                          <div>
                            <p className="font-medium mb-1">Verification Failed</p>
                            <p className="text-sm text-gray-400">
                              The cryptographic signature is invalid, or the artwork has been tampered with or is not registered.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                      <div className="text-neutral-600 mb-4">
                        <File className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium text-gray-400">
                          Verification results will appear here
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          {verificationMethod === 'file' 
                            ? 'Click "Verify File" to start verification'
                            : 'Enter an Art ID and click "Verify" to start'}
                        </p>
                      </div>
                      {/* Verification Logic Explanation */}
                      <div className="mt-8 text-left max-w-md w-full">
                        <h3 className="font-semibold mb-3 text-gray-300 flex items-center gap-2">
                          <Shield size={18} />
                          How Verification Works
                        </h3>
                        <div className="space-y-2 text-sm text-gray-400">
                          <div className="flex items-start gap-2">
                            <Key className="mt-0.5 text-cyan-400" size={16} />
                            <span>Detects embedded Public Key and Unique Pixel Arrangement/Noise from the file</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <Hash className="mt-0.5 text-purple-400" size={16} />
                            <span>Compares the detected hash against on-chain records via DAG/IPFS link</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <Shield className="mt-0.5 text-green-400" size={16} />
                            <span>Validates the Ed25519 Cryptographic Signature against creator's identity</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : showIdResult ? (
          // ID Verification Result View (no file)
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
                Verification Result
              </h1>
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="rounded-lg bg-gradient-to-br from-fuchsia-500/10 to-cyan-500/10 p-8 border border-neutral-800">
                      <div className="flex items-center justify-center mb-4">
                        {result?.isAuthentic !== false && !result?.error ? (
                          <CheckCircle2 className="h-16 w-16 text-green-400" />
                        ) : (
                          <XCircle className="h-16 w-16 text-red-400" />
                        )}
                      </div>
                      <p className="text-center text-gray-300">
                        {result?.isAuthentic !== false && !result?.error
                          ? 'Artwork verified successfully'
                          : 'Verification failed'}
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setResult(null)
                        setArtId('')
                        setVerificationMethod('file')
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      Verify Another
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div>
              {result && (
                <Card className="sticky top-6">
                  <CardContent className="p-6">
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold mb-4 text-gray-200">Verification Result</h2>
                      {result.error ? (
                        <div className="space-y-4">
                          <div className="flex items-start gap-3 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                            <XCircle className="mt-0.5" size={20} />
                            <div>
                              <p className="font-medium mb-1">Verification Failed</p>
                              <p className="text-sm">{result.error}</p>
                              <p className="text-sm mt-2 text-gray-400">
                                The cryptographic signature is invalid, or the artwork has been tampered with or is not registered.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : result.isAuthentic !== false ? (
                        <div className="space-y-4">
                          <div className="flex items-start gap-3 text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                            <CheckCircle2 className="mt-0.5" size={20} />
                            <div>
                              <p className="font-medium mb-1 text-lg">VERIFIED!</p>
                              <p className="text-sm text-gray-300">
                                This artwork is immutably linked to <span className="font-mono text-cyan-400">{result.original_artist || result.artist_wallet || 'Creator'}</span>
                              </p>
                            </div>
                          </div>
                          
                          {/* Verification Steps */}
                          {result.verification_steps && (
                            <div className="space-y-2">
                              <h3 className="font-semibold text-gray-200 flex items-center gap-2">
                                <Shield size={18} />
                                Verification Steps
                              </h3>
                              <div className="space-y-2">
                                {result.verification_steps.map((step: string, idx: number) => (
                                  <div key={idx} className="flex items-start gap-2 text-sm">
                                    <CheckCircle2 className="text-green-400 mt-0.5" size={16} />
                                    <span className="text-gray-300">{step}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Certificate Details */}
                          <div className="space-y-3 pt-4 border-t border-neutral-800">
                            <h3 className="font-semibold text-gray-200 flex items-center gap-2">
                              <File size={18} />
                              Certificate Details
                            </h3>
                            <div className="space-y-2 text-sm">
                              {result.artwork_id && (
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-400">Artwork ID:</span>
                                  <span className="font-mono text-cyan-400 text-xs">{result.artwork_id}</span>
                                </div>
                              )}
                              {result.blockchain_tx_hash && (
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-400">Blockchain TX:</span>
                                  <span className="font-mono text-green-400 text-xs truncate ml-2">{result.blockchain_tx_hash.substring(0, 16)}...</span>
                                </div>
                              )}
                              {result.ipfs_hash && (
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-400">IPFS Hash:</span>
                                  <span className="font-mono text-purple-400 text-xs truncate ml-2">{result.ipfs_hash.substring(0, 16)}...</span>
                                </div>
                              )}
                              {result.creation_date && (
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-400">Created:</span>
                                  <span className="text-gray-300">{new Date(result.creation_date).toLocaleDateString()}</span>
                                </div>
                              )}
                              {result.similarity_score !== undefined && (
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-400">Confidence:</span>
                                  <span className="text-green-400 font-semibold">{(result.similarity_score * 100).toFixed(1)}%</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Full JSON for technical users */}
                          <details className="mt-4">
                            <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                              View Full Certificate Data
                            </summary>
                            <pre className="mt-2 rounded-lg border border-neutral-800 bg-neutral-900 p-4 overflow-auto text-xs text-gray-300 max-h-[300px]">
                              {JSON.stringify(result, null, 2)}
                            </pre>
                          </details>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                          <XCircle className="mt-0.5" size={20} />
                          <div>
                            <p className="font-medium mb-1">Verification Failed</p>
                            <p className="text-sm text-gray-400">
                              The cryptographic signature is invalid, or the artwork has been tampered with or is not registered.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}


