import httpStatus from "http-status";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import { JwtPayload } from "jsonwebtoken";
import { notificationService } from "../Notification/Notification.service";


const toggleLikes = async (postId: string, user: any) => {

  if (!postId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "postId is required");
  }

  if (!user?.id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
  }

  return prisma.$transaction(async (tx) => {

    // ----- CHECK POST -----
    const post = await tx.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new ApiError(httpStatus.NOT_FOUND, "Post not found");
    }

    // ----- CHECK LIKE -----
    const existingLike = await tx.like.findFirst({
      where: {
        userId: user.id,
        postId,
      },
    });

    // -------- UNLIKE --------
    if (existingLike) {

      await tx.like.delete({
        where: { id: existingLike.id },
      });

      await tx.post.update({
        where: { id: postId },
        data: {
          likeCount: { decrement: 1 },
        },
      });

      return {
        isLiked: false,
        message: "Unliked successfully",
      };
    }

    // -------- LIKE --------
    await tx.like.create({
      data: {
        userId: user.id,
        postId,
      },
    });

    await tx.post.update({
      where: { id: postId },
      data: {
        likeCount: { increment: 1 },
      },
    });

    // ----- Notification -----
    if (user?.fcmToken) {
      await notificationService.sendNotification(
        user.fcmToken,
        "Post liked",
        "You liked a post",
        user.id
      );
    }

    return {
      isLiked: true,
      message: "Liked successfully",
    };
  });
};

const unlike = async (id: string, user: any) => {
  const isPostExist = await prisma.post.findUnique({
    where: { id },
  });

  if (!isPostExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "Post not found");
  }

  const existingLike = await prisma.like.findFirst({
    where: {
      userId: user.id,
      postId: id,
    },
  });

  if (!existingLike) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Like does not exist");
  }

  await prisma.like.delete({
    where: { id: existingLike.id },
  });

  await prisma.post.update({
    where: { id },
    data: {
      likeCount: {
        decrement: 1,
      },
    },
  });

  return { message: "Unliked successfully", courseId: id };
};


const getAllMyLikes = async (user: JwtPayload) => {
  if (!user?.id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");
  }

  return prisma.like.findMany({
    where: { userId: user.id },

    select: {
      postId: true,

      user: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
};

const getLikesByPost = async (postId: string) => {
  if (!postId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Post ID required");
  }

  return prisma.like.findMany({
    where: { postId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          image: true,
        },
      },
    },
  });
};

export const LikeService = {
  getAllMyLikes,
  unlike,
  toggleLikes,
  getLikesByPost,
};
