import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getUserNotes,
  getProjectNotes,
  createNote,
  updateNote,
  deleteNote
} from './controller';

const router = Router();

// Get all notes for current user
router.get('/notes', authenticate, getUserNotes);

// Get notes for a specific project
router.get('/projects/:projectId/notes', authenticate, getProjectNotes);

// Create a new note
router.post('/notes', authenticate, createNote);

// Update a note
router.put('/notes/:noteId', authenticate, updateNote);

// Delete a note
router.delete('/notes/:noteId', authenticate, deleteNote);

export default router;
