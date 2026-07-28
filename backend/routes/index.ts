import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import teamRoutes from "./team.routes";
import taskRoutes from "./task.routes";
import performanceRoutes from "./performance.routes";
import approvalRoutes from "./approval.routes";
import appreciationRoutes from "./appreciation.routes";

const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/", userRoutes);
apiRouter.use("/", teamRoutes);
apiRouter.use("/", taskRoutes);
apiRouter.use("/", performanceRoutes);
apiRouter.use("/approval", approvalRoutes);
apiRouter.use("/", appreciationRoutes);

export default apiRouter;
