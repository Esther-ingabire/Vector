import { useState } from 'react'
import { X, MessageSquare, HelpCircle, Star, Send, CheckCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { feedbackApi } from '../../api/feedback.js'

export default function FeedbackModal({ mode = 'feedback', onClose }) {
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const isFeedback = mode === 'feedback'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!message.trim()) return
    setLoading(true)
    try {
      await feedbackApi.submit({
        mode,
        message: message.trim(),
        ...(isFeedback && rating > 0 ? { rating } : {}),
      })
      setSubmitted(true)
      toast.success(isFeedback ? 'Thanks for your feedback!' : "Message sent — we'll get back to you.")
      setTimeout(onClose, 2000)
    } catch {
      // toast already shown by axios interceptor
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isFeedback ? 'bg-primary-50' : 'bg-success-50'}`}>
              {isFeedback
                ? <MessageSquare className="w-5 h-5 text-primary-600" />
                : <HelpCircle className="w-5 h-5 text-success-600" />
              }
            </div>
            <div>
              <p className="font-semibold text-gray-900">{isFeedback ? 'Send Feedback' : 'Help & Support'}</p>
              <p className="text-xs text-gray-400">{isFeedback ? 'Tell us what you think' : "We're here to help"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200/60 backdrop-blur-sm rounded-xl transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {submitted ? (
          <div className="py-14 flex flex-col items-center gap-3">
            <CheckCircle className="w-12 h-12 text-success-500" />
            <p className="text-base font-semibold text-gray-800">{isFeedback ? 'Thank you!' : 'Message received!'}</p>
            <p className="text-sm text-gray-400 text-center px-6">
              {isFeedback ? 'Your feedback has been recorded.' : "We'll get back to you shortly."}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

            {!isFeedback && (
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-1.5">
                <p className="font-medium text-gray-700">Contact information</p>
                <p>Email: <span className="text-primary-600">support@chainsight.rw</span></p>
                <p>Phone: <span className="text-gray-700">+250 788 000 000</span></p>
                <p className="text-xs text-gray-400 mt-1">Mon – Fri, 8 AM – 5 PM (CAT)</p>
              </div>
            )}

            {/* Star rating — feedback only */}
            {isFeedback && (
              <div>
                <label className="label">How would you rate your experience?</label>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHovered(n)}
                      onMouseLeave={() => setHovered(0)}
                      className="p-0.5 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${
                          n <= (hovered || rating) ? 'fill-warning-400 text-warning-400' : 'text-gray-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="label">{isFeedback ? 'Your message' : 'Describe your issue'}</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
                required
                placeholder={isFeedback
                  ? 'What is working well? What could be improved?'
                  : 'Please describe your issue in detail…'
                }
                className="input resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={!message.trim() || loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />
                }
                {loading ? 'Sending…' : isFeedback ? 'Send Feedback' : 'Send Message'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
