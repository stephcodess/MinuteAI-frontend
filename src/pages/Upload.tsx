import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, FileAudio, X, AlertCircle, Lock, Zap, Trash2,
  ArrowRight, CheckCircle, Languages, ChevronDown,
  FileText, BarChart2, AlignLeft, Minimize2,
} from 'lucide-react'
import { formRequest } from '../lib/api'
import { useWorkspace } from '../context/WorkspaceContext'
import Sidebar from '../components/Sidebar'

const ACCEPTED_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/webm', 'video/mp4']
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
  { code: 'ha', name: 'Hausa'       },
  { code: 'id', name: 'Indonesian'  },
  { code: 'vi', name: 'Vietnamese'  },
  { code: 'th', name: 'Thai'        },
]

const AUDIO_LANGUAGES = [
  { code: '',   name: 'Auto-detect' },
  { code: 'en', name: 'English'     },
  { code: 'fr', name: 'French'      },
  { code: 'es', name: 'Spanish'     },
  { code: 'de', name: 'German'      },
  { code: 'it', name: 'Italian'     },
  { code: 'pt', name: 'Portuguese'  },
  { code: 'nl', name: 'Dutch'       },
  { code: 'ru', name: 'Russian'     },
  { code: 'zh', name: 'Chinese'     },
  { code: 'ja', name: 'Japanese'    },
  { code: 'ko', name: 'Korean'      },
  { code: 'ar', name: 'Arabic'      },
  { code: 'hi', name: 'Hindi'       },
  { code: 'tr', name: 'Turkish'     },
  { code: 'pl', name: 'Polish'      },
  { code: 'sv', name: 'Swedish'     },
  { code: 'uk', name: 'Ukrainian'   },
  { code: 'yo', name: 'Yoruba'      },
  { code: 'ha', name: 'Hausa'       },
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
      className={`relative flex flex-col items-start gap-2 p-3.5 rounded-2xl border-2 text-left transition-all duration-200 ${
        selected
          ? `border-transparent ring-2 ${tpl.ring} bg-gray-50 shadow-sm`
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${tpl.gradient} flex items-center justify-center shadow-sm shrink-0`}>
        <Icon size={15} className="text-white" />
      </div>
      <div>
        <p className="text-xs font-bold text-gray-800">{tpl.name}</p>
        <p className="text-[11px] text-gray-400 leading-snug mt-0.5">{tpl.desc}</p>
      </div>
      {selected && (
        <div className={`absolute top-2 right-2 w-4 h-4 rounded-full ${tpl.dot} flex items-center justify-center`}>
          <CheckCircle size={10} className="text-white" />
        </div>
      )}
    </motion.button>
  )
}

function StepIndicator({ step }: { step: number }) {
  const steps = ['Upload', 'Configure', 'Process', 'Download']
  return (
    <div className="hidden sm:flex items-center gap-3">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${i <= step ? 'text-violet-700' : 'text-gray-300'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              i < step  ? 'bg-violet-600 text-white'
              : i === step ? 'bg-violet-600 text-white'
              : 'bg-gray-100 text-gray-400'
            }`}>
              {i < step ? <CheckCircle size={11} /> : i + 1}
            </div>
            {label}
          </div>
          {i < steps.length - 1 && <div className="w-8 h-px bg-gray-200" />}
        </div>
      ))}
    </div>
  )
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-600">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none px-3.5 py-2.5 pr-9 rounded-xl border-2 border-gray-200 focus:border-violet-400 focus:outline-none focus:shadow-[0_0_0_3px_rgba(139,92,246,0.08)] text-sm text-gray-800 bg-white transition-all"
        >
          {options.map(o => (
            <option key={o.value ?? o.code} value={o.value ?? o.code}>{o.label ?? o.name}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function Upload() {
  const [file, setFile]                     = useState(null)
  const [dragging, setDragging]             = useState(false)
  const [error, setError]                   = useState(null)
  const [uploading, setUploading]           = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Config state
  const [meetingType, setMeetingType]             = useState('general')
  const [meetingTitle, setMeetingTitle]           = useState('')
  const [attendees, setAttendees]                 = useState('')
  const [audioLanguage, setAudioLanguage]         = useState('')
  const [outputLanguage, setOutputLanguage]       = useState('en')
  const [customInstructions, setCustomInstructions] = useState('')
  const [template, setTemplate]                   = useState('standard')

  const inputRef         = useRef(null)
  const navigate         = useNavigate()
  const { activeWorkspace } = useWorkspace()

  const step = uploading ? 2 : file ? 1 : 0

  function validateFile(f) {
    if (!ACCEPTED_TYPES.includes(f.type)) return 'Unsupported format. Please use MP3, MP4, M4A, WAV, or WebM.'
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

  async function handleSubmit() {
    if (!file || uploading) return
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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar active="upload" />

      <main className="min-w-0 flex-1 overflow-y-auto">

        {/* header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/80 py-4 pl-16 pr-4 backdrop-blur sm:px-6 lg:px-8">
          <div>
            <h1 className="text-lg font-bold text-gray-900">New Meeting</h1>
            <p className="text-xs text-gray-400">
              Upload a recording for {activeWorkspace?.name ?? 'your workspace'}
            </p>
          </div>
          <StepIndicator step={step} />
        </div>

        <div className="max-w-xl mx-auto px-6 py-10 space-y-5">

          {/* ── drop zone ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div
              onClick={() => !file && inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={e => { if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false) }}
              onDrop={onDrop}
              className={`relative rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer ${
                dragging
                  ? 'border-violet-500 bg-violet-50/80 shadow-2xl shadow-violet-200/60 scale-[1.01]'
                  : file
                  ? 'border-violet-300 bg-violet-50/40 cursor-default'
                  : 'border-gray-200 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-100/50 bg-white'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".mp3,.mp4,.m4a,.wav,.webm"
                className="hidden"
                onChange={e => { if (e.target.files[0]) handleFileSelect(e.target.files[0]) }}
              />
              <AnimatePresence mode="wait">
                {file ? (
                  <motion.div
                    key="file"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.25 }}
                    className="p-8"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-300/30">
                        <FileAudio className="text-white" size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate text-base mb-0.5">{file.name}</p>
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                          <span>{formatBytes(file.size)}</span>
                          <span>·</span>
                          <span className="text-violet-500 font-medium">{estimateTime(file.size)} to process</span>
                        </div>
                        <div className="mt-4"><MiniWaveform /></div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); setFile(null) }}
                        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-400 flex items-center justify-center transition-colors shrink-0"
                      >
                        <X size={15} />
                      </button>
                    </div>
                    <div className="mt-6 pt-5 border-t border-violet-100 flex items-center gap-2 text-xs text-gray-400">
                      <CheckCircle size={13} className="text-green-500" />
                      File validated — fill in the details below to generate minutes
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="py-14 px-8 text-center"
                  >
                    <IdleIcon dragging={dragging} />
                    <p className="text-lg font-semibold text-gray-800 mb-1">
                      {dragging ? 'Release to upload' : 'Drop your audio here'}
                    </p>
                    <p className="text-gray-400 text-sm mb-6">
                      or{' '}
                      <span className="text-violet-600 font-medium underline underline-offset-2 decoration-dotted">
                        click to browse
                      </span>
                    </p>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {FORMATS.map(fmt => (
                        <span key={fmt} className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-500 text-xs font-medium tracking-wide">
                          {fmt}
                        </span>
                      ))}
                      <span className="text-gray-300 text-xs">· up to 500 MB</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center gap-2.5 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm"
              >
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── config form (appears after file selected) ── */}
          <AnimatePresence>
            {file && !uploading && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.35 }}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* section header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50">
                  <div className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
                    <AlignLeft size={12} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Configure your output</p>
                    <p className="text-xs text-gray-400">Help Claude understand your meeting for a better result</p>
                  </div>
                </div>

                <div className="px-6 py-5 space-y-4">

                  {/* row 1: type + audio language */}
                  <div className="grid grid-cols-2 gap-3">
                    <SelectField
                      label="Meeting type"
                      value={meetingType}
                      onChange={setMeetingType}
                      options={MEETING_TYPES}
                    />
                    <SelectField
                      label="Audio language"
                      value={audioLanguage}
                      onChange={setAudioLanguage}
                      options={AUDIO_LANGUAGES}
                    />
                  </div>

                  {/* row 2: output language */}
                  <SelectField
                    label="Document language"
                    value={outputLanguage}
                    onChange={setOutputLanguage}
                    options={OUTPUT_LANGUAGES.map(l => ({ value: l.code, label: l.name }))}
                  />

                  {/* meeting title */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-600">
                      Meeting title
                      <span className="ml-1.5 text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={meetingTitle}
                      onChange={e => setMeetingTitle(e.target.value)}
                      placeholder="e.g. Q3 Planning Session"
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 focus:border-violet-400 focus:outline-none focus:shadow-[0_0_0_3px_rgba(139,92,246,0.08)] text-sm text-gray-800 placeholder-gray-400 transition-all"
                    />
                  </div>

                  {/* attendees */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-600">
                      Attendees
                      <span className="ml-1.5 text-gray-400 font-normal">(optional, comma-separated)</span>
                    </label>
                    <input
                      type="text"
                      value={attendees}
                      onChange={e => setAttendees(e.target.value)}
                      placeholder="e.g. Alice (PM), Bob (Engineering), Carol (Design)"
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 focus:border-violet-400 focus:outline-none focus:shadow-[0_0_0_3px_rgba(139,92,246,0.08)] text-sm text-gray-800 placeholder-gray-400 transition-all"
                    />
                  </div>

                  {/* custom instructions */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-600">
                      Custom instructions
                      <span className="ml-1.5 text-gray-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={customInstructions}
                      onChange={e => setCustomInstructions(e.target.value)}
                      placeholder="e.g. Focus on technical decisions. Ignore small talk. Highlight risks."
                      rows={2}
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 focus:border-violet-400 focus:outline-none focus:shadow-[0_0_0_3px_rgba(139,92,246,0.08)] text-sm text-gray-800 placeholder-gray-400 transition-all resize-none"
                    />
                  </div>

                  {/* template selection */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-600">Document template</label>
                    <div className="grid grid-cols-2 gap-2">
                      {TEMPLATES.map(tpl => (
                        <TemplateCard
                          key={tpl.id}
                          tpl={tpl}
                          selected={template === tpl.id}
                          onClick={() => setTemplate(tpl.id)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── submit ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
          >
            <motion.button
              onClick={handleSubmit}
              disabled={!file || uploading}
              whileHover={file && !uploading ? { scale: 1.015 } : {}}
              whileTap={file && !uploading ? { scale: 0.98 } : {}}
              className={`group relative w-full py-4 rounded-2xl font-semibold text-base transition-all duration-200 overflow-hidden ${
                file && !uploading
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-300/40 hover:shadow-xl hover:shadow-violet-400/40'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {file && !uploading && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }}
                />
              )}
              <span className="relative flex items-center justify-center gap-2">
                {uploading ? (
                  <>
                    <motion.div
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    />
                    {uploadProgress < 1 ? `Uploading… ${Math.round(uploadProgress * 100)}%` : 'Processing…'}
                  </>
                ) : (
                  <>
                    Generate minutes
                    <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </span>
            </motion.button>

            {uploading && uploadProgress > 0 && uploadProgress < 1 && (
              <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                  style={{ width: `${uploadProgress * 100}%` }}
                  transition={{ duration: 0.15 }}
                />
              </div>
            )}
          </motion.div>

          {/* live translate banner */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <Link
              to="/translator"
              className="group flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 hover:border-violet-300 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-violet-300/30">
                <Languages size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-violet-900">Live Translator</p>
                <p className="text-xs text-violet-500 mt-0.5">Translate speech from any language in real-time</p>
              </div>
              <ArrowRight size={15} className="text-violet-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </Link>
          </motion.div>

          {/* trust strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center justify-center gap-7 text-xs text-gray-400"
          >
            {[
              { icon: Lock,   label: 'End-to-end encrypted' },
              { icon: Zap,    label: 'Results in ~2 min'    },
              { icon: Trash2, label: 'Deleted after 24h'    },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon size={12} className="text-gray-300" />
                {label}
              </div>
            ))}
          </motion.div>

          <p className="text-center text-xs text-gray-300">
            We'll email you when your minutes are ready — you can close this tab
          </p>
        </div>
      </main>
    </div>
  )
}
