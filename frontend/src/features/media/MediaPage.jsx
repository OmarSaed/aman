import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { UploadCloud, Trash2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { mediaService } from '../../services/media.service';
import { ConfirmModal } from '../../components/ui/Modal';

export default function MediaPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const qc = useQueryClient();
  const fileInputRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const { data: qData, isLoading, error } = useQuery({
    queryKey: ['media'],
    queryFn: () => mediaService.listMedia().then(r => r.data)
  });

  const assets = qData?.data || [];

  const uploadMut = useMutation({
    mutationFn: (file) => mediaService.uploadMedia(file),
    onSuccess: () => {
      toast.success(isAr ? 'تم رفع الملف بنجاح' : 'File uploaded successfully');
      qc.invalidateQueries(['media']);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error uploading file')
  });

  const deleteMut = useMutation({
    mutationFn: (id) => mediaService.deleteMedia(id),
    onSuccess: () => {
      toast.success(isAr ? 'تم الحذف بنجاح' : 'File deleted successfully');
      setDeleteId(null);
      qc.invalidateQueries(['media']);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error deleting file')
  });

  const handleFileUpload = (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'].includes(file.type)) {
      toast.error(isAr ? 'نوع الملف غير مدعوم' : 'Invalid file type');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(isAr ? 'حجم الملف يتجاوز الحد الأقصى 10MB' : 'File exceeds 10MB limit');
      return;
    }
    uploadMut.mutate(file);
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="page-container fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">{isAr ? 'إدارة الوسائط' : 'Media Management'}</h1>
          <p className="page-subtitle text-secondary">
            {isAr ? 'مكتبة الصور والوسائط للنظام' : 'System-wide image and media library'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploadMut.isPending}>
          <UploadCloud size={18} />
          <span>{uploadMut.isPending ? '...' : isAr ? 'رفع صورة' : 'Upload Image'}</span>
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/jpeg, image/png, image/webp, image/gif, image/svg+xml"
          onChange={(e) => {
            if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
            e.target.value = null; // reset
          }}
        />
      </div>

      <div 
        className={`card ${isDragging ? 'dragging' : ''}`}
        style={{ 
          marginBottom: 24, padding: 40, border: isDragging ? '2px dashed var(--primary)' : '2px dashed var(--border)', 
          background: isDragging ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-surface)', textAlign: 'center', 
          borderRadius: 12, transition: 'all 0.2s' 
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <UploadCloud size={48} style={{ color: 'var(--text-tertiary)', margin: '0 auto 16px' }} />
        <h3 style={{ marginBottom: 8 }}>{isAr ? 'اسحب وأفلت الصور هنا' : 'Drag and drop images here'}</h3>
        <p className="text-secondary" style={{ fontSize: 14 }}>{isAr ? 'يدعم صور بحجم أقصى 10 ميجابايت (JPG، PNG، WEBP)' : 'Supports images up to 10MB (JPG, PNG, WEBP)'}</p>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><span className="loader loader-dark" /></div>
      ) : error ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--danger)' }}><AlertCircle style={{ margin: '0 auto 8px' }}/> {isAr ? 'حدث خطأ' : 'Error loading media'}</div>
      ) : assets.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <ImageIcon size={48} style={{ color: 'var(--text-tertiary)', margin: '0 auto 16px' }} />
          <h3>{isAr ? 'لا توجد وسائط' : 'No media items found'}</h3>
          <p className="text-secondary">{isAr ? 'لم تقم برفع أي صور بعد' : 'You haven\'t uploaded any images yet'}</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
          gap: 20 
        }}>
          {assets.map(asset => (
            <div key={asset.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ 
                height: 160, 
                backgroundColor: '#f1f5f9',
                backgroundImage: `url(${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${asset.url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderBottom: '1px solid var(--border)'
              }} />
              <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={asset.filename}>
                  {asset.filename}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {(asset.sizeBytes / 1024).toFixed(1)} KB • {new Date(asset.createdAt).toLocaleDateString()}
                </div>
                <div style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    className="btn btn-ghost" 
                    style={{ padding: '4px 8px', height: 'auto', fontSize: 12, color: 'var(--danger)' }}
                    onClick={() => setDeleteId(asset.id)}
                    disabled={deleteMut.isPending}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMut.mutate(deleteId)}
        loading={deleteMut.isPending}
        title={isAr ? 'حذف الوسائط' : 'Delete Media'}
        message={isAr ? 'هل أنت متأكد من حذف هذا الملف؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this file? This action cannot be undone.'}
        confirmLabel={isAr ? 'حذف' : 'Delete'}
      />
    </div>
  );
}
