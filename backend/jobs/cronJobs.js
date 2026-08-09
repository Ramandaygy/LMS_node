const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');

// Run every day at 00:00
cron.schedule('0 0 * * *', async () => {
  console.log('[CRON] Memulai proses pembersihan auto-cleanup file lama...');
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Cari tugas yang deadline-nya sudah lewat 7 hari
    const expiredAssignments = await Assignment.find({
      deadline: { $lt: sevenDaysAgo }
    });

    const assignmentIds = expiredAssignments.map(a => a._id);

    if (assignmentIds.length === 0) {
      console.log('[CRON] Tidak ada tugas yang kedaluwarsa lebih dari 7 hari.');
      return;
    }

    // Cari submission dengan file untuk tugas-tugas tersebut
    const submissionsToClean = await Submission.find({
      assignment_id: { $in: assignmentIds },
      file: { $ne: '' }
    });

    let deletedCount = 0;

    for (const sub of submissionsToClean) {
      if (sub.file) {
        // Hapus file fisik (lokal) jika ada
        if (sub.file.startsWith('/uploads/')) {
          const filePath = path.join(__dirname, '..', '..', sub.file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } else if (process.env.VERCEL === '1' && sub.file.startsWith('http')) {
          // Logika untuk menghapus dari Supabase Storage jika diperlukan
          // const { supabase } = require('../services/supabaseService');
          // await supabase.storage.from('submissions').remove([fileName]);
        }
        
        // Kosongkan nama file di DB
        sub.file = '';
        await sub.save();
        deletedCount++;
      }
    }
    
    // Opsional: Hapus attachment media di soal assignment jika diperlukan
    // (Berdasarkan instruksi "media soalnya auto kehapus")
    let deletedMediaCount = 0;
    for (const assignment of expiredAssignments) {
      if (assignment.attachments && assignment.attachments.length > 0) {
        let hasChanges = false;
        const newAttachments = [];
        
        for (const att of assignment.attachments) {
          if (att.type === 'file' && att.value) {
            if (att.value.startsWith('/uploads/')) {
               const filePath = path.join(__dirname, '..', '..', att.value);
               if (fs.existsSync(filePath)) {
                 fs.unlinkSync(filePath);
               }
            }
            hasChanges = true;
          } else {
            newAttachments.push(att);
          }
        }
        
        if (hasChanges) {
          assignment.attachments = newAttachments;
          await assignment.save();
          deletedMediaCount++;
        }
      }
    }

    console.log(`[CRON] Auto-cleanup selesai. Menghapus file dari ${deletedCount} submission dan media dari ${deletedMediaCount} soal tugas.`);
  } catch (error) {
    console.error('[CRON] Gagal menjalankan auto-cleanup:', error);
  }
});
