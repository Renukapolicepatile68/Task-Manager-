import express from "express";
import { getChatResponse, getSmartSuggestions } from "../controllers/aiController.js";
import { protectRoute } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protectRoute);
router.post("/suggestions", getSmartSuggestions);
router.post("/chat", getChatResponse);

export default router;
