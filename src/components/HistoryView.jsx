import React, { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const CHAPTER_COLORS = [
  '#C1440E','#D4920A','#2C4A6E','#2B5C4E','#5C2B5C','#6B6058',
  '#8B1A1A','#1A5276','#1E8449','#7D3C98','#B7770D','#2E86C1'
]

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>{children}</div>
  )
}

export default function HistoryView({ allData, years, loadYear }) {
  const [selectedChapters, setSelectedChapters] = useState(['HOU','FTW','SAT','DAL','TYL'])
  const [view, setView] = useState('trend') // 'trend' | 'table'

  // Gather all chapter codes from all loaded years
  const allChapters = useMemo(() => {
    const codes = new Set()
    years.forEach(yr => {
      allData[yr]?.chapters?.forEach(c => codes.add(c.code))
    })
    return Array.from(codes).sort()
  }, [allData, years])

  // Build trend line data: [{year, HOU:132, FTW:75, ...}]
  const trendData = useMemo(() => {
    const loadedYears = years.filter(y => allData[y])
    return loadedYears.map(yr => {
      const row = { year: yr }
      allData[yr]?.chapters?.forEach(c => {
        row[c.code] = c.total || 0
      })
      return row
    }).reverse()
  }, [allData, years])

  const loadedYears = years.filter(y => allData[y])
  const missingYears = years.filter(y => !allData[y])

  function toggleChapter(code) {
    setSelectedChapters(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    )
  }

  return (
    <div>
      <SectionLabel>04 · Multi-Year Analysis</SectionLabel>
      <div style={{
        fontFamily:"'Bebas Neue', sans-serif", fontSize:30, letterSpacing:0.5,
        color:'var(--ink)', marginBottom:20, paddingBottom:12,
        borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12
      }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--gold)', flexShrink:0 }} />
        Chapter History · 2022–{Math.max(...years)}
      </div>

      {missingYears.length > 0 && (
        <div style={{
          background:'rgba(212,146,10,0.06)', border:'1px solid rgba(212,146,10,0.2)',
          borderRadius:8, padding:'12px 16px', marginBottom:20, fontSize:12, color:'var(--mid)'
        }}>
          <strong style={{ color:'var(--gold)' }}>Note:</strong> Data for {missingYears.join(', ')} hasn't been loaded yet.{' '}
          {missingYears.map(y => (
            <button key={y} onClick={() => loadYear(y)} style={{
              fontFamily:'var(--mono)', fontSize:10, padding:'2px 8px', marginLeft:6,
              borderRadius:3, border:'1px solid var(--gold)', background:'transparent',
              color:'var(--gold)', cursor:'pointer'
            }}>Load {y}</button>
          ))}
        </div>
      )}

      {/* View toggle */}
      <div style={{ display:'flex', gap:6, marginBottom:20 }}>
        {[['trend','Trend Lines'],['table','Comparison Table']].map(([key,lbl]) => (
          <button key={key} onClick={() => setView(key)} style={{
            fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase',
            padding:'5px 12px', borderRadius:4, border:'1px solid var(--border)',
            background: view === key ? 'var(--ink)' : 'transparent',
            color: view === key ? 'var(--cream)' : 'var(--mid)', cursor:'pointer'
          }}>{lbl}</button>
        ))}
      </div>

      {view === 'trend' && (
        <>
          {/* Chapter selector */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', marginBottom:8 }}>
              Select chapters to compare (click to toggle):
            </div>
            <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
              {allChapters.map((code, i) => {
                const active = selectedChapters.includes(code)
                return (
                  <button key={code} onClick={() => toggleChapter(code)} style={{
                    fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em',
                    padding:'3px 8px', borderRadius:3, cursor:'pointer',
                    border:`1px solid ${active ? CHAPTER_COLORS[i % CHAPTER_COLORS.length] : 'var(--border)'}`,
                    background: active ? CHAPTER_COLORS[i % CHAPTER_COLORS.length] : 'transparent',
                    color: active ? '#fff' : 'var(--mid)',
                    transition:'all 0.15s'
                  }}>{code}</button>
                )
              })}
            </div>
          </div>

          {trendData.length < 2 ? (
            <div style={{ padding:'32px 0', textAlign:'center', color:'var(--mid)', fontSize:13 }}>
              Load at least 2 years of data to see trend lines.
            </div>
          ) : (
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'24px 8px 8px' }}>
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={trendData} margin={{ top:4, right:24, left:0, bottom:4 }}>
                  <XAxis dataKey="year" tick={{ fontFamily:'DM Mono', fontSize:10, fill:'var(--mid)' }} />
                  <YAxis tick={{ fontFamily:'DM Mono', fontSize:10, fill:'var(--mid)' }} width={32} />
                  <Tooltip
                    contentStyle={{ fontFamily:'DM Mono', fontSize:11, border:'1px solid var(--border)', borderRadius:6 }}
                    formatter={(v, name) => [v, name]}
                  />
                  <Legend wrapperStyle={{ fontFamily:'DM Mono', fontSize:10 }} />
                  {selectedChapters.map((code, i) => (
                    <Line
                      key={code}
                      type="monotone"
                      dataKey={code}
                      stroke={CHAPTER_COLORS[allChapters.indexOf(code) % CHAPTER_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r:4 }}
                      activeDot={{ r:6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {view === 'table' && (
        <ComparisonTable allData={allData} years={loadedYears} allChapters={allChapters} />
      )}
    </div>
  )
}

function ComparisonTable({ allData, years, allChapters }) {
  const sortedYears = [...years].sort()

  return (
    <div style={{ overflow:'auto', borderRadius:10, border:'1px solid var(--border)' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11, background:'var(--surface)', minWidth:600 }}>
        <thead>
          <tr style={{ background:'rgba(15,13,11,0.03)' }}>
            <th style={{ ...thStyle, textAlign:'left', position:'sticky', left:0, background:'rgba(245,240,232,0.98)' }}>Chapter</th>
            {sortedYears.map(y => (
              <th key={y} style={thStyle}>{y}</th>
            ))}
            <th style={{ ...thStyle, color:'var(--gold)' }}>Avg</th>
          </tr>
        </thead>
        <tbody>
          {allChapters.map((code, idx) => {
            const vals = sortedYears.map(y => {
              const ch = allData[y]?.chapters?.find(c => c.code === code)
              return ch?.total || 0
            })
            const avg = vals.length ? (vals.reduce((s,v)=>s+v,0) / vals.length).toFixed(1) : '—'
            // Find name from any year
            let name = code
            for (const y of sortedYears) {
              const ch = allData[y]?.chapters?.find(c => c.code === code)
              if (ch?.name && ch.name !== code) { name = ch.name; break }
            }

            return (
              <tr key={code} style={{
                borderBottom:'1px solid rgba(15,13,11,0.05)',
                background: idx % 2 === 0 ? 'transparent' : 'rgba(15,13,11,0.015)'
              }}>
                <td style={{
                  ...tdStyle, position:'sticky', left:0, zIndex:1,
                  background: idx % 2 === 0 ? 'var(--surface)' : 'rgba(245,240,232,0.98)',
                }}>
                  <span style={{ fontFamily:'var(--mono)', fontSize:10, fontWeight:500 }}>{code}</span>
                  <span style={{ color:'var(--mid)', marginLeft:8, fontSize:10 }}>{name}</span>
                </td>
                {vals.map((val, i) => {
                  const prev = i > 0 ? vals[i-1] : null
                  const delta = prev !== null ? val - prev : null
                  return (
                    <td key={i} style={{ ...tdStyle, textAlign:'center', fontFamily:'var(--mono)', fontSize:11 }}>
                      {val}
                      {delta !== null && delta !== 0 && (
                        <span style={{ fontSize:9, marginLeft:3, color: delta > 0 ? 'var(--sage)' : 'var(--burnt)' }}>
                          {delta > 0 ? '▲' : '▼'}{Math.abs(delta)}
                        </span>
                      )}
                    </td>
                  )
                })}
                <td style={{ ...tdStyle, textAlign:'center', fontFamily:"'Bebas Neue', sans-serif", fontSize:16, color:'var(--gold)' }}>
                  {avg}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const thStyle = {
  textAlign:'center', padding:'9px 12px',
  fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em',
  textTransform:'uppercase', color:'var(--mid)',
  borderBottom:'1px solid var(--border)', whiteSpace:'nowrap'
}

const tdStyle = { padding:'8px 12px', verticalAlign:'middle' }
