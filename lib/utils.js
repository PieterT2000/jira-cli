import { fileURLToPath } from "url";
import { dirname } from "path";

export const getDirname = (filePath) => {
  const __filename = fileURLToPath(filePath);
  return dirname(__filename);
};
