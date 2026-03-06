import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

/**
 * Upload an image to Cloudinary
 * @param file - Base64 string or file path
 * @param folder - Folder name in Cloudinary (optional)
 * @returns Upload result with secure URL
 */
export async function uploadToCloudinary(
  file: string,
  folder: string = 'bakery-shop',
): Promise<{
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
}> {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder,
      resource_type: 'auto',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    });

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Delete an image from Cloudinary
 * @param publicId - The public ID of the image to delete
 * @returns Deletion result
 */
export async function deleteFromCloudinary(
  publicId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await cloudinary.uploader.destroy(publicId);
    return { success: true };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

/**
 * Upload multiple images to Cloudinary
 * @param files - Array of base64 strings or file paths
 * @param folder - Folder name in Cloudinary (optional)
 * @returns Array of upload results
 */
export async function uploadMultipleToCloudinary(
  files: string[],
  folder: string = 'bakery-shop',
): Promise<
  Array<{
    success: boolean;
    url?: string;
    publicId?: string;
    error?: string;
  }>
> {
  const uploadPromises = files.map((file) => uploadToCloudinary(file, folder));
  return Promise.all(uploadPromises);
}
