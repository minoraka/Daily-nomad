import { useCallback, useEffect, useState } from 'react'
import { listDailies, type DailyQuery } from '../api/endpoints'
import type { Daily } from '../api/types'

/** Paginated feed with "load more". Reloads from page 1 when the query changes. */
export function useDailies(query: DailyQuery | null) {
  const [items, setItems] = useState<Daily[] | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState(false)
  const key = JSON.stringify(query)

  const reload = useCallback(async () => {
    if (!query) return
    try {
      const r = await listDailies({ ...query, page: 1 })
      setItems(r.results)
      setHasMore(Boolean(r.next))
      setPage(1)
      setError(false)
    } catch {
      setError(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    reload()
  }, [reload])

  const loadMore = async () => {
    if (!query) return
    const r = await listDailies({ ...query, page: page + 1 })
    setItems((cur) => [...(cur ?? []), ...r.results])
    setHasMore(Boolean(r.next))
    setPage(page + 1)
  }

  return { items, hasMore, error, reload, loadMore }
}
