import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Box, Typography, Button, Paper, Stack, Chip, Divider,
  ThemeProvider, createTheme, CssBaseline, IconButton,
  Avatar, Tooltip, Menu, MenuItem,
} from '@mui/material'
import type { SvgIconProps } from '@mui/material'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import FingerprintIcon from '@mui/icons-material/Fingerprint'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import ReplyOutlinedIcon from '@mui/icons-material/ReplyOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import type { SvgIconComponent } from '@mui/icons-material'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#FF6B00', light: '#FF8C33', dark: '#CC5500', contrastText: '#fff' },
    secondary: { main: '#1A1A2E' },
    background: { default: '#F7F8FA', paper: '#FFFFFF' },
    text: { primary: '#1A1A2E', secondary: '#6B7280' },
    success: { main: '#16A34A' },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
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

interface VendorUser {
  registration_id?: number
  registration_no?: string
  vendor_name?: string
  email?: string
  must_change_password?: string
  registration_status?: string
}

interface OnboardingStepData {
  label: string
  description: string
  done: boolean
  action?: string
  actionLabel?: string
  viewAction?: string
  viewLabel?: string
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
    <Box sx={{ width: collapsed ? SIDEBAR_MINI : SIDEBAR_FULL, minHeight: '100vh', backgroundColor: '#1A1A2E', display: 'flex', flexDirection: 'column', flexShrink: 0, transition: 'width 0.22s ease', overflow: 'hidden' }}>
      <Box sx={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', px: collapsed ? 1 : 2.5, borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, overflow: 'hidden' }}>
        {collapsed ? (
          <Box sx={{ width: 38, height: 38, borderRadius: 2, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <Box
              component="img" src="/images/ae.png" alt="Logo"
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                e.currentTarget.style.display = 'none'
                const sib = e.currentTarget.nextSibling as HTMLElement | null
                if (sib) sib.style.display = 'flex'
              }}
              sx={{ width: 32, height: 32, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
            />
            <Typography sx={{ display: 'none', color: '#fff', fontWeight: 800, fontSize: 15 }}>V</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <Box
              component="img" src="/images/ae.png" alt="Company Logo"
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                e.currentTarget.style.display = 'none'
                const sib = e.currentTarget.nextSibling as HTMLElement | null
                if (sib) sib.style.display = 'flex'
              }}
              sx={{ height: 38, maxWidth: 160, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
            />
            <Stack direction="row" alignItems="center" spacing={1} sx={{ display: 'none' }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 2, background: 'linear-gradient(135deg, #FF6B00, #FF8C33)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>V</Typography>
              </Box>
              <Box>
                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.2, whiteSpace: 'nowrap' }}>Vendor Portal</Typography>
              </Box>
            </Stack>
          </Box>
        )}
      </Box>

      <Box sx={{ flex: 1, py: 1.5 }}>
        {NAV_ITEMS.map(({ label, Icon, path }) => {
          const active = pathname === path
          return (
            <Tooltip key={path} title={collapsed ? label : ''} placement="right" arrow>
              <Box
                onClick={() => navigate(path)}
                sx={{ mx: 1, mb: 0.5, px: collapsed ? 0 : 2, py: 1.2, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 1.5, cursor: 'pointer', backgroundColor: active ? '#FF6B00' : 'transparent', transition: 'background-color 0.15s', '&:hover': { backgroundColor: active ? '#FF6B00' : 'rgba(255,255,255,0.07)' } }}
              >
                <Icon sx={{ fontSize: 20, flexShrink: 0, color: active ? '#fff' : 'rgba(255,255,255,0.6)' }} />
                {!collapsed && (
                  <Typography sx={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#fff' : 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap' }}>
                    {label}
                  </Typography>
                )}
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

  const handleLogout = () => {
    sessionStorage.removeItem('vendor_user')
    navigate('/vendor-registration')
  }

  return (
    <Box component="header" sx={{ height: 64, flexShrink: 0, backgroundColor: '#fff', borderBottom: '1px solid #F3F4F6', px: { xs: 2, sm: 3 }, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <Box>
        <Typography variant="subtitle1" color="text.primary" lineHeight={1.2}>Vendor Dashboard</Typography>
        <Typography variant="caption" color="text.secondary">{user.registration_no || 'Registration pending'}</Typography>
      </Box>

      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Tooltip title="Notifications">
          <IconButton size="small" sx={{ color: '#9CA3AF' }}>
            <NotificationsNoneIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ height: 28, my: 'auto' }} />

        <Stack
          direction="row" alignItems="center" spacing={1}
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ cursor: 'pointer', px: 1, py: 0.5, borderRadius: 2, '&:hover': { backgroundColor: '#FFF5EE' } }}
        >
          <Avatar sx={{ width: 32, height: 32, background: 'linear-gradient(135deg, #FF6B00, #FF8C33)', fontSize: 13, fontWeight: 700 }}>
            {(user.email || 'V').charAt(0).toUpperCase()}
          </Avatar>
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
          <MenuItem onClick={() => setAnchorEl(null)} sx={{ gap: 1.5, py: 1.2 }}>
            <AccountCircleOutlinedIcon fontSize="small" sx={{ color: '#FF6B00' }} />
            <Typography variant="body2">My Profile</Typography>
          </MenuItem>
          <MenuItem onClick={handleLogout} sx={{ gap: 1.5, py: 1.2 }}>
            <LogoutIcon fontSize="small" sx={{ color: '#DC2626' }} />
            <Typography variant="body2" color="error">Sign Out</Typography>
          </MenuItem>
        </Menu>
      </Stack>
    </Box>
  )
}

// ── Onboarding Step ───────────────────────────────────────────────────────
interface OnboardingStepProps {
  step: OnboardingStepData
  index: number
  total: number
}

function OnboardingStep({ step, index, total }: OnboardingStepProps) {
  const navigate = useNavigate()
  const isLast = index === total - 1

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        {step.done
          ? <CheckCircleIcon sx={{ color: '#FF6B00', fontSize: 28 }} />
          : <RadioButtonUncheckedIcon sx={{ color: '#D1D5DB', fontSize: 28 }} />}
        {!isLast && <Box sx={{ width: 2, flex: 1, minHeight: 24, my: 0.5, backgroundColor: step.done ? '#FFB87A' : '#E5E7EB' }} />}
      </Box>

      <Box sx={{ flex: 1, pb: isLast ? 0 : 2 }}>
        <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: step.done ? '#FFD4B0' : '#E5E7EB', backgroundColor: step.done ? '#FFF8F3' : '#FAFAFA' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={3}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700} color={step.done ? '#CC5500' : 'text.primary'}>{step.label}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', lineHeight: 1.5 }}>{step.description}</Typography>
            </Box>
            {step.done ? (
              <Stack direction="row" alignItems="center" spacing={1} flexShrink={0}>
                <Chip label="Completed" size="small" sx={{ backgroundColor: '#FFF5EE', color: '#FF6B00', fontWeight: 700, fontSize: 11 }} />
                {step.viewAction && (
                  <Button size="small" variant="outlined" startIcon={<VisibilityOutlinedIcon sx={{ fontSize: '14px !important' }} />}
                    onClick={() => navigate(step.viewAction!)}
                    sx={{ fontSize: 12, py: 0.7, px: 1.5, flexShrink: 0, borderColor: '#FFD4B0', color: '#FF6B00', '&:hover': { borderColor: '#FF6B00', backgroundColor: '#FFF5EE' } }}>
                    {step.viewLabel || 'View'}
                  </Button>
                )}
              </Stack>
            ) : step.action ? (
              <Button size="small" variant="contained" endIcon={<ArrowForwardIcon sx={{ fontSize: '14px !important' }} />} onClick={() => navigate(step.action!)}
                sx={{ fontSize: 12, py: 0.7, px: 2.5, flexShrink: 0, whiteSpace: 'nowrap', background: 'linear-gradient(135deg, #FF6B00, #FF8C33)', boxShadow: '0 2px 8px rgba(255,107,0,0.25)', '&:hover': { background: 'linear-gradient(135deg, #CC5500, #FF6B00)' } }}>
                {step.actionLabel}
              </Button>
            ) : (
              <Chip label="Pending" size="small" variant="outlined" sx={{ color: '#9CA3AF', borderColor: '#E5E7EB', fontWeight: 500, fontSize: 11, flexShrink: 0 }} />
            )}
          </Stack>
        </Paper>
      </Box>
    </Box>
  )
}

// ── Info Card ─────────────────────────────────────────────────────────────
interface InfoCardProps {
  icon: React.ComponentType<SvgIconProps>
  label: string
  value?: string
}

function InfoCard({ icon: Icon, label, value }: InfoCardProps) {
  return (
    <Paper elevation={0} sx={{ flex: 1, minWidth: 180, p: 2.5, border: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ width: 44, height: 44, borderRadius: 2, backgroundColor: '#FFF5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon sx={{ color: '#FF6B00', fontSize: 22 }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
        <Typography variant="subtitle1" color="text.primary" noWrap sx={{ maxWidth: 200 }}>{value || '—'}</Typography>
      </Box>
    </Paper>
  )
}

const TOTAL_DOCS = 6

// ── Main Page ─────────────────────────────────────────────────────────────
export default function VendorHome() {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [uploadedDocCount, setUploadedDocCount] = useState<number | null>(null)

  const user: VendorUser = JSON.parse(sessionStorage.getItem('vendor_user') || '{}')

  // Live status + remarks — starts from cached session, refreshed on every page load
  const [liveStatus, setLiveStatus]       = useState<string>(user.registration_status || 'DRAFT')
  const [reviewRemarks, setReviewRemarks] = useState('')

  useEffect(() => {
    if (!user.email) {
      navigate('/vendor-registration', { replace: true })
    }
  }, [user.email, navigate])

  // Fetch latest registration status and remarks from backend
  useEffect(() => {
    if (!user.registration_id) return
    fetch(`/api/registration/form-data?registration_id=${user.registration_id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { registration_status?: string; review_remarks?: string }) => {
        const fresh = data.registration_status
        if (fresh) {
          if (fresh !== liveStatus) {
            setLiveStatus(fresh)
            const updated = { ...user, registration_status: fresh }
            sessionStorage.setItem('vendor_user', JSON.stringify(updated))
          }
          setReviewRemarks(data.review_remarks || '')
        }
      })
      .catch(() => {})
  }, [user.registration_id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user.registration_id) return
    fetch(`/api/documents/?registration_id=${user.registration_id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((docs: Array<{ document_id: number }>) => setUploadedDocCount(docs.length))
      .catch(() => setUploadedDocCount(0))
  }, [user.registration_id])

  const isSentBack   = liveStatus === 'SEND_BACK'
  const isApproved   = liveStatus === 'APPROVED'

  const ONBOARDING_STEPS: OnboardingStepData[] = [
    {
      label: 'Account Created',
      description: `Registration number ${user.registration_no || '—'} assigned. Login credentials sent to your email.`,
      done: true,
    },
    {
      label: 'Upload KYC Documents',
      description: 'Upload PAN card, GST certificate, cancelled cheque, and other compliance documents (all optional).',
      done: !isSentBack && uploadedDocCount !== null && uploadedDocCount > 0,
      action: '/vendor-registration/upload-documents',
      actionLabel: isSentBack
        ? 'Re-upload Documents'
        : uploadedDocCount !== null && uploadedDocCount > 0
          ? `Uploaded (${uploadedDocCount}/${TOTAL_DOCS})`
          : 'Upload Documents',
      viewAction: '/vendor-registration/upload-documents',
      viewLabel: 'View Documents',
    },
    {
      label: 'Complete Registration Form',
      description: 'Provide your business details, PAN, GSTIN, bank account information, and internal reference.',
      done: !isSentBack && ['SUBMITTED', 'UNDER_REVIEW', 'RESUBMITTED', 'APPROVED', 'REJECTED'].includes(liveStatus),
      action: '/vendor-registration/form',
      actionLabel: isSentBack ? 'Edit & Resubmit' : 'Fill Form',
      viewAction: '/vendor-registration/form',
      viewLabel: 'View Form',
    },
    {
      label: 'Finance Review & Approval',
      description: 'Your application will be reviewed by the finance team. This typically takes 3–5 business days.',
      done: isApproved,
    },
  ]

  const completedCount = ONBOARDING_STEPS.filter((s) => s.done).length

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F7F8FA' }}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <TopBar user={user} />

          <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3} flexWrap="wrap">
              <InfoCard icon={FingerprintIcon} label="Registration No." value={user.registration_no} />
              <InfoCard icon={EmailOutlinedIcon} label="Registered Email" value={user.email} />
              <InfoCard icon={DescriptionOutlinedIcon} label="Application Status" value={liveStatus} />
            </Stack>

            {isSentBack && (
              <Paper elevation={0} sx={{ mb: 3, border: '1px solid #FDE68A', borderRadius: 3, overflow: 'hidden' }}>
                <Box sx={{ px: 2.5, py: 1.5, backgroundColor: '#FEF3C7', borderBottom: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: 2, backgroundColor: '#FEF9C3', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ReplyOutlinedIcon sx={{ color: '#D97706', fontSize: 18 }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>Application Sent Back — Action Required</Typography>
                    <Typography sx={{ fontSize: 11.5, color: '#B45309' }}>Please address the finance team's comments, update your documents / form, and resubmit.</Typography>
                  </Box>
                </Box>
                {reviewRemarks ? (
                  <Box sx={{ px: 2.5, py: 2, backgroundColor: '#FFFBEB' }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, mb: 1 }}>Comments from Finance Team</Typography>
                    <Box sx={{ px: 2, py: 1.5, backgroundColor: '#FEF3C7', borderRadius: 2, border: '1px solid #FDE68A', borderLeft: '4px solid #D97706' }}>
                      <Typography sx={{ fontSize: 13, color: '#92400E', lineHeight: 1.6, fontStyle: 'italic' }}>"{reviewRemarks}"</Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ px: 2.5, py: 1.5, backgroundColor: '#FFFBEB' }}>
                    <Typography sx={{ fontSize: 12.5, color: '#B45309' }}>Please review your documents and registration form, correct any issues, and resubmit.</Typography>
                  </Box>
                )}
              </Paper>
            )}

            {liveStatus === 'REJECTED' && (
              <Paper elevation={0} sx={{ mb: 3, border: '1px solid #FCA5A5', borderRadius: 3, overflow: 'hidden' }}>
                <Box sx={{ px: 2.5, py: 1.5, backgroundColor: '#FEE2E2', borderBottom: '1px solid #FCA5A5', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: 2, backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CancelOutlinedIcon sx={{ color: '#DC2626', fontSize: 18 }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#991B1B' }}>Application Rejected</Typography>
                    <Typography sx={{ fontSize: 11.5, color: '#B91C1C' }}>Your vendor registration application has been rejected by the finance team.</Typography>
                  </Box>
                </Box>
                {reviewRemarks ? (
                  <Box sx={{ px: 2.5, py: 2, backgroundColor: '#FFF5F5' }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, mb: 1 }}>Reason from Finance Team</Typography>
                    <Box sx={{ px: 2, py: 1.5, backgroundColor: '#FEE2E2', borderRadius: 2, border: '1px solid #FCA5A5', borderLeft: '4px solid #DC2626' }}>
                      <Typography sx={{ fontSize: 13, color: '#991B1B', lineHeight: 1.6, fontStyle: 'italic' }}>"{reviewRemarks}"</Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ px: 2.5, py: 1.5, backgroundColor: '#FFF5F5' }}>
                    <Typography sx={{ fontSize: 12.5, color: '#B91C1C' }}>Please contact support for more information.</Typography>
                  </Box>
                )}
              </Paper>
            )}

            <Paper elevation={0} sx={{ border: '1px solid #F3F4F6', p: { xs: 2.5, sm: 3 } }}>
              <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
                <AssignmentOutlinedIcon sx={{ color: '#FF6B00', fontSize: 20 }} />
                <Typography variant="subtitle1" color="text.primary">Onboarding Checklist</Typography>
                <Chip label={`${completedCount} / ${ONBOARDING_STEPS.length} completed`} size="small" sx={{ backgroundColor: '#FFF5EE', color: '#FF6B00', fontWeight: 700, fontSize: 11 }} />
              </Stack>

              <Box>
                {ONBOARDING_STEPS.map((step, i) => (
                  <OnboardingStep key={step.label} step={step} index={i} total={ONBOARDING_STEPS.length} />
                ))}
              </Box>
            </Paper>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  )
}
