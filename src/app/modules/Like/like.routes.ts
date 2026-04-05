import { Router } from "express";
import { fileUploader } from "../../../helpars/fileUploader";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { likeController } from "./like.controller";

const router = Router();

router.get("/:postId", auth(), likeController.getLikesByPost);

router.patch("", auth(), likeController.toggleLike);
// get all my like id

router.get("/", auth(), likeController.getAllMyLikes);

router.delete("/unlike/:id", auth(), likeController.unlike);

export const LikeRouter = router;
