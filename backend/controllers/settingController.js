const Setting = require(
  '../models/Setting'
);

// ======================================
// GET SETTINGS
// ======================================
exports.getSettings =
  async (req, res) => {

    try {

      let setting =
        await Setting.findOne();

      if (!setting) {

        setting =
          await Setting.create({});
      }

      return res.status(200).json({
        success: true,
        data: setting,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to fetch settings',
      });
    }
  };

// ======================================
// UPDATE SETTINGS
// ======================================
exports.updateSettings =
  async (req, res) => {

    try {

      let setting =
        await Setting.findOne();

      if (!setting) {

        setting =
          await Setting.create(
            req.body
          );

      } else {

        setting =
          await Setting.findByIdAndUpdate(
            setting._id,
            req.body,
            { new: true }
          );
      }

      return res.status(200).json({
        success: true,
        data: setting,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to update settings',
      });
    }
  };