import React from 'react'
import { useForm, ValidationError } from '@formspree/react'

export default function ContactView() {
  const [state, handleSubmit] = useForm('xqevvaow')

  const inputStyle = {
    fontFamily: 'var(--sans)', fontSize: 13,
    padding: '10px 14px', borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'rgba(255,255,255,0.03)', color: 'var(--paper)',
    outline: 'none', width: '100%', boxSizing: 'border-box',
  }

  const labelStyle = {
    fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em',
    textTransform: 'uppercase', color: 'var(--mid)',
  }

  const errorStyle = {
    fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--burnt)', marginTop: 4,
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

      {state.succeeded ? (
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
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="subject" style={labelStyle}>Subject</label>
            <input
              id="subject"
              type="text"
              name="subject"
              required
              placeholder="What's this about?"
              style={inputStyle}
            />
            <ValidationError field="subject" errors={state.errors} style={errorStyle} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="message" style={labelStyle}>Message</label>
            <textarea
              id="message"
              name="message"
              required
              rows={6}
              placeholder="Your message…"
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
            <ValidationError field="message" errors={state.errors} style={errorStyle} />
          </div>

          <ValidationError errors={state.errors} style={errorStyle} />

          <button
            type="submit"
            disabled={state.submitting}
            style={{
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em',
              textTransform: 'uppercase', padding: '11px 20px', borderRadius: 6,
              background: state.submitting ? 'rgba(193,68,14,0.5)' : 'var(--burnt)',
              border: 'none', color: '#fff',
              cursor: state.submitting ? 'default' : 'pointer',
              alignSelf: 'flex-start',
            }}
          >
            {state.submitting ? 'Sending…' : 'Send Message'}
          </button>
        </form>
      )}
    </div>
  )
}
