'use client';

import { useState } from 'react';

interface UploadResult {
  url: string;
  publicId: string;
}

interface UseImageUploadReturn {
  upload: (file: File, folder?: string) => Promise<UploadResult | null>;
  uploadMultiple: (files: File[], folder?: string) => Promise<UploadResult[]>;
  deleteImage: (publicId: string) => Promise<boolean>;
  uploading: boolean;
  error: string | null;
  progress: number;
}

/**
 * Hook for uploading images to Cloudinary
 */
export function useImageUpload(): UseImageUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  /**
   * Convert file to base64 string
   */
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  /**
   * Upload a single image
   */
  const upload = async (
    file: File,
    folder?: string,
  ): Promise<UploadResult | null> => {
    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }

      setProgress(30);

      // Convert to base64
      const base64 = await fileToBase64(file);
      setProgress(50);

      // Upload to server
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: base64,
          folder,
        }),
      });

      setProgress(80);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      setProgress(100);

      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      console.error('Upload error:', err);
      return null;
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  /**
   * Upload multiple images
   */
  const uploadMultiple = async (
    files: File[],
    folder?: string,
  ): Promise<UploadResult[]> => {
    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      // Validate files
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} is not an image`);
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`${file.name} is larger than 10MB`);
        }
      }

      setProgress(20);

      // Convert all files to base64
      const base64Files = await Promise.all(files.map(fileToBase64));
      setProgress(50);

      // Upload to server
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: base64Files,
          folder,
        }),
      });

      setProgress(80);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      setProgress(100);

      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      return data.data.uploaded || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      console.error('Upload error:', err);
      return [];
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  /**
   * Delete an image
   */
  const deleteImage = async (publicId: string): Promise<boolean> => {
    setUploading(true);
    setError(null);

    try {
      const response = await fetch('/api/upload/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publicId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      const data = await response.json();
      return data.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Delete failed';
      setError(errorMessage);
      console.error('Delete error:', err);
      return false;
    } finally {
      setUploading(false);
    }
  };

  return {
    upload,
    uploadMultiple,
    deleteImage,
    uploading,
    error,
    progress,
  };
}
