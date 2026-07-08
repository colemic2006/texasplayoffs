import React, { useState } from 'react'

const FORMSPREE_ID = 'YOUR_FORM_ID'

export default function ContactView() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | success | error

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ subject, message }),
      })
      if (res.ok) {
        setStatus('success')
        setSubject('')
        setMessage('')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  const inputStyle = {
    fontFamily: 'var(--sans)', fontSize: 13,
    padding: '10px 14px', borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'rgba(255,255,255,0.03)', color: 'var(--paper)',
    outline: 'none', width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontFamily: 'var(--display)', fontSize: 20, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8,
        }}>
          Contact Us
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--mid)', lineHeight: 1.7 }}>
          Send us a message — submissions are anonymous.
        </div>
      </div>

      {status === 'success' ? (
        <div style={{
          background: 'rgba(80,160,80,0.08)', border: '1px solid rgba(80,160,80,0.25)',
          borderRadius: 10, padding: '24px 28px',
        }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(100,200,100,0.9)', marginBottom: 6 }}>
            Message sent
          </div>
          <div style={{ color: 'var(--mid)', fontSize: 13 }}>
            Thanks for reaching out. Your message has been received.
          </div>
          <button
            onClick={() => setStatus('idle')}
            style={{
              marginTop: 16, fontFamily: 'var(--mono)', fontSize: 10,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              background: 'none', border: '1px solid var(--border)',
              color: 'var(--mid)', borderRadius: 5, padding: '7px 14px',
              cursor: 'pointer',
            }}
          >
            Send another
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mid)' }}>
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              required
              placeholder="What's this about?"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mid)' }}>
              Message
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              required
              rows={6}
              placeholder="Your message…"
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>

          {status === 'error' && (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--burnt)' }}>
              Something went wrong. Please try again.
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'sending'}
            style={{
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em',
              textTransform: 'uppercase', padding: '11px 20px', borderRadius: 6,
              background: status === 'sending' ? 'rgba(193,68,14,0.5)' : 'var(--burnt)',
              border: 'none', color: '#fff', cursor: status === 'sending' ? 'default' : 'pointer',
              alignSelf: 'flex-start',
            }}
          >
            {status === 'sending' ? 'Sending…' : 'Send Message'}
          </button>
        </form>
      )}
    </div>
  )
}
