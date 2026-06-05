import React, { useState, useEffect } from 'react';
import { Camera, X, Plus, Image } from 'lucide-react';
import { dbService } from '../../services/db';
import { compressImage, fileToBase64 } from '../../lib/imageUtils';

interface MediaItem {
  id: string;
  data: string;
  order: number;
}

interface ImageGalleryUploadProps {
  parentId: string;
  parentType: 'hotel' | 'room';
}

export const ImageGalleryUpload = ({ parentId, parentType }: ImageGalleryUploadProps) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (parentId) {
      fetchMedia();
    }
  }, [parentId]);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const data = await dbService.getMedia(parentId);
      setMedia(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const uploadFiles = async (files: FileList) => {
    if (media.length + files.length > 12) {
      alert('Maximum 12 images allowed');
      return;
    }

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const base64 = await fileToBase64(file);
        const compressed = await compressImage(base64);
        
        await dbService.addMedia({
          parentId,
          parentType,
          data: compressed,
          order: media.length + i
        });
      }
      fetchMedia();
    } catch (e) {
      console.error(e);
      alert('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(files);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadFiles(files);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this image?')) return;
    try {
      await dbService.deleteMedia(id);
      setMedia(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  if (!parentId) {
    return (
      <div className="bg-natural-bg/50 p-6 rounded-3xl border border-dashed border-natural-accent text-center">
        <p className="text-xs text-natural-muted italic">Please initialize a property context to enable gallery uploads.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hidden File Input */}
      <input 
        id={`gallery-file-input-${parentId}`}
        type="file" 
        className="hidden" 
        multiple 
        accept="image/*" 
        onChange={handleUpload} 
        disabled={uploading || media.length >= 12}
      />

      <div className="flex justify-between items-center pb-2">
        <h4 className="text-[10px] uppercase font-bold text-natural-muted tracking-widest">Image Gallery ({media.length}/12)</h4>
        {media.length > 0 && (
          <button 
            type="button"
            onClick={() => document.getElementById(`gallery-file-input-${parentId}`)?.click()}
            className={`flex items-center gap-2 text-natural-primary hover:text-natural-dark transition-colors ${uploading || media.length >= 12 ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <Plus className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Add Images</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {media.map((item) => (
          <div key={item.id} className="relative aspect-square rounded-2xl overflow-hidden group border border-natural-accent bg-natural-bg shadow-sm">
            <img src={item.data} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button 
                type="button"
                onClick={() => handleDelete(item.id)}
                className="p-2.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {media.length < 12 && !loading && (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById(`gallery-file-input-${parentId}`)?.click()}
            className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 ${
              media.length === 0 ? 'col-span-full py-12' : ''
            } ${
              isDragging
                ? 'border-natural-primary bg-natural-primary/5 text-natural-primary scale-[0.99]'
                : 'border-natural-accent bg-natural-bg/35 text-natural-muted hover:border-natural-primary hover:bg-natural-bg/70 hover:text-natural-dark shadow-sm'
            }`}
          >
            <div className={`p-3 bg-natural-accent/15 rounded-full text-natural-primary transition-transform duration-300 ${isDragging ? 'scale-110' : ''}`}>
              <Camera className="w-6 h-6" />
            </div>
            <div className="text-center px-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-natural-dark">
                {media.length === 0 ? 'Upload Gallery Photos' : 'Add Image'}
              </p>
              <p className="text-[9px] text-natural-muted mt-1 leading-tight max-w-[200px] mx-auto">
                {media.length === 0 
                  ? 'Drag and drop files here, or click to browse' 
                  : 'Drag & drop or click'
                }
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="aspect-square rounded-2xl bg-natural-accent/10 animate-pulse flex items-center justify-center">
            <ContainerLoadingIndicator />
          </div>
        )}
      </div>

      {uploading && (
        <div className="flex items-center gap-2 text-natural-primary pt-2">
          <div className="w-3.5 h-3.5 border-2 border-natural-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest">Uploading gallery assets...</span>
        </div>
      )}
    </div>
  );
};

const ContainerLoadingIndicator = () => (
  <div className="flex flex-col items-center gap-1.5 text-natural-muted">
    <Image className="w-5 h-5 animate-pulse" />
    <span className="text-[8px] uppercase tracking-widest font-bold">Refreshed</span>
  </div>
);
