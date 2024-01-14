import { SignIn } from "@clerk/nextjs";
import type { Metadata } from 'next'
import Image from "next/image";

import { dark } from '@clerk/themes';

export const metadata: Metadata = {
  title: 'MTO',
  description: 'A Next.js 13 Meta Threads Application'
}
 
export default function Page() {
  return (
    <>
      <Image 
        src={'/assets/mtologo2.png'}
        alt="MTO Logo"
        className="hidden xl:block h-screen w-1/2 object-cover bg-no-repeat"
        width={1000}
        height={1000}
      />
      <section className="flex flex-1 justify-center items-center flex-col py-10">
        <SignIn />
      </section>
    </>
  )
}