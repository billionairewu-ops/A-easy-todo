import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Priority = "urgent" | "track" | "remember";

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  deadline: string | null;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
}

interface TaskContextValue {
  tasks: Task[];
  addTask: (task: Omit<Task, "id" | "createdAt" | "completedAt">) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleComplete: (id: string) => void;
  filter: Priority | "all";
  setFilter: (f: Priority | "all") => void;
}

const TaskContext = createContext<TaskContextValue | null>(null);

const STORAGE_KEY = "@tasks_v1";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Priority | "all">("all");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setTasks(JSON.parse(raw));
        } catch {}
      }
    });
  }, []);

  const persist = useCallback((updated: Task[]) => {
    setTasks(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const addTask = useCallback(
    (task: Omit<Task, "id" | "createdAt" | "completedAt">) => {
      const newTask: Task = {
        ...task,
        id: generateId(),
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
      persist([newTask, ...tasks]);
    },
    [tasks, persist]
  );

  const updateTask = useCallback(
    (id: string, updates: Partial<Task>) => {
      persist(tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    },
    [tasks, persist]
  );

  const deleteTask = useCallback(
    (id: string) => {
      persist(tasks.filter((t) => t.id !== id));
    },
    [tasks, persist]
  );

  const toggleComplete = useCallback(
    (id: string) => {
      persist(
        tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                completed: !t.completed,
                completedAt: !t.completed ? new Date().toISOString() : null,
              }
            : t
        )
      );
    },
    [tasks, persist]
  );

  return (
    <TaskContext.Provider
      value={{
        tasks,
        addTask,
        updateTask,
        deleteTask,
        toggleComplete,
        filter,
        setFilter,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks(): TaskContextValue {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTasks must be used inside TaskProvider");
  return ctx;
}

export function useTaskStats() {
  const { tasks } = useTasks();
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pending = total - completed;
  const urgent = tasks.filter((t) => t.priority === "urgent" && !t.completed).length;
  const track = tasks.filter((t) => t.priority === "track" && !t.completed).length;
  const remember = tasks.filter((t) => t.priority === "remember" && !t.completed).length;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const overdue = tasks.filter((t) => {
    if (t.completed || !t.deadline) return false;
    const d = new Date(t.deadline);
    d.setHours(0, 0, 0, 0);
    return d < now;
  }).length;

  const dueToday = tasks.filter((t) => {
    if (t.completed || !t.deadline) return false;
    const d = new Date(t.deadline);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === now.getTime();
  }).length;

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, pending, urgent, track, remember, overdue, dueToday, completionRate };
}
