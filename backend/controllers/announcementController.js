import Announcement from '../models/Announcement.js';

const validId = (id) => /^[a-f\d]{24}$/i.test(String(id));

export const listAnnouncements = async (req, res, next) => {
  try {
    const items = await Announcement.find({ companyId: req.user.companyId })
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      data: items,
      announcements: items,
    });
  } catch (error) {
    next(error);
  }
};

export const createAnnouncement = async (req, res, next) => {
  try {
    const { title, content, priority = 'normal' } = req.body;

    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Announcement title and content are required.',
      });
    }

    const item = await Announcement.create({
      companyId: req.user.companyId,
      title: title.trim(),
      content: content.trim(),
      priority: ['normal', 'important', 'urgent'].includes(priority)
        ? priority
        : 'normal',
      createdBy: req.user._id,
    });

    await item.populate('createdBy', 'name role');

    res.status(201).json({
      success: true,
      message: 'Announcement posted.',
      data: item,
      announcement: item,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAnnouncement = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid announcement ID.',
      });
    }

    const deleted = await Announcement.findOneAndDelete({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found.',
      });
    }

    res.json({
      success: true,
      message: 'Announcement deleted.',
    });
  } catch (error) {
    next(error);
  }
};
