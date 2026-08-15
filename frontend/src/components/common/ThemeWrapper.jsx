// frontend/src/components/common/ThemeWrapper.jsx
import { useTranslation } from 'react-i18next';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import erpTheme from '../../theme/erpTheme';

// Create rtl cache
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

const cacheLtr = createCache({
  key: 'mui',
});

export default function ThemeWrapper({ children }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  
  const theme = erpTheme(isAr);

  return (
    <CacheProvider value={isAr ? cacheRtl : cacheLtr}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
