import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Box, Typography, Button, Paper, Stack, Chip, Divider,
  ThemeProvider, createTheme, CssBaseline, IconButton,
  Avatar, Tooltip, Menu, MenuItem, TextField, Alert, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined'
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined'
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import CloseIcon from '@mui/icons-material/Close'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
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
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: { styleOverrides: { root: { borderRadius: 8, textTransform: 'none', fontWeight: 600, fontSize: 13 } } },
    MuiPaper: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 7,
            backgroundColor: '#FAFAFA',
            fontSize: 13,
            '&:hover fieldset': { borderColor: '#FF6B00' },
            '&.Mui-focused fieldset': { borderColor: '#FF6B00', borderWidth: 1.5 },
            '&.Mui-focused': { backgroundColor: '#fff' },
          },
          '& .MuiInputLabel-root': { fontSize: 13 },
          '& .MuiInputLabel-root.Mui-focused': { color: '#FF6B00' },
          '& .MuiFormHelperText-root': { marginLeft: 0, fontSize: 10.5 },
        },
      },
    },
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

type ValidatorKey = 'email' | 'phone' | 'pan' | 'gstin' | 'ifsc' | 'accountNumber' | 'pincode'

const VALIDATORS: Record<ValidatorKey, (v: string) => string> = {
  email:         (v) => v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Invalid email' : '',
  phone:         (v) => v && !/^[6-9]\d{9}$/.test(v.replace(/\s/g, '')) ? 'Invalid 10-digit number' : '',
  pan:           (v) => v && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.toUpperCase()) ? 'Invalid PAN format' : '',
  gstin:         (v) => v && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v.toUpperCase()) ? 'Invalid GSTIN' : '',
  ifsc:          (v) => v && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.toUpperCase()) ? 'Invalid IFSC' : '',
  accountNumber: (v) => v && !/^\d{9,18}$/.test(v) ? 'Must be 9–18 digits' : '',
  pincode:       (v) => v && !/^\d{6}$/.test(v) ? 'Invalid pincode' : '',
}
const validate = (name: string, value: string): string =>
  (VALIDATORS as Record<string, (v: string) => string>)[name]?.(value) ?? ''

const ACCOUNT_TYPES = ['Current', 'Savings', 'Cash Credit', 'Overdraft']

interface VendorUser {
  email?: string
  registration_no?: string
  registration_status?: string
  vendor_name?: string
  registration_id?: number
}

interface FormState {
  vendorName: string
  email: string
  phone: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  pincode: string
  pan: string
  gstin: string
  goodsDescription: string
  bankName: string
  bankBranch: string
  nameAsPerBank: string
  accountNumber: string
  accountType: string
  ifsc: string
  contactPersonAE: string
}

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
            <Stack direction="row" spacing={1} sx={{ display: 'none', alignItems: 'center' }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 2, background: 'linear-gradient(135deg,#FF6B00,#FF8C33)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>V</Typography></Box>
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
      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', p: 1.25, display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end', backgroundColor: 'rgba(255,255,255,0.05)' }}>
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
    <Box component="header" sx={{ height: 64, flexShrink: 0, backgroundColor: '#fff', borderBottom: '1px solid #F3F4F6', px: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <Box>
        <Typography variant="subtitle1" sx={{ color: 'text.primary', lineHeight: 1.2 }}>Registration Form</Typography>
        <Typography variant="caption" color="text.secondary">Fill in your vendor details below</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Tooltip title="Notifications"><IconButton size="small" sx={{ color: '#9CA3AF' }}><NotificationsNoneIcon sx={{ fontSize: 20 }} /></IconButton></Tooltip>
        <Divider orientation="vertical" flexItem sx={{ height: 28, my: 'auto' }} />
        <Box onClick={(e: React.MouseEvent<HTMLDivElement>) => setAnchorEl(e.currentTarget)} sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', px: 1, py: 0.5, borderRadius: 2, '&:hover': { backgroundColor: '#FFF5EE' } }}>
          <Avatar sx={{ width: 32, height: 32, background: 'linear-gradient(135deg,#FF6B00,#FF8C33)', fontSize: 13, fontWeight: 700 }}>{(user.email || 'V').charAt(0).toUpperCase()}</Avatar>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2, maxWidth: 180 }}>{user.email || '—'}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1 }}>{user.registration_status || 'Draft'}</Typography>
          </Box>
        </Box>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} slotProps={{ paper: { elevation: 3, sx: { borderRadius: 2, minWidth: 210, mt: 1 } } }} transformOrigin={{ horizontal: 'right', vertical: 'top' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #F3F4F6' }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>{user.email || '—'}</Typography>
            <Typography variant="caption" color="text.secondary">{user.registration_no || '—'}</Typography>
          </Box>
          <MenuItem onClick={() => setAnchorEl(null)} sx={{ gap: 1.5, py: 1.2 }}><AccountCircleOutlinedIcon fontSize="small" sx={{ color: '#FF6B00' }} /><Typography variant="body2">My Profile</Typography></MenuItem>
          <MenuItem onClick={handleLogout} sx={{ gap: 1.5, py: 1.2 }}><LogoutIcon fontSize="small" sx={{ color: '#DC2626' }} /><Typography variant="body2" color="error">Sign Out</Typography></MenuItem>
        </Menu>
      </Box>
    </Box>
  )
}

// ── Section Label ─────────────────────────────────────────────────────────
interface SectionLabelProps {
  children: React.ReactNode
}

function SectionLabel({ children }: SectionLabelProps) {
  return (
    <Box sx={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
      <Box sx={{ width: 3, height: 16, borderRadius: 4, backgroundColor: '#FF6B00', flexShrink: 0 }} />
      <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#6B7280' }}>
        {children}
      </Typography>
      <Box sx={{ flex: 1, height: 1, backgroundColor: '#F3F4F6' }} />
    </Box>
  )
}

// Returns slotProps for a TextField with a start adornment icon (MUI v9 compatible).
// Defined as a function so JSX lives in a regular function body, not inside a JSX attribute.
function adornSlot(Icon: SvgIconComponent, htmlInput?: Record<string, unknown>): Record<string, unknown> {
  return {
    input: { startAdornment: <InputAdornment position="start"><Icon sx={{ color: '#FF6B00', fontSize: 17 }} /></InputAdornment> },
    ...(htmlInput && { htmlInput }),
  }
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function VendorRegistrationForm() {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading]             = useState(false)
  const [apiError, setApiError]           = useState('')
  const [confirmOpen, setConfirmOpen]     = useState(false)
  const [reviewRemarks, setReviewRemarks] = useState('')
  const [registrationPAN, setRegistrationPAN] = useState('')
  const [panMismatchOpen, setPanMismatchOpen] = useState(false)

  const user: VendorUser = JSON.parse(sessionStorage.getItem('vendor_user') || '{}')

  const [liveStatus, setLiveStatus] = useState<string>(user.registration_status || 'DRAFT')

  const READ_ONLY_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'RESUBMITTED', 'APPROVED', 'REJECTED']
  const isSentBack = liveStatus === 'SEND_BACK'
  const isReadOnly = READ_ONLY_STATUSES.includes(liveStatus)

  // Ref kept in sync so the merged form-load effect reads the correct isSentBack
  // value synchronously inside its .then() (before React re-renders with the new state).
  const isSentBackRef = useRef(isSentBack)

  const [form, setForm] = useState<FormState>({
    vendorName: user.vendor_name || '', email: user.email || '', phone: '',
    addressLine1: '', addressLine2: '', city: '', state: '', pincode: '',
    pan: '', gstin: '', goodsDescription: '',
    bankName: '', bankBranch: '', nameAsPerBank: '', accountNumber: '', accountType: '', ifsc: '',
    contactPersonAE: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  useEffect(() => { if (!user.email) navigate('/vendor-registration', { replace: true }) }, [user.email, navigate])

  useEffect(() => {
    if (!user.registration_id) return
    fetch(`/api/registration/form-data?registration_id=${user.registration_id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (!data.registration_id) return

        // Update live status first — and sync the ref before pick() runs below
        if (data.registration_status) {
          const sentBack = data.registration_status === 'SEND_BACK'
          isSentBackRef.current = sentBack      // sync ref immediately (before re-render)
          setLiveStatus(data.registration_status)
          sessionStorage.setItem('vendor_user', JSON.stringify({ ...user, registration_status: data.registration_status }))
        }

        if (data.review_remarks) setReviewRemarks(data.review_remarks)
        // Store registration PAN for submit-time validation
        if (data.pan) setRegistrationPAN(data.pan)
        const ex: Record<string, string> = data.extracted_fields || {}
        // Extractions only from documents re-uploaded AFTER the last submission.
        // These represent updated documents and take priority over the vendor's
        // previously saved values when the form is sent back for editing.
        const freshEx: Record<string, string> = data.fresh_extracted_fields || {}

        // When sent back:
        //   freshExtracted (re-uploaded doc) > saved DB value > stale OCR.
        // First-time submission:
        //   saved DB value > any OCR extraction.
        const pick = (saved: string, extracted: string, freshExtracted = '') =>
          isSentBackRef.current ? (freshExtracted || saved || extracted) : (saved || extracted)

        const matchAccountType = (raw: string) =>
          ACCOUNT_TYPES.find(
            (t) => raw.toLowerCase() === t.toLowerCase() || raw.toLowerCase().includes(t.toLowerCase())
          ) ?? ''

        setForm((prev) => ({
          ...prev,
          vendorName:       pick(data.vendor_name,      ex.vendor_name,      freshEx.vendor_name)      || prev.vendorName,
          email:            data.email                                                                   || prev.email,
          phone:            data.phone                                                                   || prev.phone,
          // PAN always comes from OCR extraction first so vendor sees what was scanned;
          // registration PAN is kept separately for submit-time validation.
          pan:              ex.pan || data.pan                                                           || prev.pan,
          gstin:            pick(data.gstin,            ex.gstin,            freshEx.gstin)             || prev.gstin,
          goodsDescription: data.goods_description                                                       || prev.goodsDescription,
          addressLine1:     pick(data.address_line1,    ex.address_line1,    freshEx.address_line1)     || prev.addressLine1,
          addressLine2:     data.address_line2                                                           || prev.addressLine2,
          city:             pick(data.city,             ex.city,             freshEx.city)              || prev.city,
          state:            pick(data.state,            ex.state,            freshEx.state)             || prev.state,
          pincode:          pick(data.pincode,          ex.pincode,          freshEx.pincode)           || prev.pincode,
          bankName:         pick(data.bank_name,        ex.bank_name,        freshEx.bank_name)         || prev.bankName,
          bankBranch:       pick(data.bank_branch,      ex.bank_branch,      freshEx.bank_branch)       || prev.bankBranch,
          // Only auto-fill account type if the value matches a predefined option;
          // otherwise leave blank so the vendor selects manually.
          accountType:      pick(
                              data.account_type,
                              ex.account_type ? matchAccountType(ex.account_type) : '',
                              freshEx.account_type ? matchAccountType(freshEx.account_type) : '',
                            )                                                                            || prev.accountType,
          ifsc:             pick(data.ifsc,             ex.ifsc,             freshEx.ifsc)              || prev.ifsc,
          accountNumber:    pick(data.account_number,   ex.account_number,   freshEx.account_number)    || prev.accountNumber,
          nameAsPerBank:    pick(data.name_as_per_bank, ex.name_as_per_bank, freshEx.name_as_per_bank)  || prev.nameAsPerBank,
          contactPersonAE:  data.contact_person_ae                                                       || prev.contactPersonAE,
        }))
      })
      .catch(() => {})
  }, [user.registration_id])

  const handleChange = (field: keyof FormState, transform?: (v: string) => string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = transform ? transform(e.target.value) : e.target.value
      setForm((p) => ({ ...p, [field]: value }))
      if (submitAttempted) setErrors((p) => ({ ...p, [field]: validate(field, value) }))
    }

  const handleBlur = (field: keyof FormState) => () =>
    setErrors((p) => ({ ...p, [field]: validate(field, form[field]) }))

  const fp = (name: keyof FormState, transform?: (v: string) => string) => ({
    value: form[name],
    onChange: handleChange(name, transform),
    onBlur: handleBlur(name),
    error: !isReadOnly && !!(errors[name] || (submitAttempted && !form[name]?.trim())),
    helperText: isReadOnly ? '' : (errors[name] || (submitAttempted && !form[name]?.trim() ? 'Required' : '')),
    size: 'small' as const,
    fullWidth: true,
    disabled: isReadOnly,
  })

  const REQUIRED: (keyof FormState)[] = [
    'vendorName', 'email', 'phone', 'addressLine1', 'city', 'state', 'pincode',
    'pan', 'gstin', 'goodsDescription',
    'bankName', 'bankBranch', 'nameAsPerBank', 'accountNumber', 'accountType', 'ifsc',
    'contactPersonAE',
  ]

  const handleSubmitClick = () => {
    setSubmitAttempted(true)
    const newErrors: Partial<Record<keyof FormState, string>> = {}
    REQUIRED.forEach((k) => {
      if (!form[k]?.trim()) newErrors[k] = 'Required'
      else { const e = validate(k, form[k]); if (e) newErrors[k] = e }
    })
    setErrors(newErrors)
    if (Object.values(newErrors).some(Boolean)) return
    // PAN in the form must match the PAN used at registration
    if (registrationPAN && form.pan.toUpperCase().trim() !== registrationPAN.toUpperCase().trim()) {
      setPanMismatchOpen(true)
      return
    }
    setConfirmOpen(true)
  }

  const doSubmit = async () => {
    setConfirmOpen(false)
    setLoading(true)
    setApiError('')
    try {
      const res = await fetch('/api/registration/submit-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_id:   user.registration_id,
          vendor_name:       form.vendorName,
          email:             form.email,
          phone:             form.phone,
          address_line1:     form.addressLine1,
          address_line2:     form.addressLine2,
          city:              form.city,
          state:             form.state,
          pincode:           form.pincode,
          pan:               form.pan,
          gstin:             form.gstin,
          goods_description: form.goodsDescription,
          bank_name:         form.bankName,
          bank_branch:       form.bankBranch,
          account_type:      form.accountType,
          ifsc:              form.ifsc,
          account_number:    form.accountNumber,
          name_as_per_bank:  form.nameAsPerBank,
          contact_person_ae: form.contactPersonAE,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setApiError(data.detail || 'Submission failed. Please try again.')
        setLoading(false)
        return
      }
      const updatedUser = { ...user, registration_status: 'SUBMITTED' }
      sessionStorage.setItem('vendor_user', JSON.stringify(updatedUser))
      setSubmitted(true)
      setTimeout(() => navigate('/vendor-registration/home'), 2000)
    } catch {
      setApiError('Network error. Please check your connection and try again.')
      setLoading(false)
    }
  }

  const hasErrors = Object.values(errors).some(Boolean)

  if (submitted) {
    return (
      <ThemeProvider theme={theme}><CssBaseline />
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#F7F8FA' }}>
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#FFF5EE,#FFE8D5)', border: '3px solid #FF6B00', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SaveOutlinedIcon sx={{ fontSize: 36, color: '#FF6B00' }} />
              </Box>
              <Typography variant="h6" color="text.primary">Form Submitted!</Typography>
              <Typography variant="body2" color="text.secondary">Redirecting to dashboard...</Typography>
            </Box>
          </Box>
        </Box>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#F7F8FA' }}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <TopBar user={user} />

          <Box sx={{ flex: 1, overflow: 'hidden', p: 2.5, display: 'flex', flexDirection: 'column' }}>
            <Paper elevation={0} sx={{ flex: 1, border: '1px solid #F3F4F6', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              <Box sx={{ px: 3, py: 1.75, borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 4, height: 22, borderRadius: 4, backgroundColor: '#FF6B00' }} />
                  <Typography variant="h6" sx={{ color: 'text.primary', fontSize: 16 }}>Vendor Registration Form</Typography>
                  {isReadOnly
                    ? <Chip icon={<LockOutlinedIcon sx={{ fontSize: '13px !important' }} />} label="View Only" size="small" sx={{ backgroundColor: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB', fontWeight: 600, fontSize: 10 }} />
                    : isSentBack
                      ? <Chip icon={<WarningAmberOutlinedIcon sx={{ fontSize: '13px !important' }} />} label="Sent Back — Edit & Resubmit" size="small" sx={{ backgroundColor: '#FEF9C3', color: '#92400E', border: '1px solid #FDE68A', fontWeight: 600, fontSize: 10 }} />
                      : <Chip label="New Application" size="small" sx={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', fontWeight: 600, fontSize: 10 }} />
                  }
                </Box>
                {!isReadOnly && (
                  <Typography variant="caption" color="text.secondary">
                    Fields marked <Box component="span" sx={{ color: '#DC2626' }}>*</Box> are mandatory
                  </Typography>
                )}
              </Box>

              <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2 }}>
                {isSentBack && (
                  <Alert severity="warning" icon={<WarningAmberOutlinedIcon fontSize="small" />}
                    sx={{ mb: 2, borderRadius: 2, py: 0.75, fontSize: 12, backgroundColor: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A', '& .MuiAlert-icon': { color: '#D97706' } }}>
                    <strong>Application Sent Back</strong> — Please review the finance team's comments below, make the necessary corrections, and resubmit.
                    {reviewRemarks && (
                      <Box sx={{ mt: 0.75, p: 1, backgroundColor: '#FEF3C7', borderRadius: 1, border: '1px solid #FDE68A' }}>
                        <Typography sx={{ fontSize: 12, color: '#92400E', fontStyle: 'italic' }}>"{reviewRemarks}"</Typography>
                      </Box>
                    )}
                  </Alert>
                )}
                {isReadOnly && (
                  <Alert severity="info" icon={<LockOutlinedIcon fontSize="small" />}
                    sx={{ mb: 2, borderRadius: 2, py: 0.75, fontSize: 12, backgroundColor: '#F0F7FF', color: '#1D4ED8', border: '1px solid #BFDBFE', '& .MuiAlert-icon': { color: '#1D4ED8' } }}>
                    <strong>View Only</strong> — This form has been submitted and cannot be edited. Contact support if changes are needed.
                  </Alert>
                )}
                {apiError && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 2, py: 0.5, fontSize: 12 }} onClose={() => setApiError('')}>
                    {apiError}
                  </Alert>
                )}
                {submitAttempted && hasErrors && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 2, py: 0.5, fontSize: 12 }}>
                    Please fill in all required fields correctly before submitting.
                  </Alert>
                )}

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px 20px' }}>

                  <SectionLabel>Company &amp; Contact</SectionLabel>

                  <Box sx={{ gridColumn: 'span 2' }}>
                    <TextField label="Vendor / Company Name *" placeholder="e.g. Acme Technologies Pvt. Ltd."
                      slotProps={adornSlot(BusinessOutlinedIcon)}
                      {...fp('vendorName')} />
                  </Box>
                  <Box>
                    <TextField label="Email Address *" type="email" placeholder="contact@company.com"
                      slotProps={adornSlot(EmailOutlinedIcon)}
                      {...fp('email')} />
                  </Box>
                  <Box>
                    <TextField label="Contact Number *" placeholder="10-digit mobile"
                      slotProps={adornSlot(PhoneOutlinedIcon, { maxLength: 10 })}
                      {...fp('phone')} />
                  </Box>

                  <SectionLabel>Tax Information &amp; Goods</SectionLabel>

                  <Box>
                    <TextField label="PAN *" placeholder="ABCDE1234F"
                      slotProps={adornSlot(CreditCardOutlinedIcon, { maxLength: 10, style: { textTransform: 'uppercase', letterSpacing: 2, fontFamily: 'monospace' } })}
                      {...fp('pan', (v) => v.toUpperCase())} />
                  </Box>
                  <Box>
                    <TextField label="GSTIN *" placeholder="27ABCDE1234F1Z5"
                      slotProps={adornSlot(CreditCardOutlinedIcon, { maxLength: 15, style: { textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: 'monospace' } })}
                      {...fp('gstin', (v) => v.toUpperCase())} />
                  </Box>
                  <Box sx={{ gridColumn: 'span 2' }}>
                    <TextField label="Goods / Services Description *" placeholder="Describe products or services offered..."
                      slotProps={adornSlot(InventoryOutlinedIcon)}
                      {...fp('goodsDescription')} />
                  </Box>

                  <SectionLabel>Address</SectionLabel>

                  <Box sx={{ gridColumn: 'span 2' }}>
                    <TextField label="Address Line 1 *" placeholder="Building / Plot no. / Street"
                      slotProps={adornSlot(LocationOnOutlinedIcon)}
                      {...fp('addressLine1')} />
                  </Box>
                  <Box sx={{ gridColumn: 'span 2' }}>
                    <TextField label="Address Line 2" placeholder="Area / Locality / Landmark (optional)"
                      value={form.addressLine2} onChange={handleChange('addressLine2')} size="small" fullWidth disabled={isReadOnly} />
                  </Box>
                  <Box><TextField label="City *" placeholder="e.g. Mumbai" {...fp('city')} /></Box>
                  <Box><TextField label="State *" placeholder="e.g. Maharashtra" {...fp('state')} /></Box>
                  <Box><TextField label="PIN Code *" placeholder="6-digit" slotProps={{ htmlInput: { maxLength: 6 } }} {...fp('pincode')} /></Box>

                  <SectionLabel>Bank Account Details</SectionLabel>

                  <Box>
                    <TextField label="Bank Name *" placeholder="e.g. State Bank of India"
                      slotProps={adornSlot(AccountBalanceOutlinedIcon)}
                      {...fp('bankName')} />
                  </Box>
                  <Box><TextField label="Bank Branch *" placeholder="e.g. Andheri West" {...fp('bankBranch')} /></Box>
                  <Box>
                    <TextField label="Account Type *" select
                      value={form.accountType}
                      onChange={handleChange('accountType')}
                      onBlur={handleBlur('accountType')}
                      error={!isReadOnly && !!(errors.accountType || (submitAttempted && !form.accountType))}
                      helperText={isReadOnly ? '' : (errors.accountType || (submitAttempted && !form.accountType ? 'Required' : ''))}
                      size="small" fullWidth disabled={isReadOnly}>
                      <MenuItem value="" disabled><Typography sx={{ color: 'text.secondary', fontSize: 13 }}>Select type</Typography></MenuItem>
                      {ACCOUNT_TYPES.map((t) => <MenuItem key={t} value={t} sx={{ fontSize: 13 }}>{t}</MenuItem>)}
                    </TextField>
                  </Box>
                  <Box>
                    <TextField label="IFSC Code *" placeholder="SBIN0001234"
                      slotProps={{ htmlInput: { maxLength: 11, style: { textTransform: 'uppercase', fontFamily: 'monospace' } } }}
                      {...fp('ifsc', (v) => v.toUpperCase())} />
                  </Box>
                  <Box sx={{ gridColumn: 'span 2' }}>
                    <TextField label="Account Number *" placeholder="9–18 digit account number"
                      slotProps={{ htmlInput: { maxLength: 18, style: { fontFamily: 'monospace' } } }}
                      {...fp('accountNumber')} />
                  </Box>
                  <Box sx={{ gridColumn: 'span 2' }}>
                    <TextField label="Name as per Bank *" placeholder="Exact name as printed on cancelled cheque"
                      slotProps={adornSlot(PersonOutlinedIcon)}
                      {...fp('nameAsPerBank')} />
                  </Box>

                  <SectionLabel>Internal Reference</SectionLabel>

                  <Box sx={{ gridColumn: 'span 2' }}>
                    <TextField label="Internal Contact (AE) *" placeholder="Full name of your AutomationEdge point of contact"
                      slotProps={adornSlot(PersonOutlinedIcon)}
                      {...fp('contactPersonAE')} />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      The AutomationEdge employee who initiated or is sponsoring this registration.
                    </Typography>
                  </Box>

                </Box>
              </Box>

              <Box sx={{ px: 3, py: 1.75, borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                  🔒 Data encrypted in transit · Used for KYC purposes only
                </Typography>
                {isReadOnly ? (
                  <Button variant="outlined" startIcon={<CloseIcon />}
                    onClick={() => navigate('/vendor-registration/home')}
                    sx={{ borderColor: '#E5E7EB', color: '#6B7280', '&:hover': { borderColor: '#1A1A2E', color: '#1A1A2E' } }}>
                    Back to Dashboard
                  </Button>
                ) : (
                  <Stack direction="row" spacing={1.5}>
                    <Button variant="outlined" startIcon={<CloseIcon />}
                      onClick={() => navigate('/vendor-registration/home')}
                      sx={{ borderColor: '#E5E7EB', color: '#6B7280', '&:hover': { borderColor: '#1A1A2E', color: '#1A1A2E' } }}>
                      Cancel
                    </Button>
                    <Button variant="contained" startIcon={<SaveOutlinedIcon />}
                      onClick={handleSubmitClick}
                      disabled={loading}
                      sx={{ px: 3, background: 'linear-gradient(135deg,#FF6B00,#FF8C33)', boxShadow: '0 4px 14px rgba(255,107,0,0.25)', '&:hover': { background: 'linear-gradient(135deg,#CC5500,#FF6B00)' }, '&.Mui-disabled': { opacity: 0.7 } }}>
                      {loading ? 'Submitting...' : 'Save Form'}
                    </Button>
                  </Stack>
                )}
              </Box>

            </Paper>
          </Box>
        </Box>
      </Box>

      {/* Confirmation dialog — full form summary before submission */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, display: 'flex', flexDirection: 'column', maxHeight: '90vh' } } }}>

        {/* Header */}
        <DialogTitle sx={{ borderBottom: '1px solid #F3F4F6', py: 1.75, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2, backgroundColor: '#FFF5EE', border: '1px solid #FFD4B0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <WarningAmberOutlinedIcon sx={{ color: '#FF6B00', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#1A1A2E' }}>Confirm Submission</Typography>
              <Typography sx={{ fontSize: 11.5, color: '#6B7280' }}>Review your details carefully — the form cannot be edited after submission.</Typography>
            </Box>
          </Box>
        </DialogTitle>

        {/* Scrollable form summary */}
        <DialogContent sx={{ px: 2.5, py: 2, overflowY: 'auto', flex: 1 }}>

          {/* ── Business Information ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
            <Box sx={{ width: 3, height: 14, borderRadius: 4, backgroundColor: '#FF6B00' }} />
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.9 }}>Business Information</Typography>
          </Box>
          <Paper elevation={0} sx={{ border: '1px solid #F3F4F6', borderRadius: 2, mb: 2, overflow: 'hidden' }}>
            {([
              { label: 'Vendor Name',        value: form.vendorName },
              { label: 'Email',              value: form.email },
              { label: 'Phone',              value: form.phone },
              { label: 'PAN',                value: form.pan.toUpperCase(), mono: true },
              { label: 'GSTIN',              value: form.gstin.toUpperCase(), mono: true },
              { label: 'Goods / Services',   value: form.goodsDescription },
            ] as { label: string; value: string; mono?: boolean }[]).map(({ label, value, mono }, i, arr) => (
              <Box key={label} sx={{ px: 2, py: 1, display: 'flex', gap: 2, borderBottom: i < arr.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                <Typography sx={{ fontSize: 11.5, color: '#9CA3AF', minWidth: 130, flexShrink: 0 }}>{label}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: value ? '#1A1A2E' : '#D1D5DB', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value || '—'}</Typography>
              </Box>
            ))}
          </Paper>

          {/* ── Address ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
            <Box sx={{ width: 3, height: 14, borderRadius: 4, backgroundColor: '#7C3AED' }} />
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.9 }}>Address</Typography>
          </Box>
          <Paper elevation={0} sx={{ border: '1px solid #F3F4F6', borderRadius: 2, mb: 2, overflow: 'hidden' }}>
            {([
              { label: 'Address Line 1', value: form.addressLine1 },
              { label: 'Address Line 2', value: form.addressLine2 },
              { label: 'City',           value: form.city },
              { label: 'State',          value: form.state },
              { label: 'Pincode',        value: form.pincode },
            ] as { label: string; value: string }[]).map(({ label, value }, i, arr) => (
              <Box key={label} sx={{ px: 2, py: 1, display: 'flex', gap: 2, borderBottom: i < arr.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                <Typography sx={{ fontSize: 11.5, color: '#9CA3AF', minWidth: 130, flexShrink: 0 }}>{label}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: value ? '#1A1A2E' : '#D1D5DB' }}>{value || '—'}</Typography>
              </Box>
            ))}
          </Paper>

          {/* ── Bank Details ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
            <Box sx={{ width: 3, height: 14, borderRadius: 4, backgroundColor: '#0369A1' }} />
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.9 }}>Bank Details</Typography>
          </Box>
          <Paper elevation={0} sx={{ border: '1px solid #F3F4F6', borderRadius: 2, mb: 2, overflow: 'hidden' }}>
            {([
              { label: 'Bank Name',       value: form.bankName },
              { label: 'Branch',          value: form.bankBranch },
              { label: 'Account Holder',  value: form.nameAsPerBank },
              { label: 'Account Number',  value: form.accountNumber, mono: true },
              { label: 'IFSC Code',       value: form.ifsc.toUpperCase(), mono: true },
              { label: 'Account Type',    value: form.accountType },
            ] as { label: string; value: string; mono?: boolean }[]).map(({ label, value, mono }, i, arr) => (
              <Box key={label} sx={{ px: 2, py: 1, display: 'flex', gap: 2, borderBottom: i < arr.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                <Typography sx={{ fontSize: 11.5, color: '#9CA3AF', minWidth: 130, flexShrink: 0 }}>{label}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: value ? '#1A1A2E' : '#D1D5DB', fontFamily: mono ? 'monospace' : 'inherit' }}>{value || '—'}</Typography>
              </Box>
            ))}
          </Paper>

          {/* ── Internal Contact ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
            <Box sx={{ width: 3, height: 14, borderRadius: 4, backgroundColor: '#059669' }} />
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.9 }}>Internal Contact (AE)</Typography>
          </Box>
          <Paper elevation={0} sx={{ border: '1px solid #F3F4F6', borderRadius: 2, mb: 2, overflow: 'hidden' }}>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography sx={{ fontSize: 11.5, color: '#9CA3AF', mb: 0.25 }}>Contact Person</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: form.contactPersonAE ? '#1A1A2E' : '#D1D5DB' }}>{form.contactPersonAE || '—'}</Typography>
            </Box>
          </Paper>

          {/* Warning note */}
          <Box sx={{ px: 1.5, py: 1.25, backgroundColor: '#FFF8F3', borderRadius: 2, border: '1px solid #FFD4B0', display: 'flex', gap: 1 }}>
            <WarningAmberOutlinedIcon sx={{ fontSize: 15, color: '#FF6B00', flexShrink: 0, mt: 0.1 }} />
            <Typography sx={{ fontSize: 11.5, color: '#C2410C', lineHeight: 1.5 }}>
              Once submitted, <strong>you cannot edit this form</strong>. Your application will be reviewed by the finance team.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 1.5, gap: 1, borderTop: '1px solid #F3F4F6', flexShrink: 0 }}>
          <Button variant="outlined" onClick={() => setConfirmOpen(false)} fullWidth
            sx={{ borderColor: '#E5E7EB', color: '#374151', '&:hover': { borderColor: '#9CA3AF', backgroundColor: '#F9FAFB' } }}>
            Go Back &amp; Review
          </Button>
          <Button variant="contained" onClick={doSubmit} fullWidth
            sx={{ background: 'linear-gradient(135deg,#FF6B00,#FF8C33)', boxShadow: '0 4px 14px rgba(255,107,0,0.25)', '&:hover': { background: 'linear-gradient(135deg,#CC5500,#FF6B00)' } }}>
            Confirm &amp; Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── PAN Mismatch Dialog ── */}
      <Dialog open={panMismatchOpen} onClose={() => setPanMismatchOpen(false)} maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ borderBottom: '1px solid #F3F4F6', py: 1.75 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <WarningAmberOutlinedIcon sx={{ fontSize: 20, color: '#DC2626' }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#1A1A2E' }}>PAN Number Mismatch</Typography>
              <Typography sx={{ fontSize: 11.5, color: '#6B7280' }}>Form cannot be submitted until this is resolved</Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5, pb: 1 }}>
          <Alert severity="error" sx={{ mb: 2.5, fontSize: 12.5 }}>
            The PAN entered in the form does not match the PAN used at registration. Please correct it to proceed.
          </Alert>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ p: 1.5, borderRadius: 1.5, border: '1px solid #FCA5A5', backgroundColor: '#FFF5F5' }}>
              <Typography sx={{ fontSize: 10.5, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.5 }}>
                Registered PAN (must match)
              </Typography>
              <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: '#059669', letterSpacing: 2 }}>
                {registrationPAN}
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, borderRadius: 1.5, border: '1px solid #FDBA74', backgroundColor: '#FFF8F3' }}>
              <Typography sx={{ fontSize: 10.5, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.5 }}>
                PAN currently in form
              </Typography>
              <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: '#DC2626', letterSpacing: 2 }}>
                {form.pan || '—'}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 1.5 }}>
          <Button fullWidth variant="contained" onClick={() => setPanMismatchOpen(false)}
            sx={{ background: 'linear-gradient(135deg,#FF6B00,#FF8C33)', '&:hover': { background: 'linear-gradient(135deg,#CC5500,#FF6B00)' } }}>
            Go Back &amp; Fix PAN
          </Button>
        </DialogActions>
      </Dialog>

    </ThemeProvider>
  )
}
