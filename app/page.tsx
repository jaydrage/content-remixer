'use client'

import { useState, useCallback } from 'react'
import { FiCopy, FiRefreshCw, FiUpload, FiRefreshCcw } from 'react-icons/fi'

export default function Home() {
  const [inputText, setInputText] = useState('')
  const [remixedText, setRemixedText] = useState('')
  const [tweets, setTweets] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [copiedTweets, setCopiedTweets] = useState<{[key: number]: boolean}>({})
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [quotes, setQuotes] = useState<string[]>([])

  const processMarkdownFile = async (file: File) => {
    console.log('Processing file:', file.name)
    if (!file.name.endsWith('.md')) {
      setError('Please select a markdown (.md) file')
      setInputText('')
      setQuotes([])
      setSelectedFile(null)
      return
    }

    try {
      setSelectedFile(file)
      const content = await file.text()
      console.log('File content length:', content.length)
      
      // Extract quotes from markdown content
      const lines = content.split('\n')
      console.log('Number of lines:', lines.length)
      console.log('First few lines:', lines.slice(0, 5))

      // Find the Highlights section
      const highlightsIndex = lines.findIndex(line => line.trim() === '### Highlights')
      if (highlightsIndex === -1) {
        setError('No ### Highlights section found in the file')
        setInputText('')
        setQuotes([])
        setSelectedFile(null)
        return
      }

      // Process lines after ### Highlights
      let currentQuote: string[] = []
      const extractedQuotes: string[] = []

      for (let i = highlightsIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim()
        
        // Skip empty lines
        if (!line) continue
        
        // If we hit another section header, stop processing
        if (line.startsWith('###')) break
        
        // If line starts with -, it's a new quote
        if (line.startsWith('-')) {
          // Save previous quote if exists
          if (currentQuote.length > 0) {
            extractedQuotes.push(currentQuote.join(' '))
            currentQuote = []
          }
          // Add the new quote line (removing the leading -)
          currentQuote.push(line.replace(/^-\s*[""]?\s*/, '').replace(/[""]$/, ''))
        } else {
          // Continue previous quote
          currentQuote.push(line.replace(/[""]$/, '').replace(/^[""]/, ''))
        }
      }
      
      // Add the last quote if exists
      if (currentQuote.length > 0) {
        extractedQuotes.push(currentQuote.join(' '))
      }
      
      console.log('Number of extracted quotes:', extractedQuotes.length)
      console.log('First few extracted quotes:', extractedQuotes.slice(0, 3))
      
      if (extractedQuotes.length === 0) {
        setError('No quotes found in the Highlights section. Looking for lines starting with -')
        setInputText('')
        setQuotes([])
        setSelectedFile(null)
        return
      }

      setQuotes(extractedQuotes)
      
      // Randomly select up to 6 quotes
      const selectedQuotes = extractedQuotes
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(6, extractedQuotes.length))
        .join('\n\n')

      console.log('Selected quotes:', selectedQuotes)
      setInputText(selectedQuotes)
      setError('')
    } catch (err) {
      console.error('Error processing markdown:', err)
      setError('Failed to process the markdown file')
      setInputText('')
      setQuotes([])
      setSelectedFile(null)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    console.log('File selected:', file?.name)
    if (!file) return
    await processMarkdownFile(file)
  }

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    console.log('File dropped:', file?.name)
    if (!file) return
    await processMarkdownFile(file)
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const handleNewSelection = () => {
    if (quotes.length > 0) {
      const newSelection = quotes
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(6, quotes.length))
        .join('\n\n')
      console.log('New selection:', newSelection)
      setInputText(newSelection)
    }
  }

  const handleRemix = async () => {
    console.log('Remix button clicked')
    console.log('Current input text:', inputText)
    
    if (!inputText.trim()) {
      console.log('No input text found')
      setError('Please enter some text or select a markdown file')
      return
    }

    setIsLoading(true)
    setError('')
    setTweets([])
    
    try {
      console.log('Sending request to API')
      const response = await fetch('/api/remix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
      })
      
      const data = await response.json()
      console.log('API response:', data)
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remix content')
      }

      if (!Array.isArray(data.tweets)) {
        throw new Error('Unexpected response format')
      }

      setTweets(data.tweets)
    } catch (error: unknown) {
      console.error('Error in handleRemix:', error)
      setError(error instanceof Error ? error.message : 'An error occurred while remixing. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tweets.join('\n\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  const handleCopyTweet = async (index: number, tweet: string) => {
    try {
      await navigator.clipboard.writeText(tweet)
      setCopiedTweets(prev => ({ ...prev, [index]: true }))
      setTimeout(() => {
        setCopiedTweets(prev => ({ ...prev, [index]: false }))
      }, 2000)
    } catch (err) {
      console.error('Failed to copy tweet:', err)
    }
  }

  const handleTweet = (tweet: string) => {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`
    window.open(tweetUrl, '_blank')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto p-6 md:p-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-transparent bg-clip-text mb-4">
            Content Remixer
          </h1>
          <p className="text-gray-600 text-lg">
            Transform your content into engaging tweets in seconds
          </p>
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <div className="flex flex-col space-y-6">
              {/* File Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Markdown File (Optional)
                </label>
                <div 
                  className="flex items-center justify-center w-full"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <label className="w-full flex flex-col items-center px-4 py-6 bg-gray-50 rounded-xl border-2 border-gray-200 border-dashed cursor-pointer hover:bg-gray-100 transition-colors">
                    <FiUpload className="w-8 h-8 text-gray-400" />
                    <span className="mt-2 text-sm text-gray-500">
                      {selectedFile ? selectedFile.name : 'Select a markdown file or drag and drop'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".md"
                      onChange={handleFileSelect}
                    />
                  </label>
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    Upload a markdown file to randomly select up to 6 quotes
                  </p>
                  {quotes.length > 0 && (
                    <button
                      onClick={handleNewSelection}
                      className="flex items-center space-x-2 px-3 py-1 text-sm text-purple-600 
                               hover:bg-purple-50 rounded-lg transition-colors"
                    >
                      <FiRefreshCcw className="w-4 h-4" />
                      <span>New Selection</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Text Input Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selected Quotes or Custom Content
                </label>
                <textarea
                  className="w-full h-40 p-4 text-gray-800 bg-gray-50 border border-gray-200 rounded-xl 
                            focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all
                            placeholder:text-gray-400"
                  placeholder="Paste your content here or upload a markdown file above..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
              </div>
            </div>
            
            <button
              className={`mt-6 w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 
                         text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 
                         transition-all transform hover:scale-[1.02] active:scale-[0.98]
                         ${(!inputText.trim() || isLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}
                         flex items-center justify-center space-x-2`}
              onClick={handleRemix}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <FiRefreshCw className="animate-spin" />
                  <span>Transforming...</span>
                </>
              ) : (
                <>
                  <span>Transform into Tweets</span>
                  {!inputText.trim() && <span className="text-sm ml-2">(Add content first)</span>}
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 animate-fade-in">
              {error}
            </div>
          )}
          
          {tweets.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-xl text-gray-800">Your Tweets</h2>
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 
                           hover:text-purple-600 transition-colors rounded-lg hover:bg-purple-50"
                >
                  <FiCopy />
                  <span>{copied ? 'Copied!' : 'Copy all'}</span>
                </button>
              </div>
              <div className="space-y-4">
                {tweets.map((tweet, index) => (
                  <div 
                    key={index}
                    className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-purple-200 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <p className="text-gray-800 whitespace-pre-wrap font-sans flex-grow">{tweet}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleCopyTweet(index, tweet)}
                          className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-600 
                                   hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                          <FiCopy className="w-4 h-4" />
                          <span>{copiedTweets[index] ? 'Copied!' : 'Copy'}</span>
                        </button>
                        <button
                          onClick={() => handleTweet(tweet)}
                          className="flex items-center space-x-2 px-3 py-1.5 text-sm text-blue-500
                                   hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                          </svg>
                          <span>Tweet</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

// Add this to your globals.css or create it if it doesn't exist
// @keyframes fade-in {
//   from { opacity: 0; transform: translateY(10px); }
//   to { opacity: 1; transform: translateY(0); }
// }
// 
// .animate-fade-in {
//   animation: fade-in 0.3s ease-out forwards;
// }