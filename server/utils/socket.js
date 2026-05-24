let io = null;

export const initSocket = async (server, opts = {}) => {
  const { Server } = await import("socket.io");
  io = new Server(server, opts);

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("authenticate", (data) => {
      // placeholder for future auth handling
    });

    socket.on("disconnect", () => {
      // console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
};

export const getIO = () => io;
