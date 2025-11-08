import React from 'react';
import { Note } from '../db';
import '../index.css'; // glass-card スタイルのためにインポート

interface TaskItemProps {
  task: Note;
  onToggleCompletion: (id: string, isCompleted: boolean) => void;
  onDelete: (id: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggleCompletion, onDelete }) => {
  const formattedDate = task.createdAt.toLocaleString();

  return (
    <div className="task-item glass-card">
      <input
        type="checkbox"
        checked={task.isCompleted || false}
        onChange={() => onToggleCompletion(task.id, !(task.isCompleted || false))}
        className="task-checkbox"
      />
      <span className={`task-content ${task.isCompleted ? 'completed' : ''}`}>
        {task.content as string}
      </span>
      <div className="task-actions">
        <button onClick={() => onDelete(task.id)} className="icon-button small">
          <span className="material-symbols-outlined">delete</span>
        </button>
      </div>
      <div className="task-footer">
        <span className="task-date">{formattedDate}</span>
      </div>
    </div>
  );
};

export default TaskItem;
