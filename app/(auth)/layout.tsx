import { Metadata } from "next"

export const metadata: Metadata = {
    title: 'MTO',
    description: 'A Next.js 13 Meta Threads Application',
    icons: {
      icon: `/assets/favicon.ico`
    }
  }

export default function Layout({ 
    children 
} : { 
    children: React.ReactNode 
}) {
    return (
            <div className='w-full flex justify-center items-center min-h-screen bg-dark-4'>
                {children}
            </div>
    )
}
        