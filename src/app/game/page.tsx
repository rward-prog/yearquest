'use client'
import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { US_EVENTS, type HistoryEvent } from '@/data/usEvents'
import { WORLD_EVENTS } from '@/data/worldEvents'
import { supabase } from '@/lib/supabase'
import USMap from '@/components/USMap'

const TOTAL_ROUNDS = 6
const TIMER_SECONDS = 10
const CLOSE_THRESHOLD = 10 // years — counts for streak

function calcPoints(diff: number, timeLeft: number): number {
  let base = 0
  if (diff === 0) base = 1000
  else if (diff <= 1) base = 950
  else if (diff <= 5) base = 850
  else if (diff <= 10) base = 700
  else if (diff <= 25) base = 500
  else if (diff <= 50) base = 300
  else if (diff <= 100) base = 100
  else base = Math.max(0, 50 - Math.floor((diff - 100) / 20))
  const timeBonus = Math.round(timeLeft * 20) // max 200
  return base + timeBonus
}

function makeHint(year: number): string {
  const s = String(year)
  const idxs = [0, 1, 2, 3]
  // shuffle
  for (let i = idxs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idxs[i], idxs[j]] = [idxs[j], idxs[i]]
  }
  const reveal = new Set(idxs.slice(0, 2))
  return s.split('').map((c, i) => (reveal.has(i) ? c : '_')).join('')
}

function getEvents(mode: string): HistoryEvent[] {
  if (mode === 'us') return US_EVENTS
  if (mode === 'world') return WORLD_EVENTS
  return [...US_EVENTS, ...WORLD_EVENTS]
}

function getRange(mode: string): [number, number] {
  if (mode === 'us') return [1600, 2024]
  return [1000, 2024]
}

function pickEvents(mode: string): HistoryEvent[] {
  const pool = [...getEvents(mode)]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, TOTAL_ROUNDS)
}

const NAME_COLORS: Record<string, string> = {
  blue: '#3b8fe8', green: '#2ecc71', orange: '#e67e22',
  red: '#e74c3c', purple: '#9b59b6', gold: '#d4aa50', pink: '#e91e8c',
}

function GameInner() {
  const params = useSearchParams()
  const router = useRouter()
  const mode = params.get('mode') || 'us'
  const name = params.get('name') || '???'
  const nameColor = typeof window !== 'undefined' ? (localStorage.getItem('yearquest_namecolor') ?? null) : null
  const displayColor = nameColor ? (NAME_COLORS[nameColor] ?? '#fff') : '#fff'

  const [minYear, maxYear] = getRange(mode)
  const [events] = useState<HistoryEvent[]>(() => pickEvents(mode))
  const [round, setRound] = useState(0)
  const [guessYear, setGuessYear] = useState(Math.round((minYear + maxYear) / 2))
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS)
  const [phase, setPhase] = useState<'guessing' | 'revealed' | 'done'>('guessing')
  const [scores, setScores] = useState<number[]>([])
  const [diffs, setDiffs] = useState<number[]>([])
  const [streak, setStreak] = useState(0)
  const [hintAvailable, setHintAvailable] = useState(false)
  const [hintUsed, setHintUsed] = useState(false)
  const [hintText, setHintText] = useState('')
  const [showHintOffer, setShowHintOffer] = useState(false)
  const [savedScore, setSavedScore] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sliderRef = useRef<HTMLInputElement>(null)

  const currentEvent = events[round]
  const totalScore = scores.reduce((a, b) => a + b, 0)

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const submitGuess = useCallback((year: number, tLeft: number) => {
    stopTimer()
    const diff = Math.abs(year - currentEvent.year)
    const pts = calcPoints(diff, tLeft)
    const isClose = diff <= CLOSE_THRESHOLD
    const newStreak = isClose ? streak + 1 : 0
    setScores(s => [...s, pts])
    setDiffs(d => [...d, diff])
    setStreak(newStreak)
    setPhase('revealed')
    if (newStreak >= 3 && round + 1 < TOTAL_ROUNDS) {
      setHintAvailable(true)
      setShowHintOffer(true)
    }
  }, [currentEvent, streak, round, stopTimer])

  // Timer countdown
  useEffect(() => {
    if (phase !== 'guessing') return
    setTimeLeft(TIMER_SECONDS)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          submitGuess(guessYear, 0)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => stopTimer()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, phase])

  // Keyboard controls for slider
  useEffect(() => {
    if (phase !== 'guessing') return
    const range = maxYear - minYear
    const step10 = Math.max(1, Math.round(range / 100))
    const step1 = 1

    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault()
        setGuessYear(y => Math.max(minYear, y - (e.shiftKey ? step10 : step1)))
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault()
        setGuessYear(y => Math.min(maxYear, y + (e.shiftKey ? step10 : step1)))
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        submitGuess(guessYear, timeLeft)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, guessYear, timeLeft, minYear, maxYear, submitGuess])

  // Auto-save score when done
  useEffect(() => {
    if (phase !== 'done' || savedScore) return
    setSavedScore(true)
    const ts = totalScore + (scores[scores.length - 1] ?? 0) // already included via setScores
    // Award class cash
    const cash = parseInt(localStorage.getItem('yearquest_classcash') || '0', 10)
    const earned = Math.floor(totalScore / 1000)
    if (earned > 0) localStorage.setItem('yearquest_classcash', String(cash + earned))
    // Save to Supabase
    supabase.from('yq_scores').insert({ name, score: totalScore, mode }).then(() => {})
    supabase.from('yq_visitors').insert({}).then(() => {})
  }, [phase, savedScore, totalScore, name, mode, scores])

  function advance() {
    const nextRound = round + 1
    if (nextRound >= TOTAL_ROUNDS) {
      setPhase('done')
    } else {
      setRound(nextRound)
      setGuessYear(Math.round((minYear + maxYear) / 2))
      setHintUsed(false)
      setHintText('')
      setHintAvailable(false)
      setShowHintOffer(false)
      setPhase('guessing')
    }
  }

  function useHint() {
    if (!hintAvailable || round + 1 >= TOTAL_ROUNDS) return
    const nextYear = events[round + 1].year
    setHintText(makeHint(nextYear))
    setHintUsed(true)
    setShowHintOffer(false)
    setHintAvailable(false)
  }

  function skipHint() {
    setShowHintOffer(false)
  }

  function diffLabel(diff: number): string {
    if (diff === 0) return 'Exact! 🎯'
    if (diff <= 1) return `${diff} year off ⭐`
    if (diff <= 5) return `${diff} years off`
    if (diff <= 10) return `${diff} years off`
    if (diff <= 25) return `${diff} years off`
    return `${diff} years off 😬`
  }

  function diffColor(diff: number): string {
    if (diff === 0) return '#4adf80'
    if (diff <= 5) return '#d4aa50'
    if (diff <= 25) return '#e08040'
    return '#e04040'
  }

  const showUSMap = mode === 'us' || mode === 'both'

  if (phase === 'done') {
    return <DoneScreen totalScore={totalScore} scores={scores} diffs={diffs} events={events} mode={mode} name={name} router={router} displayColor={displayColor} />
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-6" style={{ background: '#0a0a0f', color: '#fff' }}>
      {/* Header */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-4">
        <button onClick={() => router.push('/')} className="text-gray-500 hover:text-white text-sm transition-colors">← Home</button>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm">Round {round + 1}/{TOTAL_ROUNDS}</span>
          <span className="font-bold text-sm" style={{ color: displayColor }}>{name}</span>
          <span className="text-gray-400 text-sm">{totalScore} pts</span>
        </div>
      </div>

      {/* Timer bar */}
      {phase === 'guessing' && (
        <div className="w-full max-w-2xl mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Time</span>
            <span style={{ color: timeLeft <= 3 ? '#e04040' : '#d4aa50', fontWeight: 'bold' }}>{timeLeft}s</span>
          </div>
          <div className="w-full h-2 rounded-full" style={{ background: '#1a1a2e' }}>
            <div
              className="h-2 rounded-full transition-all duration-1000"
              style={{
                width: `${(timeLeft / TIMER_SECONDS) * 100}%`,
                background: timeLeft <= 3 ? '#e04040' : '#d4aa50',
              }}
            />
          </div>
        </div>
      )}

      {/* US Map */}
      {showUSMap && (
        <div className="w-full max-w-2xl mb-4">
          <USMap year={phase === 'revealed' ? currentEvent.year : guessYear} />
        </div>
      )}

      {/* Event card */}
      <div className="w-full max-w-2xl rounded-2xl p-5 mb-6" style={{ background: '#12121e', border: '1px solid #2a2a3e' }}>
        {hintText && phase === 'guessing' && (
          <div className="text-center mb-3 py-2 px-4 rounded-xl text-sm font-mono font-bold" style={{ background: 'rgba(212,170,80,0.1)', color: '#d4aa50', letterSpacing: '0.2em' }}>
            Hint: {hintText}
          </div>
        )}
        <p className="text-center text-base leading-relaxed" style={{ color: '#e0e0f0' }}>
          {currentEvent.event}
        </p>
      </div>

      {/* Slider section */}
      <div className="w-full max-w-2xl mb-6">
        <div className="text-center text-4xl font-bold mb-4" style={{ color: '#d4aa50', fontFamily: 'Georgia, serif' }}>
          {guessYear}
        </div>
        <input
          ref={sliderRef}
          type="range"
          min={minYear}
          max={maxYear}
          value={guessYear}
          onChange={e => phase === 'guessing' && setGuessYear(Number(e.target.value))}
          disabled={phase !== 'guessing'}
          className="w-full"
          style={{ accentColor: '#d4aa50', height: '6px', cursor: phase === 'guessing' ? 'pointer' : 'default' }}
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>{minYear}</span>
          <span className="text-gray-500 text-xs">← → arrow keys  |  Shift+arrow = fast</span>
          <span>{maxYear}</span>
        </div>
      </div>

      {/* Submit or Reveal */}
      {phase === 'guessing' ? (
        <button
          onClick={() => submitGuess(guessYear, timeLeft)}
          className="px-10 py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 hover:brightness-110"
          style={{ background: '#d4aa50', color: '#0a0a0f' }}
        >
          Lock In!
        </button>
      ) : (
        <div className="w-full max-w-2xl flex flex-col items-center gap-4">
          {/* Result */}
          <div className="w-full rounded-2xl p-5 text-center" style={{ background: '#12121e', border: '1px solid #2a2a3e' }}>
            <div className="text-3xl font-bold mb-1" style={{ color: diffColor(diffs[diffs.length - 1]), fontFamily: 'Georgia, serif' }}>
              {currentEvent.year}
            </div>
            <div className="text-sm mb-2" style={{ color: diffColor(diffs[diffs.length - 1]) }}>
              {diffLabel(diffs[diffs.length - 1])}
            </div>
            <div className="text-2xl font-bold" style={{ color: '#d4aa50' }}>
              +{scores[scores.length - 1]} pts
            </div>
            {streak >= 3 && (
              <div className="mt-2 text-sm" style={{ color: '#4adf80' }}>
                🔥 {streak} in a row!
              </div>
            )}
          </div>

          {/* Hint offer */}
          {showHintOffer && (
            <div className="w-full rounded-2xl p-4 text-center" style={{ background: 'rgba(212,170,80,0.08)', border: '1.5px solid #d4aa50' }}>
              <div className="text-sm font-bold mb-2" style={{ color: '#d4aa50' }}>
                🔥 3 in a row! Reveal 2 digits of the next year?
              </div>
              <div className="flex gap-3 justify-center">
                <button onClick={useHint} className="px-5 py-2 rounded-xl font-bold text-sm" style={{ background: '#d4aa50', color: '#0a0a0f' }}>
                  Yes, reveal!
                </button>
                <button onClick={skipHint} className="px-5 py-2 rounded-xl font-bold text-sm" style={{ background: '#1a1a2e', color: '#ccc' }}>
                  No thanks
                </button>
              </div>
            </div>
          )}

          <button
            onClick={advance}
            className="px-10 py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 hover:brightness-110"
            style={{ background: '#d4aa50', color: '#0a0a0f' }}
          >
            {round + 1 >= TOTAL_ROUNDS ? 'See Results!' : 'Next Event →'}
          </button>
        </div>
      )}
    </main>
  )
}

// ——— End screen ———
function DoneScreen({ totalScore, scores, diffs, events, mode, name, router, displayColor }: {
  totalScore: number; scores: number[]; diffs: number[]; events: HistoryEvent[];
  mode: string; name: string; router: ReturnType<typeof useRouter>; displayColor: string
}) {
  const [lb, setLb] = useState<{ name: string; score: number; name_color?: string }[]>([])
  const [lbPeriod, setLbPeriod] = useState<'all' | 'week' | 'today'>('all')
  const [loading, setLoading] = useState(true)
  const cashEarned = Math.floor(totalScore / 1000)
  const maxPossible = TOTAL_ROUNDS * 1200

  const NAME_COLORS_MAP: Record<string, string> = {
    blue: '#3b8fe8', green: '#2ecc71', orange: '#e67e22',
    red: '#e74c3c', purple: '#9b59b6', gold: '#d4aa50', pink: '#e91e8c',
  }

  useEffect(() => {
    setLoading(true)
    let q = supabase.from('yq_scores').select('name, score, name_color').eq('mode', mode).order('score', { ascending: false }).limit(50)
    if (lbPeriod === 'today') {
      const d = new Date(); d.setHours(0, 0, 0, 0)
      q = q.gte('played_at', d.toISOString())
    } else if (lbPeriod === 'week') {
      q = q.gte('played_at', new Date(Date.now() - 7 * 86400000).toISOString())
    }
    q.then(({ data }) => { setLb(data ?? []); setLoading(false) })
  }, [lbPeriod, mode])

  const modeLabel = mode === 'us' ? '🇺🇸 US History' : mode === 'world' ? '🌍 World History' : '🌐 Both'
  const myRank = lb.findIndex(e => e.name === name && e.score === totalScore) + 1

  function gradeColor(score: number) {
    const pct = score / maxPossible
    if (pct >= 0.85) return '#4adf80'
    if (pct >= 0.65) return '#d4aa50'
    if (pct >= 0.45) return '#e08040'
    return '#e04040'
  }
  function gradeLabel(score: number) {
    const pct = score / maxPossible
    if (pct >= 0.85) return 'Historian! 📚'
    if (pct >= 0.65) return 'Good Guess!'
    if (pct >= 0.45) return 'Keep Studying'
    return 'Try Again'
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8" style={{ background: '#0a0a0f', color: '#fff' }}>
      <div className="w-full max-w-lg flex flex-col items-center gap-6">

        {/* Score card */}
        <div className="w-full rounded-2xl p-6 text-center" style={{ background: '#12121e', border: '1px solid #2a2a3e' }}>
          <div className="text-lg mb-1" style={{ color: displayColor, fontWeight: 'bold' }}>{name}</div>
          <div className="text-sm text-gray-500 mb-3">{modeLabel}</div>
          <div className="text-5xl font-bold mb-2" style={{ color: gradeColor(totalScore), fontFamily: 'Georgia, serif' }}>
            {totalScore}
          </div>
          <div className="text-lg font-bold mb-1" style={{ color: gradeColor(totalScore) }}>
            {gradeLabel(totalScore)}
          </div>
          <div className="text-sm text-gray-500">out of {maxPossible} possible</div>
          {cashEarned > 0 && (
            <div className="mt-4 py-2 px-4 rounded-full inline-flex items-center gap-2 text-sm font-bold" style={{ background: 'rgba(212,170,80,0.15)', color: '#d4aa50', border: '1px solid #d4aa50' }}>
              💰 +{cashEarned} Class Cash earned!
            </div>
          )}
          {myRank > 0 && myRank <= 10 && (
            <div className="mt-2 text-sm" style={{ color: '#4adf80' }}>#{myRank} on the leaderboard!</div>
          )}
        </div>

        {/* Round breakdown */}
        <div className="w-full rounded-2xl overflow-hidden" style={{ background: '#12121e', border: '1px solid #2a2a3e' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: '#2a2a3e', color: '#d4aa50', fontWeight: 'bold', fontSize: '0.875rem' }}>
            Round Breakdown
          </div>
          {events.map((ev, i) => (
            <div key={ev.id} className="flex items-start gap-3 px-4 py-3 border-b last:border-0" style={{ borderColor: '#1a1a2e' }}>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-400 leading-snug line-clamp-2">{ev.event.slice(0, 80)}…</div>
                <div className="text-xs mt-1" style={{ color: '#d4aa50' }}>Answer: {ev.year}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-bold" style={{ color: scores[i] !== undefined ? (diffs[i] <= 5 ? '#4adf80' : diffs[i] <= 25 ? '#d4aa50' : '#e08040') : '#666' }}>
                  {scores[i] !== undefined ? `+${scores[i]}` : '—'}
                </div>
                <div className="text-xs" style={{ color: '#888' }}>
                  {diffs[i] !== undefined ? (diffs[i] === 0 ? 'Exact!' : `±${diffs[i]}yr`) : ''}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Leaderboard */}
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
          {loading ? (
            <div className="p-6 text-center text-gray-500 text-sm">Loading...</div>
          ) : lb.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">No scores yet — you might be first!</div>
          ) : (
            <div>
              {lb.slice(0, 10).map((entry, i) => {
                const isMe = entry.name === name && entry.score === totalScore
                const entryColor = entry.name_color ? (NAME_COLORS_MAP[entry.name_color] ?? '#fff') : '#fff'
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-2 border-b last:border-0"
                    style={{
                      borderColor: '#1a1a2e',
                      background: isMe ? 'rgba(212,170,80,0.08)' : 'transparent',
                    }}
                  >
                    <span className="w-6 text-xs text-gray-600 text-right">{i + 1}</span>
                    <span className="flex-1 font-bold text-sm" style={{ color: entryColor }}>{entry.name}</span>
                    <span className="text-sm font-bold" style={{ color: '#d4aa50' }}>{entry.score}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => router.push(`/game?mode=${mode}&name=${name}`)}
            className="w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 hover:brightness-110"
            style={{ background: '#d4aa50', color: '#0a0a0f' }}
          >
            Play Again
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 rounded-2xl font-bold text-sm transition-all"
            style={{ background: '#1a1a2e', color: '#ccc' }}
          >
            ← Change Mode
          </button>
        </div>
      </div>
    </main>
  )
}

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f', color: '#d4aa50' }}>
        Loading...
      </div>
    }>
      <GameInner />
    </Suspense>
  )
}
