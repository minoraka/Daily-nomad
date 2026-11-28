import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Field } from '../layout/Field'
import { Modal } from '../layout/Modal'

export function ReturnDialog({ onConfirm, onCancel }: { onConfirm: (text: string) => void; onCancel: () => void }) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  return (
    <Modal onClose={onCancel}>
      <h2>{t('board.return_title')}</h2>
      <form className="form" onSubmit={(e) => { e.preventDefault(); onConfirm(text) }} data-testid="return-dialog">
        <Field label={t('board.return_comment')}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} autoFocus maxLength={2000}
            data-testid="return-comment" />
        </Field>
        <div className="actions">
          <button type="button" className="btn" onClick={onCancel}>{t('board.cancel')}</button>
          <button className="btn btn-primary" data-testid="return-confirm">{t('board.return')}</button>
        </div>
      </form>
    </Modal>
  )
}
