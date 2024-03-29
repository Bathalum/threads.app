'use server'

import { FilterQuery, SortOrder } from "mongoose";
import { revalidatePath } from "next/cache";

import Community from "../models/community.model";
import User from "../models/user.model";
import Thread from "../models/thread.model";

import { connectToDB } from "../mongoose"

interface Params{
    userId: string;
    username: string;
    name: string;
    bio: string;
    image: string;
    path: string;
}

export async function fetchUser(userId:string | null) {
    try {
        connectToDB();

        return await User
            .findOne({ id: userId })
            .populate({
                path: 'communities',
                model: Community,
            })
    } catch (error: any) {
        throw new Error (`Failed to fetch user: ${error.message}`);
    }
}


export async function updateUser({
        userId,
        username,
        name,
        bio,
        image,
        path,
    
    }: Params): Promise<void> {     
        
        try {
            connectToDB();

        await User.findOneAndUpdate(
            { id: userId },
            {
                username: username.toLowerCase(),
                name,
                bio,
                image,
                onboarded: true,
            },
            {upsert: true}
        );
    
        if(path === '/profile/edit') {
            revalidatePath(path)
        }
    } catch (error: any) {
        throw new Error(`Failed to create/update user: ${error.message}`)
    }
}

export async function fetchUserPosts(userId: string) {
    try {
        connectToDB();

        //Find all threads authored by user with given userId
        const threads = await User.findOne({id: userId})
            .populate({
                path: 'threads',
                model: Thread,
                populate: [
                    {
                        path: 'community',
                        model: Community,
                        select: 'name id image _id', // Select the "name" and "_id" fields from the "Community" model
                    },
                    {
                        path: 'children',
                        model: Thread,
                        populate: 
                        {
                            path: 'author',
                            model: User,
                            select: 'name image id', // Select the "name" and "_id" fields from the "User" model
                        },
                    }
                ]
            });

        return threads
    } catch (error: any) {
        throw new Error(`Failed to fetch user posts: ${error.message}`)
    }
}

export async function fetchUsers({
    userId,
    searchString = '',
    pageNumber = 1,
    pageSize = 20,
    sortBy = 'desc'
 } :  {
    userId: string;
    searchString?: string;
    pageNumber?: number,
    pageSize?: number,
    sortBy?: SortOrder
 }) {

    try {
        connectToDB();

        // Calculate the number of users to skip based on the page number and page size.
        const skipAmount = (pageNumber - 1) * pageSize;

        // Create a case-insensitive regular expression for the provided search string.
        const regex = new RegExp(searchString, 'i')

        // Create an initial query object to filter users.
        const query: FilterQuery<typeof User> = {
            id: {$ne: userId}
        }

          // If the search string is not empty, add the $or operator to match either username or name fields.
        if(searchString.trim() !== '') {
            query.$or = [
                { username: {$regex: regex}},
                { name: {$regex: regex}}
            ]
        }

        // Define the sort options for the fetched users based on createdAt field and provided sort order.
        const sortOptions = {createAt: sortBy};

        const usersQuery = User.find(query)
            .sort(sortOptions)
            .skip(skipAmount)
            .limit(pageSize);

        // Count the total number of users that match the search criteria (without pagination).
        const totalUsersCount = await User.countDocuments(query);

        const users = await usersQuery.exec();

        const isNext = totalUsersCount > skipAmount + users.length;

        // Check if there are more users beyond the current page.
        return {users, isNext};
        
    } catch (error: any) {
        throw new Error (`Failed to fetch users: ${error.message}`)
    }
}

export async function getActivity(userId: string) {
    try {
        connectToDB();

        //find all threads created by the user
        const userThreads = await Thread.find({ author: userId });

        //collect all the child thread ids (replies) from the 'children' field
        const childThreadIds = await userThreads.reduce((acc, userThread) => {
            return acc.concat(userThread.children)
        }, [])

        //get all replies excluding from user
        const replies = await Thread.find({
            _id: {$in: childThreadIds},
            author: {$ne: userId}
        }).populate({
            path: 'author',
            model: User,
            select: 'name image _id'
        })

        return replies;

    } catch (error: any) {
        throw new Error(`Failed to fetch activity: ${error.message}`)
    }
}