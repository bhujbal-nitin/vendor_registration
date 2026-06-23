import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Box, Typography, Button, Paper, Stack, Chip, Divider,
  ThemeProvider, createTheme, CssBaseline, IconButton,
  Avatar, Tooltip, Menu, MenuItem, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Snackbar, Alert, CircularProgress,
} from '@mui/material'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import type { SvgIconComponent } from '@mui/icons-material'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#FF6B00', light: '#FF8C33', dark: '#CC5500', contrastText: '#fff' },
    secondary: { main: '#1A1A2E' },
    background: { default: '#F7F8FA', paper: '#FFFFFF' },
    text: { primary: '#1A1A2E', secondary: '#6B7280' },
    success: { main: '#059669' },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: { styleOverrides: { root: { borderRadius: 9, textTransform: 'none', fontWeight: 600 } } },
    MuiPaper: { styleOverrides: { root: { borderRadius: 12 } } },
  },
})

const SIDEBAR_FULL = 240
const SIDEBAR_MINI = 64

interface NavItem {
  label: string
  Icon: SvgIconComponent
  path: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', Icon: HomeOutlinedIcon, path: '/vendor-registration/home' },
]

interface DocDefinition {
  id: string
  label: string
  desc: string
  icon: string
  optional?: boolean
}

const DOCS: DocDefinition[] = [
  { id: 'incorporation',  label: 'Certificate of Incorporation', desc: 'ROC / MOA / AOA',     icon: '🏛️' },
  { id: 'pan',            label: 'PAN Card',                     desc: 'Company / LLP PAN',   icon: '🪪' },
  { id: 'gst',            label: 'GST Certificate',              desc: 'Form REG-06',           icon: '📋' },
  { id: 'cheque',         label: 'Cancelled Cheque',             desc: 'Active bank account',  icon: '🏦' },
  { id: 'msme',           label: 'MSME Certificate',             desc: 'Udyam Registration',   icon: '🎖️' },
  { id: 'bank_statement', label: 'Bank Statement',               desc: 'Last 6 months',        icon: '📄', optional: true },
]

interface VendorUser {
  email?: string
  user_id?: number
  registration_id?: number
  registration_no?: string
  registration_status?: string
}

interface ServerDoc {
  document_id: number
  document_type: string
  file_name: string
  file_path: string
  status: string
  ae_workflow?: { triggered: boolean; error: string | null; response?: unknown }
}

const DOC_TYPE_MAP: Record<string, string> = {
  incorporation:  'Certificate of Incorporation',
  pan:            'PAN Card',
  gst:            'GST Certificate',
  cheque:         'Cancelled Cheque',
  msme:           'MSME Certificate',
  bank_statement: 'Bank Statement',
}

const DOC_ID_BY_TYPE: Record<string, string> = Object.fromEntries(
  Object.entries(DOC_TYPE_MAP).map(([k, v]) => [v, k])
)

const fmtBytes = (b: number) =>
  b < 1_048_576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1_048_576).toFixed(1)} MB`

// ── Sidebar ──────────────────────────────────────────────────────────────
interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  return (
    <Box sx={{ width: collapsed ? SIDEBAR_MINI : SIDEBAR_FULL, height: '100vh', backgroundColor: '#1A1A2E', display: 'flex', flexDirection: 'column', flexShrink: 0, transition: 'width 0.22s ease', overflow: 'hidden' }}>
      <Box sx={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', px: collapsed ? 1 : 2.5, borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, overflow: 'hidden' }}>
        {collapsed ? (
          <Box sx={{ width: 38, height: 38, borderRadius: 2, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <Box component="img" src="/images/ae.png" alt="Logo"
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; const s = e.currentTarget.nextSibling as HTMLElement | null; if (s) s.style.display = 'block' }}
              sx={{ width: 32, height: 32, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            <Typography sx={{ display: 'none', color: '#fff', fontWeight: 800, fontSize: 15 }}>V</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <Box component="img" src="/images/ae.png" alt="Logo"
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; const s = e.currentTarget.nextSibling as HTMLElement | null; if (s) s.style.display = 'flex' }}
              sx={{ height: 38, maxWidth: 160, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            <Stack direction="row" alignItems="center" spacing={1} sx={{ display: 'none' }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 2, background: 'linear-gradient(135deg,#FF6B00,#FF8C33)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>V</Typography>
              </Box>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>Vendor Portal</Typography>
            </Stack>
          </Box>
        )}
      </Box>

      <Box sx={{ flex: 1, py: 1.5 }}>
        {NAV_ITEMS.map(({ label, Icon, path }) => {
          const active = pathname === path || path === '/vendor-registration/home'
          return (
            <Tooltip key={path} title={collapsed ? label : ''} placement="right" arrow>
              <Box onClick={() => navigate(path)} sx={{ mx: 1, mb: 0.5, px: collapsed ? 0 : 2, py: 1.2, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 1.5, cursor: 'pointer', backgroundColor: active ? '#FF6B00' : 'transparent', transition: 'background-color 0.15s', '&:hover': { backgroundColor: active ? '#FF6B00' : 'rgba(255,255,255,0.07)' } }}>
                <Icon sx={{ fontSize: 20, flexShrink: 0, color: active ? '#fff' : 'rgba(255,255,255,0.6)' }} />
                {!collapsed && <Typography sx={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#fff' : 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap' }}>{label}</Typography>}
              </Box>
            </Tooltip>
          )
        })}
      </Box>

      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', p: 1.25, display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end' }}>
        <IconButton onClick={onToggle} size="small" sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff' } }}>
          {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
        </IconButton>
      </Box>
    </Box>
  )
}

// ── Top Bar ───────────────────────────────────────────────────────────────
interface TopBarProps {
  user: VendorUser
}

function TopBar({ user }: TopBarProps) {
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const handleLogout = () => { sessionStorage.removeItem('vendor_user'); navigate('/vendor-registration') }
  return (
    <Box component="header" sx={{ height: 64, flexShrink: 0, backgroundColor: '#fff', borderBottom: '1px solid #F3F4F6', px: { xs: 2, sm: 3 }, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <Box>
        <Typography variant="subtitle1" color="text.primary" lineHeight={1.2}>Document Upload</Typography>
        <Typography variant="caption" color="text.secondary">Upload your KYC documents (all optional)</Typography>
      </Box>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Tooltip title="Notifications"><IconButton size="small" sx={{ color: '#9CA3AF' }}><NotificationsNoneIcon sx={{ fontSize: 20 }} /></IconButton></Tooltip>
        <Divider orientation="vertical" flexItem sx={{ height: 28, my: 'auto' }} />
        <Stack direction="row" alignItems="center" spacing={1} onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ cursor: 'pointer', px: 1, py: 0.5, borderRadius: 2, '&:hover': { backgroundColor: '#FFF5EE' } }}>
          <Avatar sx={{ width: 32, height: 32, background: 'linear-gradient(135deg,#FF6B00,#FF8C33)', fontSize: 13, fontWeight: 700 }}>{(user.email || 'V').charAt(0).toUpperCase()}</Avatar>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="body2" fontWeight={700} color="text.primary" lineHeight={1.2} noWrap sx={{ maxWidth: 180 }}>{user.email || '—'}</Typography>
            <Typography variant="caption" color="text.secondary" lineHeight={1}>{user.registration_status || 'Draft'}</Typography>
          </Box>
        </Stack>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} PaperProps={{ elevation: 3, sx: { borderRadius: 2, minWidth: 210, mt: 1 } }} transformOrigin={{ horizontal: 'right', vertical: 'top' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #F3F4F6' }}>
            <Typography variant="body2" fontWeight={700} noWrap>{user.email || '—'}</Typography>
            <Typography variant="caption" color="text.secondary">{user.registration_no || '—'}</Typography>
          </Box>
          <MenuItem onClick={() => setAnchorEl(null)} sx={{ gap: 1.5, py: 1.2 }}><AccountCircleOutlinedIcon fontSize="small" sx={{ color: '#FF6B00' }} /><Typography variant="body2">My Profile</Typography></MenuItem>
          <MenuItem onClick={handleLogout} sx={{ gap: 1.5, py: 1.2 }}><LogoutIcon fontSize="small" sx={{ color: '#DC2626' }} /><Typography variant="body2" color="error">Sign Out</Typography></MenuItem>
        </Menu>
      </Stack>
    </Box>
  )
}

// ── Document Card ─────────────────────────────────────────────────────────
type AnalysisStatus = 'analysing' | 'complete' | 'failed'

interface DocCardProps {
  doc: DocDefinition
  isUploaded: boolean
  isUploading: boolean
  progress: number
  file: File | undefined
  serverFileName?: string
  documentId?: number
  isLocked: boolean
  analysisStatus?: AnalysisStatus
  onFileChange: (file: File, docId: string) => void
  onRemove: (docId: string) => void
}

function DocCard({ doc, isUploaded, isUploading, progress, file, serverFileName, documentId, isLocked, analysisStatus, onFileChange, onRemove }: DocCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (!isUploaded && !isUploading && inputRef.current) {
      inputRef.current.value = ''
    }
  }, [isUploaded, isUploading])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && !isLocked) onFileChange(f, doc.id)
  }, [doc.id, onFileChange, isLocked])

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!documentId) return
    try {
      const res = await fetch(`/api/documents/${documentId}/download/`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = serverFileName || file?.name || 'document'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // fallback: open in new tab if blob fetch fails
      window.open(`/api/documents/${documentId}/download/`, '_blank')
    }
  }

  const borderColor = isUploaded
    ? (isLocked ? '#BFDBFE' : '#A7F3D0')
    : (dragging ? '#FF6B00' : '#F3F4F6')
  const bgColor = isUploaded
    ? (isLocked ? '#F0F7FF' : '#F0FDF9')
    : (dragging ? '#FFF8F4' : (isLocked ? '#F9FAFB' : '#fff'))

  return (
    <Paper
      elevation={0}
      onDrop={isLocked ? undefined : handleDrop}
      onDragOver={isLocked ? undefined : (e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={isLocked ? undefined : () => setDragging(false)}
      onClick={isLocked ? undefined : () => !isUploaded && !isUploading && inputRef.current?.click()}
      sx={{
        border: `${isUploaded ? '1.5px' : (dragging ? '2px dashed' : '1px')} solid ${borderColor}`,
        backgroundColor: bgColor,
        cursor: (isLocked || isUploaded || isUploading) ? 'default' : 'pointer',
        transition: 'all 0.2s',
        overflow: 'hidden',
        height: '100%',
        display: 'flex', flexDirection: 'column',
        '&:hover': (!isLocked && !isUploaded && !isUploading) ? { borderColor: '#FF6B00', backgroundColor: '#FFF8F4', boxShadow: '0 4px 16px rgba(255,107,0,0.08)' } : {},
      }}
    >
      {!isLocked && (
        <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && onFileChange(e.target.files[0], doc.id)} />
      )}

      <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: '1px solid', borderColor: isUploaded ? (isLocked ? '#BFDBFE' : '#D1FAE5') : '#F3F4F6' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 34, height: 34, borderRadius: 2, backgroundColor: isUploaded ? (isLocked ? '#DBEAFE' : '#D1FAE5') : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
              {doc.icon}
            </Box>
            <Box>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#1A1A2E', lineHeight: 1.3 }}>{doc.label}</Typography>
              <Typography sx={{ fontSize: 11, color: '#9CA3AF' }}>{doc.desc}</Typography>
            </Box>
          </Stack>
          {isUploaded
            ? <CheckCircleIcon sx={{ color: isLocked ? '#3B82F6' : '#059669', fontSize: 18, flexShrink: 0 }} />
            : isLocked
              ? <LockOutlinedIcon sx={{ fontSize: 16, color: '#D1D5DB', flexShrink: 0 }} />
              : null
          }
        </Stack>
      </Box>

      <Box sx={{ px: 2, py: 1.5, flex: 1, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        {isUploaded && (
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1, flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <InsertDriveFileOutlinedIcon sx={{ fontSize: 18, color: isLocked ? '#3B82F6' : '#059669', flexShrink: 0 }} />
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#1A1A2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file?.name ?? serverFileName}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
              {isLocked ? (
                <Tooltip title="Download document">
                  <IconButton size="small" onClick={handleDownload}
                    sx={{ color: '#3B82F6', p: 0.4, '&:hover': { backgroundColor: '#EFF6FF' } }}>
                    <DownloadOutlinedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              ) : (
                <>
                  <Typography sx={{ fontSize: 11, color: '#9CA3AF' }}>{file ? fmtBytes(file.size) : ''}</Typography>
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); onRemove(doc.id) }}
                    sx={{ color: '#DC2626', p: 0.4, '&:hover': { backgroundColor: '#FEF2F2' } }}>
                    <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </>
              )}
            </Box>
          </Box>
        )}

        {isUploading && (
          <Box width="100%">
            <Stack direction="row" justifyContent="space-between" mb={0.75}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#FF6B00' }}>Uploading...</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#FF6B00' }}>{progress}%</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 5, borderRadius: 3, backgroundColor: '#FFE8D5', '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg,#FF6B00,#FF8C33)', borderRadius: 3 } }} />
          </Box>
        )}

        {!isUploaded && !isUploading && (
          isLocked ? (
            <Stack direction="row" alignItems="center" spacing={1}>
              <LockOutlinedIcon sx={{ fontSize: 16, color: '#D1D5DB' }} />
              <Typography sx={{ fontSize: 12, color: '#D1D5DB' }}>No document uploaded</Typography>
            </Stack>
          ) : (
            <Stack direction="row" alignItems="center" justifyContent="space-between" width="100%" spacing={1}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <CloudUploadOutlinedIcon sx={{ fontSize: 18, color: '#D1D5DB' }} />
                <Typography sx={{ fontSize: 12, color: '#9CA3AF' }}>
                  Drop file or <Box component="span" sx={{ color: '#FF6B00', fontWeight: 600 }}>browse</Box>
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: 10, color: '#D1D5DB', whiteSpace: 'nowrap' }}>PDF · PNG · JPG</Typography>
            </Stack>
          )
        )}
      </Box>

      {analysisStatus && (
        <Stack direction="row" sx={{ alignItems: 'center', px: 2, py: 0.75, borderTop: '1px solid', borderColor: analysisStatus === 'complete' ? '#D1FAE5' : analysisStatus === 'failed' ? '#FDE68A' : '#FFE8D5', backgroundColor: analysisStatus === 'complete' ? '#F0FDF9' : analysisStatus === 'failed' ? '#FFFBEB' : '#FFF8F4' }} spacing={0.75}>
          {analysisStatus === 'analysing' && (
            <><CircularProgress size={10} sx={{ color: '#FF6B00' }} /><Typography sx={{ fontSize: 11, color: '#FF6B00' }}>Analysing...</Typography></>
          )}
          {analysisStatus === 'complete' && (
            <><CheckCircleOutlinedIcon sx={{ fontSize: 13, color: '#059669' }} /><Typography sx={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>Analysis complete</Typography></>
          )}
          {analysisStatus === 'failed' && (
            <><WarningAmberOutlinedIcon sx={{ fontSize: 13, color: '#D97706' }} /><Typography sx={{ fontSize: 11, color: '#D97706' }}>Failed to analyse</Typography></>
          )}
        </Stack>
      )}
    </Paper>
  )
}

const LOCKED_STATUSES = ['Submitted', 'Under Review', 'Resubmitted', 'Approved', 'Rejected', 'Tally Sync Pending', 'Completed']

// ── Main Page ─────────────────────────────────────────────────────────────
export default function DocumentUpload() {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [files, setFiles] = useState<Record<string, File>>({})
  const [uploading, setUploading] = useState<Record<string, number>>({})
  const [serverDocs, setServerDocs] = useState<Record<string, ServerDoc>>({})
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({})
  const [confirmFormOpen, setConfirmFormOpen]   = useState(false)
  const [wfWarning, setWfWarning]               = useState('')
  const [awaitingAnalysis, setAwaitingAnalysis] = useState(false)

  const [docAnalysis, setDocAnalysis] = useState<Record<string, { requestId: number; status: AnalysisStatus }>>({})
  const pollTimers    = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const docAnalysisRef = useRef(docAnalysis)
  useEffect(() => { docAnalysisRef.current = docAnalysis }, [docAnalysis])

  const user: VendorUser = JSON.parse(sessionStorage.getItem('vendor_user') || '{}')
  useEffect(() => { if (!user.email) navigate('/vendor-registration', { replace: true }) }, [user.email, navigate])

  // Cleanup polling timers on unmount
  useEffect(() => () => { Object.values(pollTimers.current).forEach(clearTimeout) }, [])

  // Navigate once all docs finish analysing (or 60s timeout from "continue" click)
  useEffect(() => {
    if (!awaitingAnalysis) return
    const start = Date.now()
    const check = setInterval(() => {
      const anyPending = Object.values(docAnalysisRef.current).some(d => d.status === 'analysing')
      if (!anyPending || Date.now() - start > 60_000) {
        clearInterval(check)
        setAwaitingAnalysis(false)
        navigate('/vendor-registration/form')
      }
    }, 500)
    return () => clearInterval(check)
  }, [awaitingAnalysis, navigate])

  // Load previously uploaded documents on mount
  useEffect(() => {
    if (!user.registration_id) return
    fetch(`/api/documents/?registration_id=${user.registration_id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: ServerDoc[]) => {
        const map: Record<string, ServerDoc> = {}
        data.forEach((doc) => {
          const localId = DOC_ID_BY_TYPE[doc.document_type]
          if (localId) map[localId] = doc
        })
        setServerDocs(map)
      })
      .catch(() => { /* ignore on load failure */ })
  }, [user.registration_id])

  const handleFileChange = useCallback((file: File, docId: string) => {
    setUploadErrors((prev) => { const s = { ...prev }; delete s[docId]; return s })
    setUploading((prev) => ({ ...prev, [docId]: 0 }))

    const formData = new FormData()
    formData.append('file', file)
    formData.append('document_type', DOC_TYPE_MAP[docId])
    formData.append('registration_id', String(user.registration_id ?? ''))
    formData.append('uploaded_by', String(user.user_id ?? ''))

    const xhr = new XMLHttpRequest()

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.min(Math.floor((e.loaded / e.total) * 100), 99)
        setUploading((prev) => ({ ...prev, [docId]: pct }))
      }
    }

    xhr.onload = () => {
      setUploading((prev) => { const s = { ...prev }; delete s[docId]; return s })
      if (xhr.status === 200 || xhr.status === 201) {
        const data: ServerDoc = JSON.parse(xhr.responseText)
        setFiles((prev) => ({ ...prev, [docId]: file }))
        setServerDocs((prev) => ({ ...prev, [docId]: data }))
        // AE workflow warning (agent not running, etc.)
        if (data.ae_workflow && !data.ae_workflow.triggered && data.ae_workflow.error) {
          setWfWarning(data.ae_workflow.error)
        }

        // Start polling workflow status if triggered
        const requestId = (data.ae_workflow?.response as { automationRequestId?: number })?.automationRequestId
        if (data.ae_workflow?.triggered && requestId) {
          setDocAnalysis(prev => ({ ...prev, [docId]: { requestId, status: 'analysing' } }))
          startPolling(docId, requestId)
        }
      } else {
        let msg = 'Upload failed. Please try again.'
        try { msg = JSON.parse(xhr.responseText).detail ?? msg } catch { /* ignore */ }
        setUploadErrors((prev) => ({ ...prev, [docId]: msg }))
      }
    }

    xhr.onerror = () => {
      setUploading((prev) => { const s = { ...prev }; delete s[docId]; return s })
      setUploadErrors((prev) => ({ ...prev, [docId]: 'Network error. Please try again.' }))
    }

    xhr.open('POST', '/api/documents/upload')
    xhr.send(formData)
  }, [user.registration_id])

  const startPolling = useCallback((docId: string, requestId: number) => {
    clearTimeout(pollTimers.current[docId])
    const startTime = Date.now()
    const tick = async () => {
      if (Date.now() - startTime > 60_000) {
        setDocAnalysis(prev => ({ ...prev, [docId]: { requestId, status: 'failed' } }))
        return
      }
      try {
        const res  = await fetch(`/api/ae/workflow-status/${requestId}/`)
        const json = await res.json()
        if (json.complete) {
          setDocAnalysis(prev => ({ ...prev, [docId]: { requestId, status: 'complete' } }))
        } else if (json.failed) {
          setDocAnalysis(prev => ({ ...prev, [docId]: { requestId, status: 'failed' } }))
        } else {
          pollTimers.current[docId] = setTimeout(tick, 3000)
        }
      } catch {
        pollTimers.current[docId] = setTimeout(tick, 3000)
      }
    }
    tick()
  }, [])

  const handleRemove = useCallback((docId: string) => {
    const doc = serverDocs[docId]
    if (doc) {
      fetch(`/api/documents/${doc.document_id}/`, { method: 'DELETE' }).catch(() => { /* best-effort */ })
    }
    clearTimeout(pollTimers.current[docId])
    setFiles((prev)        => { const s = { ...prev }; delete s[docId]; return s })
    setServerDocs((prev)   => { const s = { ...prev }; delete s[docId]; return s })
    setUploadErrors((prev) => { const s = { ...prev }; delete s[docId]; return s })
    setDocAnalysis((prev)  => { const s = { ...prev }; delete s[docId]; return s })
  }, [serverDocs])

  const isDocDone = (docId: string) => !!files[docId] || !!serverDocs[docId]
  const uploadedCount = DOCS.filter((d) => isDocDone(d.id)).length
  const allUploaded = uploadedCount === DOCS.length
  const isSentBack = (user.registration_status || '') === 'Sent Back'
  const isStatusLocked = LOCKED_STATUSES.includes(user.registration_status || '')
  // Lock only when submission status prevents changes (not based on upload count)
  const isLocked = !isSentBack && isStatusLocked

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#F7F8FA' }}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <TopBar user={user} />

          <Box sx={{ flex: 1, overflow: 'hidden', px: { xs: 2, md: 3 }, py: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <UploadFileOutlinedIcon sx={{ color: '#FF6B00', fontSize: 22 }} />
                <Typography variant="h6" color="text.primary">KYC Document Verification</Typography>
                {isLocked
                  ? <Chip icon={<LockOutlinedIcon sx={{ fontSize: '13px !important' }} />} label="View Only" size="small" sx={{ backgroundColor: '#F0F7FF', color: '#1D4ED8', border: '1px solid #BFDBFE', fontWeight: 700, fontSize: 11 }} />
                  : <Chip label="All Optional" size="small" sx={{ backgroundColor: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB', fontWeight: 700, fontSize: 11 }} />
                }
              </Stack>
              <Typography variant="caption" color="text.secondary">Accepted: PDF, JPEG, PNG · Max 10 MB each</Typography>
            </Stack>

            <Box sx={{ flex: 1, display: 'flex', gap: 2.5, overflow: 'hidden', minHeight: 0 }}>
              <Box sx={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'repeat(3, 1fr)', gap: 1.5 }}>
                {DOCS.map((doc, idx) => {
                  const isUploaded = isDocDone(doc.id)
                  const isUploading = uploading[doc.id] !== undefined
                  return (
                    <Box key={doc.id}>
                      <DocCard
                        doc={doc}
                        isUploaded={isUploaded}
                        isUploading={isUploading}
                        progress={uploading[doc.id] ?? 0}
                        file={files[doc.id]}
                        serverFileName={serverDocs[doc.id]?.file_name}
                        documentId={serverDocs[doc.id]?.document_id}
                        isLocked={isLocked}
                        analysisStatus={docAnalysis[doc.id]?.status}
                        onFileChange={handleFileChange}
                        onRemove={handleRemove}
                      />
                      {uploadErrors[doc.id] && (
                        <Typography sx={{ fontSize: 11, color: '#DC2626', mt: 0.5, px: 0.5 }}>
                          {uploadErrors[doc.id]}
                        </Typography>
                      )}
                    </Box>
                  )
                })}
              </Box>

              <Paper elevation={0} sx={{ width: 260, flexShrink: 0, border: '1px solid #F3F4F6', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #F3F4F6', background: 'linear-gradient(135deg,#FFF8F3,#fff)' }}>
                  <Typography variant="subtitle2" color="text.primary" mb={1.5}>Upload Progress</Typography>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.75}>
                    <Typography sx={{ fontSize: 12, color: '#6B7280' }}>Documents uploaded</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: allUploaded ? '#059669' : '#FF6B00' }}>{uploadedCount} / {DOCS.length}</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={(uploadedCount / DOCS.length) * 100}
                    sx={{ height: 7, borderRadius: 4, backgroundColor: '#F3F4F6', '& .MuiLinearProgress-bar': { background: allUploaded ? 'linear-gradient(90deg,#059669,#34D399)' : 'linear-gradient(90deg,#FF6B00,#FF8C33)', borderRadius: 4, transition: 'width 0.5s ease' } }} />
                </Box>

                <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 1.5 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.6, mb: 1 }}>Checklist</Typography>
                  <Stack spacing={1}>
                    {DOCS.map((doc) => {
                      const done = isDocDone(doc.id)
                      return (
                        <Stack key={doc.id} direction="row" alignItems="center" spacing={1.5}>
                          {done
                            ? <CheckCircleIcon sx={{ fontSize: 16, color: '#059669', flexShrink: 0 }} />
                            : <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: '#D1D5DB', flexShrink: 0 }} />}
                          <Typography sx={{ fontSize: 12.5, color: done ? '#059669' : '#6B7280', fontWeight: done ? 600 : 400, lineHeight: 1.3 }}>{doc.label}</Typography>
                        </Stack>
                      )
                    })}
                  </Stack>
                </Box>

                <Divider />

                <Box sx={{ px: 2.5, py: 2 }}>
                  {isLocked ? (
                    <Box sx={{ mb: 1.5, p: 1.25, borderRadius: 2, backgroundColor: '#F0F7FF', border: '1px solid #BFDBFE' }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <LockOutlinedIcon sx={{ color: '#3B82F6', fontSize: 17 }} />
                        <Typography sx={{ fontSize: 12, color: '#1D4ED8', fontWeight: 600 }}>Documents locked — view only</Typography>
                      </Stack>
                    </Box>
                  ) : allUploaded ? (
                    <Box sx={{ mb: 1.5, p: 1.25, borderRadius: 2, backgroundColor: '#F0FDF9', border: '1px solid #A7F3D0' }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <CheckCircleOutlinedIcon sx={{ color: '#059669', fontSize: 18 }} />
                        <Typography sx={{ fontSize: 12, color: '#065F46', fontWeight: 600 }}>All documents uploaded!</Typography>
                      </Stack>
                    </Box>
                  ) : (
                    <Typography sx={{ fontSize: 11.5, color: '#9CA3AF', mb: 1.5, lineHeight: 1.5 }}>
                      Documents are optional. You can proceed to the form at any time.
                    </Typography>
                  )}

                  <Button fullWidth variant="contained" endIcon={<ArrowForwardIcon />}
                    onClick={() => setConfirmFormOpen(true)}
                    sx={{ py: 1.2, fontSize: 13, background: 'linear-gradient(135deg,#FF6B00,#FF8C33)', color: '#fff', boxShadow: '0 4px 16px rgba(255,107,0,0.25)', '&:hover': { background: 'linear-gradient(135deg,#E55A00,#FF6B00)' } }}>
                    {isStatusLocked ? 'View Registration Form' : 'Next: Registration Form'}
                  </Button>

                  <Typography sx={{ fontSize: 10.5, color: '#D1D5DB', mt: 1.5, textAlign: 'center' }}>
                    🔒 256-bit SSL · SOC 2 Compliant
                  </Typography>
                </Box>
              </Paper>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Confirmation dialog — shown before navigating to the registration form */}
      <Dialog open={confirmFormOpen} onClose={() => setConfirmFormOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 0.5 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 2, backgroundColor: '#F0FDF9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <WarningAmberOutlinedIcon sx={{ color: '#059669', fontSize: 20 }} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#1A1A2E' }}>
            {isStatusLocked ? 'View Registration Form' : 'Proceed to Registration Form?'}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pb: 1 }}>
          {isStatusLocked ? (
            <DialogContentText sx={{ fontSize: 13.5, color: '#374151', lineHeight: 1.6 }}>
              Your registration form has already been submitted. You can view the filled details in read-only mode.
            </DialogContentText>
          ) : (
            <>
              <DialogContentText sx={{ fontSize: 13.5, color: '#374151', lineHeight: 1.6 }}>
                All <strong>{DOCS.length} documents</strong> are uploaded and saved. You're ready to fill the registration form.
              </DialogContentText>
              <DialogContentText sx={{ fontSize: 12, color: '#6B7280', mt: 1.5, p: 1.5, backgroundColor: '#F9FAFB', borderRadius: 2, border: '1px solid #F3F4F6' }}>
                Once the registration form is submitted, documents will be locked and cannot be changed.
              </DialogContentText>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
          <Button variant="outlined" onClick={() => setConfirmFormOpen(false)} fullWidth
            sx={{ borderColor: '#E5E7EB', color: '#374151', '&:hover': { borderColor: '#9CA3AF', backgroundColor: '#F9FAFB' } }}>
            Stay Here
          </Button>
          <Button variant="contained" onClick={() => {
            setConfirmFormOpen(false)
            const anyAnalysing = Object.values(docAnalysis).some(d => d.status === 'analysing')
            if (anyAnalysing) {
              setAwaitingAnalysis(true)  // effect will navigate once done / 60s
            } else {
              navigate('/vendor-registration/form')
            }
          }} fullWidth
            sx={{ background: 'linear-gradient(135deg,#059669,#10B981)', boxShadow: '0 4px 16px rgba(5,150,105,0.25)', '&:hover': { background: 'linear-gradient(135deg,#047857,#059669)' } }}>
            {isStatusLocked ? 'View Form' : 'Continue to Form'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Awaiting analysis dialog — shown when continuing to form while docs are still being analysed */}
      <Dialog open={awaitingAnalysis} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogContent sx={{ textAlign: 'center', py: 5, px: 4 }}>
          <CircularProgress size={44} sx={{ color: '#FF6B00', mb: 2.5 }} />
          <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#1A1A2E', mb: 1 }}>
            Analysing your documents
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7 }}>
            Please wait while we process your documents.<br />
            This may take up to a minute.
          </Typography>
        </DialogContent>
      </Dialog>

      {/* AE workflow warning — shown when agent is not running or workflow failed to trigger */}
      <Snackbar
        open={!!wfWarning}
        autoHideDuration={8000}
        onClose={() => setWfWarning('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity="warning"
          onClose={() => setWfWarning('')}
          sx={{ width: '100%', borderRadius: 2, fontSize: 13 }}
        >
          <strong>OCR workflow not triggered</strong> — {wfWarning}
        </Alert>
      </Snackbar>

    </ThemeProvider>
  )
}
