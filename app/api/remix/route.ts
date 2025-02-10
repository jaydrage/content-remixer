import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// Types for request and response
type RemixRequest = {
  text: string
  platform: 'twitter' | 'instagram' | 'linkedin'
  prompt: string
}

type RemixResponse = {
  tweets: string[]
} | {
  error: string
}

// Prompt template for generating tweets
const TWEET_GENERATION_PROMPT = `You are a social media expert. Please transform the following text into 6 engaging, viral-style tweets. Each tweet should be concise (max 280 characters), engaging, and maintain the key information while adding personality. 

IMPORTANT: Format your response as a numbered list with EXACTLY 6 tweets, one per line, starting each line with just the number and a period (e.g. "1.", "2.", etc). Do not add any other formatting or text.

Input text: {text}

Remember:
- You are a social media expert
- Keep each tweet under 280 characters
- Make them engaging and shareable
- Maintain the key information
- Do not use any hashtags
- Each tweet should be able to stand alone`

export async function POST(request: Request) {
  console.log('Environment variables:', {
    CLAUDE_API_KEY_EXISTS: !!process.env.CLAUDE_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!process.env.CLAUDE_API_KEY) {
    console.error('CLAUDE_API_KEY is not defined in environment')
    return NextResponse.json<RemixResponse>(
      { error: 'API key not configured - please check server logs' },
      { status: 500 }
    )
  }

  const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
  })

  try {
    const { text, platform, prompt } = await request.json() as RemixRequest
    console.log('Processing remix request:', { platform, text })

    console.log('Making request to Claude API...')
    const response = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `${prompt}\n\nInput text: ${text}`
      }]
    })
    console.log('Claude API Response:', JSON.stringify(response, null, 2))

    const remixedContent = response.content[0].type === 'text' ? response.content[0].text : null
    console.log('Extracted content:', remixedContent)
    
    if (!remixedContent) {
      throw new Error('Unexpected response format from Claude API')
    }

    // Parse the response into individual posts
    const posts = remixedContent
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        // Remove the number prefix (e.g., "1.", "2.", etc.)
        const postText = line.replace(/^\d+\.\s*/, '').trim()
        return postText
      })

    if (posts.length !== 6) {
      throw new Error('Expected exactly 6 posts in response')
    }

    return NextResponse.json<RemixResponse>({ 
      tweets: posts
    })
  } catch (error) {
    const errorDetails = {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      stack: error instanceof Error ? error.stack : undefined,
      response: (error as any)?.response,
      status: (error as any)?.status,
      type: (error as any)?.type
    }
    console.error('Error processing remix request:', errorDetails)

    return NextResponse.json<RemixResponse>(
      { error: errorDetails.message },
      { status: 500 }
    )
  }
} 