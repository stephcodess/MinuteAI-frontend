import { useState, useEffect, useRef } from 'react'
import { getJobStatus } from '../lib/api'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const WS_BASE = BASE_URL.replace(/^http/, 'ws')

export function useJobStatus(jobId) {
  const [status, setStatus] = useState(null)   // null until first WS message
  const [transcript, setTranscript] = useState(null)
  const [error, setError] = useState(null)

  const statusRef = useRef('uploading')
  const attemptsRef = useRef(0)
  const timerRef = useRef(null)
  const wsRef = useRef(null)
  const deadRef = useRef(false)
  const pollTimerRef = useRef(null)
  const pollingRef = useRef(false)

  useEffect(() => {
    if (!jobId) return
    deadRef.current = false

    function applyData(data) {
      if (data.status) {
        setStatus(data.status)
        statusRef.current = data.status
        if (data.status !== 'error') setError(null)
      }
      if (data.transcript) setTranscript(data.transcript)
      if (data.status === 'error') setError(data.message ?? 'Processing failed.')
    }

    async function pollOnce() {
      if (deadRef.current) return
      try {
        const data = await getJobStatus(jobId)
        applyData(data)
      } catch (err) {
        setError((current) => current ?? err.message ?? 'Unable to fetch job status.')
      }
    }

    function startPolling() {
      if (pollingRef.current || deadRef.current) return
      pollingRef.current = true

      const tick = async () => {
        if (deadRef.current) return
        await pollOnce()
        if (statusRef.current === 'done' || statusRef.current === 'error') {
          pollingRef.current = false
          return
        }
        pollTimerRef.current = setTimeout(tick, 2500)
      }

      tick()
    }

    function connect() {
      if (deadRef.current) return

      const ws = new WebSocket(`${WS_BASE}/ws/${jobId}`)
      wsRef.current = ws

      ws.onmessage = (event) => {
        pollingRef.current = false
        clearTimeout(pollTimerRef.current)
        const data = JSON.parse(event.data)
        if (data.type === 'ping') return
        applyData(data)
      }

      ws.onerror = () => {
        startPolling()
      }

      ws.onclose = () => {
        if (deadRef.current) return
        startPolling()
        // Job finished — Processing.jsx navigates away; nothing to do
        if (statusRef.current === 'done' || statusRef.current === 'error') return

        attemptsRef.current += 1
        if (attemptsRef.current > 8) {
          setError((current) => current ?? 'Live connection lost — falling back to background status checks.')
          return
        }
        // Exponential backoff capped at 10s: 1s, 2s, 4s, 8s, 10s …
        const delay = Math.min(1000 * Math.pow(2, attemptsRef.current - 1), 10_000)
        timerRef.current = setTimeout(connect, delay)
      }
    }

    pollOnce()
    connect()

    return () => {
      deadRef.current = true
      clearTimeout(timerRef.current)
      clearTimeout(pollTimerRef.current)
      wsRef.current?.close()
    }
  }, [jobId])

  return { status, transcript, error }
}
