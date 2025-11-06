import React, { useState, useEffect } from 'react';
import { Upload, Image, FileText, Music, CheckCircle, AlertCircle } from 'lucide-react';
import { generateArt, importArt, getCertificate } from '../lib/api';

interface Artwork {
  id: string;
  title: string;
  prompt: string;
  contentType: string;
  ipfsHash: string;
  blockchainTxHash: string;
  createdAt: string;
  certificateUrl: string;
}

export default function Dashboard() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [prompt, setPrompt] = useState('');
  const [contentType, setContentType] = useState('image');
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('');
  const [imageSize, setImageSize] = useState('1024x1024');
  const [loading, setLoading] = useState(false);
  const [userWallet, setUserWallet] = useState('');

  useEffect(() => {
    // Load user wallet from localStorage or Web3
    const wallet = localStorage.getItem('walletAddress') || '';
    setUserWallet(wallet);
    
    // Load user's artworks
    loadArtworks();
  }, []);

  const loadArtworks = async () => {
    // Fetch user's artworks from backend
    const storedArtworks = localStorage.getItem('artworks');
    if (storedArtworks) {
      setArtworks(JSON.parse(storedArtworks));
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    setLoading(true);
    try {
      const response = await generateArt({
        user_id: userWallet,
        prompt: prompt,
        content_type: contentType,
        llm_provider: provider,
        parameters: {
          model,
          size: contentType === 'image' ? imageSize : undefined,
        }
      });

      const newArtwork: Artwork = {
        id: response.artwork.id,
        title: prompt.substring(0, 50),
        prompt: prompt,
        contentType: contentType,
        ipfsHash: response.artwork.ipfs_hash,
        blockchainTxHash: response.artwork.blockchain_tx_hash,
        createdAt: new Date().toISOString(),
        certificateUrl: response.certificate.verification_url
      };

      const updatedArtworks = [...artworks, newArtwork];
      setArtworks(updatedArtworks);
      localStorage.setItem('artworks', JSON.stringify(updatedArtworks));

      setPrompt('');
      alert('Artwork generated and certified successfully!');
    } catch (error) {
      console.error('Error generating art:', error);
      alert('Failed to generate artwork');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (file: File) => {
    setLoading(true);
    try {
      const fileData = await file.arrayBuffer();
      const response = await importArt({
        user_id: userWallet,
        source_url: '',
        content_type: contentType,
        file_data: Array.from(new Uint8Array(fileData)),
        prompt: prompt,
        source_platform: 'external',
        metadata: {}
      });

      const newArtwork: Artwork = {
        id: response.artwork.id,
        title: file.name,
        prompt: prompt,
        contentType: contentType,
        ipfsHash: response.artwork.ipfs_hash,
        blockchainTxHash: response.artwork.blockchain_tx_hash,
        createdAt: new Date().toISOString(),
        certificateUrl: response.certificate.verification_url
      };

      const updatedArtworks = [...artworks, newArtwork];
      setArtworks(updatedArtworks);
      localStorage.setItem('artworks', JSON.stringify(updatedArtworks));

      alert('Artwork imported and certified successfully!');
    } catch (error) {
      console.error('Error importing art:', error);
      alert('Failed to import artwork');
    } finally {
      setLoading(false);
    }
  };

  const downloadCertificate = async (artworkId: string) => {
    try {
      const certificate = await getCertificate(artworkId);
      const blob = new Blob([JSON.stringify(certificate, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${artworkId}.json`;
      a.click();
    } catch (error) {
      console.error('Error downloading certificate:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">
            Proof-of-Art Studio
          </h1>
          <p className="text-xl text-gray-300">Create verifiable AI-generated art with blockchain certification</p>
          <div className="mt-4 flex items-center space-x-2">
            <CheckCircle className="text-green-400" size={20} />
            <span className="text-sm text-gray-400">Wallet: {userWallet.substring(0, 10)}...{userWallet.substring(userWallet.length - 8)}</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Creation Panel */}
          <div className="lg:col-span-1 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold mb-6">Create New Art</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Content Type</label>
                <select 
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className="w-full bg-white/20 rounded-lg px-4 py-2 border border-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="image">Image</option>
                  <option value="text">Text</option>
                  <option value="audio">Audio</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Provider</label>
                <select 
                  value={provider}
                  onChange={(e) => {
                    setProvider(e.target.value);
                    setModel('');
                  }}
                  className="w-full bg-white/20 rounded-lg px-4 py-2 border border-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="openai">OpenAI</option>
                  <option value="vertex">Google Vertex / Gemini</option>
                  <option value="grok">Grok (xAI)</option>
                  <option value="stability">Stability AI</option>
                </select>
              </div>

              {/* Model selector depends on provider/content type */}
              <div>
                <label className="block text-sm font-medium mb-2">Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-white/20 rounded-lg px-4 py-2 border border-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  {provider === 'openai' && contentType === 'image' && (
                    <>
                      <option value="gpt-image-1">gpt-image-1</option>
                      <option value="dall-e-3">dall-e-3</option>
                    </>
                  )}
                  {provider === 'openai' && contentType === 'text' && (
                    <>
                      <option value="gpt-4o-mini">gpt-4o-mini</option>
                      <option value="gpt-4o">gpt-4o</option>
                    </>
                  )}
                  {provider === 'vertex' && contentType === 'image' && (
                    <>
                      <option value="imagegeneration@005">imagegeneration@005</option>
                      <option value="imagegeneration@002">imagegeneration@002</option>
                    </>
                  )}
                  {provider === 'vertex' && contentType === 'text' && (
                    <>
                      <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                      <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                    </>
                  )}
                  {provider === 'grok' && (
                    <>
                      <option value="grok-2">grok-2</option>
                    </>
                  )}
                  {provider === 'stability' && contentType === 'image' && (
                    <>
                      <option value="stable-diffusion-xl-1024-v1-0">SDXL 1.0</option>
                    </>
                  )}
                </select>
              </div>

              {contentType === 'image' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Image Size</label>
                  <select
                    value={imageSize}
                    onChange={(e) => setImageSize(e.target.value)}
                    className="w-full bg-white/20 rounded-lg px-4 py-2 border border-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="512x512">512x512</option>
                    <option value="768x768">768x768</option>
                    <option value="1024x1024">1024x1024</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter your creative prompt..."
                  className="w-full bg-white/20 rounded-lg px-4 py-3 border border-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500 min-h-[120px]"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-gradient-to-r from-pink-500 to-cyan-500 hover:from-pink-600 hover:to-cyan-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Image size={20} />
                    <span>Generate & Certify</span>
                  </>
                )}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/30"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-transparent text-gray-400">or</span>
                </div>
              </div>

              <label className="w-full bg-white/10 hover:bg-white/20 border-2 border-dashed border-white/30 rounded-lg py-8 flex flex-col items-center justify-center cursor-pointer transition-all">
                <Upload size={32} className="mb-2 text-gray-400" />
                <span className="text-sm text-gray-400">Import existing artwork</span>
                <input
                  type="file"
                  accept="image/*,audio/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleImport(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Gallery */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold mb-6">Your Certified Artworks</h2>
              
              {artworks.length === 0 ? (
                <div className="text-center py-16">
                  <AlertCircle size={48} className="mx-auto mb-4 text-gray-500" />
                  <p className="text-gray-400">No artworks yet. Create your first certified masterpiece!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {artworks.map((artwork) => (
                    <div key={artwork.id} className="bg-white/10 rounded-xl p-4 border border-white/20 hover:border-cyan-500 transition-all">
                      <div className="aspect-square bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-lg mb-4 flex items-center justify-center">
                        {artwork.contentType === 'image' ? (
                          <Image size={64} className="text-white/40" />
                        ) : artwork.contentType === 'text' ? (
                          <FileText size={64} className="text-white/40" />
                        ) : (
                          <Music size={64} className="text-white/40" />
                        )}
                      </div>
                      
                      <h3 className="font-semibold mb-2 truncate">{artwork.title}</h3>
                      <p className="text-sm text-gray-400 mb-3 truncate">{artwork.prompt}</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">IPFS:</span>
                          <span className="text-cyan-400 truncate ml-2">{artwork.ipfsHash.substring(0, 12)}...</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Blockchain:</span>
                          <span className="text-green-400 truncate ml-2">{artwork.blockchainTxHash.substring(0, 12)}...</span>
                        </div>
                      </div>

                      <div className="mt-4 flex space-x-2">
                        <button 
                          onClick={() => downloadCertificate(artwork.id)}
                          className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white text-sm py-2 px-4 rounded-lg transition-all"
                        >
                          Download Certificate
                        </button>
                        <button className="bg-white/10 hover:bg-white/20 text-white text-sm py-2 px-4 rounded-lg transition-all">
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}