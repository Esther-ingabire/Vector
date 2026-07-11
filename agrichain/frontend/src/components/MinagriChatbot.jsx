import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Brain, Loader, ChevronDown } from 'lucide-react'
import { analyticsApi } from '../api/analytics.js'

const SUGGESTIONS = [
  'Which district has the highest losses?',
  'What are the loss rates by crop?',
  'Show me active area loss alerts',
  'What are the recommendations?',
  'How is cold chain compliance?',
  'What is the national loss trend?',
]

function formatAnswer(text) {
  // Render **bold** and bullet points from the backend's markdown-lite format
  const lines = text.split('\n')
  return lines.map((line, i) => {
    const boldified = line.replace(/\*\*(.*?)\*\*/g, (_, m) => `<strong>${m}</strong>`)
    if (line.startsWith('•')) {
      return <li key={i} className="ml-2" dangerouslySetInnerHTML={{ __html: boldified.replace(/^•\s*/, '') }} />
    }
    if (/^\d+\./.test(line)) {
      return <li key={i} className="ml-2 list-decimal" dangerouslySetInnerHTML={{ __html: boldified.replace(/^\d+\.\s*/, '') }} />
    }
    if (line.trim() === '') return <div key={i} className="h-2" />
    return <p key={i} dangerouslySetInnerHTML={{ __html: boldified }} />
  })
}

export default function MinagriChatbot() {
  const [open, setOpen]       = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef             = useRef(null)
  const inputRef              = useRef(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
      if (messages.length === 0) {
        setMessages([{
          role: 'assistant',
          text: "Hello! I'm the ChainSight AI Assistant. Ask me anything about Rwanda's agricultural supply chain — districts, crops, loss rates, cold chain, or recommendations.",
        }])
      }
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (q) => {
    const question = (q || input).trim()
    if (!question || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: question }])
    setLoading(true)
    try {
      const res = await analyticsApi.minagriChat(question)
      setMessages(prev => [...prev, { role: 'assistant', text: res.data.answer }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, I could not reach the analysis engine. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        title="AI Supply Chain Assistant"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-105"
        style={{ background: 'linear-gradient(135deg, #228b52 0%, #1a5c34 100%)' }}
      >
        {open
          ? <ChevronDown className="w-6 h-6 text-white" />
          : <MessageSquare className="w-6 h-6 text-white" />
        }
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-gray-200 bg-white"
          style={{ height: '520px' }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{ background: 'linear-gradient(135deg, #228b52 0%, #1a5c34 100%)' }}>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">AI Supply Chain Assistant</p>
              <p className="text-xs text-green-200">Powered by live ChainSight data</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mr-2 mt-0.5"
                    style={{ background: 'linear-gradient(135deg, #228b52, #1a5c34)' }}>
                    <Brain className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed space-y-1 ${
                  m.role === 'user'
                    ? 'bg-primary-600 text-white rounded-br-sm'
                    : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
                }`}>
                  {m.role === 'assistant'
                    ? <div className="space-y-0.5">{formatAnswer(m.text)}</div>
                    : m.text
                  }
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mr-2 mt-0.5"
                  style={{ background: 'linear-gradient(135deg, #228b52, #1a5c34)' }}>
                  <Brain className="w-3 h-3 text-white" />
                </div>
                <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-2">
                  <Loader className="w-3.5 h-3.5 animate-spin text-primary-500" />
                  <span className="text-xs text-gray-400">Analysing supply chain data…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions (only when just the welcome message is shown) */}
          {messages.length === 1 && !loading && (
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex gap-1.5 overflow-x-auto shrink-0">
              {SUGGESTIONS.slice(0, 3).map(s => (
                <button key={s} onClick={() => send(s)}
                  className="shrink-0 text-xs bg-white border border-gray-200 rounded-full px-3 py-1.5 text-gray-600 hover:border-primary-400 hover:text-primary-600 transition-colors whitespace-nowrap">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 bg-white shrink-0">
            <div className="flex items-end gap-2 bg-gray-50 rounded-xl border border-gray-200 focus-within:border-primary-400 focus-within:ring-1 focus-within:ring-primary-200 transition-all px-3 py-2">
              <textarea
                ref={inputRef}
                rows={1}
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none max-h-24"
                placeholder="Ask about districts, crops, losses…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKey}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #228b52, #1a5c34)' }}
              >
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
