import React, { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

const WEEKS = ['1','2','3','4','5','6']
const ROUND_LABELS = { '1':'Week 1', '2':'Week 2', '3':'Week 3', '4':'Week 4', '5':'Week 5', '6':'Week 6' }
const CLASSIFICATIONS = ['1A D1','1A D2','2A D1','2A D2','3A D1','3A D2','4A D1','4A D2','5A D1','5A D2','6A D1','6A D2']

// Classifications that do not play in a given week (bye)
const BYE_CLASSIFICATIONS = { '5': ['1A D1', '1A D2'] }

const CHAPTER_NAMES = {
  ABI:'Abilene', AMA:'Amarillo', AUS:'Austin', BEA:'Beaumont', COM:'Commerce',
  CSC:'College Station', CTX:'Central Texas', DAL:'Dallas', ELP:'El Paso',
  ETX:'East Texas', FTW:'Fort Worth', HOU:'Houston', NTX:'North Texas',
  PBC:'Permian Basin', RGV:'Rio Grande Valley', SAT:'San Antonio',
  SAN:'San Angelo', SFA:'Stephen F. Austin', SPC:'South Plains', STX:'South Texas',
  TYL:'Tyler', WAC:'Waco', WACO:'Waco',
}

const COLORS = ['var(--burnt)','var(--gold)','var(--steel)','var(--sage)','var(--grape)','var(--mid)']

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em',
      textTransform:'uppercase', color:'var(--mid)', marginBottom:6
    }}>{children}</div>
  )
}

function SectionTitle({ accent, children }) {
  return (
    <div style={{
      fontFamily:"'Bebas Neue', sans-serif", fontSize:30, letterSpacing:0.5,
      color:'var(--ink)', marginBottom:20, paddingBottom:12,
      borderBottom:'1px solid var(--border)',
      display:'flex', alignItems:'center', gap:12
    }}>
      <div style={{ width:4, height:28, borderRadius:2, background: accent, flexShrink:0 }} />
      {children}
    </div>
  )
}

export default function ChapterDashboard({ data, year }) {
  const [sortBy, setSortBy] = useState('total')
  const [selectedWeek, setSelectedWeek] = useState('all')
  const [selectedChapter, setSelectedChapter] = useState(null)
  const [filterClass, setFilterClass] = useState('all')

  const chapters = data?.chapters || []

  const sorted = useMemo(() => {
    return [...chapters].sort((a, b) => {
      if (sortBy === 'total') return (b.total || 0) - (a.total || 0)
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'code') return a.code.localeCompare(b.code)
      // sort by week
      const aW = a.weeks?.[sortBy]?.total || 0
      const bW = b.weeks?.[sortBy]?.total || 0
      return bW - aW
    })
  }, [chapters, sortBy])

  const totalGames = chapters.reduce((s, c) => s + (c.total || 0), 0)

  // Bar chart data: games per chapter for selected week (or total)
  const barData = useMemo(() => {
    return sorted.slice(0, 22).map(c => {
      let val
      if (selectedWeek === 'all') {
        val = filterClass === 'all'
          ? (c.total || 0)
          : WEEKS.reduce((s, w) => s + (c.weeks?.[w]?.classifications?.[filterClass] || 0), 0)
      } else {
        val = filterClass === 'all'
          ? (c.weeks?.[selectedWeek]?.total || 0)
          : (c.weeks?.[selectedWeek]?.classifications?.[filterClass] || 0)
      }
      return { code: c.code, value: val }
    })
  }, [sorted, selectedWeek, filterClass])

  const filteredTotal = useMemo(() => {
    return chapters.reduce((s, c) => {
      if (selectedWeek === 'all') {
        return s + (filterClass === 'all'
          ? (c.total || 0)
          : WEEKS.reduce((ss, w) => ss + (c.weeks?.[w]?.classifications?.[filterClass] || 0), 0))
      } else {
        return s + (filterClass === 'all'
          ? (c.weeks?.[selectedWeek]?.total || 0)
          : (c.weeks?.[selectedWeek]?.classifications?.[filterClass] || 0))
      }
    }, 0)
  }, [chapters, selectedWeek, filterClass])

  const selectedChapterData = selectedChapter
    ? chapters.find(c => c.code === selectedChapter)
    : null

  return (
    <div>
      {/* ── 2022 PARTIAL DATA NOTE ── */}
      {year === 2022 && (
        <div style={{
          background:'rgba(193,68,14,0.06)', border:'1px solid rgba(193,68,14,0.2)',
          borderRadius:8, padding:'10px 16px', marginBottom:20,
          fontFamily:'var(--mono)', fontSize:11, color:'var(--mid)', lineHeight:1.6
        }}>
          <span style={{ color:'var(--burnt)', fontWeight:600, marginRight:6 }}>Note:</span>
          2022 has all 692 games. Two games have no chapter assignment (one 2A D1 Bi-District game with an unknown chapter, plus one other), so the chapter-based total shown here is 690.
        </div>
      )}

      {/* ── SUMMARY CARDS ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:40 }}>
        {[
          { label:'Total Playoff Games', value: totalGames, color:'var(--burnt)' },
          { label:'Active Chapters', value: chapters.filter(c=>c.total>0).length, color:'var(--gold)' },
          { label:'Largest Chapter', value: sorted[0]?.code || '—', color:'var(--steel)' },
          { label:'Most Games', value: sorted[0]?.total || '—', color:'var(--sage)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10,
            padding:'16px 18px', position:'relative', overflow:'hidden'
          }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color }} />
            <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>{label}</div>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:28, color:'var(--ink)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── BAR CHART ── */}
      <div style={{ marginBottom:48 }}>
        <SectionLabel>01 · Visual Overview</SectionLabel>
        <SectionTitle accent="var(--burnt)">Games by Chapter</SectionTitle>

        {/* Filters */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
          <FilterGroup
            label="Week"
            options={[['all','All Weeks'], ...WEEKS.map(w => [w, ROUND_LABELS[w]])]}
            value={selectedWeek}
            onChange={setSelectedWeek}
          />
          <FilterGroup
            label="Classification"
            options={[['all','All'], ...CLASSIFICATIONS.map(c => [c, c])]}
            value={filterClass}
            onChange={setFilterClass}
            byeKeys={BYE_CLASSIFICATIONS[selectedWeek] || []}
          />
        </div>

        <div style={{ display:'flex', gap:16, alignItems:'stretch' }}>
          <div style={{ flex:1, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'24px 8px 8px' }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} margin={{ top:4, right:8, left:0, bottom:30 }}>
                <XAxis dataKey="code" tick={{ fontFamily:'DM Mono', fontSize:9, fill:'var(--mid)' }} angle={-45} textAnchor="end" />
                <YAxis tick={{ fontFamily:'DM Mono', fontSize:9, fill:'var(--mid)' }} width={28} />
                <Tooltip
                  formatter={(v) => [v, 'Games']}
                  contentStyle={{ fontFamily:'DM Mono', fontSize:11, border:'1px solid var(--border)', borderRadius:6 }}
                />
                <Bar dataKey="value" radius={[3,3,0,0]}>
                  {barData.map((entry, i) => (
                    <Cell key={entry.code}
                      fill={entry.code === selectedChapter ? 'var(--gold)' : 'var(--burnt)'}
                      fillOpacity={entry.value === 0 ? 0.2 : 0.85}
                      onClick={() => setSelectedChapter(entry.code === selectedChapter ? null : entry.code)}
                      style={{ cursor:'pointer' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{
            background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10,
            padding:'20px 24px', display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center', minWidth:140
          }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginBottom:4, textAlign:'center' }}>
              {selectedWeek === 'all' ? 'All Rounds' : ROUND_LABELS[selectedWeek]}
            </div>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:96, lineHeight:1, color:'var(--ink)' }}>
              {filteredTotal}
            </div>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginTop:4, textAlign:'center' }}>
              games
            </div>
          </div>
        </div>
        <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)', marginTop:6, textAlign:'center', letterSpacing:'0.1em' }}>
          Click a bar to drill into that chapter's weekly breakdown
        </div>
      </div>

      {/* ── CHAPTER DETAIL (drill-in) ── */}
      {selectedChapterData && (
        <div style={{ marginBottom:48 }}>
          <SectionLabel>Chapter Detail</SectionLabel>
          <SectionTitle accent="var(--gold)">{CHAPTER_NAMES[selectedChapterData.code] || selectedChapterData.name} ({selectedChapterData.code})</SectionTitle>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            {/* Weekly summary table */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background:'rgba(15,13,11,0.03)' }}>
                    <th style={thStyle}>Week</th>
                    <th style={thStyle}>Round</th>
                    <th style={thStyle}>Games</th>
                    <th style={thStyle}>Cumulative</th>
                  </tr>
                </thead>
                <tbody>
                  {WEEKS.map(w => {
                    const wk = selectedChapterData.weeks?.[w]
                    return (
                      <tr key={w} style={{ borderBottom:'1px solid rgba(15,13,11,0.05)' }}>
                        <td style={{ ...tdStyle, textAlign:'center' }}>{w}</td>
                        <td style={{ ...tdStyle, color:'var(--mid)', fontSize:11, textAlign:'center' }}>{ROUND_LABELS[w]}</td>
                        <td style={{ ...tdStyle, fontWeight:500, textAlign:'center' }}>{wk?.total ?? 0}</td>
                        <td style={{ ...tdStyle, color:'var(--burnt)', fontFamily:'var(--mono)', fontSize:11, textAlign:'center' }}>
                          {wk?.cumulative ?? 0}
                        </td>
                      </tr>
                    )
                  })}
                  <tr style={{ background:'rgba(212,146,10,0.06)' }}>
                    <td colSpan={2} style={{ ...tdStyle, fontFamily:'var(--mono)', fontSize:10, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--mid)' }}>Post-Season Total</td>
                    <td colSpan={2} style={{ ...tdStyle, fontFamily:"'Bebas Neue', sans-serif", fontSize:22, color:'var(--burnt)', textAlign:'center' }}>
                      {selectedChapterData.total}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Classification breakdown mini-chart */}
            <ClassificationBreakdown chapter={selectedChapterData} />
          </div>
        </div>
      )}

      {/* ── FULL DATA TABLE ── */}
      <div style={{ marginBottom:48 }}>
        <SectionLabel>02 · Full Data</SectionLabel>
        <SectionTitle accent="var(--steel)">All Chapters — Week by Week</SectionTitle>

        {/* Sort controls */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
          <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', alignSelf:'center', marginRight:4 }}>Sort by:</span>
          {[['total','Total'],['name','Name'],['1','Wk 1'],['2','Wk 2'],['3','Wk 3'],['4','Wk 4'],['5','Wk 5'],['6','Wk 6']].map(([key,label]) => (
            <button key={key} onClick={() => setSortBy(key)} style={{
              fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase',
              padding:'4px 10px', borderRadius:4, border:'1px solid var(--border)',
              background: sortBy === key ? 'var(--ink)' : 'transparent',
              color: sortBy === key ? 'var(--cream)' : 'var(--mid)',
              cursor:'pointer', transition:'all 0.15s'
            }}>{label}</button>
          ))}
        </div>

        <div style={{ overflow:'auto', borderRadius:10, border:'1px solid var(--border)' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, background:'var(--surface)', minWidth:700 }}>
            <thead>
              <tr style={{ background:'rgba(15,13,11,0.03)' }}>
                <th style={{ ...thStyle, textAlign:'left', position:'sticky', left:0, background:'rgba(245,240,232,0.98)' }}>Chapter</th>
                {WEEKS.map(w => <th key={w} style={thStyle}>Wk {w}</th>)}
                <th style={{ ...thStyle, color:'var(--burnt)' }}>Total</th>
                <th style={thStyle}>% of Games</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((ch, idx) => {
                const pct = totalGames > 0 ? ((ch.total / totalGames) * 100).toFixed(1) : '0.0'
                return (
                  <tr
                    key={ch.code}
                    onClick={() => setSelectedChapter(ch.code === selectedChapter ? null : ch.code)}
                    style={{
                      borderBottom:'1px solid rgba(15,13,11,0.05)',
                      background: ch.code === selectedChapter ? 'rgba(212,146,10,0.06)' : idx % 2 === 0 ? 'transparent' : 'rgba(15,13,11,0.015)',
                      cursor:'pointer',
                      transition:'background 0.1s'
                    }}
                  >
                    <td style={{
                      ...tdStyle, position:'sticky', left:0, zIndex:1,
                      background: ch.code === selectedChapter ? 'rgba(212,146,10,0.1)' : idx % 2 === 0 ? 'var(--surface)' : 'rgba(245,240,232,0.98)',
                    }}>
                      <span style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:500, color:'var(--ink)' }}>{ch.code}</span>
                      <span style={{ fontFamily:'DM Sans', fontSize:11, color:'var(--mid)', marginLeft:8 }}>{ch.name}</span>
                    </td>
                    {WEEKS.map(w => {
                      const val = ch.weeks?.[w]?.total ?? 0
                      return (
                        <td key={w} style={{ ...tdStyle, textAlign:'center', fontFamily:'var(--mono)', fontSize:11 }}>
                          <span style={{
                            display:'inline-block', minWidth:28, padding:'1px 0',
                            fontWeight: val > 0 ? 500 : 400,
                            color: val > 0 ? 'var(--ink)' : 'rgba(15,13,11,0.2)'
                          }}>{val}</span>
                        </td>
                      )
                    })}
                    <td style={{ ...tdStyle, textAlign:'center', fontFamily:"'Bebas Neue', sans-serif", fontSize:18, color:'var(--burnt)' }}>
                      {ch.total || 0}
                    </td>
                    <td style={{ ...tdStyle, textAlign:'center' }}>
                      <PctBar pct={parseFloat(pct)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function FilterGroup({ label, options, value, onChange, byeKeys = [] }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
      <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', marginRight:2 }}>{label}:</span>
      <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
        {options.map(([key, lbl]) => {
          const isBye = byeKeys.includes(key)
          const isActive = value === key
          return (
            <button key={key} onClick={() => onChange(isBye ? 'all' : key)}
              title={isBye ? 'Bye week — 1A divisions do not play in Week 5' : undefined}
              style={{
                fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.08em',
                padding:'3px 8px', borderRadius:3, border:'1px solid var(--border)',
                background: isActive && !isBye ? 'var(--ink)' : 'transparent',
                color: isBye ? 'rgba(15,13,11,0.25)' : isActive ? 'var(--cream)' : 'var(--mid)',
                cursor: isBye ? 'default' : 'pointer',
                whiteSpace:'nowrap', textDecoration: isBye ? 'line-through' : 'none',
                position:'relative'
              }}>
              {lbl}
              {isBye && (
                <span style={{
                  position:'absolute', top:-6, right:-2,
                  fontFamily:'var(--mono)', fontSize:7, letterSpacing:'0.05em',
                  color:'var(--mid)', background:'var(--surface)',
                  padding:'0 2px', borderRadius:2
                }}>BYE</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ClassificationBreakdown({ chapter }) {
  const totals = CLASSIFICATIONS.map(cls => ({
    cls,
    value: WEEKS.reduce((s, w) => s + (chapter.weeks?.[w]?.classifications?.[cls] || 0), 0)
  })).filter(d => d.value > 0)

  if (totals.length === 0) {
    return (
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:24, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--mid)', fontSize:12 }}>
        No classification data
      </div>
    )
  }

  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'20px 16px' }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginBottom:14 }}>
        Games by Classification (Post-Season Total)
      </div>
      {totals.sort((a,b)=>b.value-a.value).map(({ cls, value }, i) => (
        <div key={cls} style={{ marginBottom:8 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
            <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--ink)' }}>{cls}</span>
            <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--burnt)', fontWeight:500 }}>{value}</span>
          </div>
          <div style={{ height:4, background:'rgba(15,13,11,0.07)', borderRadius:2 }}>
            <div style={{
              height:'100%', borderRadius:2,
              width: `${(value / totals[0].value) * 100}%`,
              background: COLORS[i % COLORS.length]
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function PctBar({ pct }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <div style={{ flex:1, height:4, background:'rgba(15,13,11,0.07)', borderRadius:2, minWidth:40 }}>
        <div style={{
          height:'100%', borderRadius:2,
          width:`${Math.min(pct * 3, 100)}%`,
          background:'var(--burnt)', opacity:0.6
        }} />
      </div>
      <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)', width:32, textAlign:'right' }}>{pct}%</span>
    </div>
  )
}

const thStyle = {
  textAlign:'center', padding:'9px 12px',
  fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em',
  textTransform:'uppercase', color:'var(--mid)',
  borderBottom:'1px solid var(--border)', whiteSpace:'nowrap'
}

const tdStyle = {
  padding:'9px 12px', verticalAlign:'middle'
}
