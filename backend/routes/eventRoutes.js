import { Router } from "express";
import {
    createEvent,
    deleteEvent,
    getEventById,
    getEventRegistrations,
    getEvents,
    getMyRegistrations,
    registerSeat,
    updateEvent,
} from "../controllers/eventController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.route("/").get(getEvents).post(protect, authorize("admin"), createEvent);

router.get("/my-registrations", protect, getMyRegistrations);

router.route("/:id").get(getEventById).put(protect, authorize("admin"), updateEvent).delete(protect, authorize("admin"), deleteEvent);

router.patch("/:id/register", protect, registerSeat);
router.get("/:id/registrations", protect, authorize("admin"), getEventRegistrations);

export default router;
