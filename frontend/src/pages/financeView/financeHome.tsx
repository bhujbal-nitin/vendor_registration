import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Typography, Button, Paper, Stack, Chip, Divider,
  ThemeProvider, createTheme, CssBaseline, IconButton,
  Avatar, Tooltip, Menu, MenuItem, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TablePagination,
  TextField, InputAdornment, LinearProgress, Badge,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  CircularProgress, Alert, Select, Snackbar,
} from '@mui/material'
import type { SvgIconProps } from '@mui/material'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined'
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import SearchIcon from '@mui/icons-material/Search'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import FingerprintIcon from '@mui/icons-material/Fingerprint'
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined'
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import ContactsOutlinedIcon from '@mui/icons-material/ContactsOutlined'
import CloseIcon from '@mui/icons-material/Close'
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined'
import ReplyOutlinedIcon from '@mui/icons-material/ReplyOutlined'
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import FitScreenIcon from '@mui/icons-material/FitScreen'
import SummarizeOutlinedIcon from '@mui/icons-material/SummarizeOutlined'
import CompareArrowsOutlinedIcon from '@mui/icons-material/CompareArrowsOutlined'
import type { SvgIconComponent } from '@mui/icons-material'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#FF6B00', light: '#FF8C33', dark: '#CC5500', contrastText: '#fff' },
    secondary: { main: '#1A1A2E' },
    background: { default: '#F7F8FA', paper: '#FFFFFF' },
    text: { primary: '#1A1A2E', secondary: '#6B7280' },
    success: { main: '#059669' },
    warning: { main: '#D97706' },
    error: { main: '#DC2626' },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: { styleOverrides: { root: { borderRadius: 9, textTransform: 'none', fontWeight: 600 } } },
    MuiPaper: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 700, color: '#1A1A2E', backgroundColor: '#FFF8F3', fontSize: '0.8rem' },
        body: { fontSize: '0.875rem' },
      },
    },
  },
})

const SIDEBAR_FULL = 240
const SIDEBAR_MINI = 64

type SectionId = 'dashboard' | 'registrations' | 'approvals' | 'documents'

// All statuses the system can produce
type RegistrationStatus = 'DRAFT' | 'DOCUMENT_UPLOADED' | 'SUBMITTED' | 'UNDER_REVIEW' |
  'SEND_BACK' | 'RESUBMITTED' | 'APPROVED' | 'REJECTED'

// ── API Types ─────────────────────────────────────────────────────────────
interface ApiRegistration {
  registration_id: number
  registration_no: string
  registration_status: RegistrationStatus
  vendor_name: string
  pan_number: string
  email: string
  mobile: string
  submitted_date: string
  created_date: string
  document_count: number
  gstin: string
  address: string
}

interface ApiDocument {
  document_id: number
  document_type: string
  file_name: string
  status: string
}

interface ApiRegistrationDetail extends ApiRegistration {
  goods_description: string
  bank_name: string
  bank_account_no: string
  bank_ifsc: string
  bank_branch: string
  account_type: string
  account_holder_name: string
  contact_person: string
  designation: string
  documents: ApiDocument[]
}

// Ordered list of expected KYC document types
const KYC_DOC_TYPES = [
  'Certificate of Incorporation',
  'PAN Card',
  'GST Certificate',
  'Cancelled Cheque',
  'MSME Certificate',
  'Bank Statement',
]

interface NavItem {
  id: SectionId
  label: string
  Icon: SvgIconComponent
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',     label: 'Dashboard',         Icon: DashboardOutlinedIcon },
  { id: 'registrations', label: 'All Registrations', Icon: PeopleAltOutlinedIcon },
  { id: 'approvals',     label: 'Pending Approvals', Icon: PendingActionsOutlinedIcon },
  { id: 'documents',     label: 'Document Review',   Icon: FolderOpenOutlinedIcon },
]

const STATUS_CFG: Record<string, { bg: string; color: string; border: string; label: string }> = {
  DRAFT:             { bg: '#F3F4F6', color: '#6B7280',  border: '#D1D5DB', label: 'Draft' },
  DOCUMENT_UPLOADED: { bg: '#EFF6FF', color: '#2563EB',  border: '#BFDBFE', label: 'Documents Uploaded' },
  SUBMITTED:         { bg: '#FFF8F3', color: '#FF6B00',  border: '#FFD4B0', label: 'Submitted' },
  UNDER_REVIEW:      { bg: '#FFFBEB', color: '#D97706',  border: '#FDE68A', label: 'Under Review' },
  SEND_BACK:         { bg: '#FFF5F5', color: '#C2410C',  border: '#FDBA74', label: 'Sent Back' },
  RESUBMITTED:       { bg: '#F0F7FF', color: '#2563EB',  border: '#BFDBFE', label: 'Resubmitted' },
  APPROVED:          { bg: '#F0FFF4', color: '#16A34A',  border: '#BBF7D0', label: 'Approved' },
  REJECTED:          { bg: '#FFF5F5', color: '#DC2626',  border: '#FCA5A5', label: 'Rejected' },
}

function StatusChip({ status }: { status: string }) {
  const c = STATUS_CFG[status] ?? STATUS_CFG.DRAFT
  return (
    <Chip label={c?.label ?? status} size="small"
      sx={{ backgroundColor: c.bg, color: c.color, border: `1px solid ${c.border}`, fontWeight: 700, fontSize: '0.72rem', height: 22 }} />
  )
}

// Statuses that need a finance review action
const PENDING_REVIEW_STATUSES: RegistrationStatus[] = ['SUBMITTED', 'RESUBMITTED']

// ── Sidebar ───────────────────────────────────────────────────────────────
function Sidebar({ active, onSelect, collapsed, onToggle, pendingCount }: {
  active: SectionId; onSelect: (id: SectionId) => void
  collapsed: boolean; onToggle: () => void; pendingCount: number
}) {
  return (
    <Box sx={{ width: collapsed ? SIDEBAR_MINI : SIDEBAR_FULL, height: '100vh', flexShrink: 0, backgroundColor: '#1A1A2E', display: 'flex', flexDirection: 'column', transition: 'width 0.22s ease', overflow: 'hidden' }}>
      <Box sx={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', px: collapsed ? 1 : 2.5, borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, overflow: 'hidden' }}>
        {collapsed ? (
          <Box sx={{ width: 38, height: 38, borderRadius: 2, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <Box component="img" src="/images/ae.png" alt="Logo"
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; const s = e.currentTarget.nextSibling as HTMLElement | null; if (s) s.style.display = 'block' }}
              sx={{ width: 32, height: 32, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            <Typography sx={{ display: 'none', color: '#fff', fontWeight: 800, fontSize: 15 }}>F</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <Box component="img" src="/images/ae.png" alt="Logo"
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; const s = e.currentTarget.nextSibling as HTMLElement | null; if (s) s.style.display = 'flex' }}
              sx={{ height: 38, maxWidth: 160, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            <Stack direction="row" alignItems="center" spacing={1} sx={{ display: 'none' }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 2, background: 'linear-gradient(135deg,#FF6B00,#FF8C33)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>F</Typography>
              </Box>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>Finance Portal</Typography>
            </Stack>
          </Box>
        )}
      </Box>

      {!collapsed && (
        <Typography sx={{ px: 2.5, pt: 2, pb: 0.5, color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Finance Admin
        </Typography>
      )}

      <Box sx={{ flex: 1, py: 0.5 }}>
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = active === id
          const badge = id === 'approvals' ? pendingCount : 0
          return (
            <Tooltip key={id} title={collapsed ? label : ''} placement="right" arrow>
              <Box onClick={() => onSelect(id)} sx={{ mx: 1, mb: 0.5, px: collapsed ? 0 : 2, py: 1.2, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 1.5, cursor: 'pointer', backgroundColor: isActive ? '#FF6B00' : 'transparent', transition: 'background-color 0.15s', '&:hover': { backgroundColor: isActive ? '#FF6B00' : 'rgba(255,255,255,0.07)' } }}>
                {badge > 0 && collapsed
                  ? <Badge variant="dot" color="error"><Icon sx={{ fontSize: 20, color: isActive ? '#fff' : 'rgba(255,255,255,0.6)' }} /></Badge>
                  : badge > 0
                    ? <Badge badgeContent={badge} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 15, minWidth: 15 } }}><Icon sx={{ fontSize: 20, color: isActive ? '#fff' : 'rgba(255,255,255,0.6)' }} /></Badge>
                    : <Icon sx={{ fontSize: 20, flexShrink: 0, color: isActive ? '#fff' : 'rgba(255,255,255,0.6)' }} />
                }
                {!collapsed && (
                  <Typography sx={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? '#fff' : 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap' }}>{label}</Typography>
                )}
              </Box>
            </Tooltip>
          )
        })}
      </Box>

      {!collapsed && (
        <Box sx={{ mx: 1, mb: 1, px: 1.5, py: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar sx={{ width: 32, height: 32, background: 'linear-gradient(135deg,#FF6B00,#FF8C33)', fontSize: 12, fontWeight: 700 }}>FA</Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Finance Admin</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>Super Admin</Typography>
            </Box>
          </Stack>
        </Box>
      )}

      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', p: 1.25, display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end', backgroundColor: 'rgba(255,255,255,0.05)' }}>
        <IconButton onClick={onToggle} size="small" sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff' } }}>
          {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
        </IconButton>
      </Box>
    </Box>
  )
}

// ── Top Bar ───────────────────────────────────────────────────────────────
function TopBar({ title, subtitle, onRefresh, refreshing }: {
  title: string; subtitle: string; onRefresh: () => void; refreshing: boolean
}) {
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  return (
    <Box component="header" sx={{ height: 64, flexShrink: 0, backgroundColor: '#fff', borderBottom: '1px solid #F3F4F6', px: { xs: 2, sm: 3 }, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <Box>
        <Typography variant="subtitle1" color="text.primary" sx={{ lineHeight: 1.2 }}>{title}</Typography>
        <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
      </Box>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Tooltip title="Refresh data">
          <IconButton size="small" onClick={onRefresh} disabled={refreshing} sx={{ color: '#9CA3AF' }}>
            {refreshing
              ? <CircularProgress size={16} sx={{ color: '#FF6B00' }} />
              : <RefreshOutlinedIcon sx={{ fontSize: 20 }} />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Notifications">
          <IconButton size="small" sx={{ color: '#9CA3AF' }}>
            <NotificationsNoneIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
        <Divider orientation="vertical" flexItem sx={{ height: 28, my: 'auto' }} />
        <Stack direction="row" alignItems="center" spacing={1} onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ cursor: 'pointer', px: 1, py: 0.5, borderRadius: 2, '&:hover': { backgroundColor: '#FFF5EE' } }}>
          <Avatar sx={{ width: 32, height: 32, background: 'linear-gradient(135deg,#FF6B00,#FF8C33)', fontSize: 13, fontWeight: 700 }}>FA</Avatar>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ lineHeight: 1.2 }}>Finance Admin</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>Super Admin</Typography>
          </Box>
        </Stack>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
          PaperProps={{ elevation: 3, sx: { borderRadius: 2, minWidth: 200, mt: 1 } }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #F3F4F6' }}>
            <Typography variant="body2" fontWeight={700}>Finance Admin</Typography>
            <Typography variant="caption" color="text.secondary">finance@automationedge.ai</Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => navigate('/vendor-registration')} sx={{ gap: 1.5, py: 1.2 }}>
            <LogoutIcon fontSize="small" sx={{ color: '#DC2626' }} />
            <Typography variant="body2" color="error">Sign Out</Typography>
          </MenuItem>
        </Menu>
      </Stack>
    </Box>
  )
}

// ── Info Card ─────────────────────────────────────────────────────────────
function InfoCard({ icon: Icon, label, value, color = '#FF6B00' }: {
  icon: React.ComponentType<SvgIconProps>; label: string; value: string | number; color?: string
}) {
  return (
    <Paper elevation={0} sx={{ flex: 1, minWidth: 180, p: 2.5, border: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ width: 44, height: 44, borderRadius: 2, backgroundColor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon sx={{ color, fontSize: 22 }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</Typography>
        <Typography variant="subtitle1" color="text.primary" noWrap>{value}</Typography>
      </Box>
    </Paper>
  )
}

// ── Field Row (used inside dialogs) ──────────────────────────────────────
function FieldRow({ label, value, mono, onView }: {
  label: string; value: string; mono?: boolean; onView?: () => void
}) {
  return (
    <Box sx={{ py: 1, borderBottom: '1px solid #F9FAFB', '&:last-child': { borderBottom: 'none' } }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={0.5}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.25 }}>{label}</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: value ? '#1A1A2E' : '#D1D5DB', fontFamily: mono ? 'monospace' : 'inherit', letterSpacing: mono ? '0.04em' : 0 }}>
            {value || '—'}
          </Typography>
        </Box>
        {onView && (
          <Tooltip title="View source document" placement="left">
            <IconButton size="small" onClick={onView}
              sx={{ p: 0.4, mt: 1.75, flexShrink: 0, color: '#C4C4C4', '&:hover': { color: '#FF6B00', backgroundColor: '#FFF5EE' } }}>
              <VisibilityOutlinedIcon sx={{ fontSize: 13 }} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Box>
  )
}

// ── OCR Extraction Analysis Dialog ────────────────────────────────────────
const DOC_ABBREV: Record<string, string> = {
  'Certificate of Incorporation': 'COI',
  'PAN Card':                     'PAN Card',
  'GST Certificate':              'GST Cert.',
  'Cancelled Cheque':             'Cheque',
  'MSME Certificate':             'MSME',
}

const MONO_FIELDS = new Set(['PAN Number', 'GSTIN', 'IFSC Code', 'Account Number', 'CIN', 'Udyam Number'])

interface AnalysisField {
  label: string
  values: Record<string, string>
  all_match: boolean
  has_conflict: boolean
}
interface AnalysisData {
  document_types: string[]
  fields: AnalysisField[]
}

interface FormAnalysisField {
  label: string
  submitted: string
  extracted: string
  match: boolean | null   // null = one side missing
  mono: boolean
}
interface FormAnalysisData {
  fields: FormAnalysisField[]
}

function ExtractionAnalysisDialog({ registrationId, open, onClose }: {
  registrationId: number | null; open: boolean; onClose: () => void
}) {
  const [data, setData]       = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(false)

  useEffect(() => {
    if (!open || !registrationId) return
    setLoading(true)
    setError(false)
    fetch(`/api/finance/registrations/${registrationId}/extraction-analysis/`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d: AnalysisData) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [open, registrationId])

  useEffect(() => { if (!open) { setData(null); setError(false) } }, [open])

  const hasData = data && data.fields.length > 0

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ borderBottom: '1px solid #F3F4F6', py: 1.75 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 34, height: 34, borderRadius: 2, backgroundColor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <SummarizeOutlinedIcon sx={{ fontSize: 18, color: '#4F46E5' }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" color="text.primary">OCR Extraction Analysis</Typography>
              <Typography variant="caption" color="text.secondary">Comparing extracted values across uploaded documents</Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose} size="small" sx={{ color: '#9CA3AF', '&:hover': { backgroundColor: '#F3F4F6' } }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: '#4F46E5' }} />
          </Box>
        )}
        {!loading && error && (
          <Box sx={{ p: 3 }}><Alert severity="error">Failed to load extraction data.</Alert></Box>
        )}
        {!loading && !error && !hasData && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: 3, backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
              <SummarizeOutlinedIcon sx={{ fontSize: 26, color: '#D1D5DB' }} />
            </Box>
            <Typography variant="body2" color="text.secondary" fontWeight={600}>No extraction data available</Typography>
            <Typography variant="caption" color="text.secondary">OCR analysis runs when documents are uploaded.</Typography>
          </Box>
        )}
        {!loading && hasData && (
          <>
            {/* Legend */}
            <Stack direction="row" spacing={2.5} sx={{ px: 3, py: 1.25, borderBottom: '1px solid #F3F4F6', backgroundColor: '#FAFAFA', flexWrap: 'wrap' }}>
              {[
                { color: '#D1FAE5', border: '#6EE7B7', label: 'All values match' },
                { color: '#FEF3C7', border: '#FCD34D', label: 'Mismatch — review needed' },
                { color: '#F3F4F6', border: '#E5E7EB', label: 'Single source' },
              ].map(({ color, border, label }) => (
                <Stack key={label} direction="row" alignItems="center" spacing={0.75}>
                  <Box sx={{ width: 12, height: 12, borderRadius: 0.5, backgroundColor: color, border: `1px solid ${border}` }} />
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                </Stack>
              ))}
            </Stack>

            <TableContainer sx={{ maxHeight: 460 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ minWidth: 170, fontWeight: 700, fontSize: 12, backgroundColor: '#FFF8F3', borderColor: '#F3F4F6' }}>
                      Field
                    </TableCell>
                    {data!.document_types.map((dt) => (
                      <TableCell key={dt} align="center"
                        sx={{ minWidth: 120, fontWeight: 700, fontSize: 12, backgroundColor: '#FFF8F3', borderColor: '#F3F4F6' }}>
                        {DOC_ABBREV[dt] ?? dt}
                      </TableCell>
                    ))}
                    <TableCell align="center" sx={{ minWidth: 90, fontWeight: 700, fontSize: 12, backgroundColor: '#FFF8F3', borderColor: '#F3F4F6' }}>
                      Status
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data!.fields.map((field) => {
                    const presentCount = Object.keys(field.values).length
                    const rowBg = field.has_conflict
                      ? '#FFFBEB'
                      : presentCount > 1 && field.all_match
                        ? '#F0FFF4'
                        : 'transparent'
                    return (
                      <TableRow key={field.label} sx={{ backgroundColor: rowBg, '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ fontWeight: 600, fontSize: 12, color: '#374151', borderColor: '#F3F4F6' }}>
                          {field.label}
                        </TableCell>
                        {data!.document_types.map((dt) => (
                          <TableCell key={dt} align="center"
                            sx={{
                              fontSize: 12,
                              borderColor: '#F3F4F6',
                              color: field.values[dt] ? '#1A1A2E' : '#D1D5DB',
                              fontFamily: MONO_FIELDS.has(field.label) ? 'monospace' : 'inherit',
                              wordBreak: 'break-word',
                            }}>
                            {field.values[dt] || '—'}
                          </TableCell>
                        ))}
                        <TableCell align="center" sx={{ borderColor: '#F3F4F6' }}>
                          {presentCount === 0 ? null
                            : presentCount === 1
                              ? <Chip label="1 source" size="small" sx={{ fontSize: 10, height: 20, backgroundColor: '#F3F4F6', color: '#6B7280' }} />
                              : field.has_conflict
                                ? <Chip label="Mismatch" size="small" sx={{ fontSize: 10, height: 20, backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D', fontWeight: 700 }} />
                                : <Chip label="Match" size="small" sx={{ fontSize: 10, height: 20, backgroundColor: '#D1FAE5', color: '#065F46', border: '1px solid #6EE7B7', fontWeight: 700 }} />
                          }
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #F3F4F6' }}>
        <Button onClick={onClose} variant="outlined"
          sx={{ borderColor: '#E5E7EB', color: '#374151', '&:hover': { borderColor: '#9CA3AF' } }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Vendor Detail Dialog ──────────────────────────────────────────────────
function VendorDetailDialog({ registrationId, open, onClose }: {
  registrationId: number | null; open: boolean; onClose: () => void
}) {
  const [detail, setDetail]         = useState<ApiRegistrationDetail | null>(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [activeView, setActiveView]             = useState<'docs' | 'ocr' | 'form'>('docs')
  const [analysisData, setAnalysisData]         = useState<AnalysisData | null>(null)
  const [analysisLoading, setAnalysisLoading]   = useState(false)
  const [formAnalysisData, setFormAnalysisData] = useState<FormAnalysisData | null>(null)
  const [formAnalysisLoading, setFormAnalysisLoading] = useState(false)

  // Preview state
  const [selectedDoc, setSelectedDoc]       = useState<ApiDocument | null>(null)
  const [previewUrl, setPreviewUrl]         = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError]     = useState('')
  const [previewIsImage, setPreviewIsImage] = useState(false)
  const [zoom, setZoom]                     = useState(1)
  const previewContainerRef                 = useRef<HTMLDivElement>(null)

  // Ctrl+scroll or trackpad pinch (ctrlKey=true) → zoom; plain scroll → pan image normally
  useEffect(() => {
    const el = previewContainerRef.current
    if (!el || !previewIsImage || !previewUrl) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return  // let two-finger scroll pan the image
      e.preventDefault()
      setZoom((z) => Math.min(4, Math.max(0.25, z + (e.deltaY > 0 ? -0.15 : 0.15))))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [previewIsImage, previewUrl])

  // Revoke old blob URL when replaced
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  // Fetch OCR cross-doc analysis when panel is opened
  useEffect(() => {
    if (activeView !== 'ocr' || !registrationId || analysisData) return
    setAnalysisLoading(true)
    fetch(`/api/finance/registrations/${registrationId}/extraction-analysis/`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d: AnalysisData) => setAnalysisData(d))
      .catch(() => setAnalysisData(null))
      .finally(() => setAnalysisLoading(false))
  }, [activeView, registrationId, analysisData])

  // Fetch form vs OCR comparison when panel is opened
  useEffect(() => {
    if (activeView !== 'form' || !registrationId || formAnalysisData) return
    setFormAnalysisLoading(true)
    fetch(`/api/finance/registrations/${registrationId}/form-analysis/`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d: FormAnalysisData) => setFormAnalysisData(d))
      .catch(() => setFormAnalysisData(null))
      .finally(() => setFormAnalysisLoading(false))
  }, [activeView, registrationId, formAnalysisData])

  // Reset everything when dialog closes
  useEffect(() => {
    if (!open) {
      setDetail(null)
      setSelectedDoc(null)
      setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null })
      setPreviewError('')
      setZoom(1)
      setActiveView('docs')
      setAnalysisData(null)
      setFormAnalysisData(null)
    }
  }, [open])

  // Fetch registration detail
  useEffect(() => {
    if (!open || !registrationId) return
    setLoading(true)
    setError('')
    fetch(`/api/finance/registrations/${registrationId}/`)
      .then((r) => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((d: ApiRegistrationDetail) => setDetail(d))
      .catch(() => setError('Failed to load registration details.'))
      .finally(() => setLoading(false))
  }, [open, registrationId])

  const handleViewDoc = async (doc: ApiDocument, allowToggle = true) => {
    // Chips toggle off when the same doc is clicked again; FieldRow eye-buttons never toggle off
    if (allowToggle && selectedDoc?.document_id === doc.document_id && activeView === 'docs') {
      setSelectedDoc(null)
      setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null })
      setPreviewError('')
      setZoom(1)
      return
    }
    setActiveView('docs')
    setSelectedDoc(doc)
    setPreviewLoading(true)
    setPreviewError('')
    setZoom(1)
    setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null })

    try {
      const res = await fetch(`/api/documents/${doc.document_id}/download/`)
      if (!res.ok) throw new Error('Not found')
      const contentType = res.headers.get('Content-Type') || ''
      const blob = await res.blob()
      setPreviewUrl(URL.createObjectURL(blob))
      setPreviewIsImage(contentType.startsWith('image/'))
    } catch {
      setPreviewError('Could not load this document.')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleDownload = () => {
    if (!selectedDoc || !previewUrl) return
    const a = document.createElement('a')
    a.href = previewUrl
    a.download = selectedDoc.file_name
    a.click()
  }

  const uploadedDocs = detail?.documents ?? []
  const docMap: Record<string, ApiDocument> = {}
  uploadedDocs.forEach((d) => { docMap[d.document_type] = d })

  // Returns a view-handler only when the source document is uploaded
  const docViewFor = (docType: string) => {
    const doc = docMap[docType]
    return doc ? () => handleViewDoc(doc, false) : undefined
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth
      PaperProps={{ sx: { borderRadius: 3, height: '92vh', maxHeight: 860, display: 'flex', flexDirection: 'column' } }}>

      {/* ── Header ── */}
      <DialogTitle sx={{ borderBottom: '1px solid #F3F4F6', py: 1.75, flexShrink: 0 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar sx={{ width: 42, height: 42, background: 'linear-gradient(135deg,#FF6B00,#FF8C33)', fontWeight: 700, fontSize: 17, flexShrink: 0 }}>
            {detail?.vendor_name?.charAt(0) ?? '?'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" color="text.primary" noWrap>{detail?.vendor_name || 'Loading…'}</Typography>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#FF6B00', fontWeight: 700 }}>{detail?.registration_no}</Typography>
              <Typography variant="caption" color="text.secondary">·</Typography>
              <Typography variant="caption" color="text.secondary">{detail?.email}</Typography>
            </Stack>
          </Box>
          {detail && <StatusChip status={detail.registration_status} />}
          <IconButton onClick={onClose} size="small" sx={{ color: '#9CA3AF', ml: 1, '&:hover': { backgroundColor: '#F3F4F6' } }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      {/* ── Body ── */}
      <DialogContent sx={{ p: 0, display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Global loading / error */}
        {loading && (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress sx={{ color: '#FF6B00' }} />
          </Box>
        )}
        {error && !loading && (
          <Box sx={{ flex: 1, p: 3 }}><Alert severity="error">{error}</Alert></Box>
        )}

        {detail && !loading && (
          <>
            {/* ── LEFT: Registration form data (scrollable) ── */}
            <Box sx={{ width: 340, flexShrink: 0, borderRight: '1px solid #F3F4F6', overflowY: 'auto', p: 2 }}>

              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
                <FingerprintIcon sx={{ fontSize: 13, color: '#FF6B00' }} />
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.9 }}>Registration Info</Typography>
              </Stack>
              <Paper elevation={0} sx={{ p: 1.5, mb: 1.75, border: '1px solid #F3F4F6', borderRadius: 2 }}>
                <FieldRow label="Registration No." value={detail.registration_no} mono />
                <FieldRow label="PAN Number"       value={detail.pan_number} mono onView={docViewFor('PAN Card')} />
                <FieldRow label="GSTIN"            value={detail.gstin} mono onView={docViewFor('GST Certificate')} />
                <FieldRow label="Email"            value={detail.email} />
                <FieldRow label="Mobile"           value={detail.mobile} />
                <FieldRow label="Submitted"        value={detail.submitted_date || 'Not submitted'} />
              </Paper>

              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
                <BusinessOutlinedIcon sx={{ fontSize: 13, color: '#7C3AED' }} />
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.9 }}>Business Details</Typography>
              </Stack>
              <Paper elevation={0} sx={{ p: 1.5, mb: 1.75, border: '1px solid #F3F4F6', borderRadius: 2 }}>
                <FieldRow label="Vendor Name"      value={detail.vendor_name} onView={docViewFor('Certificate of Incorporation')} />
                <FieldRow label="Address"          value={detail.address} onView={docViewFor('MSME Certificate')} />
                <FieldRow label="Goods / Services" value={detail.goods_description} />
              </Paper>

              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
                <AccountBalanceOutlinedIcon sx={{ fontSize: 13, color: '#0369A1' }} />
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.9 }}>Bank Details</Typography>
              </Stack>
              <Paper elevation={0} sx={{ p: 1.5, mb: 1.75, border: '1px solid #F3F4F6', borderRadius: 2 }}>
                <FieldRow label="Bank Name"       value={detail.bank_name}          onView={docViewFor('Cancelled Cheque')} />
                <FieldRow label="Branch"          value={detail.bank_branch}         onView={docViewFor('Cancelled Cheque')} />
                <FieldRow label="Account Holder"  value={detail.account_holder_name} onView={docViewFor('Cancelled Cheque')} />
                <FieldRow label="Account No."     value={detail.bank_account_no} mono onView={docViewFor('Cancelled Cheque')} />
                <FieldRow label="IFSC Code"       value={detail.bank_ifsc} mono      onView={docViewFor('Cancelled Cheque')} />
                <FieldRow label="Account Type"    value={detail.account_type}        onView={docViewFor('Cancelled Cheque')} />
              </Paper>

              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
                <ContactsOutlinedIcon sx={{ fontSize: 13, color: '#059669' }} />
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.9 }}>Internal Contact (AE)</Typography>
              </Stack>
              <Paper elevation={0} sx={{ p: 1.5, border: '1px solid #F3F4F6', borderRadius: 2 }}>
                <FieldRow label="Contact Person" value={detail.contact_person} />
              </Paper>
            </Box>

            {/* ── RIGHT: Document selector + inline preview ── */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

              {/* Document chip strip */}
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #F3F4F6', backgroundColor: '#FAFAFA', flexShrink: 0 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <FolderOpenOutlinedIcon sx={{ fontSize: 15, color: '#FF6B00' }} />
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1A1A2E' }}>KYC Documents</Typography>
                    <Chip label={`${uploadedDocs.length}/${KYC_DOC_TYPES.length}`} size="small"
                      sx={{ height: 18, fontSize: 10, fontWeight: 700, backgroundColor: uploadedDocs.length === KYC_DOC_TYPES.length ? '#F0FFF4' : '#FFF5EE', color: uploadedDocs.length === KYC_DOC_TYPES.length ? '#059669' : '#FF6B00', border: `1px solid ${uploadedDocs.length === KYC_DOC_TYPES.length ? '#BBF7D0' : '#FFD4B0'}` }} />
                  </Stack>
                  <Stack direction="row" spacing={0.75}>
                    <Button size="small" variant={activeView === 'ocr' ? 'contained' : 'outlined'}
                      startIcon={<SummarizeOutlinedIcon sx={{ fontSize: 13 }} />}
                      onClick={() => setActiveView((v) => v === 'ocr' ? 'docs' : 'ocr')}
                      disabled={uploadedDocs.length === 0}
                      sx={{ fontSize: 11, ...(activeView === 'ocr'
                        ? { backgroundColor: '#4F46E5', color: '#fff', '&:hover': { backgroundColor: '#4338CA' } }
                        : { borderColor: '#E0E7FF', color: '#4F46E5', '&:hover': { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' } }
                      ), '&.Mui-disabled': { opacity: 0.45 } }}>
                      OCR Analysis
                    </Button>
                    <Button size="small" variant={activeView === 'form' ? 'contained' : 'outlined'}
                      startIcon={<CompareArrowsOutlinedIcon sx={{ fontSize: 13 }} />}
                      onClick={() => setActiveView((v) => v === 'form' ? 'docs' : 'form')}
                      sx={{ fontSize: 11, ...(activeView === 'form'
                        ? { backgroundColor: '#4F46E5', color: '#fff', '&:hover': { backgroundColor: '#4338CA' } }
                        : { borderColor: '#E0E7FF', color: '#4F46E5', '&:hover': { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' } }
                      ) }}>
                      Form vs OCR
                    </Button>
                    {selectedDoc && previewUrl && activeView === 'docs' && (
                      <Button size="small" variant="outlined" startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 13 }} />}
                        onClick={handleDownload}
                        sx={{ fontSize: 11, borderColor: '#E5E7EB', color: '#6B7280', '&:hover': { borderColor: '#FF6B00', color: '#FF6B00', backgroundColor: '#FFF5EE' } }}>
                        Download
                      </Button>
                    )}
                  </Stack>
                </Stack>
                <Stack direction="row" spacing={0.75} flexWrap="wrap">
                  {KYC_DOC_TYPES.map((docType) => {
                    const doc = docMap[docType]
                    const isSelected = selectedDoc?.document_type === docType
                    return (
                      <Chip key={docType} label={docType} size="small"
                        disabled={!doc}
                        onClick={() => doc && handleViewDoc(doc)}
                        icon={doc
                          ? <CheckCircleIcon sx={{ fontSize: '12px !important', color: isSelected ? '#fff !important' : '#059669 !important' }} />
                          : undefined}
                        sx={{
                          mb: 0.5, cursor: doc ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: 11,
                          backgroundColor: isSelected ? '#059669' : (doc ? '#F0FFF4' : '#F3F4F6'),
                          color: isSelected ? '#fff' : (doc ? '#059669' : '#9CA3AF'),
                          border: `1px solid ${isSelected ? '#059669' : (doc ? '#BBF7D0' : '#E5E7EB')}`,
                          '&:hover': doc ? { borderColor: '#059669' } : {},
                          '&.Mui-disabled': { opacity: 0.6, cursor: 'not-allowed' },
                        }} />
                    )
                  })}
                </Stack>
                {selectedDoc && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Viewing: <strong>{selectedDoc.document_type}</strong> · {selectedDoc.file_name}
                  </Typography>
                )}
              </Box>

              {/* Inline OCR Analysis panel */}
              {activeView === 'ocr' && (
                <Box sx={{ flex: 1, overflow: 'auto', backgroundColor: '#FAFAFA', display: 'flex', flexDirection: 'column' }}>
                  {analysisLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                      <CircularProgress sx={{ color: '#4F46E5' }} />
                    </Box>
                  )}
                  {!analysisLoading && (!analysisData || analysisData.fields.filter(f => Object.keys(f.values).length >= 2).length === 0) && (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                      <Box sx={{ width: 48, height: 48, borderRadius: 2.5, backgroundColor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
                        <SummarizeOutlinedIcon sx={{ fontSize: 24, color: '#6366F1' }} />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>No cross-document fields found</Typography>
                      <Typography variant="caption" color="text.secondary">OCR analysis runs when documents are uploaded.</Typography>
                    </Box>
                  )}
                  {!analysisLoading && analysisData && analysisData.fields.filter(f => Object.keys(f.values).length >= 2).length > 0 && (
                    <>
                      {/* Legend bar */}
                      <Box sx={{ px: 2.5, py: 1.25, borderBottom: '1px solid #E5E7EB', backgroundColor: '#fff', display: 'flex', alignItems: 'center', gap: 2.5, flexShrink: 0, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#6B7280' }}>Legend:</Typography>
                        {[
                          { accent: '#059669', bg: '#F0FFF4', label: 'All values match' },
                          { accent: '#D97706', bg: '#FFFBEB', label: 'Values differ' },
                        ].map(({ accent, bg, label }) => (
                          <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Box sx={{ width: 3, height: 14, borderRadius: 2, backgroundColor: accent }} />
                            <Box sx={{ width: 22, height: 14, borderRadius: 0.75, backgroundColor: bg, border: `1px solid ${accent}22` }} />
                            <Typography variant="caption" color="text.secondary">{label}</Typography>
                          </Box>
                        ))}
                      </Box>

                      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                        <TableContainer sx={{ border: '1px solid #E5E7EB', borderRadius: 1.5, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                          <Table stickyHeader size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ minWidth: 130, fontWeight: 700, fontSize: 12, py: 1.25, px: 2, backgroundColor: '#F8FAFC', color: '#374151', borderBottom: '2px solid #E5E7EB', borderRight: '1px solid #E5E7EB' }}>
                                  Field
                                </TableCell>
                                {analysisData.document_types.map((dt) => (
                                  <TableCell key={dt} align="center"
                                    sx={{ fontWeight: 700, fontSize: 11, py: 1.25, px: 1.5, backgroundColor: '#F8FAFC', color: '#374151', borderBottom: '2px solid #E5E7EB', borderRight: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>
                                    {DOC_ABBREV[dt] ?? dt}
                                  </TableCell>
                                ))}
                                <TableCell align="center"
                                  sx={{ minWidth: 90, fontWeight: 700, fontSize: 12, py: 1.25, px: 1.5, backgroundColor: '#F8FAFC', color: '#374151', borderBottom: '2px solid #E5E7EB' }}>
                                  Status
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {analysisData.fields
                                .filter((f) => Object.keys(f.values).length >= 2)
                                .map((field, idx, arr) => {
                                  const isMatch  = !field.has_conflict
                                  const accent   = isMatch ? '#059669' : '#D97706'
                                  const rowBg    = isMatch ? '#F0FFF9' : '#FFFBEB'
                                  const lastRow  = idx === arr.length - 1

                                  // Per-cell coloring: in a mismatch row, find values that appear in
                                  // 2+ documents so those cells stay green while the outlier is amber.
                                  // If every value is unique (maxCount === 1), no majority exists — all amber.
                                  const presentVals = Object.values(field.values).filter(Boolean)
                                  const counts: Record<string, number> = {}
                                  presentVals.forEach((v) => { const k = v.toUpperCase().trim(); counts[k] = (counts[k] || 0) + 1 })
                                  const maxCount = presentVals.length ? Math.max(...Object.values(counts)) : 0
                                  const majoritySet = maxCount >= 2
                                    ? new Set(Object.entries(counts).filter(([, c]) => c === maxCount).map(([k]) => k))
                                    : new Set<string>()

                                  const cellColor = (val: string) => {
                                    if (!val) return '#C4C4C4'
                                    if (isMatch) return '#065F46'
                                    return majoritySet.has(val.toUpperCase().trim()) ? '#065F46' : '#92400E'
                                  }

                                  return (
                                    <TableRow key={field.label} sx={{ backgroundColor: rowBg }}>
                                      <TableCell sx={{
                                        fontWeight: 600, fontSize: 12, color: '#1A1A2E', py: 1, pl: 0,
                                        borderBottom: lastRow ? 'none' : '1px solid #E5E7EB',
                                        borderRight: '1px solid #E5E7EB',
                                        borderLeft: `4px solid ${accent}`,
                                        paddingLeft: '12px',
                                      }}>
                                        {field.label}
                                      </TableCell>
                                      {analysisData!.document_types.map((dt) => {
                                        const val = field.values[dt] || ''
                                        return (
                                          <TableCell key={dt} align="center" sx={{
                                            fontSize: 11, py: 1, px: 1.5,
                                            borderBottom: lastRow ? 'none' : '1px solid #E5E7EB',
                                            borderRight: '1px solid #E5E7EB',
                                            color: cellColor(val),
                                            fontFamily: MONO_FIELDS.has(field.label) ? 'monospace' : 'inherit',
                                            fontWeight: val ? 600 : 400,
                                            wordBreak: 'break-word',
                                          }}>
                                            {val || '—'}
                                          </TableCell>
                                        )
                                      })}
                                      <TableCell align="center" sx={{ py: 1, px: 1, borderBottom: lastRow ? 'none' : '1px solid #E5E7EB' }}>
                                        {isMatch
                                          ? <Chip label="Match"    size="small" sx={{ fontSize: 10, height: 20, backgroundColor: '#D1FAE5', color: '#065F46', border: '1px solid #6EE7B7', fontWeight: 700 }} />
                                          : <Chip label="Mismatch" size="small" sx={{ fontSize: 10, height: 20, backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D', fontWeight: 700 }} />
                                        }
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    </>
                  )}
                </Box>
              )}

              {/* Inline Form vs OCR panel */}
              {activeView === 'form' && (
                <Box sx={{ flex: 1, overflow: 'auto', backgroundColor: '#FAFAFA', display: 'flex', flexDirection: 'column' }}>
                  {formAnalysisLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                      <CircularProgress sx={{ color: '#4F46E5' }} />
                    </Box>
                  )}
                  {!formAnalysisLoading && (!formAnalysisData || formAnalysisData.fields.length === 0) && (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                      <Box sx={{ width: 48, height: 48, borderRadius: 2.5, backgroundColor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
                        <CompareArrowsOutlinedIcon sx={{ fontSize: 24, color: '#4F46E5' }} />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>No comparison data available</Typography>
                      <Typography variant="caption" color="text.secondary">Form must be submitted and OCR workflows must have run.</Typography>
                    </Box>
                  )}
                  {!formAnalysisLoading && formAnalysisData && formAnalysisData.fields.length > 0 && (
                    <>
                      {/* Legend bar */}
                      <Box sx={{ px: 2.5, py: 1.25, borderBottom: '1px solid #E5E7EB', backgroundColor: '#fff', display: 'flex', alignItems: 'center', gap: 2.5, flexShrink: 0, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#6B7280' }}>Legend:</Typography>
                        {[
                          { accent: '#059669', bg: '#F0FFF4', label: 'Submitted matches OCR' },
                          { accent: '#D97706', bg: '#FFFBEB', label: 'Submitted differs from OCR' },
                          { accent: '#9CA3AF', bg: '#F9FAFB', label: 'No OCR extraction' },
                        ].map(({ accent, bg, label }) => (
                          <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Box sx={{ width: 3, height: 14, borderRadius: 2, backgroundColor: accent }} />
                            <Box sx={{ width: 22, height: 14, borderRadius: 0.75, backgroundColor: bg, border: `1px solid ${accent}33` }} />
                            <Typography variant="caption" color="text.secondary">{label}</Typography>
                          </Box>
                        ))}
                      </Box>

                      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                        <TableContainer sx={{ border: '1px solid #E5E7EB', borderRadius: 1.5, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                          <Table stickyHeader size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ minWidth: 130, fontWeight: 700, fontSize: 12, py: 1.25, px: 2, backgroundColor: '#F8FAFC', color: '#374151', borderBottom: '2px solid #E5E7EB', borderRight: '1px solid #E5E7EB' }}>
                                  Field
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12, py: 1.25, px: 2, backgroundColor: '#F8FAFC', color: '#374151', borderBottom: '2px solid #E5E7EB', borderRight: '1px solid #E5E7EB' }}>
                                  Submitted by Vendor
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 12, py: 1.25, px: 2, backgroundColor: '#F8FAFC', color: '#374151', borderBottom: '2px solid #E5E7EB', borderRight: '1px solid #E5E7EB' }}>
                                  Extracted by OCR
                                </TableCell>
                                <TableCell align="center" sx={{ minWidth: 90, fontWeight: 700, fontSize: 12, py: 1.25, px: 1.5, backgroundColor: '#F8FAFC', color: '#374151', borderBottom: '2px solid #E5E7EB' }}>
                                  Status
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {formAnalysisData.fields.map((field, idx, arr) => {
                                const lastRow  = idx === arr.length - 1
                                const accent   = field.match === true ? '#059669' : field.match === false ? '#D97706' : '#9CA3AF'
                                const rowBg    = field.match === true ? '#F0FFF9' : field.match === false ? '#FFFBEB' : '#F9FAFB'
                                const valColor = field.match === true ? '#065F46' : field.match === false ? '#92400E' : '#6B7280'
                                const monoSx   = field.mono ? { fontFamily: 'monospace', letterSpacing: '0.03em' } : {}
                                return (
                                  <TableRow key={field.label} sx={{ backgroundColor: rowBg }}>
                                    <TableCell sx={{
                                      fontWeight: 600, fontSize: 12, color: '#1A1A2E', py: 1,
                                      borderBottom: lastRow ? 'none' : '1px solid #E5E7EB',
                                      borderRight: '1px solid #E5E7EB',
                                      borderLeft: `4px solid ${accent}`,
                                      paddingLeft: '12px',
                                    }}>
                                      {field.label}
                                    </TableCell>
                                    <TableCell sx={{
                                      fontSize: 11, py: 1, px: 2,
                                      borderBottom: lastRow ? 'none' : '1px solid #E5E7EB',
                                      borderRight: '1px solid #E5E7EB',
                                      color: field.submitted ? valColor : '#C4C4C4',
                                      fontWeight: field.submitted ? 600 : 400,
                                      wordBreak: 'break-word', ...monoSx,
                                    }}>
                                      {field.submitted || '—'}
                                    </TableCell>
                                    <TableCell sx={{
                                      fontSize: 11, py: 1, px: 2,
                                      borderBottom: lastRow ? 'none' : '1px solid #E5E7EB',
                                      borderRight: '1px solid #E5E7EB',
                                      color: field.extracted ? valColor : '#C4C4C4',
                                      fontWeight: field.extracted ? 600 : 400,
                                      wordBreak: 'break-word', ...monoSx,
                                    }}>
                                      {field.extracted || '—'}
                                    </TableCell>
                                    <TableCell align="center" sx={{ py: 1, px: 1, borderBottom: lastRow ? 'none' : '1px solid #E5E7EB' }}>
                                      {field.match === true  && <Chip label="Match"    size="small" sx={{ fontSize: 10, height: 20, backgroundColor: '#D1FAE5', color: '#065F46', border: '1px solid #6EE7B7', fontWeight: 700 }} />}
                                      {field.match === false && <Chip label="Mismatch" size="small" sx={{ fontSize: 10, height: 20, backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D', fontWeight: 700 }} />}
                                      {field.match === null  && <Chip label="No OCR"   size="small" sx={{ fontSize: 10, height: 20, backgroundColor: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB' }} />}
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    </>
                  )}
                </Box>
              )}

              {/* Preview area */}
              {activeView === 'docs' && <Box sx={{ flex: 1, overflow: 'hidden', backgroundColor: '#F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>

                {/* Placeholder */}
                {!selectedDoc && (
                  <Box sx={{ textAlign: 'center', px: 3 }}>
                    <Box sx={{ width: 64, height: 64, borderRadius: 3, backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                      <InsertDriveFileOutlinedIcon sx={{ fontSize: 32, color: '#D1D5DB' }} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5 }}>No document selected</Typography>
                    <Typography variant="caption" color="text.secondary">Click any document chip above to preview it here</Typography>
                  </Box>
                )}

                {/* Loading spinner */}
                {previewLoading && (
                  <Box sx={{ textAlign: 'center' }}>
                    <CircularProgress sx={{ color: '#FF6B00', mb: 1.5 }} />
                    <Typography variant="caption" color="text.secondary" display="block">Loading document…</Typography>
                  </Box>
                )}

                {/* Preview error */}
                {previewError && !previewLoading && (
                  <Box sx={{ p: 3, maxWidth: 400 }}>
                    <Alert severity="error">{previewError}</Alert>
                  </Box>
                )}

                {/* Image preview with zoom */}
                {previewUrl && !previewLoading && previewIsImage && (
                  <>
                    <Box
                      ref={previewContainerRef}
                      sx={{ width: '100%', height: '100%', overflow: 'auto', display: 'flex', alignItems: zoom <= 1 ? 'center' : 'flex-start', justifyContent: zoom <= 1 ? 'center' : 'flex-start', p: 2, cursor: zoom > 1 ? 'grab' : 'zoom-in', userSelect: 'none' }}
                    >
                      <Box component="img" src={previewUrl} alt={selectedDoc?.document_type}
                        sx={{ display: 'block', transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.15s ease', maxWidth: zoom <= 1 ? '100%' : 'none', maxHeight: zoom <= 1 ? '100%' : 'none', borderRadius: 1, boxShadow: '0 4px 24px rgba(0,0,0,0.18)', flexShrink: 0 }} />
                    </Box>

                    {/* Floating zoom toolbar */}
                    <Box sx={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 0.25, backgroundColor: 'rgba(26,26,46,0.82)', borderRadius: 3, px: 1.25, py: 0.6, backdropFilter: 'blur(6px)', boxShadow: '0 4px 16px rgba(0,0,0,0.3)', zIndex: 10 }}>
                      <Tooltip title="Zoom out  (scroll ↓)">
                        <span>
                          <IconButton size="small" onClick={() => setZoom((z) => Math.max(0.25, parseFloat((z - 0.02).toFixed(2))))} disabled={zoom <= 0.25}
                            sx={{ color: '#fff', p: 0.5, '&:hover': { backgroundColor: 'rgba(255,255,255,0.12)' }, '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)' } }}>
                            <ZoomOutIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Typography sx={{ color: '#fff', fontSize: 12, fontWeight: 700, minWidth: 40, textAlign: 'center', letterSpacing: '0.02em' }}>
                        {Math.round(zoom * 100)}%
                      </Typography>

                      <Tooltip title="Zoom in  (scroll ↑)">
                        <span>
                          <IconButton size="small" onClick={() => setZoom((z) => Math.min(4, parseFloat((z + 0.02).toFixed(2))))} disabled={zoom >= 4}
                            sx={{ color: '#fff', p: 0.5, '&:hover': { backgroundColor: 'rgba(255,255,255,0.12)' }, '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)' } }}>
                            <ZoomInIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.2)', mx: 0.5, my: 0.25 }} />

                      <Tooltip title="Fit to window">
                        <IconButton size="small" onClick={() => setZoom(1)}
                          sx={{ color: zoom === 1 ? 'rgba(255,255,255,0.4)' : '#fff', p: 0.5, '&:hover': { backgroundColor: 'rgba(255,255,255,0.12)' } }}>
                          <FitScreenIcon sx={{ fontSize: 17 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </>
                )}

                {/* PDF preview */}
                {previewUrl && !previewLoading && !previewIsImage && (
                  <Box component="iframe" src={previewUrl} title={selectedDoc?.document_type ?? 'Document'}
                    sx={{ width: '100%', height: '100%', border: 'none', display: 'block' }} />
                )}
              </Box>}
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #F3F4F6' }}>
        <Button onClick={onClose} variant="outlined"
          sx={{ borderColor: '#E5E7EB', color: '#374151', '&:hover': { borderColor: '#9CA3AF' } }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Dashboard Section ──────────────────────────────────────────────────────
function DashboardSection({ registrations, onNavigate }: {
  registrations: ApiRegistration[]; onNavigate: (id: SectionId) => void
}) {
  const total    = registrations.length
  const pending  = registrations.filter((r) => PENDING_REVIEW_STATUSES.includes(r.registration_status)).length
  const approved = registrations.filter((r) => r.registration_status === 'APPROVED').length
  const rejected = registrations.filter((r) => r.registration_status === 'REJECTED').length
  const recent   = registrations.filter((r) => PENDING_REVIEW_STATUSES.includes(r.registration_status))
  const [dashPage, setDashPage] = useState(0)
  const dashRpp = 5

  return (
    <Stack spacing={3}>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
        <InfoCard label="Total Registrations" value={total}    icon={PeopleAltOutlinedIcon}      color="#FF6B00" />
        <InfoCard label="Pending Review"       value={pending}  icon={PendingActionsOutlinedIcon} color="#D97706" />
        <InfoCard label="Approved"             value={approved} icon={CheckCircleOutlinedIcon}    color="#059669" />
        <InfoCard label="Rejected"             value={rejected} icon={CancelOutlinedIcon}         color="#DC2626" />
      </Stack>

      {recent.length > 0 && (
        <Paper elevation={0} sx={{ border: '1px solid #F3F4F6' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, py: 2, borderBottom: '1px solid #F3F4F6' }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <HourglassEmptyIcon sx={{ color: '#FF6B00', fontSize: 20 }} />
              <Typography variant="subtitle1">Recent Submissions Pending Review</Typography>
              <Chip label={pending} size="small" sx={{ backgroundColor: '#FFF5EE', color: '#FF6B00', fontWeight: 700, fontSize: 11, border: '1px solid #FFD4B0' }} />
            </Stack>
            <Button size="small" onClick={() => onNavigate('approvals')} sx={{ color: '#FF6B00', fontWeight: 600, fontSize: 12 }}>View All →</Button>
          </Stack>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>{['Reg. No.', 'Vendor', 'PAN', 'Email', 'Submitted', 'Docs', 'Action'].map((h) => <TableCell key={h} sx={{ fontSize: 12 }}>{h}</TableCell>)}</TableRow>
              </TableHead>
              <TableBody>
                {recent.slice(dashPage * dashRpp, dashPage * dashRpp + dashRpp).map((r) => (
                  <TableRow key={r.registration_id} hover sx={{ '&:hover': { backgroundColor: '#FFF8F3' } }}>
                    <TableCell><Typography variant="caption" sx={{ fontWeight: 700, color: '#FF6B00', fontFamily: 'monospace' }}>{r.registration_no}</Typography></TableCell>
                    <TableCell sx={{ maxWidth: 140 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{r.vendor_name || '—'}</Typography>
                    </TableCell>
                    <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{r.pan_number}</Typography></TableCell>
                    <TableCell sx={{ maxWidth: 150 }}><Typography variant="caption" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{r.email}</Typography></TableCell>
                    <TableCell><Typography variant="caption" color="text.secondary">{r.submitted_date || '—'}</Typography></TableCell>
                    <TableCell>
                      <Chip label={`${r.document_count}/5`} size="small"
                        sx={{ backgroundColor: r.document_count === 5 ? '#F0FFF4' : '#FFF8F3', color: r.document_count === 5 ? '#059669' : '#FF6B00', fontWeight: 700, fontSize: 11, border: `1px solid ${r.document_count === 5 ? '#BBF7D0' : '#FFD4B0'}` }} />
                    </TableCell>
                    <TableCell>
                      <Button size="small" variant="outlined" onClick={() => onNavigate('approvals')}
                        sx={{ fontSize: 11, py: 0.4, borderColor: '#FF6B00', color: '#FF6B00', '&:hover': { backgroundColor: '#FFF5EE' } }}>Review</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination component="div" count={recent.length} page={dashPage}
            onPageChange={(_, p) => setDashPage(p)} rowsPerPage={dashRpp} rowsPerPageOptions={[5]}
            sx={{ borderTop: '1px solid #F3F4F6' }} />
        </Paper>
      )}
    </Stack>
  )
}

// ── All Registrations Section ──────────────────────────────────────────────
function RegistrationsSection({ registrations, onRefresh }: { registrations: ApiRegistration[]; onRefresh: () => void }) {
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState<RegistrationStatus | 'All'>('All')
  const [page, setPage]             = useState(0)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState('')
  const [actionInfo, setActionInfo] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const rpp = 10

  // Dialog state for status changes that require a reason
  const [remarkDialog, setRemarkDialog] = useState<{ registrationId: number; action: string } | null>(null)
  const [remarkText, setRemarkText]     = useState('')
  const [remarkError, setRemarkError]   = useState('')
  const [remarkLoading, setRemarkLoading] = useState(false)

  const REQUIRES_REMARK = new Set(['REJECTED', 'SEND_BACK'])

  const handleStatusChange = async (registrationId: number, newStatus: string) => {
    // For Reject / Send Back — open dialog to collect reason first
    if (REQUIRES_REMARK.has(newStatus)) {
      setRemarkDialog({ registrationId, action: newStatus })
      setRemarkText('')
      setRemarkError('')
      return
    }
    // All other statuses — submit directly
    await submitStatusChange(registrationId, newStatus, '')
  }

  const submitStatusChange = async (registrationId: number, newStatus: string, remarks: string) => {
    setUpdatingId(registrationId)
    if (newStatus === 'APPROVED') setActionInfo('Creating vendor ledger in Tally… please wait.')
    try {
      const res = await fetch(`/api/finance/registrations/${registrationId}/review/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: newStatus, remarks }),
      })
      if (res.ok) {
        setActionSuccess(
          newStatus === 'APPROVED'
            ? 'Vendor approved — ledger created successfully in Tally.'
            : 'Status updated successfully.'
        )
        onRefresh()
      } else {
        const errBody = await res.json().catch(() => ({}))
        setActionError(errBody.detail || 'Status change failed. Please try again.')
      }
    } finally {
      setUpdatingId(null)
      setActionInfo('')
    }
  }

  const confirmRemark = async () => {
    if (!remarkText.trim()) { setRemarkError('Please enter a reason.'); return }
    if (!remarkDialog) return
    setRemarkLoading(true)
    try {
      await submitStatusChange(remarkDialog.registrationId, remarkDialog.action, remarkText.trim())
      setRemarkDialog(null)
    } finally {
      setRemarkLoading(false)
    }
  }

  const filtered = useMemo(() =>
    registrations.filter((r) => {
      const q = search.toLowerCase()
      const matchSearch = r.registration_no.toLowerCase().includes(q) || (r.vendor_name || '').toLowerCase().includes(q) || r.pan_number.toLowerCase().includes(q)
      const matchStatus = statusFilter === 'All' || r.registration_status === statusFilter
      return matchSearch && matchStatus
    }), [registrations, search, statusFilter])

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h5" color="text.primary">All Registrations</Typography>
          <Typography variant="caption" color="text.secondary">{filtered.length} vendor registration{filtered.length !== 1 ? 's' : ''} found</Typography>
        </Box>
      </Stack>

      <Paper elevation={0} sx={{ border: '1px solid #F3F4F6' }}>
        <Box sx={{ p: 2.5, borderBottom: '1px solid #F3F4F6' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
            <TextField size="small" placeholder="Search by name, PAN or Reg. No…" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#9CA3AF', fontSize: 18 }} /></InputAdornment> }}
              sx={{ flex: 1, maxWidth: 360, '& .MuiOutlinedInput-root': { borderRadius: 2, '&.Mui-focused fieldset': { borderColor: '#FF6B00' } } }} />
            <Stack direction="row" spacing={0.75} flexWrap="wrap">
              {([['All', 'All'], ...Object.entries(STATUS_CFG).map(([k, v]) => [k, v.label])] as [string, string][]).map(([key, label]) => (
                <Chip key={key} label={label} size="small" onClick={() => { setStatus(key as RegistrationStatus | 'All'); setPage(0) }}
                  sx={{ cursor: 'pointer', fontWeight: 600, fontSize: 11, backgroundColor: statusFilter === key ? '#FF6B00' : '#F3F4F6', color: statusFilter === key ? '#fff' : '#6B7280', border: `1px solid ${statusFilter === key ? '#FF6B00' : '#E5E7EB'}`, '&:hover': { backgroundColor: statusFilter === key ? '#FF6B00' : '#FFF5EE' } }} />
              ))}
            </Stack>
          </Stack>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>{['Reg. No.', 'Vendor Name', 'PAN', 'Email', 'Docs', 'Date', 'Status'].map((h) => <TableCell key={h} sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{h}</TableCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {filtered.slice(page * rpp, page * rpp + rpp).map((r) => (
                <TableRow key={r.registration_id} hover sx={{ '&:hover': { backgroundColor: '#FFF8F3' } }}>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#FF6B00', fontFamily: 'monospace' }}>{r.registration_no}</Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 150 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{r.vendor_name || '—'}</Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 130 }}>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600, display: 'block', fontSize: 10 }}>{r.pan_number}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: 10 }}>{r.gstin || '—'}</Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 150 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{r.email}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: r.document_count === 5 ? '#059669' : '#FF6B00' }}>{r.document_count}/5</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{r.submitted_date || r.created_date || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={r.registration_status}
                      size="small"
                      disabled={updatingId === r.registration_id}
                      onChange={(e) => handleStatusChange(r.registration_id, e.target.value)}
                      renderValue={(val) => (
                        updatingId === r.registration_id
                          ? <CircularProgress size={14} sx={{ color: '#FF6B00', mx: 1 }} />
                          : <StatusChip status={val as string} />
                      )}
                      sx={{
                        minWidth: 120,
                        '& .MuiOutlinedInput-notchedOutline': { border: '1px solid #E5E7EB', borderRadius: 2 },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#FF6B00' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#FF6B00', borderWidth: 1 },
                        '& .MuiSelect-select': { py: '5px', px: 1 },
                        '& .MuiSelect-icon': { color: '#9CA3AF', fontSize: 18 },
                      }}
                      MenuProps={{ PaperProps: { sx: { borderRadius: 2, mt: 0.5, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' } } }}
                    >
                      {Object.keys(STATUS_CFG).map((s) => (
                        <MenuItem key={s} value={s} sx={{ py: 0.75 }}>
                          <StatusChip status={s} />
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">No registrations match your filter.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={filtered.length} page={page}
          onPageChange={(_, p) => setPage(p)} rowsPerPage={rpp} rowsPerPageOptions={[10]}
          sx={{ borderTop: '1px solid #F3F4F6' }} />
      </Paper>

      {/* ── Reason dialog for Reject / Send Back from All Registrations ── */}
      <Dialog open={remarkDialog !== null} onClose={() => !remarkLoading && setRemarkDialog(null)}
        maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ borderBottom: '1px solid #F3F4F6', pb: 1.5 }}>
          <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
            <Box sx={{
              width: 36, height: 36, borderRadius: 2, flexShrink: 0,
              backgroundColor: remarkDialog?.action === 'REJECTED' ? '#FEE2E2' : '#FEF9C3',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {remarkDialog?.action === 'REJECTED'
                ? <CancelOutlinedIcon sx={{ color: '#DC2626', fontSize: 20 }} />
                : <ReplyOutlinedIcon  sx={{ color: '#D97706', fontSize: 20 }} />}
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#1A1A2E' }}>
                {remarkDialog?.action === 'REJECTED' ? 'Reject Application' : 'Send Application Back to Vendor'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {remarkDialog?.action === 'REJECTED'
                  ? 'The vendor will be notified with the rejection reason.'
                  : 'The vendor will be able to edit their form and re-upload documents.'}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ pt: 2.5 }}>
          <DialogContentText sx={{ fontSize: 13.5, color: '#374151', mb: 2 }}>
            {remarkDialog?.action === 'REJECTED'
              ? 'Please provide a clear reason for rejection. This will be shown to the vendor on their dashboard.'
              : 'Please describe what needs to be corrected. The vendor will see this reason on their dashboard.'}
          </DialogContentText>
          <TextField
            label={remarkDialog?.action === 'REJECTED' ? 'Reason for Rejection *' : 'Reason / Instructions for vendor *'}
            multiline rows={4} fullWidth autoFocus
            value={remarkText}
            onChange={(e) => { setRemarkText(e.target.value); if (remarkError) setRemarkError('') }}
            error={!!remarkError}
            helperText={remarkError || `${remarkText.length}/1000`}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&.Mui-focused fieldset': {
                  borderColor: remarkDialog?.action === 'REJECTED' ? '#DC2626' : '#D97706',
                },
              },
              '& label.Mui-focused': {
                color: remarkDialog?.action === 'REJECTED' ? '#DC2626' : '#D97706',
              },
            }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
          <Button variant="outlined" disabled={remarkLoading} onClick={() => setRemarkDialog(null)} fullWidth
            sx={{ borderColor: '#E5E7EB', color: '#374151', '&:hover': { borderColor: '#9CA3AF' } }}>
            Cancel
          </Button>
          <Button variant="contained" disabled={remarkLoading} onClick={confirmRemark} fullWidth
            startIcon={remarkLoading
              ? <CircularProgress size={14} sx={{ color: '#fff' }} />
              : remarkDialog?.action === 'REJECTED'
                ? <CancelOutlinedIcon sx={{ fontSize: 16 }} />
                : <ReplyOutlinedIcon  sx={{ fontSize: 16 }} />}
            sx={{
              background: remarkDialog?.action === 'REJECTED'
                ? 'linear-gradient(135deg,#DC2626,#EF4444)'
                : 'linear-gradient(135deg,#D97706,#F59E0B)',
              boxShadow: remarkDialog?.action === 'REJECTED'
                ? '0 4px 14px rgba(220,38,38,0.3)'
                : '0 4px 14px rgba(217,119,6,0.3)',
              '&:hover': {
                background: remarkDialog?.action === 'REJECTED'
                  ? 'linear-gradient(135deg,#B91C1C,#DC2626)'
                  : 'linear-gradient(135deg,#B45309,#D97706)',
              },
            }}>
            {remarkLoading
              ? 'Submitting…'
              : remarkDialog?.action === 'REJECTED' ? 'Confirm Rejection' : 'Send Back to Vendor'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* In-progress: e.g. "Creating vendor ledger in Tally…" — stays open until the action finishes */}
      <Snackbar open={!!actionInfo} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="info" icon={<CircularProgress size={16} sx={{ color: '#1D4ED8' }} />}
          sx={{ width: '100%', maxWidth: 480, borderRadius: 2 }}>
          {actionInfo}
        </Alert>
      </Snackbar>

      {/* Success confirmation */}
      <Snackbar open={!!actionSuccess} autoHideDuration={6000} onClose={() => setActionSuccess('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setActionSuccess('')} sx={{ width: '100%', maxWidth: 480, borderRadius: 2 }}>
          {actionSuccess}
        </Alert>
      </Snackbar>

      {/* Status change / Tally action errors */}
      <Snackbar open={!!actionError} autoHideDuration={8000} onClose={() => setActionError('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="error" onClose={() => setActionError('')} sx={{ width: '100%', maxWidth: 480, borderRadius: 2 }}>
          {actionError}
        </Alert>
      </Snackbar>
    </Stack>
  )
}

// ── Pending Approvals Section ──────────────────────────────────────────────
function ApprovalsSection({ registrations, onRefresh }: {
  registrations: ApiRegistration[]; onRefresh: () => void
}) {
  const [reviewLoading, setReviewLoading] = useState<Record<number, boolean>>({})
  const [reviewDone, setReviewDone]       = useState<Record<number, string>>({})
  const [detailId, setDetailId]           = useState<number | null>(null)
  const [actionError, setActionError]     = useState('')
  const [actionInfo, setActionInfo]       = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  // Send-back dialog state
  const [sendBackId, setSendBackId]           = useState<number | null>(null)
  const [sendBackReason, setSendBackReason]   = useState('')
  const [sendBackLoading, setSendBackLoading] = useState(false)
  const [reasonError, setReasonError]         = useState('')

  const pending = registrations.filter((r) => PENDING_REVIEW_STATUSES.includes(r.registration_status))

  const handleReview = async (registrationId: number, action: 'APPROVED' | 'REJECTED') => {
    setReviewLoading((p) => ({ ...p, [registrationId]: true }))
    if (action === 'APPROVED') setActionInfo('Creating vendor ledger in Tally… please wait.')
    try {
      const res = await fetch(`/api/finance/registrations/${registrationId}/review/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        setReviewDone((p) => ({ ...p, [registrationId]: action }))
        setActionSuccess(
          action === 'APPROVED'
            ? 'Vendor approved — ledger created successfully in Tally.'
            : 'Registration rejected successfully.'
        )
        onRefresh()
      } else {
        const errBody = await res.json().catch(() => ({}))
        setActionError(errBody.detail || 'Action failed. Please try again.')
      }
    } finally {
      setReviewLoading((p) => ({ ...p, [registrationId]: false }))
      setActionInfo('')
    }
  }

  // Reject dialog state
  const [rejectId, setRejectId]           = useState<number | null>(null)
  const [rejectReason, setRejectReason]   = useState('')
  const [rejectLoading, setRejectLoading] = useState(false)
  const [rejectError, setRejectError]     = useState('')

  const openReject = (registrationId: number) => {
    setRejectId(registrationId)
    setRejectReason('')
    setRejectError('')
  }

  const confirmReject = async () => {
    if (!rejectReason.trim()) { setRejectError('Please enter a reason for rejection.'); return }
    if (!rejectId) return
    setRejectLoading(true)
    try {
      const res = await fetch(`/api/finance/registrations/${rejectId}/review/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REJECTED', remarks: rejectReason.trim() }),
      })
      if (res.ok) {
        setReviewDone((p) => ({ ...p, [rejectId]: 'REJECTED' }))
        setActionSuccess('Registration rejected successfully.')
        setRejectId(null)
        onRefresh()
      } else {
        const errBody = await res.json().catch(() => ({}))
        setActionError(errBody.detail || 'Rejection failed. Please try again.')
      }
    } finally {
      setRejectLoading(false)
    }
  }

  const openSendBack = (registrationId: number) => {
    setSendBackId(registrationId)
    setSendBackReason('')
    setReasonError('')
  }

  const confirmSendBack = async () => {
    if (!sendBackReason.trim()) { setReasonError('Please enter a reason so the vendor knows what to fix.'); return }
    if (!sendBackId) return
    setSendBackLoading(true)
    try {
      const res = await fetch(`/api/finance/registrations/${sendBackId}/review/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SEND_BACK', remarks: sendBackReason.trim() }),
      })
      if (res.ok) {
        setReviewDone((p) => ({ ...p, [sendBackId]: 'SEND_BACK' }))
        setActionSuccess('Registration sent back to vendor successfully.')
        setSendBackId(null)
        onRefresh()
      } else {
        const errBody = await res.json().catch(() => ({}))
        setActionError(errBody.detail || 'Send back failed. Please try again.')
      }
    } finally {
      setSendBackLoading(false)
    }
  }

  const cardColors = (action: string) => {
    if (action === 'APPROVED')  return { border: '#BBF7D0', bg: '#F0FFF4', divider: '#D1FAE5' }
    if (action === 'REJECTED')  return { border: '#FCA5A5', bg: '#FFF5F5', divider: '#FCA5A5' }
    if (action === 'SEND_BACK') return { border: '#FDE68A', bg: '#FFFBEB', divider: '#FDE68A' }
    return { border: '#F3F4F6', bg: '#fff', divider: '#F3F4F6' }
  }

  const doneChipProps = (action: string) => {
    if (action === 'APPROVED')  return { label: '✓ Approved',  sx: { backgroundColor: '#D1FAE5', color: '#059669' } }
    if (action === 'REJECTED')  return { label: '✗ Rejected',  sx: { backgroundColor: '#FEE2E2', color: '#DC2626' } }
    if (action === 'SEND_BACK') return { label: '↩ Sent Back', sx: { backgroundColor: '#FEF9C3', color: '#92400E' } }
    return { label: action, sx: {} }
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" color="text.primary">Pending Approvals</Typography>
        <Typography variant="caption" color="text.secondary">{pending.length} vendor registration{pending.length !== 1 ? 's' : ''} awaiting your review</Typography>
      </Box>

      {pending.length === 0 && (
        <Paper elevation={0} sx={{ border: '1px solid #F3F4F6', p: 6, textAlign: 'center' }}>
          <CheckCircleOutlinedIcon sx={{ fontSize: 48, color: '#D1D5DB', mb: 2 }} />
          <Typography variant="subtitle1" color="text.primary" sx={{ mb: 0.5 }}>All caught up!</Typography>
          <Typography variant="body2" color="text.secondary">No pending registrations to review.</Typography>
        </Paper>
      )}

      <Stack spacing={2}>
        {pending.map((r) => {
          const action = reviewDone[r.registration_id]
          const isLoading = reviewLoading[r.registration_id]
          const colors = cardColors(action ?? '')

          return (
            <Paper key={r.registration_id} elevation={0} sx={{ border: '1px solid', overflow: 'hidden', transition: 'all 0.2s', borderColor: colors.border, backgroundColor: colors.bg }}>
              <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: colors.divider }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={2}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ width: 42, height: 42, background: 'linear-gradient(135deg,#FF6B00,#FF8C33)', fontWeight: 700 }}>{r.vendor_name?.charAt(0) || '?'}</Avatar>
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
                        <Typography variant="subtitle2" color="text.primary">{r.vendor_name || '—'}</Typography>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#FF6B00', fontWeight: 700 }}>{r.registration_no}</Typography>
                        <Chip label={`Docs: ${r.document_count}/5`} size="small"
                          sx={{ backgroundColor: r.document_count === 5 ? '#F0FFF4' : '#FFF8F3', color: r.document_count === 5 ? '#059669' : '#FF6B00', fontWeight: 600, fontSize: 10, border: `1px solid ${r.document_count === 5 ? '#BBF7D0' : '#FFD4B0'}` }} />
                      </Stack>
                      <Stack direction="row" spacing={2} mt={0.4} flexWrap="wrap">
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <FingerprintIcon sx={{ fontSize: 13, color: '#9CA3AF' }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{r.pan_number}</Typography>
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <EmailOutlinedIcon sx={{ fontSize: 13, color: '#9CA3AF' }} />
                          <Typography variant="caption" color="text.secondary">{r.email}</Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">Submitted: {r.submitted_date || '—'}</Typography>
                      </Stack>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={1} flexShrink={0} alignItems="center">
                    <Button size="small" variant="outlined" startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 14 }} />}
                      onClick={() => setDetailId(r.registration_id)}
                      sx={{ fontSize: 11, borderColor: '#E5E7EB', color: '#6B7280', '&:hover': { borderColor: '#FF6B00', color: '#FF6B00', backgroundColor: '#FFF5EE' } }}>
                      View Details
                    </Button>
                    {action ? (
                      <Chip size="small" {...doneChipProps(action)} sx={{ ...doneChipProps(action).sx, fontWeight: 700, fontSize: 12 }} />
                    ) : (
                      <>
                        <Button size="small" variant="outlined" disabled={isLoading}
                          onClick={() => openReject(r.registration_id)}
                          sx={{ fontSize: 11, borderColor: '#FCA5A5', color: '#DC2626', '&:hover': { backgroundColor: '#FFF5F5', borderColor: '#DC2626' } }}>
                          Reject
                        </Button>
                        <Button size="small" variant="outlined" disabled={isLoading}
                          startIcon={<ReplyOutlinedIcon sx={{ fontSize: 14 }} />}
                          onClick={() => openSendBack(r.registration_id)}
                          sx={{ fontSize: 11, borderColor: '#FDE68A', color: '#92400E', backgroundColor: '#FFFBEB', '&:hover': { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' } }}>
                          Send Back
                        </Button>
                        <Button size="small" variant="contained" disabled={isLoading}
                          onClick={() => handleReview(r.registration_id, 'APPROVED')}
                          sx={{ fontSize: 11, background: 'linear-gradient(135deg,#059669,#10B981)', boxShadow: '0 3px 10px rgba(5,150,105,0.25)', '&:hover': { background: 'linear-gradient(135deg,#047857,#059669)' } }}>
                          {isLoading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : 'Approve'}
                        </Button>
                      </>
                    )}
                  </Stack>
                </Stack>
              </Box>

              <Box sx={{ px: 3, py: 1.75 }}>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, mb: 1 }}>Registration Details</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
                  {[
                    { label: 'GSTIN',   value: r.gstin || '—' },
                    { label: 'Mobile',  value: r.mobile || '—' },
                  ].map(({ label, value }) => (
                    <Box key={label} sx={{ minWidth: 130 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>{label}</Typography>
                      <Typography variant="caption" fontWeight={600} color="text.primary"
                        sx={{ display: 'block', fontFamily: label === 'GSTIN' ? 'monospace' : 'inherit' }}>
                        {value}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
                {r.address && (
                  <Typography sx={{ fontSize: 11, color: '#9CA3AF', mt: 1 }}>
                    <LocationOnOutlinedIcon sx={{ fontSize: 13, verticalAlign: 'middle', mr: 0.5 }} />
                    {r.address}
                  </Typography>
                )}
              </Box>
            </Paper>
          )
        })}
      </Stack>

      {/* ── Send Back dialog ── */}
      <Dialog open={sendBackId !== null} onClose={() => !sendBackLoading && setSendBackId(null)}
        maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ borderBottom: '1px solid #F3F4F6', pb: 1.5 }}>
          <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, backgroundColor: '#FEF9C3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ReplyOutlinedIcon sx={{ color: '#D97706', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#1A1A2E' }}>Send Application Back to Vendor</Typography>
              <Typography variant="caption" color="text.secondary">The vendor will be able to edit their form and re-upload documents.</Typography>
            </Box>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ pt: 2.5 }}>
          <DialogContentText sx={{ fontSize: 13.5, color: '#374151', mb: 2 }}>
            Please describe what needs to be corrected. The vendor will see this reason on their dashboard.
          </DialogContentText>
          <TextField
            label="Reason / Instructions for vendor"
            placeholder="e.g. PAN card image is blurry, please re-upload a clearer copy. Also verify your GSTIN number."
            multiline rows={4} fullWidth autoFocus
            value={sendBackReason}
            onChange={(e) => { setSendBackReason(e.target.value); if (reasonError) setReasonError('') }}
            error={!!reasonError}
            helperText={reasonError || `${sendBackReason.length}/1000`}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, '&.Mui-focused fieldset': { borderColor: '#D97706' } }, '& label.Mui-focused': { color: '#D97706' } }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
          <Button variant="outlined" disabled={sendBackLoading} onClick={() => setSendBackId(null)} fullWidth
            sx={{ borderColor: '#E5E7EB', color: '#374151', '&:hover': { borderColor: '#9CA3AF' } }}>
            Cancel
          </Button>
          <Button variant="contained" disabled={sendBackLoading} onClick={confirmSendBack} fullWidth
            startIcon={sendBackLoading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <ReplyOutlinedIcon sx={{ fontSize: 16 }} />}
            sx={{ background: 'linear-gradient(135deg,#D97706,#F59E0B)', boxShadow: '0 4px 14px rgba(217,119,6,0.3)', '&:hover': { background: 'linear-gradient(135deg,#B45309,#D97706)' } }}>
            {sendBackLoading ? 'Sending…' : 'Send Back to Vendor'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Reject dialog ── */}
      <Dialog open={rejectId !== null} onClose={() => !rejectLoading && setRejectId(null)}
        maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ borderBottom: '1px solid #F3F4F6', pb: 1.5 }}>
          <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CancelOutlinedIcon sx={{ color: '#DC2626', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#1A1A2E' }}>Reject Application</Typography>
              <Typography variant="caption" color="text.secondary">The vendor will be notified with the rejection reason.</Typography>
            </Box>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ pt: 2.5 }}>
          <DialogContentText sx={{ fontSize: 13.5, color: '#374151', mb: 2 }}>
            Please provide a clear reason for rejection. This will be shown to the vendor on their dashboard.
          </DialogContentText>
          <TextField
            label="Reason for Rejection *"
            placeholder="e.g. Documents provided are incomplete or invalid. GSTIN does not match the PAN details."
            multiline rows={4} fullWidth autoFocus
            value={rejectReason}
            onChange={(e) => { setRejectReason(e.target.value); if (rejectError) setRejectError('') }}
            error={!!rejectError}
            helperText={rejectError || `${rejectReason.length}/1000`}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, '&.Mui-focused fieldset': { borderColor: '#DC2626' } }, '& label.Mui-focused': { color: '#DC2626' } }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
          <Button variant="outlined" disabled={rejectLoading} onClick={() => setRejectId(null)} fullWidth
            sx={{ borderColor: '#E5E7EB', color: '#374151', '&:hover': { borderColor: '#9CA3AF' } }}>
            Cancel
          </Button>
          <Button variant="contained" disabled={rejectLoading} onClick={confirmReject} fullWidth
            startIcon={rejectLoading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <CancelOutlinedIcon sx={{ fontSize: 16 }} />}
            sx={{ background: 'linear-gradient(135deg,#DC2626,#EF4444)', boxShadow: '0 4px 14px rgba(220,38,38,0.3)', '&:hover': { background: 'linear-gradient(135deg,#B91C1C,#DC2626)' } }}>
            {rejectLoading ? 'Rejecting…' : 'Confirm Rejection'}
          </Button>
        </DialogActions>
      </Dialog>

      <VendorDetailDialog registrationId={detailId} open={detailId !== null} onClose={() => setDetailId(null)} />

      {/* In-progress: e.g. "Creating vendor ledger in Tally…" — stays open until the action finishes */}
      <Snackbar open={!!actionInfo} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="info" icon={<CircularProgress size={16} sx={{ color: '#1D4ED8' }} />}
          sx={{ width: '100%', maxWidth: 480, borderRadius: 2 }}>
          {actionInfo}
        </Alert>
      </Snackbar>

      {/* Success confirmation */}
      <Snackbar open={!!actionSuccess} autoHideDuration={6000} onClose={() => setActionSuccess('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setActionSuccess('')} sx={{ width: '100%', maxWidth: 480, borderRadius: 2 }}>
          {actionSuccess}
        </Alert>
      </Snackbar>

      {/* Approval/Tally action errors */}
      <Snackbar open={!!actionError} autoHideDuration={8000} onClose={() => setActionError('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="error" onClose={() => setActionError('')} sx={{ width: '100%', maxWidth: 480, borderRadius: 2 }}>
          {actionError}
        </Alert>
      </Snackbar>
    </Stack>
  )
}

// ── Document Review Section ────────────────────────────────────────────────
function DocumentsSection({ registrations }: { registrations: ApiRegistration[] }) {
  const [selectedId, setSelectedId]   = useState<number | null>(null)
  const [docs, setDocs]               = useState<ApiDocument[]>([])
  const [docsLoading, setDocsLoading] = useState(false)

  const selected = registrations.find((r) => r.registration_id === selectedId) ?? registrations[0] ?? null

  useEffect(() => {
    const id = selectedId ?? registrations[0]?.registration_id ?? null
    if (!id) return
    setDocsLoading(true)
    fetch(`/api/documents/?registration_id=${id}`)
      .then((r) => r.json())
      .then((d: ApiDocument[]) => setDocs(d))
      .catch(() => setDocs([]))
      .finally(() => setDocsLoading(false))
  }, [selectedId, registrations])

  const docMap: Record<string, ApiDocument> = {}
  docs.forEach((d) => { docMap[d.document_type] = d })

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" color="text.primary">Document Review</Typography>
        <Typography variant="caption" color="text.secondary">View and verify documents uploaded by vendors</Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2.5, minHeight: 0 }}>
        {/* Vendor list sidebar */}
        <Paper elevation={0} sx={{ width: 280, flexShrink: 0, border: '1px solid #F3F4F6', overflow: 'hidden' }}>
          <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #F3F4F6', background: 'linear-gradient(135deg,#FFF8F3,#fff)' }}>
            <Typography variant="subtitle2" color="text.primary">Select Vendor</Typography>
          </Box>
          <Box sx={{ overflowY: 'auto', maxHeight: 520 }}>
            {registrations.map((r) => {
              const isActive = (selectedId ?? registrations[0]?.registration_id) === r.registration_id
              return (
                <Box key={r.registration_id} onClick={() => setSelectedId(r.registration_id)}
                  sx={{ px: 2.5, py: 1.75, cursor: 'pointer', borderBottom: '1px solid #F9FAFB', backgroundColor: isActive ? '#FFF5EE' : 'transparent', borderLeft: isActive ? '3px solid #FF6B00' : '3px solid transparent', transition: 'all 0.15s', '&:hover': { backgroundColor: isActive ? '#FFF5EE' : '#FAFAFA' } }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 700, color: isActive ? '#FF6B00' : 'text.primary' }}>{r.vendor_name || r.pan_number}</Typography>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" mt={0.25}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{r.registration_no}</Typography>
                    <StatusChip status={r.registration_status} />
                  </Stack>
                </Box>
              )
            })}
          </Box>
        </Paper>

        {/* Documents panel */}
        <Paper elevation={0} sx={{ flex: 1, border: '1px solid #F3F4F6', overflow: 'hidden' }}>
          {selected && (
            <>
              <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #F3F4F6', background: 'linear-gradient(90deg,#FFF8F3,#fff)' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="subtitle1" color="text.primary">{selected.vendor_name || '—'}</Typography>
                    <Stack direction="row" spacing={1.5} mt={0.25} flexWrap="wrap">
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#FF6B00', fontWeight: 700 }}>{selected.registration_no}</Typography>
                      <Typography variant="caption" color="text.secondary">PAN: <strong>{selected.pan_number}</strong></Typography>
                    </Stack>
                  </Box>
                  <Chip
                    label={`${docs.filter((d) => KYC_DOC_TYPES.includes(d.document_type)).length} / 5 uploaded`}
                    size="small"
                    sx={{ backgroundColor: docs.length === 5 ? '#F0FFF4' : '#FFF5EE', color: docs.length === 5 ? '#059669' : '#FF6B00', fontWeight: 700, border: `1px solid ${docs.length === 5 ? '#BBF7D0' : '#FFD4B0'}` }}
                  />
                </Stack>
              </Box>
              <Box sx={{ p: 3 }}>
                {docsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress sx={{ color: '#FF6B00' }} />
                  </Box>
                ) : (
                  <Stack spacing={1.5}>
                    {KYC_DOC_TYPES.map((docType) => {
                      const doc = docMap[docType]
                      return (
                        <Paper key={docType} elevation={0}
                          sx={{ p: 2, border: '1px solid', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderColor: doc ? '#D1FAE5' : '#F3F4F6', backgroundColor: doc ? '#F0FFF9' : '#FAFAFA' }}>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Box sx={{ width: 36, height: 36, borderRadius: 2, backgroundColor: doc ? '#D1FAE5' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <InsertDriveFileOutlinedIcon sx={{ fontSize: 18, color: doc ? '#059669' : '#9CA3AF' }} />
                            </Box>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>{docType}</Typography>
                              {doc
                                ? <Typography variant="caption" color="#059669">{doc.file_name}</Typography>
                                : <Typography variant="caption" color="text.secondary">Not uploaded</Typography>}
                            </Box>
                          </Stack>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            {doc ? (
                              <>
                                <CheckCircleIcon sx={{ color: '#059669', fontSize: 18 }} />
                                <Button size="small" variant="outlined"
                                  startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 14 }} />}
                                  onClick={() => window.open(`/api/documents/${doc.document_id}/download/`, '_blank')}
                                  sx={{ fontSize: 11, py: 0.5, borderColor: '#D1FAE5', color: '#059669', '&:hover': { backgroundColor: '#F0FFF4', borderColor: '#059669' } }}>
                                  View
                                </Button>
                                <Button size="small" variant="outlined"
                                  startIcon={<OpenInNewOutlinedIcon sx={{ fontSize: 14 }} />}
                                  onClick={() => {
                                    const a = document.createElement('a')
                                    a.href = `/api/documents/${doc.document_id}/download/`
                                    a.download = doc.file_name
                                    a.click()
                                  }}
                                  sx={{ fontSize: 11, py: 0.5, borderColor: '#E5E7EB', color: '#6B7280', '&:hover': { borderColor: '#FF6B00', color: '#FF6B00', backgroundColor: '#FFF5EE' } }}>
                                  Download
                                </Button>
                              </>
                            ) : (
                              <Chip label="Missing" size="small"
                                sx={{ backgroundColor: '#FFF5EE', color: '#C2410C', border: '1px solid #FDBA74', fontWeight: 600, fontSize: 11 }} />
                            )}
                          </Stack>
                        </Paper>
                      )
                    })}
                  </Stack>
                )}
              </Box>
            </>
          )}
          {!selected && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Select a vendor to view documents.</Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Stack>
  )
}

// ── Reports Placeholder ───────────────────────────────────────────────────
function ReportsSection() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
      <Box textAlign="center">
        <Box sx={{ width: 72, height: 72, borderRadius: 3, backgroundColor: '#FFF5EE', border: '1px solid #FFD4B0', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
          <AssessmentOutlinedIcon sx={{ color: '#FF6B00', fontSize: 36 }} />
        </Box>
        <Typography variant="h6" color="text.primary" sx={{ mb: 0.75 }}>Reports &amp; Analytics</Typography>
        <Typography variant="body2" color="text.secondary">This section is under development.</Typography>
      </Box>
    </Box>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────
const TITLES: Record<SectionId, { title: string; sub: string }> = {
  dashboard:     { title: 'Finance Dashboard',   sub: 'Overview of vendor registrations and approvals' },
  registrations: { title: 'All Registrations',   sub: 'Browse and filter all vendor registration records' },
  approvals:     { title: 'Pending Approvals',   sub: 'Review registration form data and documents, then approve or reject' },
  documents:     { title: 'Document Review',     sub: 'Verify KYC documents submitted by vendors' },
}

export default function FinanceHome() {
  const [activeSection, setActiveSection]     = useState<SectionId>('dashboard')
  const [collapsed, setCollapsed]             = useState(false)
  const [registrations, setRegistrations]     = useState<ApiRegistration[]>([])
  const [loading, setLoading]                 = useState(true)
  const [error, setError]                     = useState('')
  const [refreshing, setRefreshing]           = useState(false)

  const fetchRegistrations = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/finance/registrations/')
      if (!res.ok) throw new Error('Failed to load registrations.')
      const data: ApiRegistration[] = await res.json()
      setRegistrations(data)
    } catch {
      setError('Failed to load registrations. Check your network and try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchRegistrations() }, [fetchRegistrations])

  const pendingCount = registrations.filter((r) => PENDING_REVIEW_STATUSES.includes(r.registration_status)).length
  const { title, sub } = TITLES[activeSection]

  const renderSection = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, flexDirection: 'column', gap: 2 }}>
          <CircularProgress sx={{ color: '#FF6B00' }} />
          <Typography variant="body2" color="text.secondary">Loading registration data…</Typography>
        </Box>
      )
    }
    if (error) {
      return (
        <Box sx={{ pt: 3 }}>
          <Alert severity="error" action={
            <Button size="small" onClick={() => fetchRegistrations(true)}>Retry</Button>
          }>{error}</Alert>
        </Box>
      )
    }
    switch (activeSection) {
      case 'dashboard':     return <DashboardSection registrations={registrations} onNavigate={setActiveSection} />
      case 'registrations': return <RegistrationsSection registrations={registrations} onRefresh={() => fetchRegistrations(true)} />
      case 'approvals':     return <ApprovalsSection registrations={registrations} onRefresh={() => fetchRegistrations(true)} />
      case 'documents':     return <DocumentsSection registrations={registrations} />
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#F7F8FA' }}>
        <Sidebar active={activeSection} onSelect={setActiveSection} collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} pendingCount={pendingCount} />
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <TopBar title={title} subtitle={sub} onRefresh={() => fetchRegistrations(true)} refreshing={refreshing} />
          <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: 3 }}>
            {renderSection()}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  )
}
