'use client'

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from "zod"

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";
import { Input } from '../ui/input';
import { Button } from "@/components/ui/button"

import { useRouter, usePathname } from 'next/navigation';

import { CommentValidation } from '@/lib/validations/thread';
import Image from 'next/image';
import { addCommentToThread } from '@/lib/actions/thread.actions';
// import { updateUser } from '@/lib/actions/user.actions';

interface Props {
    threadId: string
    currentUserImg: string
    currentUserId: string
}

const Comment = ({
    threadId,
    currentUserImg,
    currentUserId
}: Props) => {
    const router = useRouter();
    const pathname = usePathname();

    const form = useForm({
        resolver: zodResolver(CommentValidation) ,
        defaultValues: {
            thread: '',
        }
    })

    const onSubmit = async (values: z.infer<typeof CommentValidation>) => {
        await addCommentToThread(
            threadId,
            values.thread,
            JSON.parse(currentUserId),
            pathname,
        );

        form.reset();
    }

  return (
        <Form {...form}>
            <form 
            onSubmit={form.handleSubmit(onSubmit)} 
            className='comment-form'
            >

                <FormField
                control={form.control}
                name="thread"
                render={({ field }) => (
                    <FormItem className='flex gap-3 w-full items-center'>

                        <FormLabel>
                          <Image 
                            src={currentUserImg}
                            alt='Profile Image'
                            width={48}
                            height={48}
                            className='rounded-full object-cover'
                          />

                        </FormLabel>

                        <FormControl className='border-none bg-transparent'>
                            <Input 
                                type='text'
                                placeholder='Comment...'
                                className='no-focus text-light-1 outline-none'
                                {...field}
                            />
                        </FormControl>

                        <FormMessage />

                    </FormItem>
                )}
                />

                <Button type='submit' className='comment-form_btn'>
                    Reply
                </Button>

            </form>
        </Form>
  )
}

export default Comment