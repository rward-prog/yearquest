'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const NAME_COLORS: Record<string, string> = {
  blue: '#3b8fe8', green: '#2ecc71', orange: '#e67e22',
  red: '#e74c3c', purple: '#9b59b6', gold: '#d4aa50', pink: '#e91e8c',
}

const BLOCKED = new Set(['KKK', 'NZI', 'SS', 'NSM', 'WPP', 'ANP'])

type LbEntry = { name: string; score: number; name_color?: string }

export default function Home() {
  const router = useRouter()
  const [initials, setInitials] = useState('')
  const [gameMode, setGameMode] = useState<'us' | 'world' | 'both'>('us')
  const [classCash, setClassCash] = useState(0)
  const [showCashModal, setShowCashModal] = useState(false)
  const [nameColor, setNameColor] = useState<string | null>(null)
  const [showLB, setShowLB] = useState(false)
  const [lbPeriod, setLbPeriod] = useState<'all' | 'week' | 'today'>('all')
  const [lb, setLb] = useState<LbEntry[]>([])
  const [visitors, setVisitors] = useState<number | null>(null)

  useEffect(() => {
    setClassCash(parseInt(localStorage.getItem('yearquest_classcash') || '0', 10))
    setNameColor(localStorage.getItem('yearquest_namecolor'))
    supabase.from('yq_visitors').insert({}).then(() => {
      supabase.from('yq_visitors').select('*', { count: 'exact', head: true }).then(({ count }) => {
        setVisitors(count)
      })
    })
  }, [])

  useEffect(() => {
    if (!showLB) return
    let q = supabase.from('yq_scores').select('name, score, name_color').eq('mode', gameMode).order('score', { ascending: false }).limit(10)
    if (lbPeriod === 'today') {
      const d = new Date(); d.setHours(0, 0, 0, 0)
      q = q.gte('played_at', d.toISOString())
    } else if (lbPeriod === 'week') {
      q = q.gte('played_at', new Date(Date.now() - 7 * 86400000).toISOString())
    }
    q.then(({ data }) => setLb(data ?? []))
  }, [showLB, gameMode, lbPeriod])

  function handlePlay() {
    const name = initials.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3)
    if (name.length < 1) return
    if (BLOCKED.has(name)) { setInitials(''); return }
    router.push(`/game?mode=${gameMode}&name=${name}`)
  }

  const displayColor = nameColor ? (NAME_COLORS[nameColor] ?? '#fff') : '#fff'
  const modeOptions = [
    { id: 'us', label: '🇺🇸 US History', desc: 'American history from 1600s to today' },
    { id: 'world', label: '🌍 World History', desc: 'Global events from 1000 AD to today' },
    { id: 'both', label: '🌐 Both', desc: 'Mix of US and World history' },
  ]

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-4 py-8 overflow-hidden" style={{ background: '#0a0a0f' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '10%', left: '20%', width: 300, height: 300, borderRadius: '50%', background: 'rgba(212,170,80,0.04)', filter: 'blur(60px)', animation: 'float1 8s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '15%', width: 250, height: 250, borderRadius: '50%', background: 'rgba(59,143,232,0.04)', filter: 'blur(50px)', animation: 'float2 10s ease-in-out infinite' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-6">

        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight" style={{ color: '#d4aa50', fontFamily: 'Georgia, serif' }}>
            ⏳ YEARQUEST
          </h1>
          <p className="text-gray-400 mt-1 text-sm tracking-widest uppercase">History Year Guesser</p>
          {visitors !== null && (
            <p className="mt-1 text-xs" style={{ color: '#555' }}>{visitors.toLocaleString()} games played</p>
          )}
        </div>

        {classCash > 0 && (
          <button
            onClick={() => setShowCashModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all active:scale-95"
            style={{ background: 'rgba(212,170,80,0.15)', border: '1.5px solid #d4aa50', color: '#d4aa50' }}
          >
            💰 {classCash} Class Cash
          </button>
        )}

        {showCashModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowCashModal(false)}>
            <div className="rounded-2xl p-7 max-w-xs w-full text-center shadow-2xl" style={{ background: '#14141c', border: '1px solid #d4aa50' }} onClick={e => e.stopPropagation()}>
              <div className="text-5xl mb-3">💰</div>
              <div className="text-2xl font-bold mb-1" style={{ color: '#d4aa50' }}>{classCash} Class Cash</div>
              <p className="text-sm mb-4 leading-relaxed" style={{ color: '#ccc' }}>
                Spend your Class Cash in the <strong style={{ color: '#d4aa50' }}>Class Cash Store</strong>.
              </p>
              <div className="flex flex-col gap-2">
                <button onClick={() => { setShowCashModal(false); router.push('/store') }}
                  className="w-full py-3 rounded-xl font-bold text-sm" style={{ background: '#d4aa50', color: '#0a0a0f' }}>
                  🛍️ Go to the Store
                </button>
                <button onClick={() => setShowCashModal(false)}
                  className="w-full py-3 rounded-xl text-sm" style={{ background: '#1a1a2e', color: '#888' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="w-full">
          <label className="block text-xs mb-2 uppercase tracking-widest text-center" style={{ color: '#555' }}>Your Initials</label>
          <input
            type="text"
            maxLength={3}
            value={initials}
            onChange={e => setInitials(e.target.value.replace(/[^a-zA-Z]/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handlePlay()}
            placeholder="AAA"
            className="w-full text-center text-2xl font-bold py-3 px-4 rounded-xl uppercase outline-none"
            style={{
              background: '#12121e',
              border: '1.5px solid #2a2a3e',
              color: displayColor,
              letterSpacing: '0.3em',
            }}
          />
        </div>

        <div className="w-full">
          <label className="block text-xs mb-2 uppercase tracking-widest text-center" style={{ color: '#555' }}>Mode</label>
          <div className="flex flex-col gap-2">
            {modeOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => setGameMode(opt.id as typeof gameMode)}
                className="w-full text-left px-4 py-3 rounded-xl transition-all"
                style={{
                  background: gameMode === opt.id ? 'rgba(212,170,80,0.15)' : '#12121e',
                  border: `1.5px solid ${gameMode === opt.id ? '#d4aa50' : '#2a2a3e'}`,
                  color: gameMode === opt.id ? '#d4aa50' : '#888',
                }}
              >
                <div className="font-bold text-sm">{opt.label}</div>
                <div className="text-xs mt-0.5 opacity-70">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handlePlay}
          disabled={initials.trim().length === 0}
          className="w-full py-4 rounded-2xl font-bold text-xl transition-all active:scale-95 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: '#d4aa50', color: '#0a0a0f' }}
        >
          Play YEARQUEST!
        </button>

        <button
          onClick={() => setShowLB(s => !s)}
          className="text-sm transition-colors"
          style={{ color: '#d4aa50' }}
        >
          {showLB ? '▲ Hide Leaderboard' : '🏆 Leaderboard'}
        </button>

        {showLB && (
          <div className="w-full rounded-2xl overflow-hidden" style={{ background: '#12121e', border: '1px solid #2a2a3e' }}>
            <div className="flex gap-2 p-3 border-b" style={{ borderColor: '#2a2a3e' }}>
              {(['all', 'week', 'today'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setLbPeriod(p)}
                  className="px-3 py-1 rounded-full text-xs font-bold transition-all"
                  style={{ background: lbPeriod === p ? '#d4aa50' : '#1a1a2e', color: lbPeriod === p ? '#0a0a0f' : '#888' }}
                >
                  {p === 'all' ? 'All Time' : p === 'week' ? 'This Week' : 'Today'}
                </button>
              ))}
            </div>
            {lb.length === 0 ? (
              <div className="p-6 text-center text-sm" style={{ color: '#555' }}>No scores yet!</div>
            ) : (
              lb.map((e, i) => {
                const ec = e.name_color ? (NAME_COLORS[e.name_color] ?? '#fff') : '#fff'
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-2 border-b last:border-0" style={{ borderColor: '#1a1a2e' }}>
                    <span className="w-5 text-xs" style={{ color: '#555' }}>{i + 1}</span>
                    <span className="flex-1 font-bold text-sm" style={{ color: ec }}>{e.name}</span>
                    <span className="text-sm font-bold" style={{ color: '#d4aa50' }}>{e.score}</span>
                  </div>
                )
              })
            )}
          </div>
        )}

        <div className="w-full flex flex-col gap-2">
          <a
            href="https://flagrank-ten.vercel.app"
            className="w-full text-center py-3 rounded-xl text-sm font-bold transition-all hover:brightness-110"
            style={{ background: '#12121e', border: '1px solid #2a2a3e', color: '#888' }}
          >
            🌍 Also play FLAGRANK →
          </a>
          <button
            onClick={() => router.push('/store')}
            className="w-full py-2 rounded-xl text-sm transition-all"
            style={{ background: 'transparent', border: '1px solid #1a1a2e', color: '#555' }}
          >
            🛍️ Class Cash Store
          </button>
        </div>
      </div>

      <style>{`
        @keyframes float1 { 0%,100% { transform: translate(0,0) } 50% { transform: translate(20px,30px) } }
        @keyframes float2 { 0%,100% { transform: translate(0,0) } 50% { transform: translate(-20px,20px) } }
      `}</style>
    </main>
  )
}
