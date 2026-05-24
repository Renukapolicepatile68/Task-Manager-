import cookieParser from "cookie-parser";
import cors from "cors";
import dns from "dns";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import { errorHandler, routeNotFound } from "./middleware/errorMiddleware.js";
import routes from "./routes/index.js";
import dbConnection from "./utils/connectDB.js";

dns.setServers(["1.1.1.1", "8.8.8.8"]);
dotenv.config();

dbConnection();

const port = process.env.PORT || 5000;

const app = express();

app.use(
  cors({
    origin: [
      "https://mern-task-manager-app.netlify.app",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST", "DELETE", "PUT"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

//app.use(morgan("dev"));
app.use("/api", routes);

app.use(routeNotFound);
app.use(errorHandler);

import http from "http";
import { initSocket } from "./utils/socket.js";
import { startReminderScheduler } from "./utils/notificationScheduler.js";

const server = http.createServer(app);

const start = async () => {
  await initSocket(server, {
    cors: {
      origin: [
        "https://mern-task-manager-app.netlify.app",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
      ],
      credentials: true,
    },
  });

  startReminderScheduler();

  server.listen(port, () => console.log(`Server listening on ${port}`));
};

start();
