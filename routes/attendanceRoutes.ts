import express from 'express';
import multer from 'multer';
import { AttendanceController } from '../controllers/attendanceController';

const router = express.Router();
const attendanceController = new AttendanceController();

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    },
});

// Routes
router.post('/process', upload.single('photo'), attendanceController.processAttendance);
router.get('/history', attendanceController.getAttendanceHistory);

export default router; 