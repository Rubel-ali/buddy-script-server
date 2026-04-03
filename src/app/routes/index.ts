import express from "express";
import { userRoutes } from "../modules/User/user.route";
import { AuthRoutes } from "../modules/Auth/auth.routes";
import { NotificationRoutes } from "../modules/Notification/Notification.routes";
import passportRoutes from "../modules/Auth/passport.routes";
import { PostRoutes } from "../modules/Post/Post.routes";


const router = express.Router();

const moduleRoutes = [
  {
    path: "/users",
    route: userRoutes,
  },
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
		path: "/auth",
		route: passportRoutes,
	},
  {
    path: "/posts",
    route: PostRoutes,
  },
  {
    path: "/notifications",
    route: NotificationRoutes,
  }

];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;