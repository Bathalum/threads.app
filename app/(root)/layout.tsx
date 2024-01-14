import Topbar from '@/components/shared/Topbar'
import LeftSidebar from '@/components/shared/LeftSidebar'
import RightSidebar from '@/components/shared/RightSidebar'
import Bottombar from '@/components/shared/Bottombar'

import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  //check if user is logged, if not then redirect to sign-in page.
  const user = await currentUser();
  if (!user) redirect('/sign-in');

  return (
          <div className='flex h-screen flex-col'>
            <Topbar />
            <main className='flex flex-row'>
              <LeftSidebar />

              <section className='main-container'>
                <div className='w-full max-w-4xl'>
                  { children }
                </div>
              </section>

              <RightSidebar />
            </main>
            
            <Bottombar />
          </div>
  )
}
