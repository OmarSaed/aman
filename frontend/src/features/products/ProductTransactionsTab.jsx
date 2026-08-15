// frontend/src/features/products/ProductTransactionsTab.jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Box, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Typography, Chip, Skeleton, Alert,
  Paper, Stack
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { productsService } from '../../services/products.service';
import { formatDate } from '../../utils/format';
import { Calendar, ArrowUpRight, ArrowDownLeft, RefreshCcw } from 'lucide-react';

export default function ProductTransactionsTab({ productId }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const { data, isLoading, error } = useQuery({
    queryKey: ['product-transactions', productId],
    queryFn: () => productsService.getTransactions(productId).then(r => r.data.data),
  });

  if (isLoading) return <Skeleton variant="rectangular" height={400} />;
  if (error) return <Alert severity="error">Failed to load transactions</Alert>;

  const getTransactionTypeColor = (type) => {
    switch (type) {
      case 'Purchase': return 'success';
      case 'Sale': return 'error';
      case 'Adjustment': return 'warning';
      case 'Transfer': return 'info';
      default: return 'default';
    }
  };

  const getTransactionIcon = (type, qty) => {
    if (qty > 0) return <ArrowDownLeft size={16} color="#10b981" />;
    return <ArrowUpRight size={16} color="#ef4444" />;
  };

  return (
    <Box sx={{ mt: 2 }}>
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell>{isAr ? 'التاريخ' : 'Date'}</TableCell>
              <TableCell>{isAr ? 'النوع' : 'Type'}</TableCell>
              <TableCell>{isAr ? 'المخزن' : 'Warehouse'}</TableCell>
              <TableCell align="right">{isAr ? 'الكمية' : 'Qty'}</TableCell>
              <TableCell>{isAr ? 'البيان' : 'Reference/Notes'}</TableCell>
              <TableCell>{isAr ? 'بواسطة' : 'By'}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {isAr ? 'لا توجد حركات مخزنية مسجلة' : 'No stock transactions recorded.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              data.map((tx) => (
                <TableRow key={tx.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Calendar size={14} style={{ opacity: 0.5 }} />
                      <Typography variant="body2">{formatDate(tx.createdAt, 'PPp')}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={tx.transactionType} 
                      size="small" 
                      color={getTransactionTypeColor(tx.transactionType)} 
                      variant="soft" 
                      sx={{ fontWeight: 700, fontSize: '10px' }}
                    />
                  </TableCell>
                  <TableCell>{tx.warehouse?.name}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                      <Typography variant="body2" sx={{ fontWeight: 800, color: tx.quantity > 0 ? 'success.main' : 'error.main' }}>
                        {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                      </Typography>
                      {getTransactionIcon(tx.transactionType, tx.quantity)}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                      {tx.notes || tx.referenceId || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {tx.creator?.name || 'System'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
