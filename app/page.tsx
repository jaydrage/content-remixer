'use client'

import { useState } from 'react'

export default function Home() {
  const [inputText, setInputText] = useState('')
  const [remixedText, setRemixedText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRemix = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text to remix')
      return
    }

    setIsLoading(true)
    setError('')
    setRemixedText('') // Clear previous result
    
    try {
      const response = await fetch('/api/remix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to remix content')
      }

      const data = await response.json()
      setRemixedText(data.remixedText)
    } catch (error) {
      setError('An error occurred while remixing. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto space-y-6 bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-4xl font-bold text-center text-gray-800">Content Remixer</h1>
        
        <textarea
          className="w-full h-40 p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Paste your content here to remix..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        
        <button
          className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400"
          onClick={handleRemix}
          disabled={isLoading || !inputText.trim()}
        >
          {isLoading ? 'Remixing...' : 'Remix Content'}
        </button>
        
        {error && (
          <div className="p-4 border rounded-lg bg-red-50 text-red-700">
            {error}
          </div>
        )}
        
        {remixedText && (
          <div className="p-4 border rounded-lg bg-green-50">
            <h2 className="font-bold mb-2 text-gray-800">Remixed Content:</h2>
            <p className="whitespace-pre-wrap">{remixedText}</p>
          </div>
        )}
      </div>
    </main>
  )
}