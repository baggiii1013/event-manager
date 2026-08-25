import { Router } from "express";
import { getUsers, updateUserRole } from "../controllers/userController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.use(protect);
router.use(authorize("admin"));

router.route("/").get(getUsers);
router.route("/:id/role").put(updateUserRole);

export default router;
