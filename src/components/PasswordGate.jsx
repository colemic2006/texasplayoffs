import React, { useState, useEffect, useRef } from 'react'

const KEY = 'txpo_auth'
const PASSWORD = 'Playoffs!'

export function useAuth() {
  const [authed, setAuthed] = useState(() => localStorage.getItem(KEY) === '1')
  const unlock = () => { localStorage.setItem(KEY, '1'); setAuthed(true) }
  return { authed, unlock }
}

export default function PasswordGate({ onUnlock }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function submit(e) {
    e.preventDefault()
    if (value === PASSWORD) {
      onUnlock()
    } else {
      setError(true)
      setShake(true)
      setValue('')
      setTimeout(() => setShake(false), 500)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--ink)', padding: 24,
    }}>
      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-6px)}
          80%{transform:translateX(6px)}
        }
        .gate-shake { animation: shake 0.45s ease; }
      `}</style>

      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--display)', fontSize: 28, letterSpacing: '0.08em',
          color: 'var(--gold)', textTransform: 'uppercase',
        }}>
          Texas Playoffs
        </div>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em',
          color: 'rgba(245,240,232,0.3)', textTransform: 'uppercase', marginTop: 6,
        }}>
          Chapter Tracker
        </div>
      </div>

      <form
        onSubmit={submit}
        className={shake ? 'gate-shake' : ''}
        style={{
          display: 'flex', flexDirection: 'column', gap: 12,
          width: '100%', maxWidth: 280,
        }}
      >
        <input
          ref={inputRef}
          type="password"
          value={value}
          onChange={e => { setValue(e.target.value); setError(false) }}
          placeholder="Password"
          style={{
            fontFamily: 'var(--mono)', fontSize: 13,
            padding: '10px 14px', borderRadius: 6,
            border: `1px solid ${error ? 'rgba(193,68,14,0.7)' : 'rgba(255,255,255,0.15)'}`,
            background: 'rgba(255,255,255,0.04)', color: 'var(--paper)',
            outline: 'none', width: '100%', boxSizing: 'border-box',
          }}
        />
        {error && (
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em',
            color: 'var(--burnt)', textAlign: 'center',
          }}>
            Incorrect password
          </div>
        )}
        <button
          type="submit"
          style={{
            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em',
            textTransform: 'uppercase', padding: '10px 14px', borderRadius: 6,
            background: 'var(--burnt)', border: 'none', color: '#fff',
            cursor: 'pointer',
          }}
        >
          Enter
        </button>
      </form>
    </div>
  )
}
