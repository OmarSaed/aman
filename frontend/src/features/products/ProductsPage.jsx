// frontend/src/features/products/ProductsPage.jsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Tabs, Tab, Paper, Typography, Container } from '@mui/material';
import { Inventory, AccountTree, BrandingWatermark, QrCode } from '@mui/icons-material';
import ProductsList from './ProductsList';
import CategoriesList from './CategoriesList';
import BrandsList from './BrandsList';
import BarcodesList from './BarcodesList';
import MinStockList from './MinStockList';

function CustomTabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
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

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

export default function ProductsPage() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  
  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Container maxWidth={false} sx={{ px: 0, animate: 'fade 0.3s ease' }}>
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
          <Tabs 
            value={value} 
            onChange={handleChange} 
            aria-label="product management tabs"
            textColor="primary"
            indicatorColor="primary"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab 
              icon={<Inventory sx={{ fontSize: 18 }} />} 
              iconPosition="start" 
              label={isAr ? 'المنتجات والأسعار' : 'Catalog & Prices'} 
              {...a11yProps(0)} 
              sx={{ fontWeight: 700 }}
            />
            <Tab 
              icon={<AccountTree sx={{ fontSize: 18 }} />} 
              iconPosition="start" 
              label={isAr ? 'شجرة التصنيفات' : 'Categories Tree'} 
              {...a11yProps(1)} 
              sx={{ fontWeight: 700 }}
            />
            <Tab 
              icon={<BrandingWatermark sx={{ fontSize: 18 }} />} 
              iconPosition="start" 
              label={isAr ? 'الماركات المسجلة' : 'Brands Directory'} 
              {...a11yProps(2)} 
              sx={{ fontWeight: 700 }}
            />
            <Tab 
              icon={<QrCode sx={{ fontSize: 18 }} />} 
              iconPosition="start" 
              label={isAr ? 'إدارة الباركود' : 'Barcode Control'} 
              {...a11yProps(3)} 
              sx={{ fontWeight: 700 }}
            />
            <Tab 
              icon={<Inventory sx={{ fontSize: 18 }} />} 
              iconPosition="start" 
              label={isAr ? 'تنبيهات المخزون' : 'Min Stock Alerts'} 
              {...a11yProps(4)} 
              sx={{ fontWeight: 700 }}
            />
          </Tabs>
        </Box>

        <CustomTabPanel value={value} index={0}>
          <ProductsList />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={1}>
          <Box sx={{ maxWidth: '100%' }}>
            <CategoriesList />
          </Box>
        </CustomTabPanel>
        <CustomTabPanel value={value} index={2}>
          <Box sx={{ maxWidth: '100%' }}>
            <BrandsList />
          </Box>
        </CustomTabPanel>
        <CustomTabPanel value={value} index={3}>
          <Box sx={{ maxWidth: '100%' }}>
            <BarcodesList />
          </Box>
        </CustomTabPanel>
        <CustomTabPanel value={value} index={4}>
          <Box sx={{ maxWidth: '100%' }}>
            <MinStockList />
          </Box>
        </CustomTabPanel>
      </Box>
    </Container>
  );
}
