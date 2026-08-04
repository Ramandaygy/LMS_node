const Event = require('../models/Event');

// Get all events
exports.getEvents = async (req, res) => {
  try {
    const filter = {};
    if (req.user && (req.user.role === 'siswa' || req.user.role === 'ortu')) {
      filter.visibility = 'public';
    }
    const events = await Event.find(filter).sort({ start_date: 1 });
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Gagal mengambil data kalender' });
  }
};

// Create a new event
exports.createEvent = async (req, res) => {
  try {
    const { title, description, start_date, end_date, type, color, visibility } = req.body;

    const newEvent = new Event({
      title,
      description,
      start_date,
      end_date,
      type,
      color,
      visibility: visibility || 'public',
      created_by: req.user.id
    });

    const savedEvent = await newEvent.save();
    res.status(201).json(savedEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ message: 'Gagal membuat event baru' });
  }
};

// Update an event
exports.updateEvent = async (req, res) => {
  try {
    const { title, description, start_date, end_date, type, color, visibility } = req.body;
    
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event tidak ditemukan' });
    }

    event.title = title || event.title;
    event.description = description !== undefined ? description : event.description;
    event.start_date = start_date || event.start_date;
    event.end_date = end_date || event.end_date;
    event.type = type || event.type;
    event.color = color || event.color;
    if (visibility !== undefined) event.visibility = visibility;

    const updatedEvent = await event.save();
    res.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ message: 'Gagal mengupdate event' });
  }
};

// Delete an event
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event tidak ditemukan' });
    }

    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ message: 'Gagal menghapus event' });
  }
};
