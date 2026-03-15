'use client';

import React, { useRef, useState } from 'react';
import { useImageUpload } from '@/hooks/use-image-upload';
import { Upload, X, Loader2 } from 'lucide-react';

interface ImageUploadProps {
  onUploadComplete: (url: string, publicId: string) => void;
  folder?: string;
  currentImage?: string;
  onDelete?: () => void;
  className?: string;
  multiple?: boolean;
  // Deferred mode: only preview file, don't upload immediately
  deferUpload?: boolean;
  onFileSelect?: (file: File) => void;
}

/**
 * Reusable Image Upload Component
 */
export function ImageUpload({
  onUploadComplete,
  folder,
  currentImage,
  onDelete,
  className = '',
  multiple = false,
  deferUpload = false,
  onFileSelect,
}: ImageUploadProps) {
  const { upload, uploadMultiple, uploading, error, progress } =
    useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const preview = localPreview ?? currentImage ?? null;

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (multiple) {
      const fileArray = Array.from(files);

      if (deferUpload) {
        // Deferred mode: just show preview, don't upload
        // Note: deferred mode currently only supports single file
        return;
      }

      const results = await uploadMultiple(fileArray, folder);

      if (results.length > 0) {
        // For multiple uploads, call onUploadComplete for each result
        results.forEach((result) => {
          onUploadComplete(result.url, result.publicId);
        });
      }
    } else {
      const file = files[0];

      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLocalPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      if (deferUpload) {
        // Deferred mode: just show preview and pass file to parent
        if (onFileSelect) {
          onFileSelect(file);
        }
      } else {
        // Immediate mode: upload right away
        const result = await upload(file, folder);
        if (result) {
          setLocalPreview(result.url);
          onUploadComplete(result.url, result.publicId);
        }
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = () => {
    setLocalPreview(null);
    if (onDelete) {
      onDelete();
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <input
        ref={fileInputRef}
        type='file'
        accept='image/*'
        multiple={multiple}
        onChange={handleFileChange}
        className='hidden'
        disabled={uploading}
      />

      {/* Upload Button */}
      {!preview && (
        <button
          type='button'
          onClick={handleClick}
          disabled={uploading}
          className='relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {uploading ? (
            <>
              <Loader2 className='w-12 h-12 text-gray-400 animate-spin mb-4' />
              <p className='text-sm text-gray-600'>Uploading... {progress}%</p>
            </>
          ) : (
            <>
              <Upload className='w-12 h-12 text-gray-400 mb-4' />
              <p className='text-sm text-gray-600'>
                Click to upload {multiple ? 'images' : 'an image'}
              </p>
              <p className='text-xs text-gray-400 mt-2'>
                PNG, JPG, GIF up to 10MB
              </p>
            </>
          )}
        </button>
      )}

      {/* Image Preview */}
      {preview && !multiple && (
        <div className='relative w-full h-64 border-2 border-gray-200 rounded-lg overflow-hidden'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt='Preview'
            className='w-full h-full object-cover'
          />
          <button
            type='button'
            onClick={handleDelete}
            className='absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors'
          >
            <X className='w-4 h-4' />
          </button>
          {uploading && (
            <div className='absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center'>
              <div className='text-white text-center'>
                <Loader2 className='w-8 h-8 animate-spin mx-auto mb-2' />
                <p className='text-sm'>{progress}%</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Change Image Button (when image exists) */}
      {preview && !uploading && (
        <button
          type='button'
          onClick={handleClick}
          className='w-full py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
        >
          Change Image
        </button>
      )}

      {/* Error Message */}
      {error && (
        <div className='p-3 bg-red-50 border border-red-200 rounded-lg'>
          <p className='text-sm text-red-600'>{error}</p>
        </div>
      )}
    </div>
  );
}
