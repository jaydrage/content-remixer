'use client'

import { useState, useCallback } from 'react'
import { FiCopy, FiRefreshCw, FiUpload, FiRefreshCcw, FiBookmark, FiList } from 'react-icons/fi'
import Navigation from '@/components/Navigation'
import InstagramPost from '@/components/InstagramPost'
import LinkedInPost from '@/components/LinkedInPost'
import SavedTweetsSidebar from '@/components/SavedTweetsSidebar'
import SavedInstagramSidebar from '@/components/SavedInstagramSidebar'
import SavedLinkedInSidebar from '@/components/SavedLinkedInSidebar'
import { supabase } from '@/lib/supabase'
import { ThemeProvider } from '@/lib/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'

type Platform = 'twitter' | 'instagram' | 'linkedin'

const PROMPTS = {
  twitter: `You are a social media expert. Please transform the following text into 6 engaging, viral-style tweets. Each tweet should be concise (max 280 characters), engaging, and maintain the key information while adding personality.

IMPORTANT RULES:
1. Format your response as a numbered list with EXACTLY 6 tweets
2. Start each line with just the number and a period (e.g. "1.", "2.", etc)
3. Do not add any other formatting or text
4. Do not use any hashtags (#) in any of the tweets
5. Keep each tweet under 280 characters
6. Make them engaging and shareable
7. Each tweet should be able to stand alone

Remember: Absolutely NO hashtags in the tweets. Just plain text.`,

  instagram: `You are a social media expert. Please transform the following text into 6 engaging, motivational, viral-style instagram posts. Each post should be one sentence long, engaging, and motivational. It should be accompanied by a slightly longer version for the instagram caption and contain one or two hastags in the longer version. Each post should stand on its own and maintain the key information.

IMPORTANT: Format your response as a numbered list with EXACTLY 6 posts, with each post having two parts separated by a | character. The first part is the main text, and the second part is the caption with hashtags.`,

  linkedin: `You are an executive who is an expert in sales, marketing, operations, and building brands. You are also a social media expert. Please transform the following text into 6 engaging, viral linkedin posts. Make each post shareable and do not use any hashtags. Each post should be able to stand alone and maintain the key information.

IMPORTANT: Format your response as a numbered list with EXACTLY 6 posts, one per line, starting each line with just the number and a period (e.g. "1.", "2.", etc). Do not add any other formatting or text.`
}

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [editableTweets, setEditableTweets] = useState<{[key: number]: string}>({})
  const [isEditing, setIsEditing] = useState<{[key: number]: boolean}>({})
  const [currentPlatform, setCurrentPlatform] = useState<Platform>('twitter')
  const [instagramPosts, setInstagramPosts] = useState<Array<{content: string, caption: string, hashtags: string[]}>>([])
  const [linkedinPosts, setLinkedinPosts] = useState<string[]>([])
  const TWITTER_CHAR_LIMIT = 280

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
    setInstagramPosts([])
    setLinkedinPosts([])
    setEditableTweets({})
    setIsEditing({})
    
    try {
      console.log('Sending request to API')
      const response = await fetch('/api/remix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: inputText,
          platform: currentPlatform,
          prompt: PROMPTS[currentPlatform]
        }),
      })
      
      const data = await response.json()
      console.log('API response:', data)
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remix content')
      }

      if (currentPlatform === 'twitter') {
        if (!Array.isArray(data.tweets)) {
          throw new Error('Unexpected response format')
        }
        setTweets(data.tweets)
        const initialEditableTweets = data.tweets.reduce((acc: {[key: number]: string}, tweet: string, index: number) => {
          acc[index] = tweet
          return acc
        }, {})
        setEditableTweets(initialEditableTweets)
      } else if (currentPlatform === 'instagram') {
        const posts = data.tweets.map((post: string) => {
          const [content, captionWithTags] = post.split('|').map(s => s.trim())
          const hashtags = captionWithTags.match(/#[a-zA-Z0-9]+/g) || []
          const caption = captionWithTags.replace(/#[a-zA-Z0-9]+/g, '').trim()
          return { content, caption, hashtags }
        })
        setInstagramPosts(posts)
      } else {
        setLinkedinPosts(data.tweets)
      }
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

  const handleCopyTweet = async (index: number) => {
    try {
      const tweetContent = editableTweets[index] || tweets[index]
      await navigator.clipboard.writeText(tweetContent)
      setCopiedTweets(prev => ({ ...prev, [index]: true }))
      setTimeout(() => {
        setCopiedTweets(prev => ({ ...prev, [index]: false }))
      }, 2000)
    } catch (err) {
      console.error('Failed to copy tweet:', err)
    }
  }

  const handleTweetEdit = (index: number, newContent: string) => {
    setEditableTweets(prev => ({
      ...prev,
      [index]: newContent
    }))
  }

  const handleTweet = (index: number) => {
    const tweetContent = editableTweets[index] || tweets[index]
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetContent)}`
    window.open(tweetUrl, '_blank')
  }

  const handleSaveTweet = async (index: number) => {
    const tweetContent = editableTweets[index] || tweets[index]
    try {
      const { error } = await supabase
        .from('saved_tweets')
        .insert([
          { content: tweetContent }
        ])

      if (error) throw error

      // Open the sidebar to show the newly saved tweet
      setIsSidebarOpen(true)
      
      // Show feedback
      alert('Tweet saved successfully!')
    } catch (err) {
      console.error('Error saving tweet:', err)
      alert('Failed to save tweet. Please try again.')
    }
  }

  return (
    <ThemeProvider>
      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <ThemeToggle />
        <div className="max-w-4xl mx-auto p-6 md:p-12">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 text-transparent bg-clip-text mb-4">
              Content Remixer
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              Transform your content into engaging social media posts
            </p>
          </div>

          <Navigation
            currentPlatform={currentPlatform}
            onPlatformChange={setCurrentPlatform}
          />

          <div className="fixed top-4 right-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="flex items-center space-x-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-shadow dark:text-gray-200"
            >
              <FiList className="w-5 h-5" />
              <span>Saved Posts</span>
            </button>
          </div>

          <div className="space-y-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">
              <div className="flex flex-col space-y-6">
                {/* File Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Upload Markdown File (Optional)
                  </label>
                  <div 
                    className="flex items-center justify-center w-full"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                  >
                    <label className="w-full flex flex-col items-center px-4 py-6 bg-gray-50 dark:bg-gray-700 rounded-xl border-2 border-gray-200 dark:border-gray-600 border-dashed cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                      <FiUpload className="w-8 h-8 text-gray-400 dark:text-gray-300" />
                      <span className="mt-2 text-sm text-gray-500 dark:text-gray-300">
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
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Upload a markdown file to randomly select up to 6 quotes
                    </p>
                    {quotes.length > 0 && (
                      <button
                        onClick={handleNewSelection}
                        className="flex items-center space-x-2 px-3 py-1 text-sm text-purple-600 dark:text-purple-400
                                 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                      >
                        <FiRefreshCcw className="w-4 h-4" />
                        <span>New Selection</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Text Input Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Selected Quotes or Custom Content
                  </label>
                  <textarea
                    className="w-full h-40 p-4 text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl 
                              focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all
                              placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
                    <span>Transform into Posts</span>
                    {!inputText.trim() && <span className="text-sm ml-2">(Add content first)</span>}
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-400 animate-fade-in">
                {error}
              </div>
            )}
            
            {currentPlatform === 'twitter' && tweets.length > 0 && (
              <div className="bg-white dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 md:p-8 mt-8 border border-gray-200/50 dark:border-gray-700/50">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Generated Tweets</h2>
                  <button
                    onClick={handleCopy}
                    className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                  >
                    <FiCopy className="w-5 h-5" />
                    <span>{copied ? 'Copied!' : 'Copy All'}</span>
                  </button>
                </div>
                <div className="space-y-4">
                  {tweets.map((tweet, index) => {
                    const currentContent = editableTweets[index] || tweet
                    const charCount = currentContent.length
                    const charsRemaining = TWITTER_CHAR_LIMIT - charCount
                    const isOverLimit = charsRemaining < 0

                    return (
                      <div key={index} className="group">
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-200/50 dark:border-gray-600/20">
                          <div className="relative">
                            <textarea
                              className={`w-full p-2 mb-1 text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 border rounded-lg transition-all resize-none
                                         ${isOverLimit 
                                           ? 'border-red-300 dark:border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500' 
                                           : 'border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500'
                                         }`}
                              value={currentContent}
                              onChange={(e) => handleTweetEdit(index, e.target.value)}
                              rows={Math.ceil(currentContent.length / 50)}
                              style={{ minHeight: '60px' }}
                            />
                            <div className={`text-sm mb-2 text-right ${
                              isOverLimit 
                                ? 'text-red-500 dark:text-red-400' 
                                : charsRemaining <= 20 
                                  ? 'text-yellow-500 dark:text-yellow-400' 
                                  : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {charsRemaining} characters remaining
                            </div>
                          </div>
                          <div className="flex justify-end space-x-3">
                            <button
                              onClick={() => handleCopyTweet(index)}
                              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                              title="Copy tweet"
                            >
                              <FiCopy className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleTweet(index)}
                              className={`text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors ${isOverLimit ? 'opacity-50 cursor-not-allowed' : ''}`}
                              title={isOverLimit ? 'Tweet is too long' : 'Tweet'}
                              disabled={isOverLimit}
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleSaveTweet(index)}
                              className="text-purple-500 dark:text-purple-400 hover:text-purple-600 dark:hover:text-purple-300 transition-colors"
                              title="Save tweet"
                            >
                              <FiBookmark className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {currentPlatform === 'instagram' && instagramPosts.length > 0 && (
              <div className="space-y-8">
                {instagramPosts.map((post, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 md:p-8 border border-gray-200/50 dark:border-gray-700/50">
                    <InstagramPost
                      key={index}
                      post={post}
                      index={index}
                      onSave={async (post) => {
                        try {
                          const { error } = await supabase
                            .from('saved_instagram_posts')
                            .insert([post])
                          if (error) throw error
                          alert('Post saved successfully!')
                        } catch (err) {
                          console.error('Error saving post:', err)
                          alert('Failed to save post. Please try again.')
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {currentPlatform === 'linkedin' && linkedinPosts.length > 0 && (
              <div className="space-y-8">
                {linkedinPosts.map((post, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 md:p-8 border border-gray-200/50 dark:border-gray-700/50">
                    <LinkedInPost
                      key={index}
                      content={post}
                      index={index}
                      onSave={async (content) => {
                        try {
                          const { error } = await supabase
                            .from('saved_linkedin_posts')
                            .insert([{ content }])
                          if (error) throw error
                          alert('Post saved successfully!')
                        } catch (err) {
                          console.error('Error saving post:', err)
                          alert('Failed to save post. Please try again.')
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Platform-specific sidebars */}
        {currentPlatform === 'twitter' && (
          <SavedTweetsSidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            onRefresh={() => console.log('Tweets refreshed')}
          />
        )}

        {currentPlatform === 'instagram' && (
          <SavedInstagramSidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
        )}

        {currentPlatform === 'linkedin' && (
          <SavedLinkedInSidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
        )}
      </main>
    </ThemeProvider>
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