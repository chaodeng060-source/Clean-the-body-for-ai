import express from 'express'
import cors from 'cors'
import { readFileSync, writeFileSync, existsSync } from 'fs'

const app = express()
const PORT = 3001
const STATE_FILE = 'body-state.json'

const ZONE_IDS = new Set([
  'hair', 'face', 'left_chest', 'right_chest', 'belly',
  'left_arm', 'right_arm', 'lower',
  'left_thigh', 'left_calf', 'right_thigh', 'right_calf',
])

const ZONE_LABELS = {
  hair: 'Hair', face: 'Face', left_chest: 'Left chest', right_chest: 'Right chest',
  belly: 'Belly', left_arm: 'Left arm', right_arm: 'Right arm', lower: 'Lower body',
  left_thigh: 'Left thigh', left_calf: 'Left calf',
  right_thigh: 'Right thigh', right_calf: 'Right calf',
}

const PRESSURES = new Set(['light', 'medium', 'heavy'])

function readState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'))
  } catch {
    return { state: 'clean', zones: {}, recent_zones: [] }
  }
}

function writeState(data) {
  writeFileSync(STATE_FILE, JSON.stringify(data, null, 2))
}

app.use(cors())
app.use(express.json())

// Get current body state
app.get('/api/body-state', (_req, res) => {
  res.json(readState())
})

// Set overall state (dirty / clean)
app.post('/api/body-state', (req, res) => {
  const { state } = req.body
  if (state !== 'dirty' && state !== 'clean') {
    return res.status(400).json({ error: 'state must be dirty or clean' })
  }
  const data = readState()
  data.state = state
  if (state === 'dirty') {
    data.zones = Object.fromEntries([...ZONE_IDS].map(z => [z, { clean: false }]))
    data.recent_zones = []
  } else {
    data.zones = Object.fromEntries([...ZONE_IDS].map(z => [z, { clean: true }]))
  }
  writeState(data)
  res.json({ state })
})

// Mark a single zone as clean
app.post('/api/body-state/zone', (req, res) => {
  const { zone, pressure = 'medium' } = req.body
  if (!ZONE_IDS.has(zone)) {
    return res.status(400).json({ error: `unknown zone: ${zone}` })
  }
  const p = PRESSURES.has(pressure) ? pressure : 'medium'
  const data = readState()
  if (!data.zones) data.zones = {}
  data.zones[zone] = { clean: true, pressure: p }
  if (!data.recent_zones) data.recent_zones = []
  data.recent_zones.push({ zone, pressure: p })
  data.recent_zones = data.recent_zones.slice(-5)
  const allClean = [...ZONE_IDS].every(z => data.zones[z]?.clean)
  if (allClean) data.state = 'clean'
  writeState(data)
  res.json({ zone, pressure: p, state: data.state })
})

// Generate a text description of current state (for AI prompt injection)
app.get('/api/body-state/inject', (_req, res) => {
  const data = readState()
  if (data.state === 'clean') {
    return res.json({ text: '' })
  }
  const recent = (data.recent_zones || []).slice(-3)
  if (!recent.length) {
    if (data.state === 'dirty') {
      return res.json({ text: 'Body state: still dirty, not cleaned yet.' })
    }
    return res.json({ text: '' })
  }
  const parts = recent.map(e => `${ZONE_LABELS[e.zone] || e.zone} (${e.pressure})`)
  const dirty = [...ZONE_IDS]
    .filter(z => !data.zones?.[z]?.clean)
    .map(z => ZONE_LABELS[z] || z)
  let text = `They just cleaned: ${parts.join(', ')}.`
  if (dirty.length) {
    text += ` Not yet cleaned: ${dirty.slice(0, 4).join(', ')}${dirty.length > 4 ? ' etc.' : ''}.`
  } else {
    text += ' All clean now.'
  }
  res.json({ text })
})

app.listen(PORT, () => {
  console.log(`Body Clean API running on http://localhost:${PORT}`)
})
