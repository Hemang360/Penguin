import { useState, useRef } from 'react'
import { verifyByFile } from '../lib/api'
import Topbar from '../components/Topbar'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Upload, X, Image as ImageIcon, Music, Video, File } from 'lucide-react'

export default function Verify() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileType, setFileType] = useState<'image' | 'audio' | 'video' | null>(null)
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
    if (!selectedFile) return
    
    setIsUploading(true)
    try {
      const res = await verifyByFile(selectedFile)
      setResult(res)
    } catch (error: any) {
      setResult({ error: error.response?.data?.error || error.message || 'Verification failed' })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <Topbar />
      <div className="max-w-7xl mx-auto px-4 py-10">
        {!selectedFile ? (
          <>
            <h1 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-fuchsia-500 to-cyan-500 bg-clip-text text-transparent text-center">
              Find out who made it
            </h1>
            <Card className="mt-6">
              <CardContent className="p-0">
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-12 m-6 text-center cursor-pointer transition-colors ${
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
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side: Hero Text and File Preview */}
            <div className="space-y-6">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
                Find out who made it
              </h1>
              
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
                      <Button
                        onClick={handleVerify}
                        disabled={isUploading}
                        className="bg-cyan-600 hover:bg-cyan-700 w-full"
                      >
                        {isUploading ? 'Verifying...' : 'Verify File'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Side: Verification Results */}
            <div className="space-y-6">
              {result ? (
                <Card className="sticky top-6">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-200">Verification Result</h2>
                    {result.error ? (
                      <div className="text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                        <p className="font-medium">Error:</p>
                        <p>{result.error}</p>
                      </div>
                    ) : (
                      <pre className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 overflow-auto text-sm text-gray-200 max-h-[600px]">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    )}
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
                          Click "Verify File" to start verification
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


