import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { api } from '../lib/api'

const WorkspaceContext = createContext(null)
const WS_KEY = 'minuteai_workspace'

export function WorkspaceProvider({ children }) {
  const { isSignedIn } = useAuth()
  const [workspaces, setWorkspaces]   = useState([])
  const [activeId,   setActiveId]     = useState(() => localStorage.getItem(WS_KEY))
  const [wsReady,    setWsReady]      = useState(false)

  const fetchWorkspaces = useCallback(async () => {
    try {
      const data = await api.get('/workspaces')
      setWorkspaces(data)
      const ids = data.map(w => w.id)
      setActiveId(prev => {
        const valid = prev && ids.includes(prev) ? prev : (data[0]?.id ?? null)
        if (valid) localStorage.setItem(WS_KEY, valid)
        else localStorage.removeItem(WS_KEY)
        return valid
      })
    } catch {
      setWorkspaces([])
    } finally {
      setWsReady(true)
    }
  }, [])

  useEffect(() => {
    if (isSignedIn) {
      setWsReady(false)
      fetchWorkspaces()
    } else {
      setWorkspaces([])
      setActiveId(null)
      setWsReady(false)
      localStorage.removeItem(WS_KEY)
    }
  }, [isSignedIn, fetchWorkspaces])

  function switchWorkspace(id) {
    setActiveId(id)
    localStorage.setItem(WS_KEY, id)
  }

  const activeWorkspace = workspaces.find(w => w.id === activeId) ?? workspaces[0] ?? null

  async function createWorkspace(name) {
    const ws = await api.post('/workspaces', { name })
    setWorkspaces(prev => [...prev, ws])
    switchWorkspace(ws.id)
    return ws
  }

  async function renameWorkspace(id, name) {
    const ws = await api.patch(`/workspaces/${id}`, { name })
    setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, name: ws.name } : w))
    return ws
  }

  async function deleteWorkspace(id) {
    await api.delete(`/workspaces/${id}`)
    setWorkspaces(prev => {
      const next = prev.filter(w => w.id !== id)
      if (activeId === id && next.length > 0) switchWorkspace(next[0].id)
      return next
    })
  }

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      activeWorkspace,
      wsReady,
      switchWorkspace,
      createWorkspace,
      renameWorkspace,
      deleteWorkspace,
      refetch: fetchWorkspaces,
    }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  return useContext(WorkspaceContext)
}
