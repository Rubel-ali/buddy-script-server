import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { fileUploader } from "../../../helpars/fileUploader";
import {
  DeletePostInput,
  IDeletePostParams,
  IPostServiceParams,
  IPostUpdateParams,
} from "./Post.interface";
import { Prisma } from "@prisma/client";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { paginationHelper } from "../../../helpars/paginationHelper";

const createIntoDb = async ({ userId, reqBody, files }: IPostServiceParams) => {
  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized access.");
  }

  // Parse body
  const postData = JSON.parse(reqBody.text || "{}");
  const content = postData.content;
  const visibility = postData.visibility || "PUBLIC";

  // Ensure there is either content or a file
  const file = files?.file?.[0];
  if (!content && !file) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Post must have content or an image.",
    );
  }

  // Upload file if exists
  let imageUrl: string | undefined = undefined;
  if (file) {
    const uploadResult = await fileUploader.uploadToCloudinary(file);
    imageUrl = uploadResult?.Location;

    if (!imageUrl) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to upload post image.",
      );
    }
  }

  // Create post in DB
  const post = await prisma.post.create({
    data: {
      authorId: userId,
      content,
      imageUrl,
      visibility,
    },
  });

  return post;
};

const getListFromDb = async (
  userId: string | undefined,
  options: IPaginationOptions,
  params: { searchTerm?: string }
) => {
  const { limit, page, skip } = paginationHelper.calculatePagination(options);

  const { searchTerm } = params;

  const andConditions: Prisma.PostWhereInput[] = [];

  // 🔍 Search by post content or author name
  if (searchTerm) {
    andConditions.push({
      OR: [
        {
          content: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          author: {
            username: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
        {
          author: {
            firstName: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
        {
          author: {
            lastName: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
      ],
    });
  }

  // 👁 Visibility filter
  andConditions.push({
    OR: [
      { visibility: "PUBLIC" },
      ...(userId
        ? [
            {
              authorId: userId,
            },
          ]
        : []),
    ],
  });

  const whereConditions: Prisma.PostWhereInput =
    andConditions.length > 0
      ? { AND: andConditions }
      : {};

  const result = await prisma.post.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { createdAt: "desc" },

    select: {
      id: true,
      content: true,
      imageUrl: true,
      visibility: true,
      createdAt: true,
      updatedAt: true,

      commentCount: true,
      likeCount: true,

      author: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          image: true,
        },
      },

      comments: {
        where: { parentId: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          content: true,
          authorId: true,
          createdAt: true,
          updatedAt: true,

          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              image: true,
            },
          },

          replies: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              content: true,
              createdAt: true,
              updatedAt: true,

              author: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                  image: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const total = await prisma.post.count({
    where: whereConditions,
  });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

const getByIdFromDb = async (id: string) => {
  const result = await prisma.post.findUnique({ where: { id } });
  if (!result) {
    throw new Error("post not found");
  }
  return result;
};

const updateIntoDb = async ({ postId, reqBody, files }: IPostUpdateParams) => {
  // Check if post exists
  const existingPost = await prisma.post.findUnique({
    where: { id: postId },
  });
  if (!existingPost) {
    throw new ApiError(httpStatus.NOT_FOUND, "Post not found");
  }

  // Parse body safely
  let content = existingPost.content;
  let visibility: "PUBLIC" | "PRIVATE" = existingPost.visibility;

  if (reqBody.text) {
    try {
      const postData = JSON.parse(reqBody.text);
      content = postData.content ?? content;
      visibility = postData.visibility ?? visibility;
    } catch (err) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid JSON in text field");
    }
  } else {
    content = reqBody.content ?? content;
    visibility = reqBody.visibility ?? visibility;
  }

  // Handle file upload
  let imageUrl = existingPost.imageUrl;
  const file = files?.file?.[0];
  if (file) {
    const uploadResult = await fileUploader.uploadToCloudinary(file);
    if (!uploadResult?.Location) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to upload post image",
      );
    }
    imageUrl = uploadResult.Location;
  }

  // Update post in DB
  const updatedPost = await prisma.post.update({
    where: { id: postId },
    data: {
      content,
      visibility,
      imageUrl,
      updatedAt: new Date(),
    },
  });

  return updatedPost;
};

const deleteItemFromDb = async ({ postId, currentUserId }: DeletePostInput) => {
  // Step 1: Check if post exists
  const existingPost = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!existingPost) {
    throw new ApiError(httpStatus.NOT_FOUND, "Post not found");
  }

  // Step 2: Check if current user is author
  // Convert to string to avoid ObjectId vs string mismatch
  if (existingPost.authorId.toString() !== currentUserId.toString()) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You can delete only your own posts",
    );
  }

  // Step 3: Delete all comments under this post (including replies)
  await prisma.comment.deleteMany({
    where: { postId: postId },
  });

  // Step 4: Delete all likes under this post
  await prisma.like.deleteMany({
    where: { postId: postId },
  });

  // Step 5: Delete the post itself
  const deletedPost = await prisma.post.delete({
    where: { id: postId },
  });

  return {
    message: "Post deleted successfully",
    deletedPost,
  };
};

export const PostService = {
  createIntoDb,
  getListFromDb,
  getByIdFromDb,
  updateIntoDb,
  deleteItemFromDb,
};
