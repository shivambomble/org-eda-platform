import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../db';

// Get all notes for a user
export const getUserNotes = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = await query(
      `SELECT n.*, p.name as project_name 
       FROM notes n
       JOIN projects p ON n.project_id = p.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching notes:', err);
    res.status(500).json({ message: 'Failed to fetch notes', error: (err as Error).message });
  }
};

// Get notes for a specific project
export const getProjectNotes = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = await query(
      `SELECT n.*, u.email as user_email
       FROM notes n
       JOIN users u ON n.user_id = u.id
       WHERE n.project_id = $1
       ORDER BY n.created_at DESC`,
      [projectId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching project notes:', err);
    res.status(500).json({ message: 'Failed to fetch project notes', error: (err as Error).message });
  }
};

// Create a new note
export const createNote = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { projectId, title, content } = req.body;

    if (!projectId || !title || !content) {
      return res.status(400).json({ message: 'Missing required fields: projectId, title, content' });
    }

    // Verify user has access to this project
    const projectCheck = await query(
      `SELECT id FROM projects WHERE id = $1`,
      [projectId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const result = await query(
      `INSERT INTO notes (user_id, project_id, title, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, projectId, title, content]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating note:', err);
    res.status(500).json({ message: 'Failed to create note', error: (err as Error).message });
  }
};

// Update a note
export const updateNote = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { noteId } = req.params;
    const { title, content } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verify note belongs to user
    const noteCheck = await query(
      `SELECT id FROM notes WHERE id = $1 AND user_id = $2`,
      [noteId, userId]
    );

    if (noteCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Note not found or unauthorized' });
    }

    const result = await query(
      `UPDATE notes 
       SET title = COALESCE($1, title), 
           content = COALESCE($2, content),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [title || null, content || null, noteId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating note:', err);
    res.status(500).json({ message: 'Failed to update note', error: (err as Error).message });
  }
};

// Delete a note
export const deleteNote = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { noteId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verify note belongs to user
    const noteCheck = await query(
      `SELECT id FROM notes WHERE id = $1 AND user_id = $2`,
      [noteId, userId]
    );

    if (noteCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Note not found or unauthorized' });
    }

    await query(`DELETE FROM notes WHERE id = $1`, [noteId]);

    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    console.error('Error deleting note:', err);
    res.status(500).json({ message: 'Failed to delete note', error: (err as Error).message });
  }
};
