import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Alert, AlertTitle, Box, Button, Checkbox, Chip, CircularProgress, FormControl,
  FormControlLabel, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { CloudUpload, Storage, Sync } from '@mui/icons-material';
import { productsService } from '../../services/products.service';

export default function LegacySyncPanel() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const fileRef = useRef(null);

  const [category, setCategory] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [updatePrices, setUpdatePrices] = useState(true);
  const [updateStock, setUpdateStock] = useState(true);
  const [createMissing, setCreateMissing] = useState(false);

  const statusQ = useQuery({
    queryKey: ['legacy-status'],
    queryFn: () => productsService.legacyStatus().then((r) => r.data.data),
    retry: false,
  });

  const warehousesQ = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => productsService.listWarehouses().then((r) => r.data.data || []),
  });

  const categoriesQ = useQuery({
    queryKey: ['legacy-categories'],
    queryFn: () => productsService.legacyCategories().then((r) => r.data.data || []),
    enabled: Boolean(statusQ.data?.restored),
  });

  const previewQ = useQuery({
    queryKey: ['legacy-preview', category, warehouseId],
    queryFn: () => productsService.legacyPreview({ category, warehouseId }).then((r) => r.data.data),
    enabled: Boolean(category),
  });

  const uploadMut = useMutation({
    mutationFn: (file) => productsService.legacyUpload(file),
    onSuccess: () => {
      toast.success(isAr ? 'رُفع الملف' : 'Backup uploaded');
      statusQ.refetch();
    },
    onError: (e) => toast.error(e.response?.data?.message || (isAr ? 'فشل الرفع' : 'Upload failed')),
  });

  const copyMut = useMutation({
    mutationFn: () => productsService.legacyUseProjectBackup(),
    onSuccess: () => {
      toast.success(isAr ? 'تم تجهيز backup.bak' : 'Using project backup.bak');
      statusQ.refetch();
    },
    onError: (e) => toast.error(e.response?.data?.message || (isAr ? 'الملف غير موجود' : 'backup.bak not found')),
  });

  const restoreMut = useMutation({
    mutationFn: () => productsService.legacyRestore(),
    onSuccess: () => {
      toast.success(isAr ? 'تمت استعادة القاعدة' : 'Backup restored');
      statusQ.refetch();
      categoriesQ.refetch();
    },
    onError: (e) => toast.error(e.response?.data?.message || (isAr ? 'فشلت الاستعادة' : 'Restore failed')),
  });

  const syncMut = useMutation({
    mutationFn: () => productsService.legacySync({
      category,
      warehouseId: updateStock ? warehouseId : undefined,
      updatePrices,
      updateStock,
      createMissing,
    }),
    onSuccess: (res) => {
      const d = res.data.data;
      toast.success(isAr
        ? `تحديث ${d.updated} · إنشاء ${d.created} · تخطي ${d.skipped}`
        : `Updated ${d.updated} · created ${d.created} · skipped ${d.skipped}`);
      previewQ.refetch();
    },
    onError: (e) => toast.error(e.response?.data?.message || (isAr ? 'فشل المزامنة' : 'Sync failed')),
  });

  const rows = previewQ.data?.rows || [];
  const matchedRows = useMemo(() => rows.filter((r) => r.matched), [rows]);

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" fontWeight={800}>
          {isAr ? 'مزامنة قاعدة المحل القديمة' : 'Legacy POS backup sync'}
        </Typography>
        <Typography color="text.secondary">
          {isAr
            ? 'ارفع ملف .bak أو استخدم backup.bak في جذر المشروع. اختر صنفاً، ثم حدّث السعر والمخزون للمنتجات الموجودة فقط.'
            : 'Upload the SQL Server .bak or use backup.bak in the project root. Pick a category, then update price and stock on products that already exist in Aman.'}
        </Typography>
      </Box>

      {statusQ.data?.error && (
        <Alert severity="warning">
          <AlertTitle>{isAr ? 'SQL Server غير متصل' : 'SQL Server is not connected'}</AlertTitle>
          {statusQ.data.error}
          <Box sx={{ mt: 1 }}>
            {isAr
              ? 'على الـ VPS شغّل: docker compose --profile legacy up -d'
              : 'On the VPS run: docker compose --profile legacy up -d'}
          </Box>
        </Alert>
      )}

      {statusQ.data && !statusQ.data.error && (
        <Alert severity={statusQ.data.restored ? 'success' : 'info'}>
          {statusQ.data.connected
            ? (statusQ.data.restored
              ? (isAr ? 'قاعدة النسخة جاهزة. اختر صنفاً بالأسفل.' : 'Restored database is ready. Pick a category below.')
              : (isAr ? 'SQL Server متصل. ارفع الملف ثم اضغط استعادة.' : 'SQL Server is up. Upload the .bak then restore.'))
            : (isAr ? 'بانتظار SQL Server' : 'Waiting for SQL Server')}
        </Alert>
      )}

      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<CloudUpload />}
            onClick={() => fileRef.current?.click()}
            disabled={uploadMut.isPending}
          >
            {isAr ? 'رفع .bak' : 'Upload .bak'}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".bak"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMut.mutate(file);
              e.target.value = '';
            }}
          />
          <Button variant="outlined" onClick={() => copyMut.mutate()} disabled={copyMut.isPending}>
            {isAr ? 'استخدم backup.bak في المشروع' : 'Use project backup.bak'}
          </Button>
          <Button
            variant="contained"
            startIcon={restoreMut.isPending ? <CircularProgress size={16} color="inherit" /> : <Storage />}
            onClick={() => restoreMut.mutate()}
            disabled={restoreMut.isPending || !statusQ.data?.connected}
          >
            {isAr ? 'استعادة القاعدة' : 'Restore backup'}
          </Button>
        </Stack>
        {statusQ.data?.hostBak && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {isAr ? 'ملف موجود:' : 'Found file:'} {statusQ.data.hostBak}
          </Typography>
        )}
      </Paper>

      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormControl fullWidth>
            <InputLabel>{isAr ? 'صنف المصدر' : 'Source category'}</InputLabel>
            <Select
              label={isAr ? 'صنف المصدر' : 'Source category'}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={!categoriesQ.data?.length}
            >
              {(categoriesQ.data || []).map((c) => (
                <MenuItem key={c.name} value={c.name}>
                  {c.name} ({c.itemCount})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>{isAr ? 'مستودع أمان' : 'Aman warehouse'}</InputLabel>
            <Select
              label={isAr ? 'مستودع أمان' : 'Aman warehouse'}
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
            >
              {(warehousesQ.data || []).map((w) => (
                <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        <Stack direction="row" spacing={2} sx={{ mt: 1 }} flexWrap="wrap">
          <FormControlLabel
            control={<Checkbox checked={updatePrices} onChange={(e) => setUpdatePrices(e.target.checked)} />}
            label={isAr ? 'تحديث السعر والتكلفة والجملة' : 'Update cost / retail / wholesale'}
          />
          <FormControlLabel
            control={<Checkbox checked={updateStock} onChange={(e) => setUpdateStock(e.target.checked)} />}
            label={isAr ? 'تحديث المخزون' : 'Update stock'}
          />
          <FormControlLabel
            control={<Checkbox checked={createMissing} onChange={(e) => setCreateMissing(e.target.checked)} />}
            label={isAr ? 'إنشاء الأصناف غير الموجودة' : 'Create products that are not in Aman'}
          />
        </Stack>
      </Paper>

      {previewQ.isFetching && <CircularProgress />}

      {previewQ.data && (
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap">
            <Chip label={`${isAr ? 'الكل' : 'Total'} ${previewQ.data.total}`} />
            <Chip color="success" label={`${isAr ? 'موجود' : 'Matched'} ${previewQ.data.matched}`} />
            <Chip color="warning" label={`${isAr ? 'غير موجود' : 'Unmatched'} ${previewQ.data.unmatched}`} />
            <Box sx={{ flex: 1 }} />
            <Button
              variant="contained"
              startIcon={syncMut.isPending ? <CircularProgress size={16} color="inherit" /> : <Sync />}
              disabled={syncMut.isPending || (!createMissing && matchedRows.length === 0) || (updateStock && !warehouseId)}
              onClick={() => syncMut.mutate()}
            >
              {isAr ? 'مزامنة الموجود' : 'Sync matched products'}
            </Button>
          </Stack>
          <TableContainer sx={{ maxHeight: 520 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>{isAr ? 'المصدر' : 'Source'}</TableCell>
                  <TableCell>{isAr ? 'باركود' : 'Barcode'}</TableCell>
                  <TableCell align="right">{isAr ? 'سعر / مخزون المصدر' : 'Source price / qty'}</TableCell>
                  <TableCell>{isAr ? 'في أمان' : 'In Aman'}</TableCell>
                  <TableCell align="right">{isAr ? 'سعر / مخزون الحالي' : 'Current price / qty'}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.source.sourceId} sx={{ opacity: row.matched ? 1 : 0.55 }}>
                    <TableCell>
                      <strong>{row.source.name}</strong>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {row.source.sku}
                      </Typography>
                    </TableCell>
                    <TableCell>{row.source.barcode || '—'}</TableCell>
                    <TableCell align="right">
                      {row.source.price} / {row.source.quantity}
                    </TableCell>
                    <TableCell>
                      {row.matched ? row.matched.name : (isAr ? 'غير موجود' : 'Not found')}
                    </TableCell>
                    <TableCell align="right">
                      {row.matched ? `${row.matched.mainPrice} / ${row.matched.stock ?? '—'}` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Stack>
  );
}
