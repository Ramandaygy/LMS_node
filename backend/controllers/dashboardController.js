const User = require('../models/User');
const Class = require('../models/Class');
const Subject = require('../models/Subject');

// ======================================
// GET DASHBOARD STATS
// ======================================
exports.getDashboardStats =
  async (req, res) => {

    try {

      const total_students =
        await User.countDocuments({
          role: 'siswa',
        });

      const total_teachers =
        await User.countDocuments({
          role: 'guru',
        });

      const total_parents =
        await User.countDocuments({
          role: 'ortu',
        });

      const total_classes =
        await Class.countDocuments();

      const total_subjects =
        await Subject.countDocuments();

      return res.status(200).json({
        success: true,

        total_students,
        total_teachers,
        total_parents,
        total_classes,
        total_subjects,
     
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to load dashboard stats',
      });
    }
  };

  exports.getParentDashboard = async (req, res) => {
    try {
  
      const parentId = req.user.id;
  
      const parent =
        await mongoose.connection
          .collection('users_ortu')
          .findOne({
            _id: new mongoose.Types.ObjectId(parentId)
          });
  
      if (!parent) {
        return res.status(404).json({
          success:false,
          message:'Parent not found'
        });
      }
  
      const childrenIds =
        parent.children || [];
  
      const students =
        await mongoose.connection
          .collection('users_siswa')
          .find({
            _id: {
              $in: childrenIds
            }
          })
          .toArray();
  
      return res.json({
        success:true,
        total_children: students.length,
        children: students
      });
  
    } catch(err){
      console.error(err);
      res.status(500).json({
        success:false,
        error:err.message
      });
    }
  };