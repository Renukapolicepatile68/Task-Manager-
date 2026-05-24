import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import store from "./redux/store";
import { apiSlice } from "./redux/slices/apiSlice";

import "./index.css";

// initialize socket.io client and listen to server events
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_APP_BASE_URL || "";

let socket = null;
try {
  socket = io(SOCKET_URL, { withCredentials: true });

  socket.on("connect", () => {
    console.log("Socket connected", socket.id);
  });

  // ask for notification permission
  if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
    Notification.requestPermission().then((perm) => {
      console.log("Notification permission:", perm);
    });
  }

  socket.on("taskCreated", (task) => {
    // invalidate task, dashboard and notification caches
    store.dispatch(apiSlice.util.invalidateTags(["Task", "Dashboard", "Notification"]));

    // show browser notification
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("New Task Created", {
          body: task.title || "A new task was created",
        });
      }
    } catch (err) {
      console.warn("Notification error", err);
    }
  });

  socket.on("taskUpdated", (task) => {
    store.dispatch(apiSlice.util.invalidateTags(["Task", "Dashboard", "Notification"]));

    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Task Updated", {
          body: task.title || "A task was updated",
        });
      }
    } catch (err) {
      console.warn("Notification error", err);
    }
  });

  socket.on("taskDeleted", (payload) => {
    store.dispatch(apiSlice.util.invalidateTags(["Task", "Dashboard", "Notification"]));

    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Task Removed", {
          body: payload?.id ? `Task ${payload.id} removed` : "A task was removed",
        });
      }
    } catch (err) {
      console.warn("Notification error", err);
    }
  });

  socket.on("taskActivity", (payload) => {
    store.dispatch(apiSlice.util.invalidateTags(["Task", "Notification"]));

    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Task Activity", {
          body: payload?.activity?.activity || "New activity on a task",
        });
      }
    } catch (err) {
      console.warn("Notification error", err);
    }
  });

  socket.on("taskReminder", ({ task, text }) => {
    store.dispatch(apiSlice.util.invalidateTags(["Task", "Dashboard", "Notification"]));

    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Task Reminder", {
          body: text || `Reminder for ${task?.title}`,
        });
      }
    } catch (err) {
      console.warn("Notification error", err);
    }
  });
} catch (err) {
  console.warn("Socket init failed", err);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  </Provider>
);
