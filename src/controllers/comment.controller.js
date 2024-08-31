import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

///////////////////////// get all comments for a video //////////////////////////
//TODO: get all comments for a video
// 1. get videoId from params URL
// 2. create a pipeline to match the videoId
// 3. use aggregatePaginate to get all comments
const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid VideoId");
  }

  // 2. create a pipeline to match the videoId
  let pipeline = [{ $match: { video: new mongoose.Types.ObjectId(videoId) } }];

  //   helps you run pagination queries on the results fetched by the pipeline
  const options = {
    page: parseInt(page),
    // this is used to Specify which page of results to fetch.
    // If page is set to 1, you are requesting the first page of results.

    limit: parseInt(limit),
    // Defines the maximum number of results to return per page.
    // If limit is set to 10, up to 10 results will be returned per page.

    customLabels: {
      //Allows customization of field names in the paginated result.

      totalDocs: "total_comments", //This field represents the total number of documents that match the query. renamed to total_comments
      docs: "Comments", //This field contains the array of documents for the current page renamed to comments
    },
  };

  // 3. use aggregatePaginate to get all comments
  //   It applies the pipeline to the Comment collection and paginates the results according to the options.
  const allComments = await Comment.aggregatePaginate(pipeline, options);

  if (allComments?.total_comments === 0) {
    throw new ApiError(400, "Comments not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, { Comments: allComments, size: allComments.length })
    );
});

///////////////////////// add a comment to a video //////////////////////////
// 1. get videoId from params URL and content from req.body
// 2. create a new comment and save it to the database
const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { videoId } = req.params;
  const { content } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video");
  }

  if (!content) {
    throw new ApiError(400, "please enter a valid comment");
  }

  const comment = Comment.create({
    content: content,
    video: videoId,
    owner: req.user._id,
  });

  if (!comment) {
    throw new ApiError(500, "Comment not saved to db");
  }
  return res
    .status(201)
    .json(new ApiResponse(200, comment, "Comment added successfully"));
});

////////////////////////////////////////////////////////////////////////////

///////////////////////// update a comment //////////////////////////
// TODO: update a comment
// 1. get commentId from params URL and content from req.body
// 2. find the comment by commentId and req.user._id. // only owner can update the comment
// 3. update the comment content and save it to the database
const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params;
  const { content } = req.body;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid commentId");
  }

  if (!content) {
    throw new ApiError(400, "Invalid comment");
  }

  //   find the comment using commentId and req.user._id
  //   As only user can update the comemnt

  //   const comment = await Comment.findOne({
  //     $and: [
  //       { _id: commentId },
  //       { owner: req.user._id },
  //     ],
  //   });

  //   OR WE CAN USE since the $and operator is not strictly necessary when combining two conditions, you can directly write the query without $and:
  const comment = await Comment.findOne({
    _id: commentId,
    owner: req.user._id,
  });

  if (!comment) {
    throw new ApiError(404, "comment not found");
  }

  // update the content of the found comment
  comment.content = content;

  await comment.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "comment updated successfully"));
});

///////////////////////// delete a comment //////////////////////////
// TODO: delete a comment
// 1. get commentId from params URL
// 2. delete the comment from the database based on the commentId and req.user._id (only owner can delete the comment)
// 3. if deletedCount is 0, return an error message
const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid CommentId");
  }

  //   // 2. delete the comment from the database based on the commentId and req.user._id
  //   const delComment = await Comment.deleteOne({
  //     $and: [
  //       { _id: commentId }, // Find comment by commentId
  //       { owner: req.user._id },
  //     ], // Ensure the comment is owned by the current user
  //   });

  const delComment = await Comment.deleteOne({
    _id: commentId,
    owner: req.user._id,
  });

  if (!delComment) {
    throw new ApiError(500, "comment not found");
  }

  // 3. if deletedCount is 0, return an error message
  // delComment will return object -> { acknowledged: true, deletedCount: 0 }
  // deletedCount:0 means comment found and not deleted
  // deletedCount:1 means comment found and deleted
  if (delComment.deletedCount === 0) {
    return res
      .status(500)
      .json(new ApiError(403, "You are not authorized to delete this comment"));
  }

  return res
    .status(200)
    .json(new ApiResponse(204, delComment, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
