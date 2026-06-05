import React, { useState, useEffect } from 'react';
import { Camera, X, Plus } from 'lucide-react';
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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (media.length + files.length > 12) {
      alert('Maximum 12 images allowed');
      return;
    }

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
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
      // Reset input
      e.target.value = '';
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
      <div className="flex justify-between items-center">
        <h4 className="text-[10px] uppercase font-bold text-natural-muted tracking-widest">Image Gallery ({media.length}/12)</h4>
        <label className={`cursor-pointer group flex items-center gap-2 text-natural-primary transition-opacity ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          <Plus className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Add Images</span>
          <input 
            type="file" 
            className="hidden" 
            multiple 
            accept="image/*" 
            onChange={handleUpload} 
            disabled={uploading || media.length >= 12}
          />
        </label>
      </div>

      <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
        {media.map((item) => (
          <div key={item.id} className="relative aspect-square rounded-2xl overflow-hidden group border border-natural-accent bg-natural-bg">
            <img src={item.data} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button 
                onClick={() => handleDelete(item.id)}
                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg active:scale-90"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
        {loading && (
          <div className="aspect-square rounded-xl bg-natural-accent/10 animate-pulse flex items-center justify-center">
            <Camera className="w-4 h-4 text-natural-muted" />
          </div>
        )}
        {!loading && media.length === 0 && (
          <div className="col-span-full py-8 text-center bg-natural-bg rounded-2xl border border-dashed border-natural-accent">
            <p className="text-[10px] font-bold text-natural-muted uppercase tracking-widest">No images uploaded</p>
          </div>
        )}
      </div>
      {uploading && (
        <div className="flex items-center gap-2 text-natural-primary">
          <div className="w-3 h-3 border-2 border-natural-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest">Uploading...</span>
        </div>
      )}
    </div>
  );
};
