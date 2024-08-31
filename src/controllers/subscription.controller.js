import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//1 get the channelId from params
//2 check if the user is already subscribed to the channel
//3 if it is already subscribed then delete that subscription document
//4 if it’s not then create a subscription document
const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid ChannelID");
  }

  // Check if the user is already subscribed
  const alreadySubscribed = await Subscription.findOne({
    subscriber: req.user._id,
    channel: channelId,
  });

  if (alreadySubscribed) {
    // Unsubscribe if already subscribed
    const unsubscribed = await Subscription.findByIdAndDelete(
      alreadySubscribed._id
    );

    if (!unsubscribed) {
      throw new ApiError(500, "Cannot unsubscribe, please try again");
    }

    return res
      .status(204)
      .json(new ApiResponse(204, unsubscribed, "Unsubscribed successfully"));
  }

  // Subscribe to the channel
  const subscribed = await Subscription.create({
    subscriber: req.user._id,
    channel: channelId,
  });

  if (!subscribed) {
    throw new ApiError(500, "Cannot subscribe, please try again");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, subscribed, "Subscribed successfully"));
});

// Controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid ChannelID");
  }

  // Get all subscribers of the channel
  const subscriberList = await Subscription.find({
    channel: channelId,
  });

  // If no subscribers found
  if (!subscriberList.length) {
    throw new ApiError(404, "Channel has no subscribers");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        Total_Subscribers: subscriberList.length,
        Subscribers: subscriberList,
      },
      "Subscribers found successfully"
    )
  );
});

// Controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  // Here, use req.user._id because we need the subscriptions of the current user, not channelId
  const channelList = await Subscription.find({
    subscriber: req.user._id,
  });

  // If no channels found
  if (!channelList.length) {
    throw new ApiError(404, "User has no subscriptions");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        Total_Channels_Subscribed: channelList.length,
        Channels_subscribed: channelList,
      },
      "Subscriptions found successfully"
    )
  );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
