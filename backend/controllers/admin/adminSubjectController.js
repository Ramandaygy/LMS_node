const Subject = require('../../models/Subject');
const Assignment = require('../../models/Assignment');
const Schedule = require('../../models/Schedule');

exports.getAllSubjects = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    let filters = {};
    if (req.query.is_active !== undefined) {
      filters.is_active = req.query.is_active === 'true';
    }
    if (req.query.code) {
      filters.code = req.query.code;
    }
    if (req.query.search) {
      filters.name = { $regex: req.query.search, $options: 'i' };
    }

    const sortBy = req.query.sort_by || 'name';
    const sortOrder = req.query.order === 'desc' ? -1 : 1;
    const sort = { [sortBy]: sortOrder };

    const subjects = await Subject.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
    const total = await Subject.countDocuments(filters);

    const formatted = subjects.map(s => ({ ...s, _id: s._id.toString() }));

    res.json({
      subjects: formatted,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createSubject = async (req, res) => {
  try {
    const data = req.body;
    if (!data.name) return res.status(400).json({ error: 'Subject name is required' });

    const existing = await Subject.findOne({ name: data.name });
    if (existing) return res.status(400).json({ error: `Subject ${data.name} already exists` });

    if (data.code) {
      const existingCode = await Subject.findOne({ code: data.code });
      if (existingCode) return res.status(400).json({ error: `Code ${data.code} already exists` });
    }

    const newSubject = {
      name: data.name,
      code: data.code || '',
      description: data.description || '',
      is_active: data.is_active !== undefined ? data.is_active : true,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await Subject.create(newSubject);
    res.status(201).json({ message: 'Subject created successfully', subject_id: result._id.toString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const subjectId = req.params.subject_id;
    const data = req.body;
    const existing = await Subject.findById(subjectId);
    if (!existing) return res.status(404).json({ error: 'Subject not found' });

    // Check name conflict
    if (data.name && data.name !== existing.name) {
      const conflict = await Subject.findOne({ name: data.name });
      if (conflict) return res.status(400).json({ error: `Subject ${data.name} already exists` });
    }
    // Check code conflict
    if (data.code && data.code !== existing.code) {
      const conflictCode = await Subject.findOne({ code: data.code });
      if (conflictCode) return res.status(400).json({ error: `Code ${data.code} already exists` });
    }

    const updateData = { updated_at: new Date() };
    const allowedFields = ['name', 'code', 'description', 'is_active'];
    allowedFields.forEach(field => {
      if (data[field] !== undefined) updateData[field] = data[field];
    });

    await Subject.findByIdAndUpdate(subjectId, { $set: updateData });
    res.json({ message: 'Subject updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const subjectId = req.params.subject_id;
    // Cek apakah subject digunakan di assignments atau schedules
    const usedInAssignments = await Assignment.findOne({ subject_id: subjectId });
    const usedInSchedules = await Schedule.findOne({ subject_id: subjectId });
    if (usedInAssignments || usedInSchedules) {
      return res.status(400).json({ error: 'Cannot delete subject because it is used in assignments or schedules' });
    }

    const result = await Subject.findByIdAndDelete(subjectId);
    if (!result) return res.status(404).json({ error: 'Subject not found' });
    res.json({ message: 'Subject deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getSubjectOptions = async (req, res) => {
  try {
    const subjects = await Subject.find({ is_active: true })
      .select('_id name code')
      .sort({ name: 1 })
      .lean();
    const formatted = subjects.map(s => ({ _id: s._id.toString(), name: s.name, code: s.code }));
    res.json({ subjects: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};