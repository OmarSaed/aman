// frontend/src/features/settings/SettingsPage.jsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Tabs, Tab, Container, Typography } from '@mui/material';
import { Settings, Business, Inventory } from '@mui/icons-material';
import SystemSettingsPage from './SystemSettingsPage';
import CompanySettingsPage from './CompanySettingsPage';
import WarehousesList from './WarehousesList';
import Can from '../auth/Can';

function CustomTabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation('settings');
  
  const [value, setValue] = useState(0);

  const handleChange = (e, newValue) => {
    setValue(newValue);
  };

  return (
    <Container maxWidth={false} sx={{ px: 0 }} className="animate-fade">
      <div className="page-header">
        <div className="page-header-left">
          <h1>{t('title')}</h1>
          <p>{t('subtitle', 'Manage global system preferences, taxation, and legal company identifiers.')}</p>
        </div>
      </div>

      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={value} 
            onChange={handleChange} 
            textColor="primary"
            indicatorColor="primary"
            sx={{
              '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
              '& .MuiTab-root': { py: 2, minHeight: 64, fontSize: 14, textTransform: 'none' }
            }}
          >
            <Tab 
              icon={<Settings sx={{ fontSize: 20 }} />} 
              iconPosition="start" 
              label={t('systemSettings')} 
              sx={{ fontWeight: 700 }}
            />
            <Tab 
              icon={<Business sx={{ fontSize: 20 }} />} 
              iconPosition="start" 
              label={t('companyProfile')} 
              sx={{ fontWeight: 700 }}
            />
            <Tab 
              icon={<Inventory sx={{ fontSize: 20 }} />} 
              iconPosition="start" 
              label={t('warehouses')} 
              sx={{ fontWeight: 700 }}
            />
          </Tabs>
        </Box>

        <CustomTabPanel value={value} index={0}>
          <Can permission="settings:view">
            <SystemSettingsPage />
          </Can>
        </CustomTabPanel>
        
        <CustomTabPanel value={value} index={1}>
          <CompanySettingsPage />
        </CustomTabPanel>

        <CustomTabPanel value={value} index={2}>
          <WarehousesList />
        </CustomTabPanel>
      </Box>
    </Container>
  );
}
