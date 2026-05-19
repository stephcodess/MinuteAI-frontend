import { useState, useEffect } from 'react'
import { getResults, getDownloadUrl } from '../lib/api'

export function useResults(jobId) {
  const [minutes, setMinutes] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!jobId) return
    getResults(jobId)
      .then(data => setMinutes(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [jobId])

  function refresh() {
    return getResults(jobId)
      .then(data => { setMinutes(data); setError(null) })
      .catch(err => setError(err.message))
  }

  function downloadDocx(template?: string) {
    window.open(getDownloadUrl(jobId, 'docx', template), '_blank')
  }

  function downloadPdf(template?: string) {
    window.open(getDownloadUrl(jobId, 'pdf', template), '_blank')
  }

  return { minutes, loading, error, downloadDocx, downloadPdf, refresh }
}
