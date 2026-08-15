import api from './api';

export const mediaService = {
  listMedia: () => api.get('/media'),
  uploadMedia: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  deleteMedia: (id) => api.delete(`/media/${id}`),
};
