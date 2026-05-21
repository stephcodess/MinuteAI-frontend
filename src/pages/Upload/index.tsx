import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, FileAudio, X, AlertCircle, Lock, Zap, Trash2,
  ArrowRight, CheckCircle, Languages, ChevronDown,
  FileText, BarChart2, AlignLeft, Minimize2, SlidersHorizontal,
  ShieldCheck,
} from 'lucide-react'
import { formRequest } from '../../lib/api'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useAuth } from '../../context/AuthContext'
import Sidebar from '../../components/Sidebar'

const ACCEPTED_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/webm', 'video/mp4']
const ACCEPTED_EXTS  = ['mp3', 'mp4', 'm4a', 'wav', 'webm']
const MAX_SIZE_MB = 500
const FORMATS = ['MP3', 'MP4', 'M4A', 'WAV', 'WebM']
const CHUNK_SIZE = 5 * 1024 * 1024

const MEETING_TYPES = [
  { value: 'general',    label: 'General Meeting'     },
  { value: 'standup',    label: 'Team Standup'         },
  { value: 'client',     label: 'Client Call'          },
  { value: 'interview',  label: 'Job Interview'        },
  { value: 'workshop',   label: 'Workshop / Training'  },
  { value: 'lecture',    label: 'Lecture / Webinar'    },
  { value: 'brainstorm', label: 'Brainstorming'        },
  { value: 'one_on_one', label: 'One-on-One'           },
]

const OUTPUT_LANGUAGES = [
  { code: 'en', name: 'English'     },
  { code: 'fr', name: 'French'      },
  { code: 'es', name: 'Spanish'     },
  { code: 'de', name: 'German'      },
  { code: 'it', name: 'Italian'     },
  { code: 'pt', name: 'Portuguese'  },
  { code: 'nl', name: 'Dutch'       },
  { code: 'pl', name: 'Polish'      },
  { code: 'sv', name: 'Swedish'     },
  { code: 'da', name: 'Danish'      },
  { code: 'no', name: 'Norwegian'   },
  { code: 'fi', name: 'Finnish'     },
  { code: 'tr', name: 'Turkish'     },
  { code: 'ro', name: 'Romanian'    },
  { code: 'hu', name: 'Hungarian'   },
  { code: 'cs', name: 'Czech'       },
  { code: 'uk', name: 'Ukrainian'   },
  { code: 'ru', name: 'Russian'     },
  { code: 'ar', name: 'Arabic'      },
  { code: 'zh', name: 'Chinese'     },
  { code: 'ja', name: 'Japanese'    },
  { code: 'ko', name: 'Korean'      },
  { code: 'hi', name: 'Hindi'       },
  { code: 'sw', name: 'Swahili'     },
  { code: 'yo', name: 'Yoruba'      },
  { code: 'ig', name: 'Igbo'        },
  { code: 'ha', name: 'Hausa'       },
  { code: 'id', name: 'Indonesian'  },
  { code: 'vi', name: 'Vietnamese'  },
  { code: 'th', name: 'Thai'        },
]

const AUDIO_LANGUAGES = [
  { code: '',   name: 'Auto-detect'      },
  { code: 'en', name: 'English'          },
  { code: 'yo', name: 'Yoruba'           },
  { code: 'ig', name: 'Igbo'             },
  { code: 'ha', name: 'Hausa'            },
  { code: 'fr', name: 'French'           },
  { code: 'es', name: 'Spanish'          },
  { code: 'de', name: 'German'           },
  { code: 'it', name: 'Italian'          },
  { code: 'pt', name: 'Portuguese'       },
  { code: 'nl', name: 'Dutch'            },
  { code: 'ru', name: 'Russian'          },
  { code: 'zh', name: 'Chinese'          },
  { code: 'ja', name: 'Japanese'         },
  { code: 'ko', name: 'Korean'           },
  { code: 'ar', name: 'Arabic'           },
  { code: 'hi', name: 'Hindi'            },
  { code: 'tr', name: 'Turkish'          },
  { code: 'pl', name: 'Polish'           },
  { code: 'sv', name: 'Swedish'          },
  { code: 'uk', name: 'Ukrainian'        },
]

const TEMPLATES = [
  {
    id: 'standard',
    name: 'Standard',
    desc: 'Classic numbered sections with action items table',
    icon: FileText,
    gradient: 'from-violet-500 to-indigo-600',
    ring: 'ring-violet-400',
    dot: 'bg-violet-500',
  },
  {
    id: 'modern',
    name: 'Modern',
    desc: 'Clean teal design, active direct language',
    icon: Zap,
    gradient: 'from-teal-500 to-emerald-600',
    ring: 'ring-teal-400',
    dot: 'bg-teal-500',
  },
  {
    id: 'executive',
    name: 'Executive',
    desc: 'Action items first, concise summaries for leadership',
    icon: BarChart2,
    gradient: 'from-blue-700 to-blue-900',
    ring: 'ring-blue-500',
    dot: 'bg-blue-700',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    desc: 'Understated grey layout, maximum whitespace',
    icon: Minimize2,
    gradient: 'from-gray-500 to-gray-700',
    ring: 'ring-gray-400',
    dot: 'bg-gray-500',
  },
]

// ── helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function estimateTime(bytes) {
  const mb = bytes / (1024 * 1024)
  if (mb < 20) return '~1 min'
  if (mb < 100) return '~2 min'
  return '~3–4 min'
}

function titleFromFilename(name: string) {
  return name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ── sub-components ────────────────────────────────────────────────────────────

function MiniWaveform() {
  const heights = [5, 9, 13, 10, 7, 12, 8, 14, 11, 9, 6, 11, 8, 13, 7]
  return (
    <div className="flex items-end gap-[3px] h-8">
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-violet-500"
          style={{ height: `${h}px` }}
          animate={{ scaleY: [1, 0.35, 1.15, 0.5, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.09, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

function IdleIcon({ dragging }) {
  return (
    <div className="relative flex items-center justify-center w-28 h-28 mx-auto mb-6">
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-violet-300/50"
        animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute inset-3 rounded-full border border-violet-300/40"
        animate={{ scale: [1, 1.12, 1], opacity: [0.6, 0, 0.6] }}
        transition={{ duration: 2.4, repeat: Infinity, delay: 0.4, ease: 'easeInOut' }}
      />
      <motion.div
        className={`w-[72px] h-[72px] rounded-full flex items-center justify-center shadow-xl transition-colors duration-300 ${
          dragging
            ? 'bg-gradient-to-br from-violet-500 to-indigo-600 shadow-violet-400/40'
            : 'bg-gradient-to-br from-violet-600 to-indigo-700 shadow-violet-500/25'
        }`}
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        whileHover={{ scale: 1.06 }}
      >
        <Mic className="text-white" size={28} />
      </motion.div>
    </div>
  )
}

function TemplateCard({ tpl, selected, onClick }) {
  const Icon = tpl.icon
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative flex flex-col items-start gap-2 p-3.5 rounded-2xl text-left transition-all duration-200 ${
        selected ? `ring-2 ${tpl.ring}` : ''
      }`}
      style={{
        background: selected ? 'rgba(139,92,246,0.08)' : 'var(--input-bg)',
        border: selected ? undefined : '1px solid var(--card-border)',
      }}
    >
      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${tpl.gradient} flex items-center justify-center shadow-sm shrink-0`}>
        <Icon size={15} className="text-white" />
      </div>
      <div>
        <p className="text-xs font-bold text-slate-200">{tpl.name}</p>
        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{tpl.desc}</p>
      </div>
      {selected && (
        <div className={`absolute top-2 right-2 w-4 h-4 rounded-full ${tpl.dot} flex items-center justify-center`}>
          <CheckCircle size={10} className="text-white" />
        </div>
      )}
    </motion.button>
  )
}

function StepIndicator({ step, dark = false }: { step: number; dark?: boolean }) {
  const steps = ['Upload', 'Configure', 'Process', 'Download']
  return (
    <div className="hidden sm:flex items-center gap-3">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${
            dark
              ? i <= step ? 'text-white' : 'text-white/40'
              : i <= step ? 'text-violet-300' : 'text-slate-600'
          }`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              i < step  ? 'bg-white text-violet-300'
              : i === step ? (dark ? 'bg-white text-violet-300' : 'bg-violet-600 text-white')
              : dark ? 'bg-white/20 text-white/50' : 'bg-white/[0.06] text-slate-500'
            }`}>
              {i < step ? <CheckCircle size={11} /> : i + 1}
            </div>
            {label}
          </div>
          {i < steps.length - 1 && <div className={`w-8 h-px ${dark ? 'bg-white/20' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  )
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold" style={{ color: 'var(--text-3)' }}>{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none px-3.5 py-2.5 pr-9 rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-violet-500/40 glass-input"
          style={{ border: '1px solid var(--input-border)' }}
        >
          {options.map(o => (
            <option key={o.value ?? o.code} value={o.value ?? o.code}>{o.label ?? o.name}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-3)' }} />
      </div>
    </div>
  )
}

function ConfigFields({ meetingType, setMeetingType, audioLanguage, setAudioLanguage, outputLanguage, setOutputLanguage, meetingTitle, setMeetingTitle, attendees, setAttendees, customInstructions, setCustomInstructions, template, setTemplate }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Meeting type" value={meetingType} onChange={setMeetingType} options={MEETING_TYPES} />
        <SelectField label="Audio language" value={audioLanguage} onChange={setAudioLanguage} options={AUDIO_LANGUAGES} />
      </div>

      <SelectField label="Document language" value={outputLanguage} onChange={setOutputLanguage}
        options={OUTPUT_LANGUAGES.map(l => ({ value: l.code, label: l.name }))} />

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold" style={{ color: 'var(--text-3)' }}>
          Meeting title <span className="font-normal opacity-60">(optional)</span>
        </label>
        <input type="text" value={meetingTitle} onChange={e => setMeetingTitle(e.target.value)}
          placeholder="e.g. Q3 Planning Session"
          className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-violet-500/40 glass-input"
          style={{ border: '1px solid var(--input-border)' }} />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold" style={{ color: 'var(--text-3)' }}>
          Attendees <span className="font-normal opacity-60">(comma-separated)</span>
        </label>
        <input type="text" value={attendees} onChange={e => setAttendees(e.target.value)}
          placeholder="Alice (PM), Bob (Eng)…"
          className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-violet-500/40 glass-input"
          style={{ border: '1px solid var(--input-border)' }} />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold" style={{ color: 'var(--text-3)' }}>
          Custom instructions <span className="font-normal opacity-60">(optional)</span>
        </label>
        <textarea value={customInstructions} onChange={e => setCustomInstructions(e.target.value)}
          placeholder="e.g. Focus on technical decisions. Highlight risks."
          rows={2}
          className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-violet-500/40 glass-input resize-none"
          style={{ border: '1px solid var(--input-border)' }} />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold" style={{ color: 'var(--text-3)' }}>Document template</label>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map(tpl => (
            <TemplateCard key={tpl.id} tpl={tpl} selected={template === tpl.id} onClick={() => setTemplate(tpl.id)} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Consent modal ─────────────────────────────────────────────────────────────

function ConsentModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const [checked, setChecked] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--dropdown-bg)', border: '1px solid var(--card-border)' }}
      >
        <div className="h-1 w-full bg-gradient-to-r from-violet-600 via-indigo-500 to-purple-600" />

        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Recording consent</h2>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Required before processing</p>
            </div>
          </div>

          <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-2)' }}>
            By uploading this recording you confirm that:
          </p>
          <ul className="space-y-2 mb-5 text-sm" style={{ color: 'var(--text-2)' }}>
            {[
              'All participants were informed that the meeting was being recorded',
              'All participants gave their consent before recording started',
              'You have the right to process this audio under your applicable data protection law',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <div className="w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle size={10} className="text-white" />
                </div>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <label className="flex items-start gap-3 cursor-pointer select-none mb-5">
            <div
              onClick={() => setChecked(c => !c)}
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                checked ? 'bg-violet-600 border-violet-600' : 'border-slate-600'
              }`}
            >
              {checked && <CheckCircle size={12} className="text-white" />}
            </div>
            <span className="text-sm" style={{ color: 'var(--text-2)' }}>
              I confirm all participants consented to this recording
            </span>
          </label>

          <div className="flex gap-3">
            <button onClick={onCancel}
              className="flex-1 py-3 rounded-full text-sm font-semibold transition"
              style={{ background: 'var(--input-bg)', color: 'var(--text-2)', border: '1px solid var(--card-border)' }}>
              Cancel
            </button>
            <button onClick={onConfirm} disabled={!checked}
              className="flex-1 py-3 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/30">
              Confirm &amp; upload
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function Upload() {
  const { user } = useAuth()
  const preferredLanguage = OUTPUT_LANGUAGES.some(lang => lang.code === user?.language) ? user.language : 'en'
  const [file, setFile]                     = useState(null)
  const [dragging, setDragging]             = useState(false)
  const [error, setError]                   = useState(null)
  const [uploading, setUploading]           = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [configOpen, setConfigOpen]         = useState(false)
  const [showConsent, setShowConsent]       = useState(false)

  // Config state
  const [meetingType, setMeetingType]             = useState('general')
  const [meetingTitle, setMeetingTitle]           = useState('')
  const [attendees, setAttendees]                 = useState('')
  const [audioLanguage, setAudioLanguage]         = useState('')
  const [outputLanguage, setOutputLanguage]       = useState(preferredLanguage)
  const [customInstructions, setCustomInstructions] = useState('')
  const [template, setTemplate]                   = useState('standard')

  const inputRef         = useRef(null)
  const navigate         = useNavigate()
  const { activeWorkspace } = useWorkspace()

  const step = uploading ? 2 : file ? 1 : 0

  const configProps = {
    meetingType, setMeetingType,
    audioLanguage, setAudioLanguage,
    outputLanguage, setOutputLanguage,
    meetingTitle, setMeetingTitle,
    attendees, setAttendees,
    customInstructions, setCustomInstructions,
    template, setTemplate,
  }

  function validateFile(f) {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ACCEPTED_TYPES.includes(f.type) && !ACCEPTED_EXTS.includes(ext))
      return 'Unsupported format. Please use MP3, MP4, M4A, WAV, or WebM.'
    if (f.size > MAX_SIZE_MB * 1024 * 1024) return `File too large — max ${MAX_SIZE_MB} MB.`
    return null
  }

  function handleFileSelect(f) {
    const err = validateFile(f)
    if (err) { setError(err); setFile(null); return }
    setError(null)
    setFile(f)
    setMeetingTitle(titleFromFilename(f.name))
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }

  async function openNativeFilePicker() {
    const result = await window.electronAPI!.openFile()
    if (!result) return
    const blob = new Blob([result.data])
    const file = new File([blob], result.name)
    handleFileSelect(file)
  }

  function handleDropZoneClick() {
    if (file) return
    if (window.electronAPI) {
      openNativeFilePicker()
    } else {
      inputRef.current?.click()
    }
  }

  function handleSubmit() {
    if (!file || uploading) return
    setShowConsent(true)
  }

  async function doUpload() {
    setShowConsent(false)
    setUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      // Init
      const initForm = new FormData()
      initForm.append('filename', file.name)
      initForm.append('filesize', String(file.size))
      if (activeWorkspace?.id) initForm.append('workspace_id', activeWorkspace.id)
      initForm.append('meeting_type', meetingType)
      initForm.append('meeting_title', meetingTitle)
      initForm.append('attendees', attendees)
      initForm.append('audio_language', audioLanguage)
      initForm.append('custom_instructions', customInstructions)
      initForm.append('template', template)
      initForm.append('output_language', outputLanguage)
      initForm.append('consent_acknowledged', 'true')

      const { jobId } = await formRequest('/upload/init', { method: 'POST', body: initForm })

      // Chunked upload
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE
        const blob  = file.slice(start, Math.min(start + CHUNK_SIZE, file.size))
        const form  = new FormData()
        form.append('index', String(i))
        form.append('total', String(totalChunks))
        form.append('chunk', blob, 'chunk')
        await formRequest(`/upload/chunk/${jobId}`, { method: 'POST', body: form })
        setUploadProgress((i + 1) / totalChunks)
      }

      // Complete
      const completeForm = new FormData()
      completeForm.append('filename', file.name)
      await formRequest(`/upload/complete/${jobId}`, { method: 'POST', body: completeForm })

      navigate(`/processing/${jobId}`)
    } catch (err) {
      setError(err.message || 'Upload failed — please try again.')
      setUploading(false)
    }
  }

  return (
    <div className="flex h-screen app-bg app-grid overflow-hidden">
      <AnimatePresence>
        {showConsent && (
          <ConsentModal onConfirm={doUpload} onCancel={() => setShowConsent(false)} />
        )}
      </AnimatePresence>

      <Sidebar active="upload" />

      <main className="min-w-0 flex-1 flex flex-col overflow-hidden relative z-[1]">

        {/* ── Page header ── */}
        <div className="shrink-0 px-4 sm:px-8 pt-6 sm:pt-7 pb-4 sm:pb-5" style={{ borderBottom: '1px solid var(--divider)' }}>
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>
              {activeWorkspace?.name ?? 'Your workspace'}
            </p>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5" style={{ color: 'var(--text-1)' }}>
                  <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
                    <Mic size={17} className="text-white" />
                  </span>
                  New Meeting
                </h1>
              </div>
              <StepIndicator step={step} />
            </div>
          </motion.div>
        </div>

        {/* ── Two-column body ── */}
        <div className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row min-h-0">

          {/* LEFT — drop zone */}
          <div className="flex-1 flex flex-col min-w-0 lg:overflow-y-auto px-4 sm:px-8 py-6 sm:py-8 lg:border-r" style={{ borderColor: 'var(--divider)' }}>

            {/* Drop zone */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <div
                onClick={handleDropZoneClick}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={e => { if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false) }}
                onDrop={onDrop}
                className={`relative rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer ${
                  dragging
                    ? 'border-violet-500 bg-violet-500/10 shadow-2xl shadow-violet-500/20 scale-[1.01]'
                    : file
                    ? 'border-violet-500/40 bg-violet-500/5 cursor-default'
                    : 'border-white/10 hover:border-violet-500/40 hover:bg-violet-500/5 bg-white/[0.03]'
                }`}
              >
                <input ref={inputRef} type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/webm,video/mp4,video/webm,.mp3,.mp4,.m4a,.wav,.webm" className="hidden"
                  onChange={e => { if (e.target.files[0]) handleFileSelect(e.target.files[0]) }} />

                <AnimatePresence mode="wait">
                  {file ? (
                    <motion.div key="file" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.25 }} className="p-8">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/30">
                          <FileAudio className="text-white" size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate text-base mb-0.5" style={{ color: 'var(--text-1)' }}>{file.name}</p>
                          <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-3)' }}>
                            <span>{formatBytes(file.size)}</span><span>·</span>
                            <span className="text-violet-400 font-medium">{estimateTime(file.size)} to process</span>
                          </div>
                          <div className="mt-4"><MiniWaveform /></div>
                        </div>
                        <button onClick={e => { e.stopPropagation(); setFile(null) }}
                          className="w-8 h-8 rounded-full flex items-center justify-center transition hover:bg-rose-500/10 hover:text-rose-400"
                          style={{ background: 'var(--input-bg)', color: 'var(--text-3)' }}>
                          <X size={15} />
                        </button>
                      </div>
                      <div className="mt-6 pt-5 flex items-center gap-2 text-xs border-t" style={{ borderColor: 'var(--divider)', color: 'var(--text-3)' }}>
                        <CheckCircle size={13} className="text-emerald-400" />
                        File validated — configure your output on the right
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="py-16 px-8 text-center">
                      <IdleIcon dragging={dragging} />
                      <p className="text-lg font-semibold mb-1" style={{ color: 'var(--text-1)' }}>
                        {dragging ? 'Release to upload' : 'Drop your audio here'}
                      </p>
                      <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>
                        or <span className="text-violet-400 font-medium underline underline-offset-2 decoration-dotted">click to browse</span>
                      </p>
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {FORMATS.map(fmt => (
                          <span key={fmt} className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: 'var(--input-bg)', color: 'var(--text-3)' }}>{fmt}</span>
                        ))}
                        <span className="text-xs" style={{ color: 'var(--text-3)' }}>· up to 500 MB</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-2.5 mt-4 text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-4 py-3 text-sm">
                  <AlertCircle size={15} className="shrink-0" />{error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mobile configure button — only visible when file is selected */}
            <AnimatePresence>
              {file && !uploading && (
                <motion.button
                  key="configure-btn"
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                  onClick={() => setConfigOpen(true)}
                  className="lg:hidden mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-2)' }}
                >
                  <SlidersHorizontal size={15} style={{ color: 'var(--text-3)' }} />
                  Configure output
                </motion.button>
              )}
            </AnimatePresence>

            {/* CTA button */}
            <motion.div className="mt-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.18 }}>
              <motion.button onClick={handleSubmit} disabled={!file || uploading}
                whileHover={file && !uploading ? { scale: 1.015 } : {}}
                whileTap={file && !uploading ? { scale: 0.98 } : {}}
                className={`group relative w-full py-4 rounded-full font-semibold text-base transition-all duration-200 overflow-hidden ${
                  file && !uploading
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/30'
                    : 'text-slate-500 cursor-not-allowed'
                }`}
                style={{ background: file && !uploading ? undefined : 'var(--input-bg)' }}>
                {file && !uploading && (
                  <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }} />
                )}
                <span className="relative flex items-center justify-center gap-2">
                  {uploading ? (
                    <>
                      <motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                      {uploadProgress < 1 ? `Uploading… ${Math.round(uploadProgress * 100)}%` : 'Processing…'}
                    </>
                  ) : (
                    <>Generate minutes <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" /></>
                  )}
                </span>
              </motion.button>

              {uploading && uploadProgress > 0 && uploadProgress < 1 && (
                <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'var(--input-bg)' }}>
                  <motion.div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                    style={{ width: `${uploadProgress * 100}%` }} transition={{ duration: 0.15 }} />
                </div>
              )}
            </motion.div>

            {/* Trust strip */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-6 text-xs" style={{ color: 'var(--text-3)' }}>
              {[{ icon: Lock, label: 'End-to-end encrypted' }, { icon: Zap, label: 'Results in ~2 min' }, { icon: Trash2, label: 'Deleted after 24h' }]
                .map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <Icon size={11} style={{ color: 'var(--text-3)' }} />{label}
                  </div>
                ))}
            </div>

            {/* Live translate banner */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }} className="mt-6">
              <Link to="/translator"
                className="group relative overflow-hidden flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/30 hover:from-violet-500 hover:to-indigo-500 transition-all">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/8 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <div className="relative w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                  <Languages size={18} className="text-white" />
                </div>
                <div className="relative flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">Try Live Translator</p>
                  <p className="text-xs text-violet-100/80 mt-0.5">Real-time speech translation in 30+ languages</p>
                </div>
                <ArrowRight size={15} className="relative text-white/70 group-hover:translate-x-0.5 group-hover:text-white transition-all shrink-0" />
              </Link>
            </motion.div>
          </div>

          {/* RIGHT — configuration (desktop only) */}
          <div className="hidden lg:flex lg:w-96 lg:shrink-0 flex-col lg:overflow-y-auto">
            <AnimatePresence mode="wait">
              {!file ? (
                <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center gap-4 px-6 sm:px-8 py-10 sm:py-16 text-center">
                  <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ background: 'var(--input-bg)' }}>
                    <AlignLeft size={26} style={{ color: 'var(--text-3)' }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-2)' }}>Configuration</p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>Drop a file on the left to configure your output options</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="config" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}
                  className="flex-1 px-6 py-6">

                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-7 h-7 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
                      <AlignLeft size={13} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Configure output</p>
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>Tailor the generated minutes</p>
                    </div>
                  </div>

                  <ConfigFields {...configProps} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* ── Mobile config modal (bottom sheet) ── */}
        <AnimatePresence>
          {configOpen && (
            <>
              <motion.div
                key="backdrop"
                className="fixed inset-0 z-40 lg:hidden"
                style={{ background: 'rgba(0,0,0,0.6)' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setConfigOpen(false)}
              />
              <motion.div
                key="sheet"
                className="fixed bottom-0 left-0 right-0 z-50 lg:hidden flex flex-col rounded-t-3xl overflow-hidden"
                style={{ background: 'var(--card-bg)', maxHeight: '85vh' }}
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              >
                {/* Sheet header */}
                <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--divider)' }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
                      <AlignLeft size={13} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Configure output</p>
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>Tailor the generated minutes</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfigOpen(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition"
                    style={{ background: 'var(--input-bg)', color: 'var(--text-3)' }}
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Scrollable fields */}
                <div className="overflow-y-auto flex-1 px-5 py-5">
                  <ConfigFields {...configProps} />
                </div>

                {/* Done button */}
                <div className="px-5 py-4 shrink-0" style={{ borderTop: '1px solid var(--divider)' }}>
                  <button
                    onClick={() => setConfigOpen(false)}
                    className="w-full py-3.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </main>
    </div>
  )
}
