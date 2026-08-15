// frontend/src/components/ui/Modal.jsx
import { 
  Dialog, DialogTitle, DialogContent, 
  DialogActions, Button, IconButton, Typography 
} from '@mui/material';
import { Close, Warning } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

/**
 * Modern MUI-based Modal for ERP
 */
export default function Modal({ isOpen, onClose, title, children, footer, size = 'md' }) {
  const maxWidthMap = { sm: 'xs', md: 'sm', lg: 'md', xl: 'lg' };

  return (
    <Dialog 
      open={Boolean(isOpen)} 
      onClose={onClose} 
      maxWidth={maxWidthMap[size] || 'sm'} 
      fullWidth
      sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ m: 0, p: 2, fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {title}
        <IconButton onClick={onClose} size="small">
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 2.5 }}>
        {children}
      </DialogContent>
      {footer && (
        <DialogActions sx={{ p: 2, gap: 1 }}>
          {footer}
        </DialogActions>
      )}
    </Dialog>
  );
}

/**
 * Specialized MUI-based Confirmation Dialogue
 */
export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Delete', loading }) {
  const { t } = useTranslation('products');
  return (
    <Dialog 
      open={Boolean(isOpen)} 
      onClose={onClose} 
      maxWidth="xs" 
      fullWidth
      sx={{ '& .MuiDialog-paper': { borderRadius: 4, p: 1 } }}
    >
      <DialogContent sx={{ textAlign: 'center', py: 4 }}>
        <Warning color="error" sx={{ fontSize: 48, mb: 2, opacity: 0.8 }} />
        <Typography variant="h6" fontWeight={800} gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
        <Typography variant="caption" display="block" color="error.main" sx={{ mt: 2, fontWeight: 700 }}>
          {t('confirm.caution')}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={loading} sx={{ px: 4 }}>
          {t('confirm.keepData')}
        </Button>
        <Button 
          variant="contained" 
          color="error" 
          onClick={onConfirm} 
          disabled={loading}
          sx={{ px: 4, boxShadow: 'none' }}
        >
          {loading ? '...' : (confirmLabel || 'Proceed')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
