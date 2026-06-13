import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Upload, Image as ImageIcon, Film, Info } from 'lucide-react';
import { dbService } from '../../services/db';
import { uploadToCloudinary, isCloudinaryConfigured, isVideoUrl, cld } from '../../lib/cloudinary';
import { SectionLabel } from './Shared';

export const HERO_MEDIA_PARENT_ID = '00000000-0000-4000-8000-000000000001';

interface HeroMediaManagerProps {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  onProcessing: (msg: string) => void;
}

export const HeroMediaManager = ({ onSuccess, onError, onProcessing }: HeroMediaManagerProps) => {
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    setIsLoading(true);
    try {
      const items = await dbService.getMedia(HERO_MEDIA_PARENT_ID);
      setMediaItems(items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      onError('Please upload an image or video file.');
      return;
    }

    if (isVideo && file.size > 50 * 1024 * 1024) {
      onError('Video file must be under 50MB.');
      return;
    }

    if (isImage && file.size > 10 * 1024 * 1024) {
      onError('Image file must be under 10MB.');
      return;
    }

    if (!isCloudinaryConfigured) {
      onError('Media hosting is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.');
      return;
    }

    setIsUploading(true);
    onProcessing('Uploading hero media...');

    try {
      if (mediaItems.length > 0) {
        await dbService.deleteMediaByParent(HERO_MEDIA_PARENT_ID);
      }

      const { url } = await uploadToCloudinary(file, { folder: 'hero' });

      await dbService.addMedia({
        parentId: HERO_MEDIA_PARENT_ID,
        parentType: 'hero',
        data: url,
        order: 0,
      });

      await loadMedia();
      onSuccess('Hero media updated. Changes are live on the homepage.');
    } catch (e: any) {
      onError(e.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    onProcessing('Removing hero media...');
    try {
      await dbService.deleteMediaByParent(HERO_MEDIA_PARENT_ID);
      setMediaItems([]);
      onSuccess('Hero media removed. The default resort image is now showing.');
    } catch (e: any) {
      onError(e.message || 'Deletion failed.');
    }
  };

  const current = mediaItems[0] || null;
  const isVideoMedia = isVideoUrl(current?.data);

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Info banner */}
      <div className="flex items-start gap-3 bg-natural-cream border border-natural-accent rounded-2xl p-5">
        <Info className="w-4 h-4 text-natural-primary mt-0.5 shrink-0" />
        <p className="text-xs text-natural-muted leading-relaxed">
          The hero media is displayed as the full-screen background on the homepage.
          Upload an image or short video to replace the default. Changes take effect immediately.
        </p>
      </div>

      {/* Current media preview */}
      <div className="bg-white rounded-[32px] border border-natural-accent overflow-hidden">
        <div className="p-8 border-b border-natural-accent">
          <h3 className="font-serif text-xl italic text-natural-dark">Current Hero Media</h3>
        </div>

        <div className="p-8">
          {isLoading ? (
            <div className="aspect-video bg-natural-accent/20 animate-pulse rounded-2xl" />
          ) : current ? (
            <div className="relative rounded-2xl overflow-hidden border border-natural-accent">
              <div className="aspect-video bg-natural-bg">
                {isVideoMedia ? (
                  <video
                    src={current.data}
                    className="w-full h-full object-cover"
                    controls
                    muted
                  />
                ) : (
                  <img
                    src={cld(current.data, 'f_auto,q_auto,w_1280')}
                    alt="Hero background"
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <div className="bg-natural-dark/70 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  {isVideoMedia ? <Film className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                  {isVideoMedia ? 'Video' : 'Image'} — Active
                </div>
                <button
                  onClick={handleDelete}
                  className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-all shadow-md"
                  title="Remove hero media"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="aspect-video border-2 border-dashed border-natural-accent rounded-2xl flex flex-col items-center justify-center gap-3 bg-natural-cream/50">
              <ImageIcon className="w-10 h-10 text-natural-muted" />
              <div className="text-center">
                <p className="text-sm font-bold text-natural-dark">No custom media set</p>
                <p className="text-xs text-natural-muted mt-1">Default resort image is currently showing</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload section */}
      <div className="bg-white rounded-[32px] border border-natural-accent p-8 space-y-6">
        <div>
          <SectionLabel label="Upload New Hero Media" />
          <p className="text-xs text-natural-muted mt-2 leading-relaxed">
            Supported formats: JPG, PNG, WebP (images) · MP4, WebM (videos, max 50MB).
            Uploading a new file replaces the current hero media.
          </p>
        </div>

        <label
          className={`flex items-center gap-3 w-fit px-8 py-4 bg-natural-primary text-white rounded-full font-bold uppercase text-[10px] tracking-widest cursor-pointer hover:bg-natural-dark transition-all shadow-lg ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <Upload className="w-4 h-4" />
          {isUploading ? 'Uploading...' : 'Choose Image or Video'}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleUpload}
            disabled={isUploading}
          />
        </label>
      </div>
    </div>
  );
};
