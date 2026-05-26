import { useEffect, useState } from 'react'
import { Download, RefreshCw, X, CheckCircle } from 'lucide-react'

type Phase = 'available' | 'downloading' | 'ready'

interface UpdateState {
  phase: Phase
  version: string
  percent: number
  speed: number
  total: number
  dismissed: boolean
}

function fmtBytes(b: number) {
  if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(1)} MB`
  if (b >= 1024)      return `${(b / 1024).toFixed(0)} KB`
  return `${b} B`
}

function fmtSpeed(bps: number) {
  return `${fmtBytes(bps)}/s`
}

export default function UpdateNotifier() {
  const [update, setUpdate] = useState<UpdateState | null>(null)

  useEffect(() => {
    const api = (window as any).electronAPI
    if (!api) return

    const unsubs = [
      api.onUpdateAvailable(({ version }: { version: string }) => {
        setUpdate({ phase: 'available', version, percent: 0, speed: 0, total: 0, dismissed: false })
      }),
      api.onUpdateProgress(({ percent, bytesPerSecond, total }: { percent: number; bytesPerSecond: number; total: number }) => {
        setUpdate(prev => prev ? { ...prev, phase: 'downloading', percent, speed: bytesPerSecond, total } : null)
      }),
      api.onUpdateReady(({ version }: { version: string }) => {
        setUpdate(prev => prev
          ? { ...prev, phase: 'ready', version, dismissed: false }
          : { phase: 'ready', version, percent: 100, speed: 0, total: 0, dismissed: false }
        )
      }),
    ]

    return () => unsubs.forEach((fn: () => void) => fn())
  }, [])

  if (!update || update.dismissed) return null

  const { phase, version, percent, speed, total } = update
  const isReady = phase === 'ready'

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        padding: '8px 16px',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          background: 'var(--dropdown-bg)',
          border: `1px solid ${isReady ? 'var(--success-soft)' : 'var(--primary-glow)'}`,
          borderRadius: 12,
          boxShadow: '0 4px 24px var(--modal-overlay)',
          backdropFilter: 'blur(16px)',
          pointerEvents: 'auto',
          minWidth: 340,
          maxWidth: 480,
          animation: 'notifier-slide-down 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Icon */}
        <div
          style={{
            flexShrink: 0, width: 32, height: 32, borderRadius: 8,
            background: isReady ? 'var(--success-soft)' : 'var(--primary-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {isReady
            ? <CheckCircle size={16} style={{ color: 'var(--success)' }} />
            : <Download size={16} style={{
                color: 'var(--nav-active-txt)',
                animation: phase === 'downloading' ? 'notifier-bounce 1s ease-in-out infinite' : undefined,
              }}
            />
          }
        </div>

        {/* Text + progress */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{
              fontSize: 13, fontWeight: 600,
              color: isReady ? 'var(--success-text)' : 'var(--nav-active-txt)',
            }}>
              {isReady              ? `v${version} ready to install`    :
               phase === 'downloading' ? `Downloading v${version}…`     :
               `Update available — v${version}`}
            </span>
            {!isReady && phase === 'downloading' && (
              <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 8, whiteSpace: 'nowrap' }}>
                {percent}%
              </span>
            )}
          </div>

          {phase === 'downloading' && (
            <>
              <div style={{
                height: 3, borderRadius: 999,
                background: 'var(--input-bg)',
                overflow: 'hidden', margin: '5px 0 4px',
              }}>
                <div style={{
                  height: '100%',
                  width: `${percent}%`,
                  background: 'linear-gradient(90deg, var(--primary), var(--primary-light))',
                  borderRadius: 999,
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                {total > 0 ? `${fmtBytes(percent / 100 * total)} / ${fmtBytes(total)}` : ''}
                {speed > 0 ? ` · ${fmtSpeed(speed)}` : ''}
              </span>
            </>
          )}

          {(phase === 'available' || isReady) && (
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {isReady ? 'Your app will restart to apply the update.' : 'Downloading in the background…'}
            </span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {isReady && (
            <button
              onClick={() => (window as any).electronAPI?.installUpdate()}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px',
                background: 'var(--success-soft)',
                border: '1px solid var(--success-soft)',
                borderRadius: 7,
                color: 'var(--success-text)',
                fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <RefreshCw size={11} />
              Restart Now
            </button>
          )}

          <button
            onClick={() => setUpdate(prev => prev ? { ...prev, dismissed: true } : null)}
            style={{
              width: 24, height: 24,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: 6,
              color: 'var(--text-3)',
              cursor: 'pointer',
              padding: 0,
            }}
            title="Dismiss"
          >
            <X size={11} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes notifier-slide-down {
          from { transform: translateY(-20px); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        @keyframes notifier-bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(3px); }
        }
      `}</style>
    </div>
  )
}
