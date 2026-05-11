import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, FileAudio, X, AlertCircle, Lock, Zap, Trash2, ArrowRight, CheckCircle } from 'lucide-react'
import { uploadAudio } from '../lib/api'
import { useWorkspace } from '../context/WorkspaceContext'
import Sidebar from '../components/Sidebar'

const ACCEPTED_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/webm', 'video/mp4']
const MAX_SIZE_MB = 500
const FORMATS = ['MP3', 'MP4', 'M4A', 'WAV', 'WebM']

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
        className={`w-18 h-18 w-[72px] h-[72px] rounded-full flex items-center justify-center shadow-xl transition-colors duration-300 ${
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

export default function Upload() {
  const [file, setFile]                   = useState(null)
  const [dragging, setDragging]           = useState(false)
  const [error, setError]                 = useState(null)
  const [uploading, setUploading]         = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [resumable, setResumable]         = useState(null)
  const inputRef                          = useRef(null)
  const navigate                          = useNavigate()
  const { activeWorkspace }               = useWorkspace()

  function validateFile(f) {
    if (!ACCEPTED_TYPES.includes(f.type)) return 'Unsupported format. Please use MP3, MP4, M4A, WAV, or WebM.'
    if (f.size > MAX_SIZE_MB * 1024 * 1024) return `File too large — max ${MAX_SIZE_MB} MB.`
    return null
  }

  function handleFileSelect(f) {
    const err = validateFile(f)
    if (err) { setError(err); setFile(null); setResumable(null); return }
    setError(null)
    setFile(f)
    const key = `minuteai_upload_${f.name}_${f.size}`
    const saved = JSON.parse(localStorage.getItem(key) || 'null')
    if (saved?.chunksCompleted > 0 && saved?.totalChunks > 0) {
      setResumable({ percent: Math.round((saved.chunksCompleted / saved.totalChunks) * 100) })
    } else {
      setResumable(null)
    }
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
      const { jobId } = await uploadAudio(file, null, (p) => setUploadProgress(p), activeWorkspace?.id)
      navigate(`/processing/${jobId}`)
    } catch (err) {
      setError(err.message || 'Upload failed — you can retry to resume from where it stopped.')
      setUploading(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar active="upload" />

      <main className="min-w-0 flex-1 overflow-y-auto pt-16 md:pt-0">

        {/* ── header ── */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">New Meeting</h1>
            <p className="text-xs text-gray-400">
              Upload a recording for {activeWorkspace?.name ?? 'your workspace'}
            </p>
          </div>

          {/* step indicator */}
          <div className="hidden sm:flex items-center gap-3">
            {['Upload', 'Process', 'Download'].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${i === 0 ? 'text-violet-700' : 'text-gray-300'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i === 0 ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {i === 0 ? <CheckCircle size={11} /> : i + 1}
                  </div>
                  {label}
                </div>
                {i < 2 && <div className="w-8 h-px bg-gray-200" />}
              </div>
            ))}
          </div>
        </div>

        {/* ── content ── */}
        <div className="max-w-xl mx-auto px-6 py-10">

          {/* drop zone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div
              onClick={() => !file && inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false) }}
              onDrop={onDrop}
              className={`
                relative rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer
                ${dragging
                  ? 'border-violet-500 bg-violet-50/80 shadow-2xl shadow-violet-200/60 scale-[1.01]'
                  : file
                  ? 'border-violet-300 bg-violet-50/40 cursor-default'
                  : 'border-gray-200 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-100/50 bg-white'
                }
              `}
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
                      File validated — ready to generate minutes
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
                className="mt-4 flex items-center gap-2.5 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm"
              >
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* resume banner */}
          <AnimatePresence>
            {resumable && !uploading && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 flex items-center gap-2.5 text-violet-700 bg-violet-50 border border-violet-200 rounded-xl px-4 py-2.5 text-sm"
              >
                <ArrowRight size={14} className="shrink-0 text-violet-500" />
                Previous upload detected ({resumable.percent}% done) — clicking below will resume it.
              </motion.div>
            )}
          </AnimatePresence>

          {/* submit */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="mt-5"
          >
            <motion.button
              onClick={handleSubmit}
              disabled={!file || uploading}
              whileHover={file && !uploading ? { scale: 1.015 } : {}}
              whileTap={file && !uploading ? { scale: 0.98 } : {}}
              className={`
                group relative w-full py-4 rounded-2xl font-semibold text-base transition-all duration-200 overflow-hidden
                ${file && !uploading
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-300/40 hover:shadow-xl hover:shadow-violet-400/40'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }
              `}
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
                    {uploadProgress < 1
                      ? `Uploading… ${Math.round(uploadProgress * 100)}%`
                      : 'Processing…'}
                  </>
                ) : (
                  <>
                    {resumable ? 'Resume upload' : 'Generate minutes'}
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

          {/* trust strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex items-center justify-center gap-7 text-xs text-gray-400"
          >
            {[
              { icon: Lock,  label: 'End-to-end encrypted' },
              { icon: Zap,   label: 'Results in ~2 min'    },
              { icon: Trash2,label: 'Deleted after 24h'    },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon size={12} className="text-gray-300" />
                {label}
              </div>
            ))}
          </motion.div>

          <p className="text-center text-xs text-gray-300 mt-4">
            We'll email you when your minutes are ready — you can close this tab
          </p>
        </div>
      </main>
    </div>
  )
}
