const { createClient } = require('@supabase/supabase-js');

// Ganti nilai berikut dengan credentials yang didapatkan
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tjjptbfwonkikfiyaaja.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_jrDX4PCI34LhvoIAe_MEeQ_rtlSTenM';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Uploads a file buffer to Supabase Storage
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} originalName - Original file name
 * @param {string} mimetype - File mime type
 * @param {string} folder - Folder name inside the bucket (e.g. 'materials', 'submissions')
 * @returns {Promise<string>} - Public URL of the uploaded file
 */
const uploadToSupabase = async (fileBuffer, originalName, mimetype, folder = '') => {
  try {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = originalName.split('.').pop();
    const fileName = `${folder ? folder + '/' : ''}${uniqueSuffix}.${ext}`;

    const { data, error } = await supabase
      .storage
      .from('materials') // Ganti dengan nama bucket Anda jika berbeda
      .upload(fileName, fileBuffer, {
        contentType: mimetype,
        upsert: false
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: publicUrlData } = supabase
      .storage
      .from('materials')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Supabase upload error:', error);
    throw error;
  }
};

module.exports = {
  supabase,
  uploadToSupabase
};
