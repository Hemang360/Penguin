import React from 'react'
import { Button } from './ui/button'

export default function Topbar() {
  return (
    <nav className="w-full border-b border-neutral-800 bg-black/60 backdrop-blur supports-[backdrop-filter]:bg-black/40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-6 rounded-sm bg-gradient-to-br from-fuchsia-500 to-cyan-500" />
          <span className="font-semibold tracking-tight">Proof-of-Art</span>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="secondary" size="sm">Dashboard</Button>
          <Button variant="outline" size="sm">Verify</Button>
        </div>
      </div>
    </nav>
  )
}


