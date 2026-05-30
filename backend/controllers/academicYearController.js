const service =
  require('../services/academicYearService');

exports.getAll =
  async (req, res) => {

    const data =
      await service.getAll();

    res.json({
      success: true,
      academic_years: data
    });
  };

exports.create =
  async (req, res) => {

    const data =
      await service.create(
        req.body
      );

    res.status(201).json({
      success: true,
      data
    });
  };

exports.update =
  async (req, res) => {

    const data =
      await service.update(
        req.params.id,
        req.body
      );

    res.json({
      success: true,
      data
    });
  };

exports.delete =
  async (req, res) => {

    await service.delete(
      req.params.id
    );

    res.json({
      success: true
    });
  };

exports.getCurrent =
  async (req, res) => {

    const data =
      await service.getCurrent();

    res.json(data);
  };