import Image from 'next/image'
import React from 'react'
import { Github, Radar } from 'lucide-react'

const Information: React.FC = () => {
  return (
    <div className="absolute right-5 top-5 flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-lg sm:flex-row">
      <a
        href="https://github.com/ramazansancar/turkey-radar-map"
        target="_blank"
        rel="noopener noreferrer"
        title="GitHub Repository"
      >
        <Github className="h-5 w-5 text-gray-800 transition-colors hover:text-gray-600" />
      </a>
      <hr className="hidden h-3 border border-gray-200 sm:block" />
      <a
        href="https://turkey-radar-map.vercel.app"
        target="_blank"
        rel="noopener noreferrer"
        title="Radar Map"
      >
        <Radar className="h-5 w-5 text-red-600" />
      </a>
    </div>
  )
}

export default Information
