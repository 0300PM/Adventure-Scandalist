import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(__dirname, 'style.css'), 'utf8')

const rules = css
  .split('}')
  .map((chunk) => {
    const [selector = '', ...body] = chunk.split('{')
    return { selector: selector.split('\n').pop()?.trim() ?? '', body: body.join('{').replace(/\s+/g, ' ').trim() }
  })
  .filter((rule) => rule.selector.length > 0 && rule.body.length > 0)

const ruleFor = (selector: string) => rules.find((rule) => rule.selector === selector)?.body ?? ''
const allRulesFor = (selector: string) => rules.filter((rule) => rule.selector === selector).map((rule) => rule.body)

describe('vitals styling', () => {
  it('lets the paper frame stretch over the whole card so nothing escapes it', () => {
    const card = ruleFor('.vitals')
    expect(card).toContain('overflow: hidden')
    expect(card).toMatch(/padding: \d+px/)
    expect(card).not.toMatch(/padding: [^;]*%/)
    expect(card).not.toContain('aspect-ratio')
    expect(ruleFor('.vitals > .gui-frame')).toContain('object-fit: fill')
    expect(ruleFor('.vitals-body')).toContain('position: relative')
    expect(ruleFor('.vitals-body')).not.toContain('position: absolute')
  })

  it('paints every condition bar with its own colour', () => {
    expect(ruleFor('.vital-health .vital-track i')).toContain('background-color')
    expect(ruleFor('.vital-stamina .vital-track i')).toContain('background-color')
    expect(ruleFor('.vital-hunger .vital-track i')).toContain('background-color')
    expect(ruleFor('.vital.is-low .vital-track i')).toContain('background-color')
    expect(ruleFor('.vital-track i')).toContain('linear-gradient')
    expect(ruleFor('.vital-track')).toMatch(/height: 1[0-9]px/)
  })

  it('wraps the clock in a paper frame sized by its content', () => {
    const cycle = ruleFor('.day-cycle')
    expect(cycle).toContain('overflow: hidden')
    expect(cycle).toMatch(/padding: \d+px/)
    expect(cycle).not.toContain('aspect-ratio')
    expect(ruleFor('.day-cycle-frame')).toContain('object-fit: fill')
    for (const body of allRulesFor('.day-cycle')) expect(body).not.toContain('aspect-ratio')
  })
})
