import dotenv from "dotenv";
dotenv.config();
import asyncHandler from "express-async-handler";
import { OpenAI } from "openai";
import Task from "../models/taskModel.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const buildTaskContext = (task) => {
  if (!task) return "";

  const completedSubTasks = task.subTasks?.filter((sub) => sub.isCompleted).length || 0;
  const totalSubTasks = task.subTasks?.length || 0;
  const completionRate = totalSubTasks
    ? Math.round((completedSubTasks / totalSubTasks) * 100)
    : 0;
  const teamMembers = task.team?.map((member) => member.name).join(", ") || "No team assigned";
  const subtaskSummary = totalSubTasks
    ? `${completedSubTasks} of ${totalSubTasks} subtasks completed (${completionRate}%).`
    : "No subtasks defined.";

  return `Task details:
- Title: ${task.title}
- Stage: ${task.stage}
- Priority: ${task.priority}
- Due Date: ${new Date(task.date).toDateString()}
- Reminder: ${task.reminderAt ? new Date(task.reminderAt).toLocaleString() : "None"}
- Team: ${teamMembers}
- Description: ${task.description || "No description provided."}
- Subtask progress: ${subtaskSummary}
`;
};

const getSmartSuggestions = asyncHandler(async (req, res) => {
  const { taskId, prompt } = req.body;
  const task = taskId ? await Task.findById(taskId).populate("team", "name") : null;
  const tasks = await Task.find({ isTrashed: false }).limit(20);

  const taskSummary = buildTaskContext(task);
  const todoSummary = tasks
    .map(
      (item) =>
        `${item.title} [${item.stage}] priority: ${item.priority} due: ${new Date(item.date).toDateString()}`
    )
    .join("\n");

  const basePrompt = `You are a productivity assistant for a task manager.
${taskSummary}
Here are the most recent tasks:\n${todoSummary}
Provide smart suggestions for what the user should do next, recommended priority adjustments, deadline reminders, and productivity tips. Keep the answer concise, actionable, and directly tied to the current task when task details are available.`;

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: prompt ? `${basePrompt}\nUser prompt: ${prompt}` : basePrompt,
    max_output_tokens: 400,
  });

  const output = response.output[0]?.content[0]?.text || "No suggestions available.";

  res.status(200).json({ status: true, suggestions: output.trim() });
});

const getChatResponse = asyncHandler(async (req, res) => {
  const { taskId, message } = req.body;

  if (!message) {
    res.status(400);
    throw new Error("Message is required");
  }

  const task = taskId ? await Task.findById(taskId).populate("team", "name") : null;
  const taskSummary = buildTaskContext(task);

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: `You are a task management assistant. ${taskSummary} Answer the user's question clearly and offer task-focused recommendations. User message: ${message}`,
    max_output_tokens: 400,
  });

  const output = response.output[0]?.content[0]?.text || "I couldn't generate a response.";

  res.status(200).json({ status: true, message: output.trim() });
});

export { getSmartSuggestions, getChatResponse };
