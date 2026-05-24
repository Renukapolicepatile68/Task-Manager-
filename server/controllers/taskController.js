import asyncHandler from "express-async-handler";
import Notice from "../models/notis.js";
import Task from "../models/taskModel.js";
import User from "../models/userModel.js";
import { getIO } from "../utils/socket.js";

const createTask = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.user;
    const { title, team, stage, date, priority, assets, links, description, reminderAt } =
      req.body;
    let text = "New task has been assigned to you";
    if (team?.length > 1) {
      text = text + ` and ${team?.length - 1} others.`;
    }

    text =
      text +
      ` The task priority is set a ${priority} priority, so check and act accordingly. The task date is ${new Date(
        date
      ).toDateString()}. Thank you!!!`;

    const activity = {
      type: "assigned",
      activity: text,
      by: userId,
    };
    let newLinks = [];

    if (links) {
      newLinks = Array.isArray(links) ? links : links.split(",").map(link => link.trim());
    }

    const task = await Task.create({
      title,
      team,
      stage: stage.toLowerCase(),
      date,
      priority: priority.toLowerCase(),
      assets,
      activities: [activity],
      links: newLinks || [],
      reminderAt,
      description,
    });

    await Notice.create({
      team,
      text,
      task: task._id,
    });

    const users = await User.find({
      _id: team,
    });

    if (users) {
      for (let i = 0; i < users.length; i++) {
        const user = users[i];

        await User.findByIdAndUpdate(user._id, { $push: { tasks: task._id } });
      }
    }

    // emit socket event
    try {
      const io = getIO();
      if (io) io.emit("taskCreated", task);
    } catch (err) {
      console.error("Socket emit error:", err);
    }

    res
      .status(200)
      .json({ status: true, task, message: "Task created successfully." });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message });
  }
});

const duplicateTask = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const task = await Task.findById(id);

    //alert users of the task
    let text = "New task has been assigned to you";
    if (task.team?.length > 1) {
      text = text + ` and ${task.team?.length - 1} others.`;
    }

    text =
      text +
      ` The task priority is set a ${
        task.priority
      } priority, so check and act accordingly. The task date is ${new Date(
        task.date
      ).toDateString()}. Thank you!!!`;

    const activity = {
      type: "assigned",
      activity: text,
      by: userId,
    };

    const newTask = await Task.create({
      title: "Duplicate - " + task.title,
      team: task.team,
      stage: task.stage,
      date: task.date,
      priority: task.priority,
      assets: task.assets,
      subTasks: task.subTasks,
      links: task.links,
      activities: [activity],
      reminderAt: task.reminderAt,
      reminderSent: false,
      description: task.description,
    });

    await Notice.create({
      team: newTask.team,
      text,
      task: newTask._id,
    });

    // emit socket event
    try {
      const io = getIO();
      if (io) io.emit("taskCreated", newTask);
    } catch (err) {
      console.error("Socket emit error:", err);
    }

    res
      .status(200)
      .json({ status: true, message: "Task duplicated successfully." });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
});

const updateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;
  const { title, date, team, stage, priority, assets, links, description, reminderAt } =
    req.body;
  try {
    const task = await Task.findById(id);

    let newLinks = [];

    if (links) {
      newLinks = Array.isArray(links) ? links : links.split(",").map(link => link.trim());
    }

    const previousStage = task.stage;
    task.title = title;
    task.date = date;
    task.priority = priority.toLowerCase();
    task.assets = assets;
    task.stage = stage.toLowerCase();
    task.team = team;
    task.links = newLinks;
    task.reminderAt = reminderAt;
    task.description = description;

    if (previousStage !== task.stage) {
      task.activities.push({
        type: "updated",
        activity: `Stage changed from ${previousStage} to ${task.stage}`,
        by: userId,
      });
    } else {
      task.activities.push({
        type: "updated",
        activity: `Task details updated for ${task.title}`,
        by: userId,
      });
    }

    await task.save();

    // emit socket event
    try {
      const io = getIO();
      if (io) io.emit("taskUpdated", task);
    } catch (err) {
      console.error("Socket emit error:", err);
    }

    res.status(200).json({ status: true, message: "Task updated successfully." });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

const updateTaskStage = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;
    const { userId } = req.user;

    const task = await Task.findById(id);
    const previousStage = task.stage;

    task.stage = stage.toLowerCase();
    task.activities.push({
      type: "stage-change",
      activity: `Stage changed from ${previousStage} to ${task.stage}`,
      by: userId,
    });

    await task.save();

    // emit socket event
    try {
      const io = getIO();
      if (io) io.emit("taskUpdated", task);
    } catch (err) {
      console.error("Socket emit error:", err);
    }

    res.status(200).json({ status: true, message: "Task stage changed successfully." });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

const updateSubTaskStage = asyncHandler(async (req, res) => {
  try {
    const { taskId, subTaskId } = req.params;
    const { status } = req.body;
    const { userId } = req.user;

    const task = await Task.findById(taskId);
    const subTask = task.subTasks.id(subTaskId);

    if (!subTask) {
      return res.status(404).json({ status: false, message: "Subtask not found" });
    }

    subTask.isCompleted = status;
    task.activities.push({
      type: "subtask-status",
      activity: `Subtask '${subTask.title}' marked ${status ? "completed" : "uncompleted"}`,
      by: userId,
    });

    await task.save();

    // emit socket event
    try {
      const io = getIO();
      if (io) io.emit("taskUpdated", task);
    } catch (err) {
      console.error("Socket emit error:", err);
    }

    res.status(200).json({
      status: true,
      message: status
        ? "Task has been marked completed"
        : "Task has been marked uncompleted",
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
});

const createSubTask = asyncHandler(async (req, res) => {
  const { title, tag, date } = req.body;
  const { id } = req.params;

  try {
    const newSubTask = {
      title,
      date,
      tag,
      isCompleted: false,
    };

    const task = await Task.findById(id);

    task.subTasks.push(newSubTask);
    task.activities.push({
      type: "subtask-added",
      activity: `Subtask '${title}' added to task '${task.title}'`,
      by: req.user.userId,
    });

    await task.save();

    // emit socket event
    try {
      const io = getIO();
      if (io) io.emit("taskUpdated", task);
    } catch (err) {
      console.error("Socket emit error:", err);
    }

    res
      .status(200)
      .json({ status: true, message: "SubTask added successfully." });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

const getTasks = asyncHandler(async (req, res) => {
  const { userId, isAdmin } = req.user;
  const { stage, isTrashed, search } = req.query;

  const parsedIsTrashed = isTrashed === "true";
  const parsedStage = stage ? decodeURIComponent(stage) : "";

  let query = { isTrashed: parsedIsTrashed };

  if (!isAdmin) {
    query.team = { $all: [userId] };
  }
  if (parsedStage) {
    query.stage = parsedStage;
  }

  if (search) {
    const searchQuery = {
      $or: [
        { title: { $regex: search, $options: "i" } },
        { stage: { $regex: search, $options: "i" } },
        { priority: { $regex: search, $options: "i" } },
      ],
    };
    query = { ...query, ...searchQuery };
  }

  let queryResult = Task.find(query)
    .populate({
      path: "team",
      select: "name title email",
    })
    .sort({ _id: -1 });

  const tasks = await queryResult;

  res.status(200).json({
    status: true,
    tasks,
  });
});

const getTask = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id)
      .populate({
        path: "team",
        select: "name title role email",
      })
      .populate({
        path: "activities.by",
        select: "name",
      })
      .sort({ _id: -1 });

    res.status(200).json({
      status: true,
      task,
    });
  } catch (error) {
    console.log(error);
    throw new Error("Failed to fetch task", error);
  }
});

const postTaskActivity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;
  const { type, activity } = req.body;

  try {
    const task = await Task.findById(id);

    const data = {
      type,
      activity,
      by: userId,
    };
    task.activities.push(data);

    await task.save();

    // emit socket event
    try {
      const io = getIO();
      if (io) io.emit("taskActivity", { taskId: id, activity: data });
    } catch (err) {
      console.error("Socket emit error:", err);
    }

    res
      .status(200)
      .json({ status: true, message: "Activity posted successfully." });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

const trashTask = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const task = await Task.findById(id);

    task.isTrashed = true;

    await task.save();

    // emit socket event
    try {
      const io = getIO();
      if (io) io.emit("taskUpdated", task);
    } catch (err) {
      console.error("Socket emit error:", err);
    }

    res.status(200).json({
      status: true,
      message: `Task trashed successfully.`,
    });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

const deleteRestoreTask = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { actionType } = req.query;

    if (actionType === "delete") {
      if (!id) {
        return res
          .status(400)
          .json({ status: false, message: "Task id is required" });
      }
      await Task.findByIdAndDelete(id);

      // emit delete event
      try {
        const io = getIO();
        if (io) io.emit("taskDeleted", { id });
      } catch (err) {
        console.error("Socket emit error:", err);
      }
    } else if (actionType === "deleteAll") {
      await Task.deleteMany({ isTrashed: true });
    } else if (actionType === "restore") {
      if (!id) {
        return res
          .status(400)
          .json({ status: false, message: "Task id is required" });
      }
      const resp = await Task.findById(id);

      if (!resp) {
        return res
          .status(404)
          .json({ status: false, message: "Task not found" });
      }

      resp.isTrashed = false;

      await resp.save();

      try {
        const io = getIO();
        if (io) io.emit("taskUpdated", resp);
      } catch (err) {
        console.error("Socket emit error:", err);
      }
    } else if (actionType === "restoreAll") {
      await Task.updateMany(
        { isTrashed: true },
        { $set: { isTrashed: false } }
      );
    } else {
      return res
        .status(400)
        .json({ status: false, message: "Invalid action type" });
    }

    res.status(200).json({
      status: true,
      message: `Operation performed successfully.`,
    });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

const dashboardStatistics = asyncHandler(async (req, res) => {
  try {
    const { userId, isAdmin } = req.user;

    // Fetch all tasks from the database
    const allTasks = isAdmin
      ? await Task.find({
          isTrashed: false,
        })
          .populate({
            path: "team",
            select: "name role title email",
          })
          .sort({ _id: -1 })
      : await Task.find({
          isTrashed: false,
          team: { $all: [userId] },
        })
          .populate({
            path: "team",
            select: "name role title email",
          })
          .sort({ _id: -1 });

    const users = await User.find({ isActive: true })
      .select("name title role isActive createdAt")
      .limit(10)
      .sort({ _id: -1 });

    // Group tasks by stage and calculate counts
    const groupedTasks = allTasks?.reduce((result, task) => {
      const stage = task.stage;

      if (!result[stage]) {
        result[stage] = 1;
      } else {
        result[stage] += 1;
      }

      return result;
    }, {});

    const normalizedTasks = {
      todo: groupedTasks?.todo || 0,
      "in progress": groupedTasks?.["in progress"] || 0,
      completed: groupedTasks?.completed || 0,
    };

    const graphData = Object.entries(
      allTasks?.reduce((result, task) => {
        const { priority } = task;
        result[priority] = (result[priority] || 0) + 1;
        return result;
      }, {})
    ).map(([name, total]) => ({ name, total }));

    // Calculate total tasks
    const totalTasks = allTasks.length;
    const last10Task = allTasks?.slice(0, 10);

    // Combine results into a summary object
    const summary = {
      totalTasks,
      last10Task,
      users: isAdmin ? users : [],
      tasks: normalizedTasks,
      graphData,
    };

    res
      .status(200)
      .json({ status: true, ...summary, message: "Successfully." });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
});

export {
  createSubTask,
  createTask,
  dashboardStatistics,
  deleteRestoreTask,
  duplicateTask,
  getTask,
  getTasks,
  postTaskActivity,
  trashTask,
  updateSubTaskStage,
  updateTask,
  updateTaskStage,
};
