import { JwtPayload } from "jsonwebtoken";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { LikeService } from "./like.services";

const toggleLike = catchAsync(async (req, res) => {
  const { postId } = req.body;
  const user = req.user;
  const result = await LikeService.toggleLikes(postId, user);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Like Created Successfully",
    data: result,
  });
});

const unlike = catchAsync(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const result = await LikeService.unlike(id, user);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: result.message,
    data: { courseId: result.courseId },
  });
});


const getAllMyLikes = catchAsync(async (req, res) => {
  const user = req.user;
  console.log(user)
  const result = await LikeService.getAllMyLikes(user as JwtPayload);
  console.log(result)
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "successfully",
    data: result,
  });
});

const toggleLikes = catchAsync(async (req, res) => {
  const postId = req.params.id;
  const user = req.user;

  const result = await LikeService.toggleLikes(postId, user);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: result,
  });
});

const getLikesByPost = catchAsync(async (req, res) => {
  const { postId } = req.params;

  const result = await LikeService.getLikesByPost(postId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Likes fetched successfully",
    data: result,
  });
});


export const likeController = {
  toggleLike,
  getAllMyLikes,
  unlike,
  toggleLikes,
  getLikesByPost,
};
