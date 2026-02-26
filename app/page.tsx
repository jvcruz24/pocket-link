'use client';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

const urlSchema = z.object({
  url: z.url('Please enter a valid URL'),
});

type UrlFormData = z.infer<typeof urlSchema>;

export default function Home() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UrlFormData>({
    resolver: zodResolver(urlSchema),
  });

  const onSubmit = (data: UrlFormData) => {
    console.log('Valid URL:', data.url);
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black'>
      <main className='flex min-h-screen w-full max-w-3xl flex-col items-center justify-center py-32 px-16 bg-white dark:bg-black sm:items-start'>
        <form
          className='w-full flex flex-row items-stretch gap-4'
          onSubmit={handleSubmit(onSubmit)}
        >
          <input
            {...register('url')}
            type='text'
            placeholder='Insert the URL here to shorten it'
            className='w-full flex-8 rounded-md border-2 border-gray-300 bg-transparent px-4 py-2 text-lg focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:focus:border-blue-400'
          />
          <button className='flex-2 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md cursor-pointer'>
            Shorten URL
          </button>
        </form>
        {errors.url && <p className='text-red-500'>{errors.url.message}</p>}
      </main>
    </div>
  );
}
