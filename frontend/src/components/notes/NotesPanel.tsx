import React, { useState } from 'react';
import { useQuery, gql, useMutation } from '@apollo/client';
import { Plus, Trash2, Clock, FileText } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const GET_PROJECTS = gql`
  query GetProjects {
    projects(order_by: {created_at: desc}) {
      id
      name
    }
  }
`;

const GET_NOTES = gql`
  query GetNotes {
    notes(order_by: {created_at: desc}) {
      id
      title
      content
      project_id
      project {
        name
      }
      created_at
    }
  }
`;

const DELETE_NOTE = gql`
  mutation DeleteNote($id: uuid!) {
    delete_notes_by_pk(id: $id) {
      id
    }
  }
`;

interface Project {
  id: string;
  name: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  project_id: string;
  project: {
    name: string;
  };
  created_at: string;
}

const NotesPanel: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [error, setError] = useState('');

  const { data: projectsData, loading: projectsLoading } = useQuery(GET_PROJECTS);
  const { data: notesData, loading: notesLoading, refetch: refetchNotes } = useQuery(GET_NOTES);
  
  const [deleteNote] = useMutation(DELETE_NOTE, {
    onCompleted: () => {
      refetchNotes();
    },
    onError: (err) => {
      console.error('Failed to delete note:', err);
    }
  });

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !noteTitle || !noteContent) {
      setError('All fields are required');
      return;
    }

    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId: selectedProject,
          title: noteTitle,
          content: noteContent
        })
      });

      if (!response.ok) {
        const error = await response.json();
        setError(error.message || 'Failed to create note');
        return;
      }

      setNoteTitle('');
      setNoteContent('');
      setSelectedProject('');
      setShowForm(false);
      setError('');
      refetchNotes();
    } catch (err) {
      console.error('Note creation error:', err);
      setError('Failed to create note');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm('Delete this note?')) return;

    try {
      await deleteNote({
        variables: { id: noteId }
      });
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const projects: Project[] = projectsData?.projects || [];
  const notes: Note[] = notesData?.notes || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Notes
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors text-blue-400 hover:text-blue-300"
          title="Add note"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Create Note Form */}
      {showForm && (
        <div className="bg-slate-700/50 rounded-lg border border-slate-600 p-3 space-y-3 animate-slideInLeft">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Project</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              disabled={projectsLoading}
              className="w-full px-2 py-1.5 bg-slate-700/50 border border-slate-600 rounded text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">{projectsLoading ? 'Loading projects...' : 'Select a project...'}</option>
              {projects.map((project: Project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Title</label>
            <Input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Note title..."
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Note</label>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write your note..."
              className="w-full px-2 py-1.5 bg-slate-700/50 border border-slate-600 rounded text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleCreateNote}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 rounded"
            >
              Save Note
            </Button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs py-1 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {notesLoading ? (
          <p className="text-xs text-slate-500 text-center py-4">Loading notes...</p>
        ) : notes.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">No notes yet</p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="bg-slate-700/30 border border-slate-600 rounded-lg p-2.5 hover:bg-slate-700/50 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">{note.title}</p>
                  <p className="text-xs text-blue-400">{note.project.name}</p>
                </div>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="p-1 text-red-400 hover:text-red-300 hover:bg-red-600/20 rounded opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                  title="Delete note"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2 mb-1.5">{note.content}</p>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                {formatDate(note.created_at)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotesPanel;
