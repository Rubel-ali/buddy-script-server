import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { PostService } from "./Post.service";
import { Request, Response } from "express";
import prisma from "../../../shared/prisma";
import pick from "../../../shared/pick";
import ApiError from "../../../errors/ApiErrors";

const createPost = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as { id?: string })?.id;
  const reqBody = req.body;

  const result = await PostService.createIntoDb({
    userId: userId as string,
    reqBody,
    files: req.files as { [fieldname: string]: Express.Multer.File[] },
  });
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Post created successfully",
    data: result,
  });
});

const getPostList = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as { id?: string })?.id;

  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);
  const filters = pick(req.query, ["searchTerm"]);

  const result = await PostService.getListFromDb(userId, options, filters);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Post list retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getPostById = catchAsync(async (req: Request, res: Response) => {
  const result = await PostService.getByIdFromDb(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Post details retrieved successfully",
    data: result,
  });
});

const updatePost = catchAsync(async (req: Request, res: Response) => {
  const postId = req.params.id;

  const result = await PostService.updateIntoDb({
    postId,
    reqBody: req.body,
    files: req.files as { [fieldname: string]: Express.Multer.File[] },
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Post updated successfully",
    data: result,
  });
});

// const deletePost = catchAsync(async (req: Request, res: Response) => {
//   const postId = req.params.id;
//   const userId = (req.user as { id?: string })?.id;

//   const existingPost = await prisma.post.findUnique({
//     where: { id: postId },
//   });

//   if (!existingPost) {
//     throw new ApiError(httpStatus.NOT_FOUND, "Post not found");
//   }

//   if (existingPost.authorId.toString() !== userId) {
//     throw new ApiError(
//       httpStatus.FORBIDDEN,
//       "You can delete only your own posts",
//     );
//   }

//   const deletedPost = await prisma.post.delete({
//     where: { id: postId },
//   });

//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     success: true,
//     message: "Post deleted successfully",
//     data: deletedPost,
//   });
// });

const deletePost = catchAsync(async (req: Request, res: Response) => {
  const postId = req.params.id;

  console.log("Attempting to delete post:", postId);
  
  // Check if post exists
  const existingPost = await prisma.post.findUnique({
    where: { id: postId },
  });
  
  if (!existingPost) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: "Post not found",
      data: undefined
    });
  }
  
  try {
    // Method 1: Recursive comment deletion
    async function deleteCommentAndReplies(commentId: string) {
      // First get all replies of this comment
      const replies = await prisma.comment.findMany({
        where: { parentId: commentId }
      });
      
      // Delete all replies recursively
      for (const reply of replies) {
        await deleteCommentAndReplies(reply.id);
      }
      
      // Delete the comment itself
      await prisma.comment.delete({
        where: { id: commentId }
      });
    }
    
    // Get all top-level comments of this post
    const topLevelComments = await prisma.comment.findMany({
      where: { 
        postId: postId,
        parentId: null 
      }
    });
    
    // Delete each comment with its replies
    for (const comment of topLevelComments) {
      await deleteCommentAndReplies(comment.id);
    }
    
    // Delete post likes
    await prisma.like.deleteMany({
      where: { postId: postId }
    });
    
    // Finally delete post
    const deletedPost = await prisma.post.delete({
      where: { id: postId },
    });
    
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Post and all related data deleted successfully",
      data: deletedPost,
    });
    
  } catch (error) {
    console.error("Delete error:", error);
    
    // Method 2: Raw MongoDB query as last resort
    try {
      // Delete all comments (including replies) using raw query
      await prisma.$runCommandRaw({
        delete: "comments",
        deletes: [{
          q: { postId: { $oid: postId } },
          limit: 0
        }]
      });
      
      // Delete all likes
      await prisma.$runCommandRaw({
        delete: "likes",
        deletes: [{
          q: { postId: { $oid: postId } },
          limit: 0
        }]
      });
      
      // Delete the post
      const deletedPost = await prisma.post.delete({
        where: { id: postId },
      });
      
      sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Post and all related data deleted successfully (using raw query)",
        data: deletedPost,
      });
      
    } catch (Error: any) {
      sendResponse(res, {
        statusCode: 500,
        success: false,
        message: Error.message || "Failed to delete post",
        data: null,
      });
    }
  }
});

export const PostController = {
  createPost,
  getPostList,
  getPostById,
  updatePost,
  deletePost,
};
