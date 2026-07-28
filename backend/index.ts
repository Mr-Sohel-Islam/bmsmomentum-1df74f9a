import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";

const PORT = env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Express backend server running on http://localhost:${PORT}`);
  logger.info(`API docs available at http://localhost:${PORT}/api`);
});
