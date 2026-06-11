const express =
  require('express');

const router =
  express.Router();

const controller =
  require(
    '../controllers/academicYearController'
  );

router.get(
  '/',
  controller.getAll
);

router.post(
  '/',
  controller.create
);

router.put(
  '/:id',
  controller.update
);

router.delete(
  '/:id',
  controller.delete
);

router.get(
  '/current',
  controller.getCurrent
);

router.get(
  '/:id/alumni',
  controller.getAlumniByYear
);

router.post(
  '/:id/promote',
  controller.promoteStudents
);

module.exports =
  router;