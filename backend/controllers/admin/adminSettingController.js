const Setting = require('../../models/Setting');

exports.getSettings = async (req, res) => {
  try {
    let settings = await Setting.findById('system_settings').lean();
    if (!settings) {
      settings = {
        school_name: 'SMP Negeri 1 Suradadi',
        academic_year: '2024/2025',
        semester: 'Ganjil',
        contact_email: 'info@smpn1suradadi.sch.id',
        contact_phone: '(021) 12345678'
      };
    }
    delete settings._id;
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    await Setting.findByIdAndUpdate('system_settings', req.body, { upsert: true, new: true });
    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};