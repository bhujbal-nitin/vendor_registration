import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  Stack,
  Divider,
  Alert,
  Link,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Chip,
  CircularProgress,
} from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import FingerprintIcon from '@mui/icons-material/Fingerprint'
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined'
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined'
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import type { SxProps, Theme } from '@mui/material'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#FF6B00',
      light: '#FF8C33',
      dark: '#CC5500',
      contrastText: '#ffffff',
    },
    secondary: { main: '#1A1A2E' },
    background: { default: '#FFFFFF', paper: '#FFFFFF' },
    text: { primary: '#1A1A2E', secondary: '#6B7280' },
    divider: '#F3F4F6',
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
    h4: { fontWeight: 800, letterSpacing: '-0.5px' },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    body2: { fontSize: '0.875rem' },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 9,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.95rem',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 9,
            backgroundColor: '#FAFAFA',
            transition: 'all 0.2s',
            '&:hover': { backgroundColor: '#FFF5EE' },
            '&.Mui-focused': {
              backgroundColor: '#FFF5EE',
              '& fieldset': { borderColor: '#FF6B00', borderWidth: 2 },
            },
          },
        },
      },
    },
  },
})

const primaryBtnSx: SxProps<Theme> = {
  py: 1.4,
  background: 'linear-gradient(135deg, #FF6B00, #FF8C33)',
  boxShadow: '0 4px 18px rgba(255,107,0,0.30)',
  '&:hover': {
    background: 'linear-gradient(135deg, #CC5500, #FF6B00)',
    boxShadow: '0 6px 24px rgba(255,107,0,0.45)',
    transform: 'translateY(-1px)',
  },
  transition: 'all 0.2s',
}

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/

// ── Brand Panel ────────────────────────────────────────────────────────
function BrandPanel() {
  const circles = [
    { size: 320, top: -80, right: -80, opacity: 0.12 },
    { size: 200, bottom: -60, left: -60, opacity: 0.10 },
    { size: 140, top: '40%', left: '60%', opacity: 0.08 },
  ] as const

  return (
    <Box
      sx={{
        flex: 1,
        background: 'linear-gradient(145deg, #FF6B00 0%, #FF8C33 45%, #FFA84D 100%)',
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 6,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {circles.map((c, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            width: c.size,
            height: c.size,
            borderRadius: '50%',
            background: `rgba(255,255,255,${c.opacity})`,
            top: 'top' in c ? c.top : undefined,
            right: 'right' in c ? c.right : undefined,
            bottom: 'bottom' in c ? c.bottom : undefined,
            left: 'left' in c ? c.left : undefined,
          }}
        />
      ))}

      <Box sx={{ mb: 3, position: 'relative' }}>
        <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="48" cy="48" r="46" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="rgba(255,255,255,0.08)" />
          <circle cx="48" cy="48" r="38" stroke="rgba(255,255,255,0.12)" strokeWidth="1" fill="none" />
          <rect x="36" y="20" width="24" height="10" rx="2.5" fill="rgba(255,255,255,0.95)" />
          <rect x="28" y="29" width="40" height="11" rx="2" fill="rgba(255,255,255,0.95)" />
          <rect x="20" y="39" width="56" height="32" rx="3" fill="rgba(255,255,255,0.95)" />
          <rect x="42" y="23" width="5" height="4" rx="1" fill="rgba(204,85,0,0.65)" />
          <rect x="49" y="23" width="5" height="4" rx="1" fill="rgba(204,85,0,0.65)" />
          <rect x="32" y="32" width="6" height="5" rx="1" fill="rgba(204,85,0,0.6)" />
          <rect x="45" y="32" width="6" height="5" rx="1" fill="rgba(204,85,0,0.6)" />
          <rect x="58" y="32" width="6" height="5" rx="1" fill="rgba(204,85,0,0.6)" />
          <rect x="24" y="43" width="9" height="7" rx="1.5" fill="rgba(255,140,51,0.6)" />
          <rect x="44" y="43" width="8" height="7" rx="1.5" fill="rgba(255,140,51,0.6)" />
          <rect x="63" y="43" width="9" height="7" rx="1.5" fill="rgba(255,140,51,0.6)" />
          <rect x="40" y="52" width="16" height="19" rx="2.5" fill="rgba(204,85,0,0.75)" />
          <circle cx="53" cy="62" r="1.5" fill="rgba(255,255,255,0.7)" />
          <circle cx="68" cy="68" r="14" fill="#FF6B00" />
          <circle cx="68" cy="68" r="12" fill="white" />
          <path d="M62 68L66 72L74 62" stroke="#FF6B00" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Box>

      <Typography variant="h4" sx={{ color: '#fff', textAlign: 'center', lineHeight: 1.25, mb: 2 }}>
        Vendor Registration<br />Portal
      </Typography>

      <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.85)', textAlign: 'center', maxWidth: 300, lineHeight: 1.7 }}>
        Streamline your onboarding journey. Register, manage documents, and
        track your approval status — all in one place.
      </Typography>

      <Stack spacing={1.5} mt={4} width="100%">
        {[
          'PAN-verified secure access',
          'Real-time approval tracking',
          'Compliant with procurement policies',
        ].map((item) => (
          <Stack key={item} direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
            </Box>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>{item}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  )
}

// ── Sign In Form ───────────────────────────────────────────────────────
interface SignInFormProps {
  onGoToRegister: () => void
}

function SignInForm({ onGoToRegister }: SignInFormProps) {
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ pan: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: name === 'pan' ? value.toUpperCase() : value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form.pan || !form.password) {
      setError('Please enter your PAN number and password.')
      return
    }
    if (!PAN_REGEX.test(form.pan)) {
      setError('Invalid PAN format. Expected format: AAAAA9999A')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pan_number: form.pan, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError((data as { detail?: string }).detail || 'Login failed. Please try again.')
        return
      }
      sessionStorage.setItem('vendor_user', JSON.stringify(data))
      navigate('/vendor-registration/home')
    } catch {
      setError('Unable to reach the server. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ pt: 0.5 }}>
      <Typography variant="h5" color="text.primary" gutterBottom>
        Welcome back
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 0.25 }}>
        Sign in using your PAN number and password.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontSize: '0.83rem' }}>
          {error}
        </Alert>
      )}

      <Stack spacing={2}>
        <TextField
          fullWidth
          required
          name="pan"
          label="PAN Card Number"
          value={form.pan}
          onChange={handleChange}
          placeholder="AAAAA9999A"
          inputProps={{ maxLength: 10, style: { letterSpacing: '0.12em', fontWeight: 600 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <FingerprintIcon sx={{ color: '#FF6B00', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          fullWidth
          required
          name="password"
          label="Password"
          type={showPass ? 'text' : 'password'}
          value={form.password}
          onChange={handleChange}
          autoComplete="current-password"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockOutlinedIcon sx={{ color: '#FF6B00', fontSize: 20 }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPass((v) => !v)}
                  edge="end"
                  size="small"
                  aria-label="toggle password visibility"
                >
                  {showPass
                    ? <VisibilityOffIcon sx={{ fontSize: 18, color: '#9CA3AF' }} />
                    : <VisibilityIcon sx={{ fontSize: 18, color: '#9CA3AF' }} />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Stack>

      <Box sx={{ textAlign: 'right', mt: 0.75, mb: 2 }}>
        <Link
          component="button"
          type="button"
          underline="hover"
          sx={{ fontSize: '0.83rem', color: '#FF6B00', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer' }}
          onClick={(e: React.MouseEvent) => e.preventDefault()}
        >
          Forgot password?
        </Link>
      </Box>

      <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={primaryBtnSx}>
        {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Sign In'}
      </Button>

      <Divider sx={{ mt: 2, mb: 1.5, borderColor: '#F3F4F6' }} />

      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" display="inline">
          Don&apos;t have an account?{' '}
        </Typography>
        <Link
          component="button"
          type="button"
          underline="hover"
          onClick={onGoToRegister}
          sx={{ color: '#FF6B00', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', border: 'none', background: 'none', verticalAlign: 'baseline' }}
        >
          Register here
        </Link>
      </Box>
    </Box>
  )
}

// ── Register Form ──────────────────────────────────────────────────────
interface RegisterFormProps {
  onGoToLogin: () => void
}

function RegisterForm({ onGoToLogin }: RegisterFormProps) {
  const [form, setForm] = useState({ pan: '', email: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: name === 'pan' ? value.toUpperCase() : value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form.pan || !form.email) {
      setError('Please fill in all required fields.')
      return
    }
    if (!PAN_REGEX.test(form.pan)) {
      setError('Invalid PAN format. Expected format: AAAAA9999A')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pan_number: form.pan, email: form.email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError((data as { detail?: string }).detail || 'Registration failed. Please try again.')
        return
      }
      setSuccess(true)
    } catch {
      setError('Unable to reach the server. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Box sx={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #FF6B00, #FF8C33)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5, boxShadow: '0 6px 24px rgba(255,107,0,0.30)' }}>
          <MarkEmailReadOutlinedIcon sx={{ fontSize: 36, color: '#fff' }} />
        </Box>
        <Typography variant="h6" color="text.primary" mb={1}>Check Your Email!</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320, mx: 'auto', lineHeight: 1.8 }}>
          Your account has been created for PAN{' '}
          <Box component="span" sx={{ fontWeight: 700, color: '#FF6B00', letterSpacing: '0.08em' }}>{form.pan}</Box>
          . A system-generated password has been sent to{' '}
          <Box component="span" sx={{ fontWeight: 600 }}>{form.email}</Box>
          . Use it to sign in.
        </Typography>
        <Button variant="contained" size="large" onClick={onGoToLogin} sx={{ mt: 2.5, px: 5, ...primaryBtnSx }} startIcon={<ArrowBackIcon />}>
          Back to Sign In
        </Button>
      </Box>
    )
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ pt: 0.5 }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={0.25}>
        <IconButton size="small" onClick={onGoToLogin} sx={{ color: '#FF6B00', ml: -0.5 }}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="h5" color="text.primary" gutterBottom>
          Create an Account
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, mt: 0.25, ml: 4.5 }}>
        Enter your PAN and email — we&apos;ll send your login password.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2, fontSize: '0.83rem' }}>{error}</Alert>
      )}

      <Stack spacing={1.5}>
        <TextField
          fullWidth required
          name="pan"
          label="PAN Card Number"
          value={form.pan}
          onChange={handleChange}
          placeholder="AAAAA9999A"
          inputProps={{ maxLength: 10, style: { letterSpacing: '0.12em', fontWeight: 600 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <FingerprintIcon sx={{ color: '#FF6B00', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          fullWidth required
          name="email"
          label="Business Email Address"
          type="email"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailOutlinedIcon sx={{ color: '#FF6B00', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
        />
      </Stack>

      <Box sx={{ mt: 1.5, p: 1.25, borderRadius: 2, backgroundColor: '#FFF5EE', border: '1px solid #FFD4B0', display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <LockOutlinedIcon sx={{ color: '#FF6B00', fontSize: 17, mt: 0.1, flexShrink: 0 }} />
        <Typography variant="caption" color="text.secondary" lineHeight={1.5}>
          A strong, system-generated password will be emailed to you. You can change it after your first login.
        </Typography>
      </Box>

      <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 1.5, ...primaryBtnSx }}>
        {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Send My Password'}
      </Button>

      <Box sx={{ textAlign: 'center', mt: 1.5 }}>
        <Typography variant="body2" color="text.secondary" display="inline">Already have an account?{' '}</Typography>
        <Link
          component="button" type="button" underline="hover" onClick={onGoToLogin}
          sx={{ color: '#FF6B00', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', border: 'none', background: 'none', verticalAlign: 'baseline' }}
        >
          Sign in
        </Link>
      </Box>
    </Box>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────
type View = 'login' | 'register'

export default function VendorLogin() {
  const [view, setView] = useState<View>('login')

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', width: '100%', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top Nav */}
        <Box component="header" sx={{ width: '100%', borderBottom: '1px solid #F3F4F6', px: { xs: 2, sm: 4, md: 6 }, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', zIndex: 10 }}>
          <Box
            component="img"
            src="/images/ae.png"
            alt="Company Logo"
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              e.currentTarget.style.display = 'none'
              const sib = e.currentTarget.nextSibling as HTMLElement | null
              if (sib) sib.style.display = 'flex'
            }}
            sx={{ height: 40, maxWidth: 180, objectFit: 'contain' }}
          />
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ display: 'none' }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2, background: 'linear-gradient(135deg,#FF6B00,#FF8C33)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="10" width="16" height="10" rx="1.5" fill="white" fillOpacity="0.95"/><rect x="6" y="6" width="10" height="5" rx="1" fill="white" fillOpacity="0.95"/><rect x="9" y="14" width="4" height="6" rx="1" fill="rgba(255,107,0,0.8)"/><circle cx="17" cy="6" r="4" fill="white"/><path d="M15 6l1.5 1.5L18.5 4" stroke="#FF6B00" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={800} color="text.primary" lineHeight={1.1}>VendorPortal</Typography>
              <Typography variant="caption" color="text.secondary" lineHeight={1}>Procurement Management</Typography>
            </Box>
          </Stack>

          <Button
            variant="outlined"
            startIcon={<AdminPanelSettingsOutlinedIcon />}
            href="/finance"
            sx={{ borderColor: '#FF6B00', color: '#FF6B00', borderRadius: 8, px: 2.5, py: 0.8, fontWeight: 600, fontSize: '0.83rem', '&:hover': { borderColor: '#CC5500', color: '#CC5500', backgroundColor: '#FFF5EE' } }}
          >
            Admin Login
          </Button>
        </Box>

        {/* Main Content */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, sm: 2, md: 2.5 }, background: 'linear-gradient(160deg, #FFF8F3 0%, #FFFFFF 60%)', overflow: 'hidden' }}>
          <Paper elevation={0} sx={{ width: '100%', maxWidth: 940, maxHeight: 'calc(100vh - 80px)', display: 'flex', overflow: 'hidden', borderRadius: 4, border: '1px solid #F3F4F6', boxShadow: '0 8px 48px rgba(0,0,0,0.10)' }}>
            <BrandPanel />

            <Box sx={{ flex: { xs: 1, md: '0 0 54%' }, display: 'flex', flexDirection: 'column', px: { xs: 3, sm: 4.5 }, py: { xs: 2.5, sm: 3 }, backgroundColor: '#fff', overflowY: 'auto' }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <BadgeOutlinedIcon sx={{ color: '#FF6B00', fontSize: 20 }} />
                <Typography variant="body2" fontWeight={600} color="text.secondary">Vendor Self-Service</Typography>
                <Chip label="Secure" size="small" sx={{ ml: 'auto', fontSize: '0.68rem', height: 20, backgroundColor: '#FFF5EE', color: '#FF6B00', fontWeight: 700, border: '1px solid #FFD4B0' }} />
              </Stack>

              <Divider sx={{ mb: 2, borderColor: '#F3F4F6' }} />

              {view === 'login'
                ? <SignInForm onGoToRegister={() => setView('register')} />
                : <RegisterForm onGoToLogin={() => setView('login')} />}

              <Divider sx={{ mt: 2, mb: 1, borderColor: '#F3F4F6' }} />
              <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
                © {new Date().getFullYear()} VendorPortal · All rights reserved
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Box>
    </ThemeProvider>
  )
}
