import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ProjectRepository } from '../../repositories/ProjectRepository';
import { transformProjectForFrontend } from '../../lib/projectTransform';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-originalname
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Only accept ZIP files
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// POST /api/projects/upload - Upload ZIP project
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    // Check authentication
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Validate file upload
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get form data
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      // Delete uploaded file if validation fails
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Project name is required' });
    }

    // Create project in database
    const projectDB = await ProjectRepository.create({
      user_id: req.session.userId,
      project_name: name.trim(),
      description: description?.trim() || null,
      project_type: 'zip',
      zip_file_path: req.file.path,
      scan_approved: false,
      is_deployed: false
    });

    // Transform for frontend
    const project = transformProjectForFrontend(projectDB);

    res.status(201).json({
      message: 'Project uploaded successfully',
      project
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    
    // Delete uploaded file if database operation fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Failed to upload project',
      details: error.message 
    });
  }
});

export default router;
