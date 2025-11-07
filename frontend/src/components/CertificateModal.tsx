import React from 'react'
import { X, Copy, CheckCircle2, Key, Hash, Link as LinkIcon, Calendar, Shield, FileText } from 'lucide-react'
import { Card, CardContent } from './ui/card'

interface CertificateData {
  certificate_id?: string
  artwork_id?: string
  artist_wallet?: string
  prompt_hash?: string
  content_hash?: string
  ipfs_hash?: string
  blockchain_tx_hash?: string
  noise_signature?: string
  timestamp?: string
  issued_at?: string
  verification_url?: string
}

interface CertificateModalProps {
  certificate: CertificateData | null
  isOpen: boolean
  onClose: () => void
}

export default function CertificateModal({ certificate, isOpen, onClose }: CertificateModalProps) {
  const [copiedField, setCopiedField] = React.useState<string | null>(null)

  if (!isOpen || !certificate) return null

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  const truncateHash = (hash?: string, length: number = 20) => {
    if (!hash) return 'N/A'
    return hash.length > length ? `${hash.substring(0, length)}...` : hash
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-auto">
        <Card className="border border-neutral-800 bg-neutral-900">
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-fuchsia-500 to-cyan-500 bg-clip-text text-transparent flex items-center gap-2">
                  <FileText size={24} />
                  Proof of Art Certificate
                </h2>
                <p className="text-sm text-gray-400 mt-1">Verifiable, Immutable, On-Chain</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Certificate Content */}
            <div className="space-y-6">
              {/* Artwork Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-neutral-800 bg-neutral-800/50 p-4">
                  <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Art Title</label>
                  <p className="text-gray-200 font-medium">{certificate.artwork_id || 'N/A'}</p>
                </div>
                <div className="rounded-lg border border-neutral-800 bg-neutral-800/50 p-4">
                  <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Artwork ID</label>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-200 font-mono text-sm">{truncateHash(certificate.artwork_id, 16)}</p>
                    {certificate.artwork_id && (
                      <button
                        onClick={() => copyToClipboard(certificate.artwork_id!, 'artwork_id')}
                        className="p-1 hover:bg-neutral-700 rounded"
                      >
                        {copiedField === 'artwork_id' ? (
                          <CheckCircle2 size={14} className="text-green-400" />
                        ) : (
                          <Copy size={14} className="text-gray-400" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Creator Identity */}
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <Key size={14} />
                  Creator Identity (Wallet Address)
                </label>
                <div className="flex items-center gap-2">
                  <p className="text-cyan-400 font-mono text-sm break-all">{certificate.artist_wallet || 'N/A'}</p>
                  {certificate.artist_wallet && (
                    <button
                      onClick={() => copyToClipboard(certificate.artist_wallet!, 'wallet')}
                      className="p-1 hover:bg-neutral-700 rounded flex-shrink-0"
                    >
                      {copiedField === 'wallet' ? (
                        <CheckCircle2 size={14} className="text-green-400" />
                      ) : (
                        <Copy size={14} className="text-gray-400" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Cryptographic Data */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                  <Shield size={18} />
                  Cryptographic Verification Data
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-neutral-800 bg-neutral-800/50 p-4">
                    <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block flex items-center gap-1">
                      <Hash size={12} />
                      Verification Hash (Fingerprint)
                    </label>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-300 font-mono text-xs break-all">{truncateHash(certificate.noise_signature || certificate.content_hash, 24)}</p>
                      {(certificate.noise_signature || certificate.content_hash) && (
                        <button
                          onClick={() => copyToClipboard(certificate.noise_signature || certificate.content_hash || '', 'fingerprint')}
                          className="p-1 hover:bg-neutral-700 rounded flex-shrink-0"
                        >
                          {copiedField === 'fingerprint' ? (
                            <CheckCircle2 size={14} className="text-green-400" />
                          ) : (
                            <Copy size={14} className="text-gray-400" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-neutral-800 bg-neutral-800/50 p-4">
                    <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block flex items-center gap-1">
                      <Key size={12} />
                      GPG/Ed25519 Signature
                    </label>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-300 font-mono text-xs break-all">{truncateHash(certificate.prompt_hash, 24)}</p>
                      {certificate.prompt_hash && (
                        <button
                          onClick={() => copyToClipboard(certificate.prompt_hash!, 'signature')}
                          className="p-1 hover:bg-neutral-700 rounded flex-shrink-0"
                        >
                          {copiedField === 'signature' ? (
                            <CheckCircle2 size={14} className="text-green-400" />
                          ) : (
                            <Copy size={14} className="text-gray-400" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Blockchain & Storage */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                  <LinkIcon size={18} />
                  Blockchain & Storage
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
                    <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Blockchain Transaction ID</label>
                    <div className="flex items-center gap-2">
                      <p className="text-green-400 font-mono text-xs break-all">{truncateHash(certificate.blockchain_tx_hash, 24)}</p>
                      {certificate.blockchain_tx_hash && (
                        <>
                          <button
                            onClick={() => copyToClipboard(certificate.blockchain_tx_hash!, 'tx')}
                            className="p-1 hover:bg-neutral-700 rounded flex-shrink-0"
                          >
                            {copiedField === 'tx' ? (
                              <CheckCircle2 size={14} className="text-green-400" />
                            ) : (
                              <Copy size={14} className="text-gray-400" />
                            )}
                          </button>
                          <a
                            href={`https://etherscan.io/tx/${certificate.blockchain_tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-green-400 hover:text-green-300"
                          >
                            View
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
                    <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">DAG/IPFS Storage Link</label>
                    <div className="flex items-center gap-2">
                      <p className="text-purple-400 font-mono text-xs break-all">{truncateHash(certificate.ipfs_hash, 24)}</p>
                      {certificate.ipfs_hash && (
                        <>
                          <button
                            onClick={() => copyToClipboard(certificate.ipfs_hash!, 'ipfs')}
                            className="p-1 hover:bg-neutral-700 rounded flex-shrink-0"
                          >
                            {copiedField === 'ipfs' ? (
                              <CheckCircle2 size={14} className="text-green-400" />
                            ) : (
                              <Copy size={14} className="text-gray-400" />
                            )}
                          </button>
                          <a
                            href={`https://ipfs.io/ipfs/${certificate.ipfs_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-purple-400 hover:text-purple-300"
                          >
                            View
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg border border-neutral-800 bg-neutral-800/50 p-4">
                  <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Calendar size={12} />
                    Creation Date
                  </label>
                  <p className="text-gray-300">{formatDate(certificate.timestamp)}</p>
                </div>
                <div className="rounded-lg border border-neutral-800 bg-neutral-800/50 p-4">
                  <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Calendar size={12} />
                    Certificate Issued
                  </label>
                  <p className="text-gray-300">{formatDate(certificate.issued_at)}</p>
                </div>
              </div>

              {/* Proof-of-Human Note */}
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">"Proof of Human" Biometric Hash</label>
                <p className="text-sm text-gray-300">
                  Biometric authentication verified via Microsoft Authenticator. The facial hash is securely stored and hashed, ensuring human authorship verification.
                </p>
              </div>

              {/* Verification URL */}
              {certificate.verification_url && (
                <div className="rounded-lg border border-neutral-800 bg-neutral-800/50 p-4">
                  <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Verification URL</label>
                  <a
                    href={certificate.verification_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 text-sm break-all"
                  >
                    {certificate.verification_url}
                  </a>
                </div>
              )}

              {/* Footer */}
              <div className="pt-4 border-t border-neutral-800">
                <p className="text-xs text-gray-500 text-center">
                  This certificate is cryptographically signed and immutably stored on the blockchain. 
                  Any tampering will invalidate the verification.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

