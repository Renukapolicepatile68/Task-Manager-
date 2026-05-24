import Task from "../models/taskModel.js";
import Notice from "../models/notis.js";
import { getIO } from "./socket.js";

const REMINDER_INTERVAL_MS = 60 * 1000; // 1 minute

const createReminderText = (task) => {
  const dueDate = task.reminderAt
    ? new Date(task.reminderAt).toLocaleString()
    : new Date(task.date).toLocaleString();
  return `Reminder: ${task.title} is scheduled for ${dueDate}.`; 
};

export const startReminderScheduler = () => {
  setInterval(async () => {
    try {
      const now = new Date();
      const tasks = await Task.find({
        reminderAt: { $lte: now },
        reminderSent: false,
        isTrashed: false,
      }).populate("team", "name email");

      if (!tasks.length) return;

      for (const task of tasks) {
        const text = createReminderText(task);

        await Notice.create({
          team: task.team.map((member) => member._id),
          text,
          task: task._id,
          notiType: "alert",
        });

        task.reminderSent = true;
        await task.save();

        const io = getIO();
        if (io) {
          io.emit("taskReminder", { task: task.toObject(), text });
        }
      }
    } catch (error) {
      console.error("Reminder scheduler error:", error);
    }
  }, REMINDER_INTERVAL_MS);
};
