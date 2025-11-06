import Topbar from '../components/Topbar'

export default function Session() {
  return (
    <div className="min-h-screen bg-black text-gray-100">
      <Topbar />
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">Session</h1>
        <p className="text-gray-500">Session graph coming soon.</p>
      </div>
    </div>
  )
}


