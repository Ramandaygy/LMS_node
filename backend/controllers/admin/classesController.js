const Class = require('../../models/Class');
const UserGuru = require('../../models/UserGuru');
const AcademicYear = require('../../models/AcademicYear');
const { ObjectId } = require('mongoose').Types;

const isValidObjectId = (id) => ObjectId.isValid(id);

exports.getAllClasses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    let filters = {};
    if (req.query.is_active !== undefined) {
      filters.is_active = req.query.is_active === 'true';
    }
    if (req.query.academic_year_id && isValidObjectId(req.query.academic_year_id)) {
      filters.academic_year_id = new ObjectId(req.query.academic_year_id);
    }

    const pipeline = [
      { $match: filters },
      { $lookup: { from: 'users_guru', localField: 'homeroom_teacher', foreignField: '_id', as: 'wali' } },
      { $lookup: { from: 'academic_years', localField: 'academic_year_id', foreignField: '_id', as: 'tahun' } },
      { $addFields: {
        homeroom_teacher_name: { $arrayElemAt: ['$wali.full_name', 0] },
        academic_year_name: { $arrayElemAt: ['$tahun.year', 0] }
      }},
      { $project: { wali: 0, tahun: 0 } },
      { $skip: skip },
      { $limit: limit }
    ];

    const classes = await Class.aggregate(pipeline);
    const total = await Class.countDocuments(filters);

    const formatted = classes.map(c => ({
      ...c,
      _id: c._id.toString(),
      homeroom_teacher: c.homeroom_teacher ? c.homeroom_teacher.toString() : null,
      academic_year_id: c.academic_year_id ? c.academic_year_id.toString() : null
    }));

    res.json({ classes: formatted, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createClass = async (req, res) => {
  try {
    const data = req.body;
    if (!data.name) return res.status(400).json({ error: 'Class name is required' });

    const existing = await Class.findOne({ name: data.name });
    if (existing) return res.status(400).json({ error: `Class ${data.name} already exists` });

    let gradeLevel = data.grade_level;
    if (gradeLevel !== undefined && gradeLevel !== null) {
      const num = parseInt(gradeLevel);
      if (isNaN(num)) return res.status(400).json({ error: 'grade_level must be an integer' });
      gradeLevel = num;
    }

    const newClass = {
      name: data.name,
      grade_level: gradeLevel,
      description: data.description || '',
      is_active: data.is_active !== undefined ? data.is_active : true,
      homeroom_teacher: (data.homeroom_teacher && isValidObjectId(data.homeroom_teacher)) ? new ObjectId(data.homeroom_teacher) : null,
      academic_year_id: (data.academic_year_id && isValidObjectId(data.academic_year_id)) ? new ObjectId(data.academic_year_id) : null,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await Class.create(newClass);
    res.status(201).json({ message: 'Class created successfully', class_id: result._id.toString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateClass = async (req, res) => {
  try {
    const classId = req.params.class_id;
    if (!isValidObjectId(classId)) return res.status(400).json({ error: 'Invalid class ID' });

    const existing = await Class.findById(classId);
    if (!existing) return res.status(404).json({ error: 'Class not found' });

    const data = req.body;
    const updateData = { updated_at: new Date() };
    const allowedFields = ['name', 'grade_level', 'description', 'is_active', 'homeroom_teacher', 'academic_year_id'];

    for (let field of allowedFields) {
      if (data[field] !== undefined) {
        if (field === 'grade_level') {
          if (data[field] !== null && data[field] !== '') {
            const num = parseInt(data[field]);
            if (isNaN(num)) return res.status(400).json({ error: 'grade_level must be an integer' });
            updateData[field] = num;
          } else {
            updateData[field] = null;
          }
        } else if (field === 'homeroom_teacher') {
          updateData[field] = (data[field] && isValidObjectId(data[field])) ? new ObjectId(data[field]) : null;
        } else if (field === 'academic_year_id') {
          updateData[field] = (data[field] && isValidObjectId(data[field])) ? new ObjectId(data[field]) : null;
        } else {
          updateData[field] = data[field];
        }
      }
    }

    if (updateData.name && updateData.name !== existing.name) {
      const conflict = await Class.findOne({ name: updateData.name });
      if (conflict) return res.status(400).json({ error: `Class ${updateData.name} already exists` });
    }

    await Class.findByIdAndUpdate(classId, { $set: updateData });
    res.json({ message: 'Class updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteClass = async (req, res) => {
  try {
    const classId = req.params.class_id;
    if (!isValidObjectId(classId)) return res.status(400).json({ error: 'Invalid class ID' });
    const result = await Class.findByIdAndDelete(classId);
    if (!result) return res.status(404).json({ error: 'Class not found' });
    res.json({ message: 'Class deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getClassOptions = async (req, res) => {
  try {
    const classes = await Class.find({ is_active: true })
      .select('_id name grade_level')
      .sort({ grade_level: 1, name: 1 })
      .lean();
    const formatted = classes.map(c => ({ _id: c._id.toString(), name: c.name, grade_level: c.grade_level }));
    res.json({ classes: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getTeacherOptions = async (req, res) => {
  try {
    const teachers = await UserGuru.find({ is_active: true })
      .select('_id full_name nip')
      .lean();
    const formatted = teachers.map(t => ({ _id: t._id.toString(), full_name: t.full_name, nip: t.nip }));
    res.json({ teachers: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getAcademicYearOptions = async (req, res) => {
  try {
    const years = await AcademicYear.find({})
      .select('_id year is_active')
      .sort({ year: -1 })
      .lean();
    const formatted = years.map(y => ({ _id: y._id.toString(), year: y.year, is_active: y.is_active }));
    res.json({ academic_years: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};