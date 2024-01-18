'use server'

import { revalidatePath } from "next/cache";

import { connectToDB } from "../mongoose"

import User from "../models/user.model";
import Thread from "../models/thread.model";
import Community from "../models/community.model";

interface Params{
    text: string,
    author: string,
    communityId: string | null,
    path: string
}

export async function createThread({text, author, communityId, path}: Params) {
    try {
        connectToDB();

        const communityIdObject = await Community.findOne(
            { id: communityId },
            { _id: 1 }
        );

        console.log(`Eyes here: ${communityIdObject}`)

        const createdThread = await Thread.create({
            text,
            author,
            community: communityIdObject,
    });

        //update user model
        await User.findByIdAndUpdate(author, {
            $push: { threads: createdThread._id }
    });

    if (communityIdObject) {
        //Update community model
        await Community.findByIdAndUpdate(communityIdObject, {
            $push: { threads: createdThread._id},
        })
    }

    revalidatePath(path);

    } catch (error: any) {
       throw new Error (`Error creating thread: ${error.message}`) 
    }
    
};

export async function fetchPosts(pageNumber = 1, pageSize = 20) {
    connectToDB();

    //Calculate the number of posts to skip
    const skipAmount = (pageNumber - 1) * pageSize;

    // Fetch the posts that have no parentes (top-level)
    const postsQuery = Thread.find({parentId: { $in: [null, undefined]}})
    .sort({ createdAt: 'desc'})
    .skip(skipAmount)
    .limit(pageSize)
    .populate({ path: 'author', model: User})
    .populate({
        path: 'community',
        model: Community,
    })
    .populate({
        path: 'children',
        populate: {
            path: 'author',
            model: User,
            select: '_id name parentId image'
        }
    })

    const totalPostsCount = await Thread.countDocuments({parentId: {$in: [null, undefined]}})

    const posts = await postsQuery.exec();

    const isNext = totalPostsCount > skipAmount + posts.length;

    return { posts, isNext }
}

export async function fetchAllChildThreads(threadId: string): Promise<any[0]> {
    const childThreads = await Thread.find({ parentId: threadId });

    const descendantThreads = [];

    for (const childThread of childThreads ) {
        const descendants = await fetchAllChildThreads(childThread._id);
        descendantThreads.push(childThread, ...descendants);
    }

    return descendantThreads;
}

export async function deleteThread(id: string, path: string): Promise<void> {
    try {
        connectToDB();

        //find the thread to be deleted (the main thread)
        const mainThread = await Thread.findById(id).populate('author community')
        console.log(mainThread)

        if (!mainThread) {
            throw new Error('Thread not found')
        }

        //fetch all child threads and their descendants recursively
        const descendantThreads = await fetchAllChildThreads(id);

        //get all descendant thread IDs including the main thread ID and child thread IDs
        const descendantThreadIds = [
            id,
            ...descendantThreads.map((thread: any) => thread._id),
        ];

        //extract the authorIds and communityIds to update User and Community modesl respectively
        const uniqueAuthorIds = new Set (
            [
                ...descendantThreads.map((thread: any) => thread.author?._id.toString()),// Use optional chaining to handle possible undefined values
                mainThread.author?._id?.toString(),
            ].filter((id) => id !== undefined)
        );
        

        const uniqueCommunityIds = new Set(
            [
              ...descendantThreads.map((thread: any) => thread.community?._id?.toString()), // Use optional chaining to handle possible undefined values
              mainThread.community?._id?.toString(),
            ].filter((id) => id !== undefined)
          );
        
        // Recursively delete child threads and their descendants
        await Thread.deleteMany({ _id: { $in: descendantThreadIds } });

        // Update User model
        await User.updateMany(
        { _id: { $in: Array.from(uniqueAuthorIds) } },
        { $pull: { threads: { $in: descendantThreadIds } } }
        );

        // Update Community model
        await Community.updateMany(
        { _id: { $in: Array.from(uniqueCommunityIds) } },
        { $pull: { threads: { $in: descendantThreadIds } } }
        );

        revalidatePath(path);

    } catch (error: any) {
        throw new Error(`Failed to delete thread: ${error.message}`)
    }
}

export async function fetchThreadById(id:string) {
    connectToDB();

    try {
        //TODO: Pop community

        const thread = await Thread.findById(id)
            .populate({
                path: 'author',
                model: User,
                select: '_id id name image'
            })  // Populate the author field with _id and username
            .populate({
                path: 'community',
                model: Community,
                select: '_id id name image',
            }) // Populate the community field with _id and name
            .populate({
                path: 'children', // Populate the children field
                populate: [
                    {
                        path: 'author', // Populate the author field within children
                        model: User,
                        select: '_id id name parentId image',  // Select only _id and username fields of the author
                    },
                    {
                        path: 'children', // Populate the children field within children
                        model: Thread, // The model of the nested children (assuming it's the same "Thread" model)
                        populate: {
                            path: 'author', // Populate the author field within nested children
                            model: User,
                            select: '_id id name parentId image', // Select only _id and username fields of the author
                        }
                    }
                ]
            }).exec();

            return thread;
    } catch (error: any) {
        throw new Error(`Error fetching thread: ${error.message}`)
    }
}

export async function addCommentToThread(
    threadId: string,
    commentText: string,
    userId: string,
    path: string,
) {
    connectToDB();

    try {
        //Find the original by ID
        const originalThread = await Thread.findById(threadId)

        if(!originalThread) {
            throw new Error('Thread not found')
        }

        //create a new thread with the comment text
        const commentThread = new Thread({
            text: commentText,
            author: userId,
            parentId: threadId, // Set the parentId to the original thread's ID
        })

        //save the new thread
        const savedCommentThread = await commentThread.save();

        //update the new thread with newly added comment
        originalThread.children.push(savedCommentThread._id)

        //save the original thread
        await originalThread.save();

        revalidatePath(path);
    } catch (error:any) {
        throw new Error (`Error adding comment to thread: ${error.message}`)
    }
    
}