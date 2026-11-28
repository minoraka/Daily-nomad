import { fireEvent, render } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { Modal } from './Modal'

test('Escape closes only the topmost modal', () => {
  const outer = vi.fn(), inner = vi.fn()
  render(<Modal onClose={outer}><Modal onClose={inner}>x</Modal></Modal>)
  fireEvent.keyDown(window, { key: 'Escape' })
  expect(inner).toHaveBeenCalledOnce()
  expect(outer).not.toHaveBeenCalled()
})
