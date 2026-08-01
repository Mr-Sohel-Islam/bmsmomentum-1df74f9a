import { Router } from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import teamRoutes from "./team.routes.js";
import taskRoutes from "./task.routes.js";
import performanceRoutes from "./performance.routes.js";
import approvalRoutes from "./approval.routes.js";
import appreciationRoutes from "./appreciation.routes.js";
import productRoutes from "./product.routes.js";
import pharmaRoutes from "./pharma.routes.js";

const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/", userRoutes);
apiRouter.use("/", teamRoutes);
apiRouter.use("/", taskRoutes);
apiRouter.use("/", performanceRoutes);
apiRouter.use("/approval", approvalRoutes);
apiRouter.use("/approvals", approvalRoutes);
apiRouter.use("/", appreciationRoutes);
apiRouter.use("/products", productRoutes);
apiRouter.use("/pharma", pharmaRoutes);

export default apiRouter;
