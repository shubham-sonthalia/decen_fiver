import express from "express";
import userRouter from "./routers/user";
import workerRouter from "./routers/worker";

export const JWT_SECRET = "sonthalia123";

const app = express();

app.use(express.json());

app.use("/api/v1/user", userRouter);
app.use("/api/v1/worker", workerRouter);

app.listen(3000);
