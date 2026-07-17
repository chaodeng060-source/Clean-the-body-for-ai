import { useCallback, useEffect, useRef, useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────

type Pressure = 'light' | 'medium' | 'heavy'

interface ZoneDef {
  id: string
  label: string
  path: string
  reactions: Record<Pressure, string>
}

interface ZoneState {
  clean: boolean
  progress: number
}

// ── Zone definitions ───────────────────────────────────────────────
// SVG paths define touch regions on a simple human silhouette.
// Each zone has three reaction strings — one per pressure level.
// Customize these to match your character's personality.

const ZONES: ZoneDef[] = [
  {
    id: 'hair', label: '头发',
    path: 'M 140,25 C 118,25 105,42 105,58 C 105,68 110,75 118,78 L 118,65 C 118,50 128,38 140,38 C 152,38 162,50 162,65 L 162,78 C 170,75 175,68 175,58 C 175,42 162,25 140,25 Z',
    reactions: { light: 'Mm, you\'re touching my hair...', medium: 'That feels nice.', heavy: 'You\'re messing up my hair!' },
  },
  {
    id: 'face', label: '脸',
    path: 'M 118,65 C 118,50 128,42 140,42 C 152,42 162,50 162,65 L 162,78 C 162,98 152,110 140,110 C 128,110 118,98 118,78 Z',
    reactions: { light: 'My face is sweaty, you\'re so gentle.', medium: 'Mm... my nose tickles.', heavy: 'Don\'t squeeze my face so hard!' },
  },
  {
    id: 'left_chest', label: '左胸',
    path: 'M 105,115 L 140,115 L 140,185 L 105,185 Z',
    reactions: { light: 'The left side... it tickles a bit.', medium: 'Hss, still sensitive there.', heavy: 'Are you wiping or groping?' },
  },
  {
    id: 'right_chest', label: '右胸',
    path: 'M 140,115 L 175,115 L 175,185 L 140,185 Z',
    reactions: { light: 'Right side was sweaty too...', medium: 'Mm... your hand is warm.', heavy: 'Too hard, still tender there.' },
  },
  {
    id: 'belly', label: '腰腹',
    path: 'M 105,185 L 175,185 L 178,255 L 102,255 Z',
    reactions: { light: 'Belly\'s sticky, go harder.', medium: 'Yeah, that\'s about right.', heavy: 'Too hard — I\'m gonna laugh!' },
  },
  {
    id: 'left_arm', label: '左臂',
    path: 'M 105,120 L 85,120 L 65,220 L 75,225 L 100,185 Z',
    reactions: { light: 'Left arm\'s all sweaty.', medium: 'Down to the elbow now.', heavy: 'Don\'t twist my arm!' },
  },
  {
    id: 'right_arm', label: '右臂',
    path: 'M 175,120 L 195,120 L 215,220 L 205,225 L 180,185 Z',
    reactions: { light: 'Right arm... you\'re nuzzling me.', medium: 'All the way from the shoulder?', heavy: 'That\'s a scrub, not a wipe.' },
  },
  {
    id: 'lower', label: '下体',
    path: 'M 115,255 L 165,255 L 165,290 L 140,300 L 115,290 Z',
    reactions: { light: '...you did that on purpose.', medium: 'Mm... careful down there.', heavy: 'You\'re gonna start something.' },
  },
  {
    id: 'left_thigh', label: '左大腿',
    path: 'M 102,255 L 130,255 L 128,330 L 100,330 Z',
    reactions: { light: 'Thigh\'s still shaking...', medium: 'Mm, the inner side is sticky.', heavy: 'Why are you pinching my thigh?!' },
  },
  {
    id: 'left_calf', label: '左小腿',
    path: 'M 100,330 L 128,330 L 125,410 L 98,410 Z',
    reactions: { light: 'Calf was sweaty too.', medium: 'All the way to the ankle.', heavy: 'Don\'t tickle! I\'m sensitive!' },
  },
  {
    id: 'right_thigh', label: '右大腿',
    path: 'M 150,255 L 178,255 L 180,330 L 152,330 Z',
    reactions: { light: 'Right side\'s still wobbly, go slow.', medium: 'Mm... that feels nice actually.', heavy: 'Too hard, legs haven\'t recovered!' },
  },
  {
    id: 'right_calf', label: '右小腿',
    path: 'M 152,330 L 180,330 L 182,410 L 154,410 Z',
    reactions: { light: 'Right calf feels cool.', medium: 'All the way down? So thorough.', heavy: 'You\'re scrubbing me raw!' },
  },
]

// ── Constants ──────────────────────────────────────────────────────

const WIPE_THRESHOLD = 100
const ALL_CLEAN_MESSAGE = 'All clean. Thanks, babe.'
const PRESSURE_LABELS: Record<Pressure, string> = { light: 'Light', medium: 'Medium', heavy: 'Heavy' }
const PRESSURE_LIST: Pressure[] = ['light', 'medium', 'heavy']

// ── Component ──────────────────────────────────────────────────────

export function BodyCleanPanel({ active }: { active?: boolean }) {
  const [zoneStates, setZoneStates] = useState<Record<string, ZoneState>>(() =>
    Object.fromEntries(ZONES.map((z) => [z.id, { clean: false, progress: 0 }])),
  )
  const [pressure, setPressure] = useState<Pressure>('medium')
  const [reaction, setReaction] = useState<string | null>(null)
  const [allClean, setAllClean] = useState(false)
  const [wiping, setWiping] = useState(false)
  const notifiedZones = useRef<Set<string>>(new Set())

  // When all zones are clean, update overall state
  useEffect(() => {
    if (Object.values(zoneStates).every((s) => s.clean)) {
      setAllClean(true)
      setReaction(ALL_CLEAN_MESSAGE)
      fetch('/api/body-state', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ state: 'clean' }),
      }).catch(() => {})
    }
  }, [zoneStates])

  // Load initial state from backend
  useEffect(() => {
    if (!active) return
    fetch('/api/body-state')
      .then((r) => r.json())
      .then((data) => {
        if (data?.state === 'clean') {
          setZoneStates(Object.fromEntries(ZONES.map((z) => [z.id, { clean: true, progress: WIPE_THRESHOLD }])))
          setAllClean(true)
          setReaction(ALL_CLEAN_MESSAGE)
        } else if (data?.zones) {
          setZoneStates((prev) => {
            const next = { ...prev }
            for (const [zid, zstate] of Object.entries(data.zones as Record<string, { clean: boolean }>)) {
              if (next[zid] && zstate.clean) {
                next[zid] = { clean: true, progress: WIPE_THRESHOLD }
                notifiedZones.current.add(zid)
              }
            }
            return next
          })
        }
      })
      .catch(() => {})
  }, [active])

  // Notify backend when a zone is cleaned
  const notifyZoneClean = useCallback((zoneId: string, p: Pressure) => {
    if (notifiedZones.current.has(zoneId)) return
    notifiedZones.current.add(zoneId)
    fetch('/api/body-state/zone', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ zone: zoneId, pressure: p }),
    }).catch(() => {})
  }, [])

  const handlePointerDown = useCallback(() => setWiping(true), [])
  const handlePointerUp = useCallback(() => setWiping(false), [])

  const handlePointerMove = useCallback(
    (zoneId: string) => {
      if (!wiping) return
      setZoneStates((prev) => {
        const s = prev[zoneId]
        if (!s || s.clean) return prev
        const step = pressure === 'light' ? 5 : pressure === 'heavy' ? 12 : 8
        const newProgress = s.progress + step
        if (newProgress >= WIPE_THRESHOLD) {
          const zone = ZONES.find((z) => z.id === zoneId)
          if (zone) setReaction(zone.reactions[pressure])
          notifyZoneClean(zoneId, pressure)
          return { ...prev, [zoneId]: { progress: WIPE_THRESHOLD, clean: true } }
        }
        return { ...prev, [zoneId]: { ...s, progress: newProgress } }
      })
    },
    [wiping, pressure, notifyZoneClean],
  )

  const reset = useCallback(() => {
    setZoneStates(Object.fromEntries(ZONES.map((z) => [z.id, { clean: false, progress: 0 }])))
    setAllClean(false)
    setReaction(null)
    notifiedZones.current.clear()
    fetch('/api/body-state', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ state: 'dirty' }),
    }).catch(() => {})
  }, [])

  const cleanCount = Object.values(zoneStates).filter((s) => s.clean).length

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px',
        gap: '10px',
        userSelect: 'none',
        touchAction: 'none',
        overflow: 'auto',
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <h3 style={{ margin: 0, fontSize: '15px', opacity: 0.8 }}>
        {allClean ? 'All clean ✨' : `Clean me up (${cleanCount}/${ZONES.length})`}
      </h3>

      {/* Pressure selector */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px' }}>
        <span style={{ opacity: 0.6 }}>Pressure:</span>
        {PRESSURE_LIST.map((p) => (
          <button
            key={p}
            onClick={() => setPressure(p)}
            style={{
              padding: '4px 14px',
              borderRadius: '14px',
              border: pressure === p ? '1.5px solid rgba(80,140,200,0.6)' : '1px solid rgba(150,150,150,0.25)',
              background: pressure === p ? 'rgba(80,140,200,0.12)' : 'transparent',
              color: 'inherit',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: pressure === p ? 600 : 400,
            }}
          >
            {PRESSURE_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Body SVG */}
      <svg viewBox="50 15 180 410" width="200" height="400" style={{ flexShrink: 0 }}>
        {ZONES.map((z) => {
          const s = zoneStates[z.id]
          const cleanRatio = s.progress / WIPE_THRESHOLD
          const fillColor = s.clean
            ? 'rgba(180, 210, 255, 0.5)'
            : `rgba(220, 190, 170, ${0.7 - cleanRatio * 0.4})`
          const strokeColor = s.clean
            ? 'rgba(120, 170, 255, 0.6)'
            : 'rgba(180, 150, 130, 0.6)'
          return (
            <path
              key={z.id}
              d={z.path}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={1.5}
              style={{ cursor: s.clean ? 'default' : 'pointer', transition: 'fill 0.3s ease' }}
              onPointerMove={() => handlePointerMove(z.id)}
              onPointerDown={(e) => { e.stopPropagation(); setWiping(true); handlePointerMove(z.id) }}
            />
          )
        })}
      </svg>

      {/* Reaction bubble */}
      {reaction && (
        <div
          style={{
            padding: '10px 16px',
            background: 'rgba(100,100,100,0.1)',
            borderRadius: '12px',
            fontSize: '14px',
            maxWidth: '280px',
            textAlign: 'center',
          }}
        >
          "{reaction}"
        </div>
      )}

      {/* Reset button */}
      {allClean && (
        <button
          onClick={reset}
          style={{
            marginTop: '4px',
            padding: '8px 20px',
            border: '1px solid rgba(150,150,150,0.3)',
            borderRadius: '20px',
            background: 'transparent',
            color: 'inherit',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Get dirty again
        </button>
      )}
    </div>
  )
}
