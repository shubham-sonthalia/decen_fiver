"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKER_JWT_SECRET = exports.JWT_SECRET = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = __importDefault(require("./routers/user"));
const worker_1 = __importDefault(require("./routers/worker"));
exports.JWT_SECRET = "sonthalia123";
exports.WORKER_JWT_SECRET = exports.JWT_SECRET + "worker";
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use("/api/v1/user", user_1.default);
app.use("/api/v1/worker", worker_1.default);
app.listen(3000);
