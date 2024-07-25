import PageIllustration from '@/components/page-illustration';

export const metadata = {
  title: 'Sign Up - Open PRO',
  description: 'Page description',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {  
  return (
    <main className="grow">
      <PageIllustration />
      {children}
    </main>
  );
}