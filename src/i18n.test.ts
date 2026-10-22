import { describe, expect, it } from 'vitest'
import { copy, type Language } from './i18n'

const languages: Language[] = ['pl', 'en', 'es']
const reference = Object.keys(copy.pl).sort()

describe('interface copy', () => {
  it('defines every Polish key in English and Spanish', () => {
    for (const language of languages) {
      expect(Object.keys(copy[language]).sort(), language).toEqual(reference)
    }
  })

  it('has no empty or placeholder strings', () => {
    for (const language of languages) {
      for (const [key, value] of Object.entries(copy[language])) {
        expect(typeof value, `${language}.${key}`).toBe('string')
        expect(value.trim().length, `${language}.${key}`).toBeGreaterThan(0)
        expect(value, `${language}.${key}`).not.toMatch(/^(TODO|FIXME|undefined|null)$/)
      }
    }
  })

  it('keeps the chronicle and story strings available in every language', () => {
    for (const language of languages) {
      for (const key of ['chronicleTitle', 'chronicleLocked', 'lorePlaces', 'storyClose', 'epilogue', 'collectRelic'] as const) {
        expect(copy[language][key].length, `${language}.${key}`).toBeGreaterThan(2)
      }
    }
  })
})
