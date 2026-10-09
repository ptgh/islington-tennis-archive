import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { emptyRacquetProfile, parseRacquetProfile, racquets, racquetPlayers, wilsonStrings, luxilonStrings } from './racquets.ts'

test('racquet collection has distinct records with sourced photos', () => {
  assert.equal(new Set(racquets.map(r => r.id)).size, racquets.length)
  assert.ok(racquets.some(r => r.era === 'current'))
  assert.ok(racquets.some(r => r.era === 'archive'))
  for (const item of racquets) {
    assert.ok(['www.wilson.com', 'racquets.tennisfame.com'].includes(new URL(item.source).hostname))
    assert.ok(item.image && ['www.wilson.com', 'images.ctfassets.net', 'www.tennisnuts.com'].includes(new URL(item.image).hostname))
  }
  for (const player of racquetPlayers) assert.ok(['www.wilson.com', 'racquets.tennisfame.com'].includes(new URL(player.source).hostname))
  assert.equal(racquets.find(r => r.id === 't2000')?.era, 'archive')
  assert.ok(racquetPlayers.some(player => player.name === 'Jimmy Connors' && player.chapter.includes('T2000')))
})

test('Blade variants have separate records for their string patterns and frame sizes', () => {
  const blades = racquets.filter(r => r.era === 'current' && r.family === 'Blade')
  assert.ok(blades.some(r => r.name.includes('98 16×19')))
  assert.ok(blades.some(r => r.name.includes('98 18×20')))
  assert.ok(blades.some(r => r.name.includes('98 Pro 16×19')))
  assert.ok(blades.some(r => r.name.includes('98 Pro 18×20')))
  assert.ok(blades.some(r => r.name.includes('100L')))
  assert.ok(blades.some(r => r.name.includes('100UL')))
  assert.ok(blades.some(r => r.name.includes('104')))
  assert.ok(blades.some(r => r.name.includes('Tiger')))
})

test('personal racquet card accepts known frame and limits persisted text', () => {
  assert.deepEqual(parseRacquetProfile('bad json'), emptyRacquetProfile)
  const profile = parseRacquetProfile(JSON.stringify({ name:'A'.repeat(90), racquetId:'blade-v10', strings:'NXT', note:'B'.repeat(200) }))
  assert.equal(profile.name.length, 50)
  assert.equal(profile.racquetId, 'blade-v10')
  assert.equal(profile.stringSource, 'other')
  assert.equal(profile.strings, 'NXT')
  assert.equal(profile.note.length, 160)
  assert.equal(parseRacquetProfile(JSON.stringify({racquetId:'invented'})).racquetId, '')
})

test('personal card handles UTR and Wilson or other strings', () => {
  assert.equal(new Set(wilsonStrings).size, wilsonStrings.length)
  assert.equal(new Set(luxilonStrings).size, luxilonStrings.length)
  const wilson = parseRacquetProfile(JSON.stringify({utr:'6.25', strings:'Wilson NXT 16'}))
  assert.equal(wilson.utr, '6.25')
  assert.equal(wilson.stringSource, 'wilson')
  assert.equal(parseRacquetProfile(JSON.stringify({strings:'Luxilon ALU Power 125'})).stringSource, 'luxilon')
  const other = parseRacquetProfile(JSON.stringify({utr:'17', stringSource:'other', strings:'My custom string'}))
  assert.equal(other.utr, '')
  assert.equal(other.stringSource, 'other')
  assert.equal(other.strings, 'My custom string')
  assert.equal(parseRacquetProfile(JSON.stringify({utr:'1'})).utr, '1')
  assert.equal(parseRacquetProfile(JSON.stringify({utr:'16.5'})).utr, '16.5')
})

test('grip size survives a saved card and older cards remain readable', () => {
  assert.equal(parseRacquetProfile(JSON.stringify({gripSize:'0'})).gripSize, '0')
  assert.equal(parseRacquetProfile(JSON.stringify({gripSize:'5'})).gripSize, '5')
  assert.equal(parseRacquetProfile(JSON.stringify({gripSize:'9'})).gripSize, '')
  assert.equal(parseRacquetProfile(JSON.stringify({name:'Alex'})).gripSize, '')
})

test('every collection frame has its own hosted photograph', () => {
  const registry = readFileSync(new URL('./racquetPhotos.ts', import.meta.url), 'utf8')
  const entries = [...registry.matchAll(/^\s+(?:'([^']+)'|(t2000)):\s*(\w+)\.url,/gm)]
  const mappings = new Map(entries.map(entry => [entry[1] || entry[2], entry[3]]))
  assert.equal(racquets.length, 32)
  assert.equal(mappings.size, 32)
  const urls = new Set<string>()
  for (const frame of racquets) {
    const variable = mappings.get(frame.id)
    assert.ok(variable, `Missing hosted photo: ${frame.id}`)
    const path = registry.match(new RegExp(`import ${variable} from '([^']+)'`))?.[1]
    assert.ok(path, `Missing photo import: ${frame.id}`)
    const pointer = JSON.parse(readFileSync(new URL(path, new URL('./racquetPhotos.ts', import.meta.url)), 'utf8'))
    assert.equal(pointer.version, 1)
    assert.ok(pointer.size > 1000)
    assert.ok(pointer.url.startsWith('/__l5e/assets-v1/'))
    assert.ok(!urls.has(pointer.url), `Substituted duplicate photo: ${frame.id}`)
    urls.add(pointer.url)
  }
})
