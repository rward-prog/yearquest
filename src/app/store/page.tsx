'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

const COLORS = [
  { id: 'blue',   label: 'Blue',   hex: '#3b8fe8', cost: 25,   emoji: '🔵' },
  { id: 'green',  label: 'Green',  hex: '#2ecc71', cost: 100,  emoji: '🟢' },
  { id: 'orange', label: 'Orange', hex: '#e67e22', cost: 300,  emoji: '🟠' },
  { id: 'red',    label: 'Red',    hex: '#e74c3c', cost: 800,  emoji: '🔴' },
  { id: 'purple', label: 'Purple', hex: '#9b59b6', cost: 1200, emoji: '🟣' },
  { id: 'gold',   label: 'Gold',   hex: '#d4aa50', cost: 1600, emoji: '⭐' },
  { id: 'pink',   label: 'Pink',   hex: '#e91e8c', cost: 2800, emoji: '🩷' },
]

function CashRain({ rainKey }: { rainKey: number }) {
  const SYMBOLS = ['💰', '💵', '💸', '🤑', '💴']
  const particles = useMemo(() =>
    Array.from({ length: 40 }, () => ({
      left: 2 + Math.random() * 96,
      delay: Math.random() * 2.5,
      duration: 4.5 + Math.random() * 3,
      size: 1.4 + Math.random() * 1.4,
      symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rainKey]
  )
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 50 }}>
      {particles.map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: '-60px',
            fontSize: `${p.size}rem`,
            animation: `cashFall ${p.duration}s ease-in ${p.delay}s forwards`,
            display: 'block',
          }}
        >
          {p.symbol}
        </span>
      ))}
    </div>
  )
}

export default function StorePage() {
  const router = useRouter()
  const [cash, setCash] = useState(0)
  const [owned, setOwned] = useState<string[]>([])
  const [equipped, setEquipped] = useState<string | null>(null)
  const [rainKey, setRainKey] = useState(0)
  const [raining, setRaining] = useState(false)

  useEffect(() => {
    setCash(parseInt(localStorage.getItem('yearquest_classcash') || '0', 10))
    setOwned(JSON.parse(localStorage.getItem('yearquest_owned_colors') || '[]'))
    setEquipped(localStorage.getItem('yearquest_namecolor') || null)
  }, [])

  function buy(colorId: string, cost: number) {
    if (cash < cost || owned.includes(colorId)) return
    const newCash = cash - cost
    const newOwned = [...owned, colorId]
    setCash(newCash)
    setOwned(newOwned)
    setEquipped(colorId)
    localStorage.setItem('yearquest_classcash', String(newCash))
    localStorage.setItem('yearquest_owned_colors', JSON.stringify(newOwned))
    localStorage.setItem('yearquest_namecolor', colorId)
    setRainKey(k => k + 1)
    setRaining(true)
    setTimeout(() => setRaining(false), 7000)
  }

  function equip(colorId: string) {
    setEquipped(colorId)
    localStorage.setItem('yearquest_namecolor', colorId)
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8" style={{ background: '#0a0a0f', color: '#fff' }}>
      {raining && <CashRain rainKey={rainKey} />}

      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="w-full flex items-center justify-between">
          <button onClick={() => router.push('/')} className="text-sm transition-colors" style={{ color: '#555' }}>← Back</button>
          <div className="text-sm font-bold" style={{ color: '#d4aa50' }}>💰 {cash} Class Cash</div>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold" style={{ color: '#d4aa50', fontFamily: 'Georgia, serif' }}>🛍️ Class Cash Store</h1>
          <p className="text-sm mt-1" style={{ color: '#555' }}>Buy colors for your name tag</p>
        </div>

        <div className="w-full flex flex-col gap-3">
          {COLORS.map(color => {
            const isOwned = owned.includes(color.id)
            const isEquipped = equipped === color.id
            const canAfford = cash >= color.cost
            return (
              <div
                key={color.id}
                className="w-full flex items-center gap-4 p-4 rounded-2xl"
                style={{
                  background: '#12121e',
                  border: `1.5px solid ${isEquipped ? color.hex : '#2a2a3e'}`,
                }}
              >
                <div className="text-2xl">{color.emoji}</div>
                <div className="flex-1">
                  <div className="font-bold text-sm" style={{ color: color.hex }}>{color.label}</div>
                  <div className="text-xs" style={{ color: '#555' }}>{color.cost} Class Cash</div>
                </div>
                {isOwned ? (
                  <button
                    onClick={() => equip(color.id)}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: isEquipped ? color.hex : '#1a1a2e',
                      color: isEquipped ? '#0a0a0f' : color.hex,
                      border: `1px solid ${color.hex}`,
                    }}
                  >
                    {isEquipped ? 'Equipped ✓' : 'Equip'}
                  </button>
                ) : (
                  <button
                    onClick={() => buy(color.id, color.cost)}
                    disabled={!canAfford}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: canAfford ? color.hex : '#1a1a2e', color: canAfford ? '#0a0a0f' : '#555' }}
                  >
                    Buy
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div className="text-center text-xs" style={{ color: '#444' }}>
          Earn Class Cash by playing well!<br />
          Every 1,000 points = 1 Class Cash
        </div>
      </div>

      <style>{`
        @keyframes cashFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </main>
  )
}
